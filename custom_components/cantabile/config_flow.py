"""Beállítás a felületen: egy megerősítő lépés; a lehetőségek között az Assist-eszköz és a bemondáskori halkítás."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import CONF_DUCK_LEVEL, CONF_DUCK_SOURCES, CONF_LLM_API, DOMAIN, DUCK_LEVEL_DEFAULT


class CantabileConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title="Cantabile", data={}, options={CONF_LLM_API: user_input[CONF_LLM_API]})
        return self.async_show_form(step_id="user", data_schema=vol.Schema({vol.Required(CONF_LLM_API, default=True): bool}))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return CantabileOptionsFlow()


class CantabileOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        o = self.config_entry.options
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Required(CONF_LLM_API, default=o.get(CONF_LLM_API, True)): bool,
                vol.Optional(CONF_DUCK_SOURCES, default=o.get(CONF_DUCK_SOURCES, [])): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain=["assist_satellite", "media_player"], multiple=True)
                ),
                vol.Required(CONF_DUCK_LEVEL, default=o.get(CONF_DUCK_LEVEL, DUCK_LEVEL_DEFAULT)): selector.NumberSelector(
                    selector.NumberSelectorConfig(min=0, max=100, step=5, unit_of_measurement="%", mode=selector.NumberSelectorMode.SLIDER)
                ),
            }),
        )
