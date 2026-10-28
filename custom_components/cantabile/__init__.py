"""Cantabile: régi hi-fi rádió és kazettás magnó a Home Assistant vezérlőpultjára.

Az integráció hozza a `custom:cantabile-card` kártyát (és az írott márkanév betűkészletét), és mindazt, ami a
kártyához a szerveren kell:
  - `cantabile/signal`: a valódi zenei jel szintje a VU-mérőkhöz (ffmpeg), `cantabile/nas_list`: a zenemappa
    listája a keresőhöz, `cantabile/deezer`: a Deezer nyilvános API-ja, `cantabile/lyrics`: dalszöveg (LRCLIB),
    `cantabile/info`: az entitások nevei;
  - ismétlésszám (number), alvásidőzítő és NET-adó (sensor) – a kártyák között közös állapot;
  - szolgáltatások: `cantabile.play` (zene / rádió név alapján), `cantabile.play_tracks` és `cantabile.stop_tracks`
    (sorozatlejátszás a sor nélküli lejátszókon), `cantabile.sleep_timer`;
  - „Cantabile” LLM API: az Assist (bármelyik LLM-es ügynök) ezzel indít zenét;
  - HA-újraindítás után a szóló Sonos zenemappás sorának cseréje friss linkekre a szám végén (sonossor.py),
    sor-átrendezés (`cantabile.move_queue_item`, `cantabile.set_order`), halkítás bemondáskor (halkitas.py),
    hézagmentes WiiM-lejátszás (hezagmentes.py), rádióadó-továbbító a BT kimenethez (tovabbito.py), saját zene
    átmeneti feltöltése más hangszórókhoz (atmeneti.py).
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.typing import ConfigType

from . import atmeneti, halkitas, library, llm, lyrics, music, sonossor, streaming, tovabbito, tv, vu
from .const import (
    CARD_URL, CONF_DUCK_LEVEL, CONF_DUCK_SOURCES, CONF_LLM_API, DOMAIN, DUCK_LEVEL_DEFAULT, STATIC_URL, UID_NET, UID_ROUNDS,
    UID_SLEEP, VERSION,
)
from .runtime import Cantabile

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.MEDIA_PLAYER, Platform.NUMBER, Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type CantabileConfigEntry = ConfigEntry[Cantabile]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """A kártya kiszolgálása és a websocket-parancsok (ezek az integráció beállításától függetlenek)."""
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(Path(__file__).parent / "www"), cache_headers=False)]
    )
    indult = time.time()      # a NAS-számok aláírt linkjei ennél régebbiek érvénytelenek (új kulcs induláskor)
    hass.data[DOMAIN] = {"indult": indult}
    library.regisztral(hass)
    lyrics.regisztral(hass)
    hass.http.register_view(tovabbito.Tovabbito(hass))
    music.figyel(hass)
    atmeneti.regisztral(hass)
    streaming.regisztral(hass)
    vu.regisztral(hass)
    tv.regisztral(hass)

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/info"})
    @callback
    def ws_info(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        reg = er.async_get(hass)
        entries = hass.config_entries.async_loaded_entries(DOMAIN)
        ent = {}
        if entries:
            eid = entries[0].entry_id
            for kulcs, uid, platform in (("rounds", UID_ROUNDS, "number"), ("sleep", UID_SLEEP, "sensor"), ("net", UID_NET, "sensor")):
                ent[kulcs] = reg.async_get_entity_id(platform, DOMAIN, f"{eid}_{uid}")
        # a Cantabile TV-lejátszók és a TV saját lejátszója (a kártya ezeket rejti a választóban, figyelmeztet rájuk)
        tvk = {lj.entity_id: lj.cast for lj in tv.kozpont(hass).lejatszok.values()} if "tv" in hass.data.get(DOMAIN, {}) else {}
        connection.send_result(msg["id"], {"version": VERSION, "configured": bool(entries), "entities": ent, "started": indult,
                                              "streaming": streaming.allapot(hass), "tv": tvk})

    websocket_api.async_register_command(hass, ws_info)

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/tracks", vol.Required("entity_id"): str})
    @callback
    def ws_tracks(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        """A sor nélküli lejátszón (WiiM) futó sorozat számai és a szóló szám helye – a kimenetváltáshoz."""
        entries = hass.config_entries.async_loaded_entries(DOMAIN)
        info = entries[0].runtime_data.tracks_info(msg["entity_id"]) if entries else None
        connection.send_result(msg["id"], info or {"tracks": None, "current": -1})

    websocket_api.async_register_command(hass, ws_tracks)

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/sonos_position", vol.Required("entity_id"): str})
    @websocket_api.async_response
    async def ws_sonos_pozicio(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        """A Sonos szóló számának helye és pozíciója (kimenetváltáskor innen folytatja a kazettát)."""
        try:
            connection.send_result(msg["id"], await sonossor.pozicio(hass, msg["entity_id"]))
        except Exception as err:  # noqa: BLE001
            connection.send_error(msg["id"], "nem_elerheto", str(err))

    websocket_api.async_register_command(hass, ws_sonos_pozicio)
    return True


async def _kartya_bejegyzes(hass: HomeAssistant) -> None:
    """A kártya Lovelace-erőforrásként (tárolós módban), verziószámmal – így a frissítés után a böngésző újratölti.

    A korai beinjektálás (add_extra_js_url) a szekciós nézetekben nem elég: ott a vezérlőpult a modul előtt rajzol, és
    a hibakártyát nem építi újra. YAML-módú erőforrásoknál marad a beinjektálás (és a README kéri a kézi bejegyzést).
    """
    url = f"{CARD_URL}?v={VERSION}"
    ll = hass.data.get("lovelace")
    res = getattr(ll, "resources", None)
    if res is None or getattr(ll, "resource_mode", "storage") != "storage" or not hasattr(res, "async_create_item"):
        if not hass.data[DOMAIN].get("js_be"):        # újratöltéskor ne kerüljön be még egyszer
            add_extra_js_url(hass, url)
            hass.data[DOMAIN]["js_be"] = True
        return
    await res.async_get_info()          # betölti a tárat
    for elem in res.async_items():
        if str(elem.get("url", "")).split("?")[0] == CARD_URL:
            if elem["url"] != url:
                await res.async_update_item(elem["id"], {"res_type": "module", "url": url})
            return
    await res.async_create_item({"res_type": "module", "url": url})


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Az integráció törlésekor a kártya Lovelace-erőforrása is kikerül (a tárolós módban felvett bejegyzés)."""
    res = getattr(hass.data.get("lovelace"), "resources", None)
    if res is None or not hasattr(res, "async_delete_item"):
        return
    await res.async_get_info()
    for elem in list(res.async_items()):
        if str(elem.get("url", "")).split("?")[0] == CARD_URL:
            await res.async_delete_item(elem["id"])


async def async_setup_entry(hass: HomeAssistant, entry: CantabileConfigEntry) -> bool:
    await _kartya_bejegyzes(hass)
    rt = Cantabile(hass)
    entry.runtime_data = rt
    rt.start()
    zene = music.regisztral(hass, rt)
    entry.async_on_unload(zene.stop)

    async def play_tracks(call: ServiceCall) -> None:
        for e in call.data["entity_id"]:
            rt.play_tracks(e, call.data["tracks"], call.data["start"])

    async def stop_tracks(call: ServiceCall) -> None:
        for e in call.data.get("entity_id") or [None]:
            rt.stop_tracks(e)

    async def sleep_timer(call: ServiceCall) -> None:
        for e in call.data["entity_id"]:
            await rt.set_sleep(e, call.data["minutes"])

    hass.services.async_register(
        DOMAIN, "play_tracks", play_tracks,
        schema=vol.Schema({vol.Required("entity_id"): cv.entity_ids, vol.Required("tracks"): [cv.string],
                           vol.Optional("start", default=0): vol.Coerce(int)}),
    )
    hass.services.async_register(DOMAIN, "stop_tracks", stop_tracks, schema=vol.Schema({vol.Optional("entity_id"): cv.entity_ids}))
    hass.services.async_register(
        DOMAIN, "sleep_timer", sleep_timer,
        schema=vol.Schema({vol.Required("entity_id"): cv.entity_ids, vol.Required("minutes"): vol.All(vol.Coerce(float), vol.Range(min=0, max=720))}),
    )
    async def move_queue_item(call: ServiceCall) -> None:
        await sonossor.athelyez(hass, call.data["entity_id"], call.data["from"], call.data["to"])

    async def set_order(call: ServiceCall) -> None:
        rt.set_order(call.data["entity_id"], call.data["tracks"])

    async def add_tracks(call: ServiceCall) -> None:
        rt.add_tracks(call.data["entity_id"], call.data["tracks"])

    hass.services.async_register(
        DOMAIN, "move_queue_item", move_queue_item,
        schema=vol.Schema({vol.Required("entity_id"): cv.entity_id, vol.Required("from"): vol.Coerce(int), vol.Required("to"): vol.Coerce(int)}),
    )
    hass.services.async_register(
        DOMAIN, "add_tracks", add_tracks,
        schema=vol.Schema({vol.Required("entity_id"): cv.entity_id, vol.Required("tracks"): [cv.string]}),
    )
    hass.services.async_register(
        DOMAIN, "set_order", set_order,
        schema=vol.Schema({vol.Required("entity_id"): cv.entity_id, vol.Required("tracks"): [cv.string]}),
    )
    folytato = sonossor.Folytato(hass, hass.data[DOMAIN]["indult"])
    folytato.start()
    entry.async_on_unload(folytato.stop)
    halkito = halkitas.Halkito(hass, entry.options.get(CONF_DUCK_SOURCES, []), entry.options.get(CONF_DUCK_LEVEL, DUCK_LEVEL_DEFAULT) / 100)
    halkito.start()
    entry.async_on_unload(halkito.stop)
    if entry.options.get(CONF_LLM_API, True):
        entry.async_on_unload(llm.regisztral(hass, zene))
    entry.async_on_unload(entry.add_update_listener(_ujratolt))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def _ujratolt(hass: HomeAssistant, entry: CantabileConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: CantabileConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        entry.runtime_data.stop()
        for s in ("play", "play_tracks", "stop_tracks", "sleep_timer", "move_queue_item", "set_order", "add_tracks"):
            hass.services.async_remove(DOMAIN, s)
    return ok
