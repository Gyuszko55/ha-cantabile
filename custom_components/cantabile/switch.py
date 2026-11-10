"""A Cantabile TV-oldal futó dalszövege be / ki (tv_kinezet.py)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import tv_kinezet
from .const import UID_TV_LYRICS
from .entity import CantabileEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([TvDalszoveg(entry)])


class TvDalszoveg(CantabileEntity, SwitchEntity):
    _attr_translation_key = "tv_lyrics"
    _attr_icon = "mdi:script-text-play"
    _attr_extra_state_attributes: dict[str, Any] = {tv_kinezet.ATTR: "lyrics"}

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, UID_TV_LYRICS)
        self._tar: tv_kinezet.TvKinezet = self.rt.tv_kinezet

    @property
    def is_on(self) -> bool:
        return self._tar.lyrics

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._tar.figyel(self.async_write_ha_state))

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self._tar.beallit(lyrics=True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self._tar.beallit(lyrics=False)
