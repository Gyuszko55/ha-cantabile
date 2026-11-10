"""A Cantabile TV-oldal kinézete: borító / bakelit / sávok / hullám / sávok és hullám (tv_kinezet.py)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import tv_kinezet
from .const import UID_TV_VISUAL
from .entity import CantabileEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([TvKinezet(entry)])


class TvKinezet(CantabileEntity, SelectEntity):
    _attr_translation_key = "tv_visual"
    _attr_icon = "mdi:television-shimmer"
    _attr_options = tv_kinezet.KINEZETEK
    _attr_extra_state_attributes: dict[str, Any] = {tv_kinezet.ATTR: "visual"}

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, UID_TV_VISUAL)
        self._tar: tv_kinezet.TvKinezet = self.rt.tv_kinezet

    @property
    def current_option(self) -> str:
        return self._tar.visual

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._tar.figyel(self.async_write_ha_state))

    async def async_select_option(self, option: str) -> None:
        await self._tar.beallit(visual=option)
