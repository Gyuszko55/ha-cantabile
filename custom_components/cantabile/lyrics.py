"""Dalszöveg a kártyához: `cantabile/lyrics` websocket-parancs.

A forrás az LRCLIB (lrclib.net) nyilvános, kulcs nélküli API-ja: előadó + cím (+ album és hossz, ha van) alapján
keres, és ha van, időzített (LRC) szöveget ad – ebből a kártya a lejátszással együtt kiemeli az épp szóló sort. Ha
pontos egyezés nincs, a keresőből a hosszban legközelebbi, lehetőleg időzített találatot választja. A szöveget a
szerver nem tárolja tartósan, csak a memóriában (legfeljebb 200 dal), hogy ugyanazt ne kérje le újra.
"""

from __future__ import annotations

import asyncio
import logging
import re
from collections import OrderedDict
from typing import Any

import aiohttp
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import VERSION, szoveg

_LOGGER = logging.getLogger(__name__)

API = "https://lrclib.net/api"
UA = f"Cantabile/{VERSION} (https://github.com/Gyuszko55/ha-cantabile)"
TAR_MERET = 200
IDOTURES = 8          # mp eltérés a hosszban, ami még ugyanaz a felvétel

_tar: OrderedDict[str, dict[str, Any]] = OrderedDict()
_IDO = re.compile(r"\[(\d+):(\d+(?:[.:]\d+)?)\]")
# zárójeles / kötőjeles toldalékok, amelyek a keresést elrontják: (Remastered 2011), - Live, [Radio Edit], feat. X
_TOLDALEK = re.compile(r"\s*[\(\[][^)\]]*(remaster|live|edit|version|mono|stereo|mix|feat|deluxe|bonus)[^)\]]*[\)\]]"
                       r"|\s+-\s+.*(remaster|live|edit|version|mono|stereo|mix).*$|\s+feat\.?\s.*$", re.I)


def _lrc(szoveg: str) -> list[list[Any]]:
    """[mm:ss.xx] sorok → [[mp, sor], …] időrendben (egy sor több időbélyeget is kaphat)."""
    sorok: list[list[Any]] = []
    for nyers in szoveg.splitlines():
        idok = _IDO.findall(nyers)
        if not idok:
            continue
        sor = _IDO.sub("", nyers).strip()
        for perc, mp in idok:
            sorok.append([round(int(perc) * 60 + float(mp.replace(":", ".")), 2), sor])
    sorok.sort(key=lambda x: x[0])
    return sorok


def _eredmeny(adat: dict[str, Any] | None) -> dict[str, Any]:
    if not adat:
        return {"found": False}
    szinkron = adat.get("syncedLyrics") or ""
    return {
        "found": True,
        "instrumental": bool(adat.get("instrumental")),
        "synced": _lrc(szinkron) if szinkron else None,
        "plain": adat.get("plainLyrics") or None,
        "artist": adat.get("artistName"),
        "title": adat.get("trackName"),
    }


async def _ker(sess: aiohttp.ClientSession, ut: str, param: dict[str, Any]) -> Any:
    for proba in range(3):          # az LRCLIB néha átmeneti 503-at ad – kétszer újra
        async with sess.get(f"{API}/{ut}", params=param, headers={"User-Agent": UA}, timeout=aiohttp.ClientTimeout(total=10)) as v:
            if v.status == 404:
                return None
            if v.status >= 500 and proba < 2:
                await asyncio.sleep(1 + proba)
                continue
            v.raise_for_status()
            return await v.json()
    return None


def _legjobb(talalatok: list[dict[str, Any]], hossz: float | None) -> dict[str, Any] | None:
    def pont(t: dict[str, Any]) -> tuple[int, float]:
        elteres = abs((t.get("duration") or 0) - hossz) if hossz else 0
        return (0 if t.get("syncedLyrics") else 1, elteres)
    jo = [t for t in talalatok if t.get("syncedLyrics") or t.get("plainLyrics") or t.get("instrumental")]
    if hossz:
        jo = [t for t in jo if not t.get("duration") or abs(t["duration"] - hossz) <= IDOTURES * 3] or jo
    return min(jo, key=pont) if jo else None


async def keres(hass: HomeAssistant, eloado: str, cim: str, album: str | None, hossz: float | None) -> dict[str, Any]:
    kulcs = f"{eloado.casefold()}|{cim.casefold()}|{round(hossz or 0)}"
    if kulcs in _tar:
        _tar.move_to_end(kulcs)
        return _tar[kulcs]
    sess = async_get_clientsession(hass)
    adat = None
    if hossz:
        param = {"artist_name": eloado, "track_name": cim, "duration": round(hossz)}
        if album:
            param["album_name"] = album
        adat = await _ker(sess, "get", param)
    if not adat:
        tiszta = _TOLDALEK.sub("", cim).strip() or cim
        talalatok = await _ker(sess, "search", {"artist_name": eloado, "track_name": tiszta}) or []
        if not talalatok and tiszta != cim:
            talalatok = await _ker(sess, "search", {"artist_name": eloado, "track_name": cim}) or []
        adat = _legjobb(talalatok, hossz)
    eredmeny = _eredmeny(adat)
    _tar[kulcs] = eredmeny
    while len(_tar) > TAR_MERET:
        _tar.popitem(last=False)
    return eredmeny


@callback
def regisztral(hass: HomeAssistant) -> None:
    @websocket_api.websocket_command(
        {
            vol.Required("type"): "cantabile/lyrics",
            vol.Required("artist"): str,
            vol.Required("title"): str,
            vol.Optional("album"): vol.Any(str, None),
            vol.Optional("duration"): vol.Any(vol.Coerce(float), None),
        }
    )
    @websocket_api.async_response
    async def ws_dalszoveg(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        eloado, cim = msg["artist"].strip(), msg["title"].strip()
        if not eloado or not cim:
            connection.send_result(msg["id"], {"found": False})
            return
        try:
            eredmeny = await keres(hass, eloado, cim, msg.get("album"), msg.get("duration"))
        except (aiohttp.ClientError, asyncio.TimeoutError) as err:
            _LOGGER.debug("LRCLIB: %s", err)
            connection.send_error(msg["id"], "nem_elerheto", szoveg(hass, "lyrics_down"))
            return
        connection.send_result(msg["id"], eredmeny)

    websocket_api.async_register_command(hass, ws_dalszoveg)
