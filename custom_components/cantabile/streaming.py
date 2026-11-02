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
from urllib.parse import quote
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


def _norm(t: str) -> str:
    t = re.sub(r"\s*[\(\[].*?(remaster|deluxe|edition|version|live|mono|stereo|anniversary)[^\)\]]*[\)\]]", "", str(t or ""), flags=re.I)
    return re.sub(r"[^\w]+", " ", t.casefold()).strip()


async def _dz_keres(hass: HomeAssistant, fajta: str, eloado: str, cim: str) -> dict[str, Any] | None:
    """Deezer-keresés előadó + cím szerint (album / szám); a legjobb egyezés (azonos cím és előadó)."""
    from .music import HibaUzenet, deezer  # noqa: PLC0415

    mezo = "album" if fajta == "album" else "track"
    q = f'artist:"{eloado}" {mezo}:"{cim}"'
    try:
        d = await deezer(hass, f"/search/{mezo}?q={quote(q)}&limit=10")
    except HibaUzenet:
        return None
    talalat = [x for x in (d or {}).get("data") or [] if isinstance(x, dict)]
    for x in talalat:
        if _norm(x.get("title")) == _norm(cim) and _norm((x.get("artist") or {}).get("name")) == _norm(eloado):
            return x
    return next((x for x in talalat if _norm((x.get("artist") or {}).get("name")) == _norm(eloado)), None)


async def _dz_isrc(hass: HomeAssistant, kod: str | None) -> str | None:
    from .music import HibaUzenet, deezer  # noqa: PLC0415

    if not kod or not ISRC.match(kod.upper()):
        return None
    try:
        d = await deezer(hass, f"/track/isrc:{kod.upper()}")
    except HibaUzenet:
        return None
    return str(d["id"]) if isinstance(d, dict) and d.get("id") else None


async def spotify_deezerre(hass: HomeAssistant, cim: str) -> dict[str, Any]:
    """Tartalék ott, ahol a Spotify nem szólhat (nincs Spotify Connect, DLNA-s TV…): ugyanaz a tartalom a Deezeren, és a
    Deezer-utakon (Sonos / WiiM saját Deezere, Music Assistant, zenemappa) szól tovább.
    - album: a Deezer ugyanazon albuma (előadó + cím) → {"album": link} – egész albumként (WiiM-en a saját Deezerén);
    - szám: ISRC szerint, ha a Spotify megadja, különben előadó + cím → {"deezer": [link]};
    - lista: a számai ISRC / előadó + cím szerint, ha a Spotify kiadja a lista számait (újabb Spotify-alkalmazásoknak
      gyakran nem – akkor „spotify_playlist_closed”)."""
    m = SPOTIFY_LINK.search(cim or "")
    if not m:
        raise StreamHiba("svc_denied", szolg="Spotify")
    fajta, sid = m.group(1).lower(), m.group(2)
    if fajta == "album":
        a = await _spotify_belso(hass, f"/albums/{sid}", False)
        eloado = ((a or {}).get("artists") or [{}])[0].get("name") or ""
        x = await _dz_keres(hass, "album", eloado, (a or {}).get("name") or "")
        if not x:
            return {"talalt": 0, "osszes": (a or {}).get("total_tracks") or 0}
        return {"album": f"https://www.deezer.com/album/{x['id']}", "cim": x.get("title"), "eloado": eloado,
                "kep": x.get("cover_medium"), "talalt": 1, "osszes": 1}
    if fajta == "track":
        try:
            t = await _spotify_belso(hass, f"/tracks/{sid}", False)
        except StreamHiba:
            t = None
        dz = await _dz_isrc(hass, ((t or {}).get("external_ids") or {}).get("isrc"))
        if not dz and t:
            x = await _dz_keres(hass, "track", ((t.get("artists") or [{}])[0]).get("name") or "", t.get("name") or "")
            dz = str(x["id"]) if x else None
        link = f"https://www.deezer.com/track/{dz}" if dz else None
        return {"deezer": [link], "talalt": int(bool(link)), "osszes": 1}
    # lista: az újabb (`/items`) és a régi (`/tracks`) végpont, a bejelentkezett fiókkal
    elemek: list[dict[str, Any]] = []
    for veg in ("items", "tracks"):
        try:
            while len(elemek) < SPOTIFY_TARTALEK_MAX:
                d = await _spotify_belso(hass, f"/playlists/{sid}/{veg}?limit=100&offset={len(elemek)}", True)
                uj = [(x or {}).get("item") or (x or {}).get("track") or {} for x in (d or {}).get("items") or []]
                elemek += uj
                if not uj or not (d or {}).get("next"):
                    break
            break
        except StreamHiba:
            elemek = []
    if not elemek:
        raise StreamHiba("spotify_playlist_closed")
    sor = asyncio.Semaphore(6)

    async def egy(t: dict[str, Any]) -> str | None:
        async with sor:
            dz = await _dz_isrc(hass, (t.get("external_ids") or {}).get("isrc"))
            if not dz and t.get("name"):
                x = await _dz_keres(hass, "track", ((t.get("artists") or [{}])[0]).get("name") or "", t["name"])
                dz = str(x["id"]) if x else None
        return f"https://www.deezer.com/track/{dz}" if dz else None

    linkek = list(await asyncio.gather(*(egy(t) for t in elemek[:SPOTIFY_TARTALEK_MAX])))
    return {"deezer": linkek, "talalt": sum(1 for x in linkek if x), "osszes": len(linkek)}


# ---- Spotify Connect: lejátszás egy Spotify-eszközön (a HA Spotify-integrációjának fiókjával) ----
# A Spotify a tétlen eszközök nevét gyakran nem adja meg (csak az azonosítót, pl. a WiiM „AVR”-ként): amikor névvel látjuk,
# megjegyezzük (azonosító → név), és később ebből ismerjük fel.
_ESZK_KULCS = "cantabile.spotify_eszkozok"


async def _eszk_tar(hass: HomeAssistant) -> tuple[Any, dict[str, str]]:
    from homeassistant.helpers.storage import Store  # noqa: PLC0415

    adat = hass.data.setdefault(DOMAIN + "_spotify_eszk", {})
    if "store" not in adat:
        adat["store"] = Store(hass, 1, _ESZK_KULCS)
        adat["nevek"] = (await adat["store"].async_load()) or {}
    return adat["store"], adat["nevek"]


async def _spotify_hiv(hass: HomeAssistant, modszer: str, ut: str, json: Any = None) -> Any:
    """Közvetlen (nem gyorsítótárazott) Spotify-hívás a bejelentkezett fiókkal – eszközlista, lejátszás indítása."""
    tok = await _spotify_token(hass, True)
    sess = async_get_clientsession(hass)
    async with sess.request(modszer, SPOTIFY_API + ut, json=json, headers={"Authorization": f"Bearer {tok}"},
                            timeout=aiohttp.ClientTimeout(total=12)) as v:
        if v.status == 401:
            _token.clear()
            raise StreamHiba("svc_login_expired")
        if v.status == 404:
            raise StreamHiba("spotify_no_device")
        if v.status >= 400:
            raise StreamHiba("svc_status", status=v.status)
        return await v.json(content_type=None) if v.content_length or v.status == 200 else None


async def spotify_eszkozok(hass: HomeAssistant) -> list[dict[str, Any]]:
    """A fiók Spotify Connect-eszközei {id, name, active}; a névtelen (csak azonosítós) eszköz a megjegyzett nevével."""
    store, nevek = await _eszk_tar(hass)
    d = await _spotify_hiv(hass, "GET", "/me/player/devices")
    ki, valtozott = [], False
    for x in (d or {}).get("devices") or []:
        did, nev = str(x.get("id") or ""), str(x.get("name") or "")
        if did and nev and nev != did and nevek.get(did) != nev:
            nevek[did] = nev
            valtozott = True
        ki.append({"id": did, "name": nevek.get(did, nev) if nev in ("", did) else nev, "active": bool(x.get("is_active"))})
    if valtozott:
        store.async_delay_save(lambda: nevek, 5)
    return ki


def _nev_norm(t: str) -> str:
    return re.sub(r"[^\w]+", "", str(t or "").casefold())


def eszkoz_valaszt(eszkozok: list[dict[str, Any]], nevek: list[str]) -> dict[str, Any] | None:
    """A hangszóró Spotify-eszköze a nevei közül (pontos, aztán részleges egyezés)."""
    keresett = [_nev_norm(n) for n in nevek if n]
    for e in eszkozok:
        if _nev_norm(e["name"]) in keresett:
            return e
    for e in eszkozok:
        n = _nev_norm(e["name"])
        if n and any(k and (k in n or n in k) for k in keresett):
            return e
    return None


async def spotify_connect(hass: HomeAssistant, nevek: list[str], uris: list[str], offset: int = 0,
                          position_ms: int = 0) -> dict[str, Any]:
    """Spotify-számok lejátszása egy Spotify Connect-eszközön (név szerint), a megadott számtól és ponttól."""
    e = eszkoz_valaszt(await spotify_eszkozok(hass), nevek)
    if not e:
        raise StreamHiba("spotify_no_device")
    uris = [u for u in uris if re.match(r"^spotify:(track|episode):[A-Za-z0-9]+$", u)][:100]
    if not uris:
        raise StreamHiba("svc_denied", szolg="Spotify")
    test = {"uris": uris, "offset": {"position": max(0, min(offset, len(uris) - 1))}, "position_ms": max(0, int(position_ms))}
    await _spotify_hiv(hass, "PUT", f"/me/player/play?device_id={e['id']}", test)
    return {"device": e["name"], "tracks": len(uris)}


async def cimek_deezerre(hass: HomeAssistant, elemek: list[dict[str, Any]]) -> dict[str, Any]:
    """Számok (cím, előadó) a Deezeren – pl. a Sonoson szóló Spotify-sor számai más hangszórónak."""
    sor = asyncio.Semaphore(6)

    async def egy(x: dict[str, Any]) -> str | None:
        if not x.get("cim"):
            return None
        async with sor:
            t = await _dz_keres(hass, "track", str(x.get("eloado") or ""), str(x["cim"]))
        return f"https://www.deezer.com/track/{t['id']}" if t else None

    linkek = list(await asyncio.gather(*(egy(x) for x in elemek[:SPOTIFY_TARTALEK_MAX])))
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

    async def _futtat(connection: websocket_api.ActiveConnection, msg: dict[str, Any], coro: Any) -> None:
        try:
            connection.send_result(msg["id"], await coro)
        except StreamHiba as e:
            connection.send_error(msg["id"], "spotify", e.szoveg(hass))
        except (aiohttp.ClientError, TimeoutError) as e:
            connection.send_error(msg["id"], "spotify", szoveg(hass, "svc_down", hiba=e))

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/spotify_connect", vol.Required("names"): [str], vol.Required("uris"): [str],
        vol.Optional("offset", default=0): vol.Coerce(int), vol.Optional("position_ms", default=0): vol.Coerce(int),
    })
    @websocket_api.async_response
    async def ws_connect(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        await _futtat(connection, msg, spotify_connect(hass, msg["names"], msg["uris"], msg["offset"], msg["position_ms"]))

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/titles_to_deezer",
                                      vol.Required("items"): vol.All([dict], vol.Length(max=SPOTIFY_TARTALEK_MAX))})
    @websocket_api.async_response
    async def ws_cimek(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        await _futtat(connection, msg, cimek_deezerre(hass, msg["items"]))

    websocket_api.async_register_command(hass, ws_connect)
    websocket_api.async_register_command(hass, ws_cimek)
