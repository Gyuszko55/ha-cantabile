"""A WiiM / LinkPlay saját Deezere: a készülékben (a WiiM Home appban) bekötött Deezer-fiók, lossless minőségben.

A Cantabile elve: minden forrás minden hangszórón szóljon, és a fő út mindig a hangszóró saját integrációja – a Music
Assistant csak tartalék. A WiiM Deezer-albumot és -listát a saját Deezeréről is le tud játszani; ezt a HA WiiM-integrációja
nem kínálja, ezért a készülék helyi felületén indítjuk:

- UPnP `urn:schemas-wiimu-com:service:PlayQueue:1` (a WiiM Home app is ezen küld): `CreateQueue` egy sorral, amelynek
  forrása `Deezer2`, keresőcíme a fiók airable-címe + `/deezer/album/<id>` vagy `/deezer/playlist/<id>` (a számokat a WiiM
  maga tölti le), majd `PlayQueueWithIndex`. Egyes számokból sor nem építhető (a WiiM csak albumot / listát fogad).
  A sor betöltése után a kért számra újra `PlayQueueWithIndex` ugrik (az első hívás még a lista elejéről indul) – addig
  a lejátszó némítva, hogy ne halljon bele az első szám.
- helyi HTTP API (`httpapi.asp`): állapot, némítás, tekerés.
- A fiók: `GetUserInfo` (`AccountSource` = `Deezer2`) → `baseUrl`; ha nincs Deezer-fiók a WiiM-ben, ez az út nem él.

A Sonoson szóló Deezer-lista azonosítója a Sonos kedvenceiből jön (cím szerint): `album-<id>`, `…playlist…-<id>`, illetve a
Deezer-kedvencek (`user-tracks-<felhasználó>`) a felhasználó „kedvenc számok” listája a nyilvános Deezer API-ból.

Websocket:
- `cantabile/wiim_deezer/available` `{entity_id}` → `{available}`
- `cantabile/wiim_deezer/play` `{entity_id, kind: album|playlist, id, track?, position?}` → `{index, total}`
- `cantabile/wiim_deezer/from_sonos` `{source, target, track, position?}` → `{kind, id, title, index, total}`
"""

from __future__ import annotations

import asyncio
import html
import json
import logging
import re
import time
from typing import Any

import aiohttp
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .hezagmentes import UPNP_PORT, gazdagep
from .music import deezer

_LOGGER = logging.getLogger(__name__)

PQ = "urn:schemas-wiimu-com:service:PlayQueue:1"
CD = "urn:schemas-upnp-org:service:ContentDirectory:1"
SOR_NEV = "Cantabile"
FORRAS = "Deezer2"
_alap_tar: dict[str, tuple[float, str | None]] = {}

SONOS_ALBUM = re.compile(r"album-(\d+)", re.I)
SONOS_LISTA = re.compile(r"playlist[^-?]*-(\d+)", re.I)
SONOS_KEDVENC = re.compile(r"user-tracks-(\d+)", re.I)
DZ_SZAM = re.compile(r"tr(?:%3a|:|-flac:)(\d+)", re.I)


def _boritek(szolg: str, akcio: str, torzs: str) -> str:
    return ('<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" '
            's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body>'
            f'<u:{akcio} xmlns:u="{szolg}">{torzs}</u:{akcio}></s:Body></s:Envelope>')


async def _soap(hass: HomeAssistant, url: str, szolg: str, akcio: str, torzs: str) -> str:
    s = async_get_clientsession(hass)
    async with s.post(url, data=_boritek(szolg, akcio, torzs).encode(), timeout=aiohttp.ClientTimeout(total=15),
                      headers={"Content-Type": 'text/xml; charset="utf-8"', "SOAPACTION": f'"{szolg}#{akcio}"'}) as r:
        t = await r.text()
        if r.status >= 400:
            raise HomeAssistantError(f"{akcio}: UPnP {r.status}")
        return html.unescape(t)


async def _pq(hass: HomeAssistant, host: str, akcio: str, torzs: str) -> str:
    return await _soap(hass, f"http://{host}:{UPNP_PORT}/upnp/control/PlayQueue1", PQ, akcio, torzs)


async def _api(hass: HomeAssistant, host: str, parancs: str) -> str:
    s = async_get_clientsession(hass, verify_ssl=False)
    async with s.get(f"https://{host}/httpapi.asp?command={parancs}", timeout=aiohttp.ClientTimeout(total=8)) as r:
        return await r.text()


def _wiim(hass: HomeAssistant, entity_id: str) -> str | None:
    """A WiiM / LinkPlay lejátszó címe (csak ezeken él ez az út)."""
    return gazdagep(hass, entity_id)


async def deezer_alap(hass: HomeAssistant, entity_id: str) -> str | None:
    """A WiiM Deezer-fiókjának airable-címe (pl. https://…airable.io), vagy None, ha nincs a WiiM-ben Deezer."""
    host = _wiim(hass, entity_id)
    if not host:
        return None
    if (t := _alap_tar.get(host)) and time.monotonic() - t[0] < (3600 if t[1] else 300):
        return t[1]
    alap = None
    try:
        v = await _pq(hass, host, "GetUserInfo", f"<AccountSource>{FORRAS}</AccountSource>")
        if m := re.search(r"<Result>(.*?)</Result>", v, re.S):
            alap = (json.loads(m.group(1)) or {}).get("baseUrl") or None
    except Exception:  # noqa: BLE001 – nem WiiM, nem érhető el, vagy nincs Deezer-fiók
        _LOGGER.debug("Cantabile: a WiiM Deezer-fiókja nem olvasható (%s)", entity_id, exc_info=True)
    _alap_tar[host] = (time.monotonic(), alap)
    return alap


def sor_tartalom(nev: str, kereso: str) -> str:
    """A CreateQueue sor-leírása (XML, még escape nélkül): Deezer-forrás, a számokat a WiiM a keresőcímről tölti le."""
    return ('<?xml version="1.0"?><PlayList>'
            f"<ListName>{html.escape(nev)}</ListName><ListInfo><SourceName>{FORRAS}</SourceName>"
            f"<SearchUrl>{html.escape(kereso)}</SearchUrl><MarkSearch>0</MarkSearch><TrackNumber>0</TrackNumber>"
            "<Quality>0</Quality><requestQuality>LOSSLESS</requestQuality><UpdateTime>0</UpdateTime>"
            "<LastPlayIndex>1</LastPlayIndex><SwitchPageMode>0</SwitchPageMode><CurrentPage>0</CurrentPage>"
            "<TotalPages>0</TotalPages></ListInfo><Tracks></Tracks></PlayList>")


def sor_szamai(valasz: str) -> list[str]:
    """A BrowseQueue válaszából a sor számainak Deezer-azonosítói, sorrendben."""
    return re.findall(r"<Track\d+>\s*<Id>(\d+)</Id>", valasz)


async def _allapot(hass: HomeAssistant, host: str) -> dict[str, Any]:
    try:
        return json.loads(await _api(hass, host, "getPlayerStatusEx"))
    except Exception:  # noqa: BLE001
        return {}


async def deezer_sorrend(hass: HomeAssistant, fajta: str, did: str, legfeljebb: int = 2000) -> list[str]:
    """Az album / lista számainak Deezer-azonosítói sorrendben (nyilvános Deezer API, lapozva) – a WiiM sora ugyanebben
    a sorrendben áll (a WiiM BrowseQueue-ja csak az első 20-at adja vissza)."""
    ki: list[str] = []
    while len(ki) < legfeljebb:
        d = await deezer(hass, f"/{fajta}/{did}/tracks?limit=100&index={len(ki)}")
        uj = [str(x.get("id")) for x in (d or {}).get("data") or [] if x.get("id")]
        ki += uj
        if not uj or not (d or {}).get("next"):
            break
    return ki


async def lejatszik(hass: HomeAssistant, entity_id: str, fajta: str, did: str, szam: str | None = None,
                    poz: float = 0) -> dict[str, Any]:
    """Deezer-album / -lista a WiiM saját Deezeréről; `szam` (Deezer-azonosító) a kezdő szám, `poz` a hely benne (mp)."""
    host = _wiim(hass, entity_id)
    alap = await deezer_alap(hass, entity_id)
    if not host or not alap:
        raise HomeAssistantError("no_wiim_deezer")
    # a kezdő szám helye a Deezer sorrendje szerint – ha nincs a listában, a WiiM meg sem szólal (a hívó másik utat választ)
    index, osszes = 1, None
    if szam:
        sorrend = await deezer_sorrend(hass, fajta, did)
        osszes = len(sorrend) or None
        if str(szam) not in sorrend:
            raise HomeAssistantError("not_in_list")
        index = sorrend.index(str(szam)) + 1
    ugrik = index > 1 or poz > 3
    nemitva = False
    try:
        if ugrik:
            nemitva = (await _allapot(hass, host)).get("mute") == "0"
            if nemitva:
                await _api(hass, host, "setPlayerCmd:mute:1")
        await _pq(hass, host, "CreateQueue", f"<QueueContext>{html.escape(sor_tartalom(SOR_NEV, f'{alap}/deezer/{fajta}/{did}'))}</QueueContext>")
        await _pq(hass, host, "PlayQueueWithIndex", f"<QueueName>{SOR_NEV}</QueueName><Index>1</Index>")
        if index > 1:
            # a sor betöltése (a WiiM a keresőcímről tölti), aztán a kért számra ugrás
            hatar = time.monotonic() + 15
            while time.monotonic() < hatar and not sor_szamai(await _pq(hass, host, "BrowseQueue", f"<QueueName>{SOR_NEV}</QueueName>")):
                await asyncio.sleep(0.7)
            await _pq(hass, host, "PlayQueueWithIndex", f"<QueueName>{SOR_NEV}</QueueName><Index>{index}</Index>")
        if ugrik:
            # a kért szám elindult (a némítás csak utána oldódik: a lista első számából semmi nem hallatszik)
            await asyncio.sleep(0.8)
            hatar = time.monotonic() + 12
            while time.monotonic() < hatar and (await _allapot(hass, host)).get("status") != "play":
                await asyncio.sleep(0.5)
        if poz > 3:
            await _api(hass, host, f"setPlayerCmd:seek:{int(poz)}")
        return {"index": index, "total": osszes}
    finally:
        if nemitva:
            await asyncio.sleep(0.4)
            try:
                await _api(hass, host, "setPlayerCmd:mute:0")
            except Exception:  # noqa: BLE001
                _LOGGER.warning("Cantabile: a WiiM némítása nem oldódott fel (%s)", entity_id)


def kedvencbol(uri: str) -> tuple[str, str] | None:
    """Egy Sonos-kedvenc Deezer-címéből (sid=2) az album / lista; a Deezer-kedvencekhez a felhasználó: ("kedvenc", uid)."""
    if "sid=2" not in uri:
        return None
    if m := SONOS_KEDVENC.search(uri):
        return ("kedvenc", m.group(1))
    if m := SONOS_ALBUM.search(uri):
        return ("album", m.group(1))
    if m := SONOS_LISTA.search(uri):
        return ("playlist", m.group(1))
    return None


def sonos_kedvencek(valasz: str) -> list[tuple[str, str]]:
    """A Sonos ContentDirectory FV:2 böngészéséből (cím, cím-URI) párok."""
    t = html.unescape(valasz)
    ki = []
    for it in re.findall(r"<item .*?</item>", t, re.S):
        ti, res = re.search(r"<dc:title>(.*?)</dc:title>", it, re.S), re.search(r"<res[^>]*>(.*?)</res>", it, re.S)
        if ti and res:
            ki.append((html.unescape(ti.group(1)).strip(), html.unescape(res.group(1)).strip()))
    return ki


async def _sonos_kedvencek(hass: HomeAssistant, sonos: str) -> list[tuple[str, str]]:
    from .sonossor import _soco  # noqa: PLC0415

    z = await _soco(hass, sonos)
    host = getattr(z, "ip_address", None)
    if not host:
        return []
    v = await _soap(hass, f"http://{host}:1400/MediaServer/ContentDirectory/Control", CD, "Browse",
                    "<ObjectID>FV:2</ObjectID><BrowseFlag>BrowseDirectChildren</BrowseFlag><Filter>*</Filter>"
                    "<StartingIndex>0</StartingIndex><RequestedCount>500</RequestedCount><SortCriteria></SortCriteria>")
    return sonos_kedvencek(v)


async def sonos_forras(hass: HomeAssistant, sonos: str) -> dict[str, str] | None:
    """A Sonoson szóló Deezer-lista / -album: {kind, id, title} – a Sonos kedvencei közül cím szerint (a lejátszó
    „media_playlist”, majd „media_album_name” mezője)."""
    st = hass.states.get(sonos)
    if not st:
        return None
    a = st.attributes
    cimek = [str(x).strip().casefold() for x in (a.get("media_playlist"), a.get("media_album_name")) if x]
    if not cimek:
        return None
    try:
        kedvencek = await _sonos_kedvencek(hass, sonos)
    except Exception:  # noqa: BLE001
        _LOGGER.debug("Cantabile: a Sonos kedvencei nem olvashatók (%s)", sonos, exc_info=True)
        return None
    for keresett in cimek:
        for cim, uri in kedvencek:
            if cim.casefold() != keresett or not (f := kedvencbol(uri)):
                continue
            fajta, did = f
            if fajta == "kedvenc":
                lista = await deezer(hass, f"/user/{did}/playlists?limit=100")
                did = next((str(x["id"]) for x in (lista or {}).get("data") or [] if x.get("is_loved_track")), None)
                if not did:
                    continue
                fajta = "playlist"
            return {"kind": fajta, "id": did, "title": cim}
    return None


PRESET_DZ = re.compile(r"/deezer/(album|playlist)/(\d+)", re.I)
PRESET_TUNEIN = re.compile(r"(?:profiles/|[?&]id=)(s\d+)", re.I)


def preset_sorok(valasz: str) -> dict[str, dict[str, str]]:
    """A PlayQueue „TotalQueue” listájából: preset-név → {forras, kereso} (a sor neve „<név>_#~<mentés ideje>”)."""
    ki: dict[str, dict[str, str]] = {}
    for blk in re.findall(r"<List\d+>(.*?)</List\d+>", html.unescape(valasz), re.S):
        def g(k: str, b: str = blk) -> str:
            m = re.search(f"<{k}>(.*?)</{k}>", b, re.S)
            return html.unescape(m.group(1)).strip() if m else ""
        nev = g("Name").split("_#~")[0].strip()
        if nev and nev not in ki:
            ki[nev] = {"forras": g("Source"), "kereso": g("SearchUrl")}
    return ki


def preset_leforditva(forras: str, kereso: str) -> dict[str, str] | None:
    """Egy preset tartalma más hangszórónak is érthetően: Deezer-album / -lista (link), vagy TuneIn-adó (azonosító)."""
    if forras.lower().startswith("deezer") and (m := PRESET_DZ.search(kereso)):
        return {"deezer_kind": m.group(1).lower(), "deezer_id": m.group(2),
                "deezer": f"https://www.deezer.com/{m.group(1).lower()}/{m.group(2)}"}
    if "tunein" in forras.lower() and (m := PRESET_TUNEIN.search(kereso)):
        return {"tunein": m.group(1)}
    return None


async def _tunein_cim(hass: HomeAssistant, allomas: str) -> str | None:
    """A TuneIn-adó stream-címe (a nyilvános OPML API-ból)."""
    s = async_get_clientsession(hass)
    try:
        async with s.get(f"https://opml.radiotime.com/Tune.ashx?id={allomas}&render=json",
                         timeout=aiohttp.ClientTimeout(total=8)) as r:
            d = await r.json(content_type=None)
    except Exception:  # noqa: BLE001
        return None
    for x in (d or {}).get("body") or []:
        if str(x.get("url") or "").startswith(("http://", "https://")):
            return x["url"]
    return None


async def presetek(hass: HomeAssistant, entity_id: str) -> list[dict[str, Any]]:
    """A WiiM presetjei a tartalmukkal: {number, name, source, image, deezer?, deezer_kind?, deezer_id?, radio?}. A Deezer-
    és a TuneIn-preset így bármelyik hangszórón szólhat (Deezer-albumként / rádióként), a többi csak a WiiM-en."""
    host = _wiim(hass, entity_id)
    if not host:
        raise HomeAssistantError("not_wiim")
    info = json.loads(await _api(hass, host, "getPresetInfo"))
    try:
        sorok = preset_sorok(await _pq(hass, host, "BrowseQueue", "<QueueName>TotalQueue</QueueName>"))
    except Exception:  # noqa: BLE001 – régebbi firmware: csak a WiiM-en játszható presetek
        sorok = {}
    ki = []
    for p in info.get("preset_list") or []:
        nev = str(p.get("name") or "").strip()
        x: dict[str, Any] = {"number": int(p.get("number") or 0), "name": nev, "source": str(p.get("source") or ""),
                             "image": p.get("picurl") or None}
        sor = sorok.get(nev)
        if sor and (f := preset_leforditva(sor["forras"] or x["source"], sor["kereso"])):
            if allomas := f.pop("tunein", None):
                if cim := await _tunein_cim(hass, allomas):
                    x["radio"] = cim
            else:
                x.update(f)
        ki.append(x)
    return ki


def regisztral(hass: HomeAssistant) -> None:
    @websocket_api.websocket_command({vol.Required("type"): "cantabile/wiim_presets", vol.Required("entity_id"): str})
    @websocket_api.async_response
    async def ws_presets(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            conn.send_result(msg["id"], {"presets": await presetek(hass, msg["entity_id"])})
        except Exception as err:  # noqa: BLE001 – nem WiiM, vagy nem válaszol
            conn.send_error(msg["id"], "nem_sikerult", str(err) or type(err).__name__)

    websocket_api.async_register_command(hass, ws_presets)

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/wiim_deezer/available", vol.Required("entity_id"): str})
    @websocket_api.async_response
    async def ws_available(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        conn.send_result(msg["id"], {"available": bool(await deezer_alap(hass, msg["entity_id"]))})

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/wiim_deezer/play", vol.Required("entity_id"): str,
        vol.Required("kind"): vol.In(["album", "playlist"]), vol.Required("id"): vol.Coerce(str),
        vol.Optional("track"): vol.Any(None, vol.Coerce(str)), vol.Optional("position", default=0): vol.Coerce(float),
    })
    @websocket_api.async_response
    async def ws_play(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            r = await lejatszik(hass, msg["entity_id"], msg["kind"], msg["id"], msg.get("track"), msg["position"])
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        except Exception as err:  # noqa: BLE001 – a WiiM nem válaszolt
            conn.send_error(msg["id"], "nem_sikerult", str(err) or type(err).__name__)
            return
        conn.send_result(msg["id"], r)

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/wiim_deezer/from_sonos", vol.Required("source"): str, vol.Required("target"): str,
        vol.Required("track"): vol.Coerce(str), vol.Optional("position", default=0): vol.Coerce(float),
    })
    @websocket_api.async_response
    async def ws_from_sonos(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            if not await deezer_alap(hass, msg["target"]):
                raise HomeAssistantError("no_wiim_deezer")
            ent = er.async_get(hass).async_get(msg["source"])
            if not ent or ent.platform != "sonos":
                raise HomeAssistantError("not_sonos")
            f = await sonos_forras(hass, msg["source"])
            if not f:
                raise HomeAssistantError("not_found")
            szam = (m.group(1) if (m := DZ_SZAM.search(msg["track"])) else msg["track"]) or None
            r = await lejatszik(hass, msg["target"], f["kind"], f["id"], szam, msg["position"])
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        except Exception as err:  # noqa: BLE001
            conn.send_error(msg["id"], "nem_sikerult", str(err) or type(err).__name__)
            return
        conn.send_result(msg["id"], {**f, **r})

    for c in (ws_available, ws_play, ws_from_sonos):
        websocket_api.async_register_command(hass, c)
