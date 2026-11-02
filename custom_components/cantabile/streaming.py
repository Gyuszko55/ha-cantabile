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

import asyncio
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
# a saját könyvtár (listák, mentett albumok, követett előadók, kedvelt dalok): csak a HA Spotify-integrációjának
# bejelentkezett fiókjával (a fejlesztői kulcs nem fér hozzá egy felhasználó könyvtárához)
SPOTIFY_SAJAT = re.compile(r"^/me/(playlists|albums|tracks|following)(\?[^#]*)?$")
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


async def _spotify_token(hass: HomeAssistant, sajat: bool = False) -> str:
    o = _opciok(hass)
    if not sajat and o.get(CONF_SPOTIFY_ID) and o.get(CONF_SPOTIFY_SECRET):
        return await _ugyfel_token(hass, "spotify", SPOTIFY_TOKEN, o[CONF_SPOTIFY_ID], o[CONF_SPOTIFY_SECRET])
    # a HA Spotify-integrációjának bejelentkezett munkamenete (a saját könyvtárhoz mindig ez)
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
    sajat = bool(SPOTIFY_SAJAT.match(ut))
    if not sajat and not SPOTIFY_UT.match(ut):
        raise StreamHiba("svc_denied", szolg="Spotify")
    tok = await _spotify_token(hass, sajat)
    return await _ker(hass, "s" + ut, SPOTIFY_API + ut, tok, {"Accept-Language": str(hass.config.language or "en")})


SPOTIFY_LINK = re.compile(r"(?:spotify:|open\.spotify\.com/(?:intl-\w+/)?)(album|playlist|track)[:/]([A-Za-z0-9]+)", re.I)
ISRC = re.compile(r"^[A-Z]{2}[A-Z0-9]{3}\d{7}$")
SPOTIFY_TARTALEK_MAX = 100


async def _spotify_belso(hass: HomeAssistant, ut: str, sajat: bool) -> Any:
    """Belső (olvasó) Spotify-kérés a helyettesítéshez – a fiók listáihoz a bejelentkezett fiókkal."""
    try:
        tok = await _spotify_token(hass, sajat)
    except StreamHiba:
        if not sajat:
            raise
        tok = await _spotify_token(hass)
    return await _ker(hass, ("u" if sajat else "s") + ut, SPOTIFY_API + ut, tok, {})


async def spotify_isrc(hass: HomeAssistant, cim: str) -> list[str | None]:
    """Egy Spotify-szám / -album / -lista számainak ISRC-azonosítói sorrendben (legfeljebb 100)."""
    m = SPOTIFY_LINK.search(cim or "")
    if not m:
        raise StreamHiba("svc_denied", szolg="Spotify")
    fajta, sid = m.group(1).lower(), m.group(2)
    if fajta == "track":
        t = await _spotify_belso(hass, f"/tracks/{sid}", False)
        return [((t or {}).get("external_ids") or {}).get("isrc")]
    if fajta == "playlist":
        ki: list[str | None] = []
        while len(ki) < SPOTIFY_TARTALEK_MAX:
            d = await _spotify_belso(hass, f"/playlists/{sid}/tracks?limit=100&offset={len(ki)}", True)
            elemek = (d or {}).get("items") or []
            ki += [(((x or {}).get("track") or {}).get("external_ids") or {}).get("isrc") for x in elemek]
            if not elemek or not (d or {}).get("next"):
                break
        return ki[:SPOTIFY_TARTALEK_MAX]
    # album: a számlistában nincs ISRC – a számok adatai 50-esével
    d = await _spotify_belso(hass, f"/albums/{sid}/tracks?limit=50", False)
    ids = [x.get("id") for x in (d or {}).get("items") or [] if x and x.get("id")]
    ki = []
    for i in range(0, len(ids), 50):
        t = await _spotify_belso(hass, f"/tracks?ids={','.join(ids[i:i + 50])}", False)
        ki += [((x or {}).get("external_ids") or {}).get("isrc") for x in (t or {}).get("tracks") or []]
    return ki


async def spotify_deezerre(hass: HomeAssistant, cim: str) -> dict[str, Any]:
    """Tartalék ott, ahol a Spotify nem szólhat (nincs Spotify Connect, BT, DLNA-s TV): ugyanazok a számok a Deezeren,
    az ISRC alapján – a Deezer-utakon (Sonos / WiiM saját Deezere, Music Assistant, zenemappa) szólnak tovább."""
    from .music import HibaUzenet, deezer  # noqa: PLC0415 – körkörös import nélkül

    isrc = await spotify_isrc(hass, cim)
    sor = asyncio.Semaphore(6)

    async def egy(kod: str | None) -> str | None:
        if not kod or not ISRC.match(kod.upper()):
            return None
        async with sor:
            try:
                d = await deezer(hass, f"/track/isrc:{kod.upper()}")
            except HibaUzenet:
                return None
        return f"https://www.deezer.com/track/{d['id']}" if isinstance(d, dict) and d.get("id") else None

    linkek = list(await asyncio.gather(*(egy(k) for k in isrc)))
    return {"deezer": linkek, "talalt": sum(1 for x in linkek if x), "osszes": len(linkek)}


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

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/spotify_to_deezer", vol.Required("uri"): str})
    @websocket_api.async_response
    async def ws_deezerre(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            connection.send_result(msg["id"], await spotify_deezerre(hass, msg["uri"]))
        except StreamHiba as e:
            connection.send_error(msg["id"], "spotify", e.szoveg(hass))
        except (aiohttp.ClientError, TimeoutError) as e:
            connection.send_error(msg["id"], "spotify", szoveg(hass, "svc_down", hiba=e))

    websocket_api.async_register_command(hass, ws_deezerre)
