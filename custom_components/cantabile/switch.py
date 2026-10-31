"""A Cantabile TV-oldal futó dalszövege be / ki (tv_kinezet.py)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import tv_kinezet
from .const import UID_TV_LYRICS
from .entity import CantabileEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([TvDalszoveg(entry)])


class TvDalszoveg(CantabileEntity, SwitchEntity, tv_kinezet.KinezetKoveto):
    _attr_translation_key = "tv_lyrics"
    _attr_icon = "mdi:script-text-play"

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, UID_TV_LYRICS)
        self._attr_is_on = None

    async def async_added_to_hass(self) -> None:
        @callback
        def frissit(most: tuple[str, bool] | None) -> None:
            self._attr_available = most is not None
            self._attr_is_on = most[1] if most else None
            self.async_write_ha_state()

        self.async_on_remove(self._kovet(self.hass, frissit))

    async def async_turn_on(self, **kwargs: Any) -> None:
        await tv_kinezet.ir(self.hass, lyrics=True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await tv_kinezet.ir(self.hass, lyrics=False)
