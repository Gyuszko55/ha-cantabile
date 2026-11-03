"""A kártya döntéseinek naplója (2.7.0b11): hangszóróváltás, út, tartalék, hiba – visszakereshető.

A kártya `cantabile/log` paranccsal küldi (esemény, szint, adat); a szerver az utolsó NAPLO_HOSSZ bejegyzést memóriában
tartja (`cantabile/log/get`), a figyelmeztetéseket és hibákat a HA naplójába is beírja. Így egy „visszadobta, de nem
írt semmit” eset utólag is kideríthető, akkor is, ha a böngésző konzolja nem látható (tablet, telefon)."""
from __future__ import annotations

import logging
from collections import deque
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import DOMAIN

_LOGGER = logging.getLogger(f"{__package__}.kartya")
NAPLO_HOSSZ = 300
SZINTEK = ("info", "warning", "error")


def _naplo(hass: HomeAssistant) -> deque[dict[str, Any]]:
    return hass.data[DOMAIN].setdefault("naplo", deque(maxlen=NAPLO_HOSSZ))


@callback
def ir(hass: HomeAssistant, esemeny: str, szint: str = "info", adat: dict[str, Any] | None = None, eszkoz: str | None = None) -> None:
    sor = {"ido": dt_util.now().isoformat(timespec="seconds"), "esemeny": esemeny, "szint": szint, "eszkoz": eszkoz, "adat": adat or {}}
    _naplo(hass).append(sor)
    szoveg = f"Cantabile kártya ({eszkoz or '?'}): {esemeny} {adat or ''}"
    if szint == "error":
        _LOGGER.error(szoveg)
    elif szint == "warning":
        _LOGGER.warning(szoveg)
    else:
        _LOGGER.info(szoveg)


@callback
def regisztral(hass: HomeAssistant) -> None:
    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/log", vol.Required("event"): vol.All(str, vol.Length(max=200)),
        vol.Optional("level", default="info"): vol.In(SZINTEK), vol.Optional("data"): dict,
        vol.Optional("device"): vol.All(str, vol.Length(max=60)),
    })
    @callback
    def ws_log(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        adat = {k: (v if isinstance(v, (int, float, bool)) or v is None else str(v)[:300]) for k, v in (msg.get("data") or {}).items()}
        ir(hass, msg["event"], msg["level"], adat, msg.get("device"))
        conn.send_result(msg["id"])

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/log/get", vol.Optional("limit", default=100): vol.All(int, vol.Range(min=1, max=NAPLO_HOSSZ))})
    @callback
    def ws_log_get(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        conn.send_result(msg["id"], {"naplo": list(_naplo(hass))[-msg["limit"]:]})

    websocket_api.async_register_command(hass, ws_log)
    websocket_api.async_register_command(hass, ws_log_get)
