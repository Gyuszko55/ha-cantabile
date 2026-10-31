"""Forráshelyettesítés: ugyanaz a szám másik forrásból, ha a választott hangszóró az eredetit nem tudja lejátszani.

- Deezer-szám nem Sonoson: a gomb mögötti Music Assistant-lejátszón az MA-ban bekötött Deezerről; ahol MA sincs (TV, BT),
  a zenemappából, ha ott is megvan.
- Music Assistant-szám MA-lejátszó nélküli gombon: Sonoson a Sonos saját Deezeréről (ha az MA-ban Deezerről való), különben
  a zenemappából.

A zenemappában előadó (az első mappa) és cím (a fájlnév sorszám, előadó- és albumelőtag nélkül) szerint keres.

Websocket: `cantabile/substitute` – bemenet: `entity_id`, `ma_entity` (a gomb MA-lejátszója, ha van), `mappa` (a kártya
zenemappája), `deezer` (szám-, album- vagy listalinkek / Sonos-azonosítók) és/vagy `ma` (`{uri, cim, eloado, album}`);
kimenet: `{mod: "sonos" | "ma" | "nas" | None, elemek: [azonosító vagy None, számonként], talalt, osszes}`.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er

from . import ma
from .library import ELOTAG
from .music import HibaUzenet, deezer, nas_lista, norm, tiszta

_LOGGER = logging.getLogger(__name__)

DZ_LINK = re.compile(r"deezer\.com/(?:\w+/)?(track|album|playlist)/(\d+)", re.I)
DZ_SONOS = re.compile(r"tr(?:%3a|:|-flac:)(\d+)", re.I)
MA_DZ = re.compile(r"^(deezer--[\w-]+)://track/(\d+)$")
SZAM_MAX = 300
_index_tar: dict[str, tuple[int, dict[tuple[str, str], str]]] = {}
_ma_dz: dict[str, Any] = {}


def _nas_index(hass: HomeAssistant, mappa: str) -> dict[tuple[str, str], str]:
    """(előadó, cím) → media-source azonosító a zenemappából (a mappalistával együtt frissül)."""
    l = nas_lista(hass, mappa)
    tarolt = _index_tar.get(mappa)
    if tarolt and tarolt[0] == id(l):
        return tarolt[1]
    idx: dict[tuple[str, str], str] = {}
    for album, fajlok in l["albumok"].items():
        resz = album.split("/")
        # az előadó bármelyik mappaszint lehet (Előadó/Album, Előadó/Album/CD 2, Gyűjtő/Előadó/Album)
        for eloado in {norm(x) for x in resz[:-1] if x} or {norm(resz[0])}:
            alb = ma._lecsupal(resz[-1], eloado)  # noqa: SLF001
            for f in fajlok:
                cim = ma._lecsupal(f.rpartition("/")[2], eloado, alb)  # noqa: SLF001
                if cim and ((eloado, cim) not in idx or ("live" in idx[(eloado, cim)].lower() and "live" not in album.lower())):
                    idx[(eloado, cim)] = f"{mappa}/{f}"        # a stúdióváltozat előbb, mint a koncertfelvétel
    _index_tar[mappa] = (id(l), idx)
    return idx


def _nas_keres(idx: dict[tuple[str, str], str], eloado: str, cim: str) -> str | None:
    e, c = norm(eloado), tiszta(cim)
    if not e or not c:
        return None
    for el in (e, e[4:] if e.startswith("the ") else f"the {e}"):     # „The Sweet” ↔ „Sweet”
        if hit := idx.get((el, c)):
            return hit
    return None


async def _dz_szamok(hass: HomeAssistant, elemek: list[str]) -> list[dict[str, Any]]:
    """Deezer-linkek / -azonosítók számokra bontva: {dz, cim, eloado, album}."""
    ki: list[dict[str, Any]] = []
    for x in elemek:
        x = str(x)
        if m := DZ_LINK.search(x):
            fajta, did = m.group(1).lower(), m.group(2)
        elif m := DZ_SONOS.search(x):
            fajta, did = "track", m.group(1)
        elif x.isdigit():
            fajta, did = "track", x
        else:
            ki.append({})
            continue
        try:
            if fajta == "track":
                d = await deezer(hass, f"/track/{did}")
                ki.append({"dz": did, "cim": d.get("title"), "eloado": (d.get("artist") or {}).get("name"), "album": (d.get("album") or {}).get("title")})
            else:
                fej = await deezer(hass, f"/{fajta}/{did}") if fajta == "album" else {}
                d = await deezer(hass, f"/{fajta}/{did}/tracks?limit={SZAM_MAX}")
                for t in d.get("data") or []:
                    ki.append({"dz": str(t.get("id")), "cim": t.get("title"), "eloado": (t.get("artist") or {}).get("name"),
                               "album": fej.get("title") or (t.get("album") or {}).get("title")})
        except HibaUzenet:
            ki.append({})
        except Exception:  # noqa: BLE001 – a Deezer most nem érhető el
            _LOGGER.debug("Cantabile: Deezer-adat nem jött (%s)", x, exc_info=True)
            ki.append({})
        if len(ki) >= SZAM_MAX:
            break
    return ki


async def _ma_deezer_peldany(hass: HomeAssistant, minta: dict[str, Any]) -> str | None:
    """Az MA-ban bekötött Deezer azonosítója (pl. deezer--GFiGB9Sm) – egy keresésből, utána megjegyezve."""
    if (t := _ma_dz.get("p")) and time.monotonic() - t[0] < 3600:
        return t[1]
    e = ma.bejegyzes(hass)
    if e is None or not minta.get("cim"):
        return None
    try:
        v = await asyncio.wait_for(ma._hiv(hass, "search", {"config_entry_id": e.entry_id, "name": minta["cim"],  # noqa: SLF001
                                                              "media_type": ["track"], "limit": 25}), 10)
    except (HomeAssistantError, TimeoutError):
        return None
    for x in (v or {}).get("tracks") or []:
        if m := MA_DZ.match(str(x.get("uri") or "")):
            _ma_dz["p"] = (time.monotonic(), m.group(1))
            return m.group(1)
    return None


def _sonos(hass: HomeAssistant, entity_id: str) -> bool:
    r = er.async_get(hass).async_get(entity_id)
    return bool(r and r.platform == "sonos")


async def helyettesit(hass: HomeAssistant, entity_id: str, ma_entity: str | None, mappa: str | None,
                      dz: list[str], mae: list[dict[str, Any]]) -> dict[str, Any]:
    szamok = await _dz_szamok(hass, dz) if dz else []
    for x in mae:
        uri = str(x.get("uri") or "")
        m = MA_DZ.match(uri)
        szamok.append({"ma": uri, "dz": m.group(2) if m else None, "cim": x.get("cim"), "eloado": x.get("eloado"), "album": x.get("album")})
    idx: dict[tuple[str, str], str] = {}
    if mappa and mappa.startswith(ELOTAG):
        try:
            idx = await hass.async_add_executor_job(_nas_index, hass, mappa.rstrip("/"))
        except HibaUzenet:
            idx = {}

    def nas(x: dict[str, Any]) -> str | None:
        return _nas_keres(idx, x.get("eloado") or "", x.get("cim") or "") if idx and x else None

    sonos = _sonos(hass, entity_id)
    elemek: list[str | None]
    if sonos:
        # Sonos: a Sonos saját Deezere (linkként), ha a szám Deezeres; különben a zenemappa
        mod = "sonos"
        elemek = [f"https://www.deezer.com/track/{x['dz']}" if x.get("dz") else nas(x) for x in szamok]
    elif ma_entity:
        # a gomb mögötti MA-lejátszó: MA-azonosító; Deezer-számnál az MA-ban bekötött Deezer
        mod = "ma"
        minta = next((x for x in szamok if x.get("dz") and not x.get("ma")), None)
        pl = await _ma_deezer_peldany(hass, minta) if minta else None
        elemek = [x.get("ma") or (f"{pl}://track/{x['dz']}" if pl and x.get("dz") else None) for x in szamok]
        if not any(elemek):                      # az MA-ban nincs Deezer: a zenemappa (a saját lejátszón)
            mod, elemek = "nas", [nas(x) for x in szamok]
    else:
        mod, elemek = "nas", [nas(x) for x in szamok]
    talalt = sum(1 for x in elemek if x)
    return {"mod": mod if talalt else None, "elemek": elemek, "talalt": talalt, "osszes": len(szamok)}


def regisztral(hass: HomeAssistant) -> None:
    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/substitute",
        vol.Required("entity_id"): str,
        vol.Optional("ma_entity"): vol.Any(None, str),
        vol.Optional("mappa"): vol.Any(None, str),
        vol.Optional("deezer", default=[]): vol.All([str], vol.Length(max=SZAM_MAX)),
        vol.Optional("ma", default=[]): vol.All([{vol.Required("uri"): str, vol.Optional("cim"): vol.Any(None, str),
                                                   vol.Optional("eloado"): vol.Any(None, str), vol.Optional("album"): vol.Any(None, str)}],
                                                 vol.Length(max=SZAM_MAX)),
    })
    @websocket_api.async_response
    async def ws_substitute(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        conn.send_result(msg["id"], await helyettesit(hass, msg["entity_id"], msg.get("ma_entity"), msg.get("mappa"),
                                                      msg["deezer"], msg["ma"]))

    websocket_api.async_register_command(hass, ws_substitute)
