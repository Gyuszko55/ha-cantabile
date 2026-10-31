"""A Cantabile TV-oldal kinézete: bakelit / sávok / hullám / sávok és hullám (tv_kinezet.py)."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import tv_kinezet
from .const import UID_TV_VISUAL
from .entity import CantabileEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([TvKinezet(entry)])


class TvKinezet(CantabileEntity, SelectEntity, tv_kinezet.KinezetKoveto):
    _attr_translation_key = "tv_visual"
    _attr_icon = "mdi:television-shimmer"
    _attr_options = tv_kinezet.KINEZETEK

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, UID_TV_VISUAL)
        self._attr_current_option = None

    async def async_added_to_hass(self) -> None:
        @callback
        def frissit(most: tuple[str, bool] | None) -> None:
            self._attr_available = most is not None
            self._attr_current_option = most[0] if most else None
            self.async_write_ha_state()

        self.async_on_remove(self._kovet(self.hass, frissit))

    async def async_select_option(self, option: str) -> None:
        await tv_kinezet.ir(self.hass, visual=option)
