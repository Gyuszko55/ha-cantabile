"""Alvásidőzítő (a lejátszók leállási ideje) és a hanggal indított NET-adó – a kártyák ezekből olvasnak."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .const import SIGNAL_NET, SIGNAL_SLEEP, UID_NET, UID_SLEEP
from .entity import CantabileEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([Alvasidozito(entry), NetAdo(entry)])


class Alvasidozito(CantabileEntity, RestoreEntity, SensorEntity):
    """Állapot: hány lejátszón fut időzítő; `timers` attribútum: lejátszó → leállás ideje (ISO)."""

    _attr_translation_key = "sleep_timer"
    _attr_icon = "mdi:sleep"

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, UID_SLEEP)

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if (regi := await self.async_get_last_state()) and isinstance(regi.attributes.get("timers"), dict):
            self.rt.restore_sleep(regi.attributes["timers"])
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_SLEEP, self._frissul))

    @callback
    def _frissul(self) -> None:
        self.async_write_ha_state()

    @property
    def native_value(self) -> int:
        return len(self.rt.sleep)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"timers": dict(self.rt.sleep)}


class NetAdo(CantabileEntity, RestoreEntity, SensorEntity):
    """A hanggal (cantabile.play / Assist) indított internetes rádióadó: név + url, ikon, ország, kodek, kbps, alias."""

    _attr_translation_key = "net_station"
    _attr_icon = "mdi:radio"

    def __init__(self, entry: ConfigEntry) -> None:
        super().__init__(entry, UID_NET)

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if (regi := await self.async_get_last_state()) and regi.attributes.get("url") and self.rt.net is None:
            self.rt.net = {k: regi.attributes.get(k) for k in ("nev", "url", "ikon", "orszag", "kodek", "kbps", "alias", "ido")}
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_NET, self._frissul))

    @callback
    def _frissul(self) -> None:
        self.async_write_ha_state()

    @property
    def native_value(self) -> str | None:
        return (self.rt.net or {}).get("nev")

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return dict(self.rt.net or {})
