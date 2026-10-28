"""Spotify és Tidal a kazettapolcon (kísérleti): katalógus-keresés a szerveren át, lejátszás Sonoson linkkel.

A Deezerrel ellentétben mindkét szolgáltatás katalógusa csak engedéllyel kérdezhető le:
  - Spotify: a Cantabile beállításaiban megadott fejlesztői kulcs (client credentials), vagy ha nincs, a Home
    Assistant Spotify-integrációjának bejelentkezett munkamenete;
  - Tidal: a Cantabile beállításaiban megadott fejlesztői kulcs (client credentials, openapi.tidal.com v2).
A kulcsok és a tokenek a szerveren maradnak: a kártya a `cantabile/spotify` és a `cantabile/tidal` paranccsal kér,
csak az engedélyezett (olvasó) útvonalakon. A lejátszás Sonoson a szolgáltatás linkjével megy (a Sonos appban
bekötött fiókkal); Spotify Connect-eszközön a kártya a HA Spotify-integrációján át indít.
"""

from __future__ import annotations

import logging
import re
import time
from typing import Any

import aiohttp
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import CONF_SPOTIFY_ID, CONF_SPOTIFY_SECRET, CONF_TIDAL_ID, CONF_TIDAL_SECRET, DOMAIN, szoveg

_LOGGER = logging.getLogger(__name__)

SPOTIFY_API = "https://api.spotify.com/v1"
SPOTIFY_TOKEN = "https://accounts.spotify.com/api/token"
TIDAL_API = "https://openapi.tidal.com/v2"
TIDAL_TOKEN = "https://auth.tidal.com/v1/oauth2/token"
_AZON = r"[A-Za-z0-9_-]+"
SPOTIFY_UT = re.compile(rf"^/(search|artists/{_AZON}(/(albums|top-tracks))?|albums/{_AZON}(/tracks)?|playlists/{_AZON}(/tracks)?)(\?[^#]*)?$")
TIDAL_UT = re.compile(
    rf"^/(searchResults/[^/?#]+(/relationships/(albums|artists|tracks|playlists))?|albums/{_AZON}(/relationships/items)?"
    rf"|artists/{_AZON}(/relationships/(albums|tracks))?|playlists/{_AZON}(/relationships/items)?|tracks/{_AZON})(\?[^#]*)?$"
)
ERVENYES = 600

_token: dict[str, tuple[float, str]] = {}
_tar: dict[str, tuple[float, Any]] = {}


class StreamHiba(Exception):
    """Kimondható hiba (a kártya megjeleníti): üzenetkulcs (const._TEXT) és a behelyettesítendő értékek."""

    def __init__(self, kulcs: str, **kw: Any) -> None:
        super().__init__(kulcs)
        self.kulcs, self.kw = kulcs, kw

    def szoveg(self, hass: HomeAssistant) -> str:
        return szoveg(hass, self.kulcs, **self.kw)


def _opciok(hass: HomeAssistant) -> dict[str, Any]:
    bej = hass.config_entries.async_loaded_entries(DOMAIN)
    return dict(bej[0].options) if bej else {}


def spotify_entitas(hass: HomeAssistant) -> str | None:
    """A HA Spotify-integrációjának lejátszója (Spotify Connect-vezérlés és a saját könyvtár böngészése)."""
    for e in er.async_get(hass).entities.values():
        if e.platform == "spotify" and e.domain == "media_player" and not e.disabled:
            return e.entity_id
    return None


def allapot(hass: HomeAssistant) -> dict[str, Any]:
    """A kártyának: melyik szolgáltatás használható."""
    o = _opciok(hass)
    ent = spotify_entitas(hass)
    return {
        "spotify": bool((o.get(CONF_SPOTIFY_ID) and o.get(CONF_SPOTIFY_SECRET)) or ent),
        "spotify_entity": ent,
        "tidal": bool(o.get(CONF_TIDAL_ID) and o.get(CONF_TIDAL_SECRET)),
    }


async def _ugyfel_token(hass: HomeAssistant, nev: str, cim: str, azon: str, titok: str) -> str:
    """Client credentials token (gyorsítótárazva, lejárat előtt 60 mp-cel megújítva)."""
    t = _token.get(nev)
    if t and t[0] > time.monotonic():
        return t[1]
    sess = async_get_clientsession(hass)
    async with sess.post(cim, data={"grant_type": "client_credentials"}, auth=aiohttp.BasicAuth(azon, titok),
                         timeout=aiohttp.ClientTimeout(total=10)) as v:
        if v.status in (400, 401):
            raise StreamHiba("svc_bad_key")
        v.raise_for_status()
        j = await v.json()
    _token[nev] = (time.monotonic() + int(j.get("expires_in", 3600)) - 60, j["access_token"])
    return j["access_token"]


async def _spotify_token(hass: HomeAssistant) -> str:
    o = _opciok(hass)
    if o.get(CONF_SPOTIFY_ID) and o.get(CONF_SPOTIFY_SECRET):
        return await _ugyfel_token(hass, "spotify", SPOTIFY_TOKEN, o[CONF_SPOTIFY_ID], o[CONF_SPOTIFY_SECRET])
    # tartalék: a HA Spotify-integrációjának bejelentkezett munkamenete
    for bej in hass.config_entries.async_loaded_entries("spotify"):
        sess = getattr(getattr(bej, "runtime_data", None), "session", None)
        if sess is not None:
            try:
                await sess.async_ensure_token_valid()
                return sess.token["access_token"]
            except Exception as err:  # noqa: BLE001
                _LOGGER.debug("Cantabile: a Spotify-integráció tokenje nem érhető el", exc_info=True)
                raise StreamHiba("spotify_login_down") from err
    raise StreamHiba("spotify_no_key")


async def _ker(hass: HomeAssistant, kulcs: str, url: str, token: str, fej: dict[str, str]) -> Any:
    tarolt = _tar.get(kulcs)
    if tarolt and time.monotonic() - tarolt[0] < ERVENYES:
        return tarolt[1]
    sess = async_get_clientsession(hass)
    async with sess.get(url, headers={"Authorization": f"Bearer {token}", **fej}, timeout=aiohttp.ClientTimeout(total=12)) as v:
        if v.status == 401:
            _token.clear()
            raise StreamHiba("svc_login_expired")
        if v.status == 429:
            raise StreamHiba("svc_rate_limit")
        if v.status >= 400:
            raise StreamHiba("svc_status", status=v.status)
        j = await v.json(content_type=None)
    if len(_tar) > 300:
        _tar.clear()
    _tar[kulcs] = (time.monotonic(), j)
    return j


async def spotify(hass: HomeAssistant, ut: str) -> Any:
    if not SPOTIFY_UT.match(ut):
        raise StreamHiba("svc_denied", szolg="Spotify")
    tok = await _spotify_token(hass)
    return await _ker(hass, "s" + ut, SPOTIFY_API + ut, tok, {"Accept-Language": str(hass.config.language or "en")})


async def tidal(hass: HomeAssistant, ut: str) -> Any:
    if not TIDAL_UT.match(ut):
        raise StreamHiba("svc_denied", szolg="Tidal")
    o = _opciok(hass)
    if not (o.get(CONF_TIDAL_ID) and o.get(CONF_TIDAL_SECRET)):
        raise StreamHiba("tidal_no_key")
    tok = await _ugyfel_token(hass, "tidal", TIDAL_TOKEN, o[CONF_TIDAL_ID], o[CONF_TIDAL_SECRET])
    return await _ker(hass, "t" + ut, TIDAL_API + ut, tok, {"Accept": "application/vnd.api+json"})


@callback
def regisztral(hass: HomeAssistant) -> None:
    for nev, fv in (("spotify", spotify), ("tidal", tidal)):

        def keszit(nev: str = nev, fv: Any = fv) -> Any:
            @websocket_api.websocket_command({vol.Required("type"): f"cantabile/{nev}", vol.Required("ut"): str})
            @websocket_api.async_response
            async def ws(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
                try:
                    connection.send_result(msg["id"], await fv(hass, msg["ut"]))
                except StreamHiba as e:
                    connection.send_error(msg["id"], nev, e.szoveg(hass))
                except (aiohttp.ClientError, TimeoutError) as e:
                    connection.send_error(msg["id"], nev, szoveg(hass, "svc_down", hiba=e))

            return ws

        websocket_api.async_register_command(hass, keszit())
