"""Cantabile TV-lejátszók: a beállításokban kiválasztott Cast-eszközönként egy `media_player` (lásd tv.py)."""

from __future__ import annotations

import asyncio
import time
from typing import Any

from homeassistant.components import websocket_api
from homeassistant.components.media_player import (
    MediaPlayerEntity, MediaPlayerEntityFeature, MediaPlayerState, MediaType,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from .const import CONF_TV_PLAYERS
from .entity import CantabileEntity
from .tv import TV_DASHBOARD, TV_VIEW, kozpont

TAMOGATOTT = (
    MediaPlayerEntityFeature.PLAY_MEDIA | MediaPlayerEntityFeature.PLAY | MediaPlayerEntityFeature.PAUSE
    | MediaPlayerEntityFeature.STOP | MediaPlayerEntityFeature.SEEK | MediaPlayerEntityFeature.VOLUME_SET
    | MediaPlayerEntityFeature.VOLUME_STEP | MediaPlayerEntityFeature.VOLUME_MUTE | MediaPlayerEntityFeature.TURN_OFF
)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities(CantabileTv(hass, entry, cast) for cast in entry.options.get(CONF_TV_PLAYERS, []))


class CantabileTv(CantabileEntity, MediaPlayerEntity):
    _attr_supported_features = TAMOGATOTT
    _attr_media_content_type = MediaType.MUSIC
    _attr_icon = "mdi:television-play"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, cast: str) -> None:
        super().__init__(entry, f"tv_{cast.split('.', 1)[-1]}")
        self.cast = cast
        st = hass.states.get(cast)
        nev = str(st.attributes.get("friendly_name") if st else cast.split(".", 1)[-1]).replace("(Cast)", "").strip()
        self._attr_name = f"TV · {nev}"
        self.dashboard, self.view = TV_DASHBOARD, TV_VIEW
        self.oldal: tuple[websocket_api.ActiveConnection, int] | None = None
        self.oldal_jott = asyncio.Event()
        self._allapot = MediaPlayerState.OFF
        self._meta: dict[str, Any] = {}
        self._mcid: str | None = None
        self._src: str | None = None
        self._poz: float | None = None
        self._hossz: float | None = None
        self._poz_ido = None

    async def async_added_to_hass(self) -> None:
        kozpont(self.hass).lejatszok[self.entity_id] = self
        self.async_on_remove(async_track_state_change_event(self.hass, [self.cast], self._cast_valtozott))

    async def async_will_remove_from_hass(self) -> None:
        kozpont(self.hass).lejatszok.pop(self.entity_id, None)

    @callback
    def _cast_valtozott(self, _ev: Event) -> None:
        self.async_write_ha_state()             # hangerő, elérhetőség

    # ---- a TV-oldal kapcsolata ----
    @callback
    def oldal_be(self, conn: websocket_api.ActiveConnection, msg_id: int) -> None:
        self.oldal = (conn, msg_id)
        self.oldal_jott.set()
        if self._allapot == MediaPlayerState.OFF:
            self._allapot = MediaPlayerState.IDLE
        self.async_write_ha_state()

    @callback
    def oldal_ki(self, conn: websocket_api.ActiveConnection, msg_id: int) -> None:
        if self.oldal == (conn, msg_id):
            self.oldal = None
            self.oldal_jott.clear()
            self._allapot = MediaPlayerState.OFF
            self._poz = None
            self.async_write_ha_state()

    @callback
    def uzen(self, adat: dict[str, Any]) -> bool:
        if self.oldal is None:
            return False
        conn, msg_id = self.oldal
        conn.send_message(websocket_api.event_message(msg_id, adat))
        return True

    @callback
    def jelentes(self, msg: dict[str, Any]) -> None:
        if msg.get("src") and self._src and msg["src"] != self._src:
            return                              # egy előző szám késve érkező jelentése
        self._allapot = {"playing": MediaPlayerState.PLAYING, "paused": MediaPlayerState.PAUSED}.get(msg["state"], MediaPlayerState.IDLE)
        if msg.get("position") is not None:
            self._poz, self._poz_ido = msg["position"], dt_util.utcnow()
        if msg.get("duration"):
            self._hossz = msg["duration"]
        self.async_write_ha_state()

    # ---- állapot ----
    @property
    def available(self) -> bool:
        st = self.hass.states.get(self.cast)
        return st is not None and st.state != "unavailable"

    @property
    def state(self) -> MediaPlayerState:
        return self._allapot

    @property
    def volume_level(self) -> float | None:
        st = self.hass.states.get(self.cast)
        return st.attributes.get("volume_level") if st else None

    @property
    def is_volume_muted(self) -> bool | None:
        st = self.hass.states.get(self.cast)
        return st.attributes.get("is_volume_muted") if st else None

    @property
    def media_content_id(self) -> str | None:
        return self._mcid

    @property
    def media_title(self) -> str | None:
        return self._meta.get("title") or self._meta.get("station")

    @property
    def media_artist(self) -> str | None:
        return self._meta.get("artist")

    @property
    def media_album_name(self) -> str | None:
        return self._meta.get("album")

    @property
    def media_duration(self) -> float | None:
        return self._hossz or self._meta.get("duration") or None

    @property
    def media_position(self) -> float | None:
        return self._poz

    @property
    def media_position_updated_at(self):  # noqa: ANN201
        return self._poz_ido

    @property
    def media_image_url(self) -> str | None:
        kep = self._meta.get("cover") or self._meta.get("artist_image")
        if kep and kep.startswith("/"):
            return None                         # a saját (aláírt) borító a HA proxyján nem kell
        return kep

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"cast_entity": self.cast, "tv_page": self.oldal is not None}

    # ---- vezérlés ----
    async def async_play_media(self, media_type: str, media_id: str, **kwargs: Any) -> None:
        kp = kozpont(self.hass)
        cim = await kp.feloldas(media_id, self.entity_id)
        src, fajl = kp.forras(cim)
        extra = kwargs.get("extra") or {}
        meta = await kp.adatok(cim, fajl, extra.get("metadata") or extra)
        await kp.oldalt_kuld(self)
        self._mcid, self._src, self._meta = media_id, src, meta
        self._hossz, self._poz, self._poz_ido = meta.get("duration") or None, 0.0, dt_util.utcnow()
        self._allapot = MediaPlayerState.PLAYING     # az oldal jelentése felülírja (pl. hiba → idle)
        self.uzen({"cmd": "play", "src": src, "meta": meta, "t": time.time()})
        self.async_write_ha_state()

    async def async_media_pause(self) -> None:
        self.uzen({"cmd": "pause"})

    async def async_media_play(self) -> None:
        self.uzen({"cmd": "resume"})

    async def async_media_stop(self) -> None:
        self.uzen({"cmd": "stop"})

    async def async_media_seek(self, position: float) -> None:
        self.uzen({"cmd": "seek", "position": position})

    async def async_set_volume_level(self, volume: float) -> None:
        await self.hass.services.async_call("media_player", "volume_set", {"entity_id": self.cast, "volume_level": volume}, blocking=True)

    async def async_mute_volume(self, mute: bool) -> None:
        await self.hass.services.async_call("media_player", "volume_mute", {"entity_id": self.cast, "is_volume_muted": mute}, blocking=True)

    async def async_turn_off(self) -> None:
        self.uzen({"cmd": "stop"})
        await self.hass.services.async_call("media_player", "turn_off", {"entity_id": self.cast}, blocking=True)
