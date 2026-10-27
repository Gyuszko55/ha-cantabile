"""A Cantabile entitások közös alapja (egy „Cantabile” szolgáltatás-eszköz alatt)."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity import Entity

from .const import DOMAIN, VERSION
from .runtime import Cantabile


class CantabileEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, entry: ConfigEntry, uid: str) -> None:
        self.rt: Cantabile = entry.runtime_data
        self._attr_unique_id = f"{entry.entry_id}_{uid}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)}, name="Cantabile", manufacturer="Cantabile",
            model="Radio & cassette deck", sw_version=VERSION, entry_type=DeviceEntryType.SERVICE,
        )
