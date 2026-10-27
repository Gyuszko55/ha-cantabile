"""Hézagmentes sorozatlejátszás WiiM-en és minden DLNA-renderelőn (UPnP).

A WiiM-nek nincs a HA felől elérhető lejátszási sora, ezért a kazetta számait mi adjuk egymás után. Ha ezt
play_media-val tennénk, minden szám után szünet lenne (a következőt csak a vége után kezdi letölteni). A WiiM viszont
DLNA-renderelőként ismeri a SetNextAVTransportURI műveletet: a szóló szám alatt megadjuk neki a következőt, ő előre
betölti, és szünet nélkül vált. Másodpercenként lekérdezzük, melyik szám szól; ha a következőre váltott, megadjuk az
azutánit. A szám címe a fájlnév – a kártya erről ismeri fel, hányadik szám szól.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Iterator
from typing import Any
from urllib.parse import unquote, urlsplit

from async_upnp_client.aiohttp import AiohttpSessionRequester
from async_upnp_client.client_factory import UpnpFactory
from async_upnp_client.profiles.dlna import DmrDevice, TransportState

from homeassistant.components import media_source
from homeassistant.components.media_player.browse_media import async_process_play_media_url
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession

_LOGGER = logging.getLogger(__name__)

UPNP_PORT = 49152
INDULASI_TURES = 20       # mp, amíg az első számnak el kell indulnia


DLNA_PLATFORMOK = ("wiim", "linkplay", "dlna_dmr")


def leiro_cim(hass: HomeAssistant, entity_id: str) -> str | None:
    """A lejátszó UPnP-leírójának címe: DLNA-integrációnál a tárolt cím, WiiM / LinkPlay (Arylic, Audio Pro…)
    eszköznél a gazdagép a beállításból vagy az eszköz-nyilvántartásból, a szokásos 49152-es porton."""
    ent = er.async_get(hass).async_get(entity_id)
    if not ent or ent.platform not in DLNA_PLATFORMOK:
        return None
    bej = hass.config_entries.async_get_entry(ent.config_entry_id) if ent.config_entry_id else None
    adat = dict(bej.data) if bej else {}
    if ent.platform == "dlna_dmr":
        return adat.get("url")
    host = adat.get("host")
    if not host and ent.device_id and (eszk := dr.async_get(hass).async_get(ent.device_id)):
        host = urlsplit(eszk.configuration_url or "").hostname
    return f"http://{host}:{UPNP_PORT}/description.xml" if host else None


async def wiim_renderelo(hass: HomeAssistant, entity_id: str) -> DmrDevice | None:
    """A lejátszó DLNA-renderelője (WiiM, LinkPlay, DLNA), ha a következő szám előre megadható; különben None."""
    cim = leiro_cim(hass, entity_id)
    if not cim:
        return None
    keres = AiohttpSessionRequester(async_get_clientsession(hass), with_sleep=True, timeout=10)
    eszkoz = await UpnpFactory(keres, non_strict=True).async_create_device(cim)
    dmr = DmrDevice(eszkoz, None)
    if not dmr.has_next_transport_uri:
        return None
    return dmr


def _ut(url: str | None) -> str:
    return unquote(urlsplit(url or "").path)


async def _link(hass: HomeAssistant, dmr: DmrDevice, entity_id: str, id_: str) -> tuple[str, str]:
    """Friss, aláírt, teljes URL és a DIDL-metaadat a számhoz."""
    pm = await media_source.async_resolve_media(hass, id_, entity_id)
    url = async_process_play_media_url(hass, pm.url)
    cim = unquote(id_.rsplit("/", 1)[-1])
    meta = await dmr.construct_play_media_metadata(url, cim, default_mime_type=pm.mime_type or "audio/mpeg",
                                                   default_upnp_class="object.item.audioItem.musicTrack")
    return url, meta


async def lejatszik(hass: HomeAssistant, dmr: DmrDevice, entity_id: str, sorrend: Iterator[str]) -> None:
    """A számok lejátszása egymás után, hézag nélkül. Visszatér, ha a sor véget ért, vagy más kezdett szólni."""
    most = next(sorrend, None)
    if most is None:
        return
    url, meta = await _link(hass, dmr, entity_id, most)
    await dmr.async_set_transport_uri(url, unquote(most.rsplit("/", 1)[-1]), meta)
    await dmr.async_play()
    most_ut = _ut(url)
    if hasattr(sorrend, "most"):
        sorrend.most = most
    kov = next(sorrend, None)
    kov_ut: str | None = None
    indult = False
    vart = 0.0
    while True:
        await asyncio.sleep(1)
        vart += 1
        await dmr.async_update(do_ping=False)
        allapot, szol = dmr.transport_state, _ut(dmr.current_track_uri)
        if allapot in (TransportState.PLAYING, TransportState.TRANSITIONING) and szol == most_ut:
            indult = True
        if not indult:
            if vart > INDULASI_TURES:
                _LOGGER.warning("Cantabile: a WiiM nem indította el a számot (%s)", entity_id)
                return
            if vart % 3 == 0 and allapot not in (TransportState.TRANSITIONING,):
                await dmr.async_play()      # a cím beállítása után túl korán érkező Play-t a WiiM elejtheti
            continue
        if kov is not None and kov_ut is None:
            k_url, k_meta = await _link(hass, dmr, entity_id, kov)
            await dmr.async_set_next_transport_uri(k_url, unquote(kov.rsplit("/", 1)[-1]), k_meta)
            kov_ut = _ut(k_url)
        if kov_ut and szol == kov_ut:
            # átváltott a következőre: az azutánit adjuk meg
            if hasattr(sorrend, "most"):
                sorrend.most = kov
            most_ut, kov, kov_ut = szol, next(sorrend, None), None
            continue
        if szol and szol not in (most_ut, kov_ut):
            return              # más szól a WiiM-en: a magnó leáll
        if allapot in (TransportState.STOPPED, TransportState.NO_MEDIA_PRESENT):
            return              # a sor végén megállt, vagy leállították
