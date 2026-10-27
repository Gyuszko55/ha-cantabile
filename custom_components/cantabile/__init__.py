"""Cantabile: 70-es évekbeli rádió és kazettás magnó a Home Assistant vezérlőpultjára.

Az integráció hozza a `custom:cantabile-card` kártyát (és az írott márkanév betűkészletét), és mindazt, ami a
kártyához a szerveren kell:
  - `cantabile/signal`: a valódi zenei jel szintje a VU-mérőkhöz (ffmpeg), `cantabile/nas_list`: a zenemappa
    listája a keresőhöz, `cantabile/deezer`: a Deezer nyilvános API-ja, `cantabile/info`: az entitások nevei;
  - ismétlésszám (number), alvásidőzítő és NET-adó (sensor) – a kártyák között közös állapot;
  - szolgáltatások: `cantabile.play` (zene / rádió név alapján), `cantabile.play_tracks` és `cantabile.stop_tracks`
    (sorozatlejátszás a sor nélküli lejátszókon), `cantabile.sleep_timer`;
  - „Cantabile” LLM API: az Assist (bármelyik LLM-es ügynök) ezzel indít zenét.
"""

from __future__ import annotations

import logging
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

from . import library, llm, music, vu
from .const import CARD_URL, CONF_LLM_API, DOMAIN, STATIC_URL, UID_NET, UID_ROUNDS, UID_SLEEP, VERSION
from .runtime import Cantabile

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.NUMBER, Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type CantabileConfigEntry = ConfigEntry[Cantabile]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """A kártya kiszolgálása és a websocket-parancsok (ezek az integráció beállításától függetlenek)."""
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(Path(__file__).parent / "www"), cache_headers=False)]
    )
    add_extra_js_url(hass, f"{CARD_URL}?v={VERSION}")
    library.regisztral(hass)
    vu.regisztral(hass)

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
        connection.send_result(msg["id"], {"version": VERSION, "configured": bool(entries), "entities": ent})

    websocket_api.async_register_command(hass, ws_info)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: CantabileConfigEntry) -> bool:
    rt = Cantabile(hass)
    entry.runtime_data = rt
    rt.start()
    zene = music.regisztral(hass, rt)

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
        for s in ("play", "play_tracks", "stop_tracks", "sleep_timer"):
            hass.services.async_remove(DOMAIN, s)
    return ok
