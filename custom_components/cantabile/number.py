"""Ismétlésszám: a magnó REPEAT gombja 1 → 2 → 3 → 4 → 5 → ∞ (6) között lép; újraindítás után is megmarad."""

from __future__ import annotations

from homeassistant.components.number import NumberMode, RestoreNumber
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import ROUNDS_INFINITE, UID_ROUNDS
from .entity import CantabileEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([Ismetlesszam(entry)])


class Ismetlesszam(CantabileEntity, RestoreNumber):
    _attr_translation_key = "rounds"
    _attr_icon = "mdi:repeat"
    _attr_native_min_value = 1
    _attr_native_max_value = ROUNDS_INFINITE
    _attr_native_step = 1
    _attr_mode = NumberMode.BOX

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, UID_ROUNDS)
        self._attr_native_value = 1

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if (adat := await self.async_get_last_number_data()) and adat.native_value is not None:
            self._attr_native_value = int(adat.native_value)
        self.rt.set_rounds(int(self._attr_native_value))

    async def async_set_native_value(self, value: float) -> None:
        self._attr_native_value = int(max(1, min(ROUNDS_INFINITE, round(value))))
        self.rt.set_rounds(int(self._attr_native_value))
        self.async_write_ha_state()
