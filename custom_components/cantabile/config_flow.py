"""Beállítás a felületen: egy megerősítő lépés; a lehetőségek között az Assist-eszköz kapcsolható."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback

from .const import CONF_LLM_API, DOMAIN


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
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({vol.Required(CONF_LLM_API, default=self.config_entry.options.get(CONF_LLM_API, True)): bool}),
        )
