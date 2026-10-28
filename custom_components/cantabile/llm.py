"""Assist-eszköz: „Cantabile” LLM API egyetlen eszközzel (zene / rádió indítása név alapján).

Bármelyik LLM-es beszélgetőügynök (Google Gemini, OpenAI, Anthropic, Ollama…) beállításaiban az „Assist” mellé
bekapcsolható. Az eszköz a `cantabile.play` szolgáltatás motorját hívja, és szerkezetes választ ad (mi szól, hol);
a mondatot az ügynök fogalmazza meg a felhasználó nyelvén. A hangszórók nevét a Cantabile kártyából veszi.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant
from homeassistant.helpers import llm

from .const import DOMAIN, LLM_API_ID
from .music import KIND, SOURCE, HibaUzenet, Zene, kartya

LEIRAS = (
    "Start music or radio on the home speakers through the Cantabile player: an artist, album or track from the local "
    "music folder or from Deezer, a radio station (presets or the worldwide Radio Browser directory), or a saved "
    "playlist. Always use this tool to start music or radio. Pause, stop, volume and next track are handled by the "
    "normal media player controls, not by this tool."
)


class Lejatszas(llm.Tool):
    name = "cantabile_play"
    description = LEIRAS
    integration = DOMAIN
    parameters = vol.Schema(
        {
            vol.Required("query", description="What to play, as the user said it (artist, album, track, station or playlist name)."): str,
            vol.Optional("kind", description="artist, album, track, radio, playlist, or auto when unclear."): vol.In(list(KIND)),
            vol.Optional("artist", description="The artist, when an album or track was requested and the artist was named."): str,
            vol.Optional("speaker", description="Speaker name, or 'all' for every Sonos speaker together. Leave empty if not said."): str,
            vol.Optional("shuffle", description="True if the user asked for shuffled / random order."): bool,
            vol.Optional("source", description="deezer, spotify or tidal if the user asked for that service, local for their own music, otherwise auto."): vol.In(list(SOURCE)),
        }
    )

    def __init__(self, zene: Zene) -> None:
        self._zene = zene

    async def async_call(self, hass: HomeAssistant, tool_input: llm.ToolInput, llm_context: llm.LLMContext) -> llm.ToolResult:
        valasz = await self._zene.play(dict(tool_input.tool_args))
        # a ToolResult a HA 2025 végén jelent meg; régebbi HA-n az eszköz egyszerű választ ad vissza
        if hasattr(llm, "ToolResult"):
            return llm.ToolResult(data=valasz, error=not valasz.get("success"))
        return valasz


class CantabileAPI(llm.API):
    def __init__(self, hass: HomeAssistant, zene: Zene) -> None:
        super().__init__(hass=hass, id=LLM_API_ID, name="Cantabile")
        self._zene = zene

    async def async_get_api_instance(self, llm_context: llm.LLMContext) -> llm.APIInstance:
        nevek = ""
        try:
            c = await kartya(self.hass)
            nevek = ", ".join(h.get("nev", h.get("entity", "")) for h in c.get("hangszorok", []))
        except HibaUzenet:
            pass
        prompt = (
            # a tool neve: önállóan cantabile_play, több API mellett cantabile__cantabile_play – a rövid névre
            # a modell néha maga talál ki előtagot (cantabile:cantabile_play), és azt a HA nem ismeri fel
            "When the user wants music or radio, call the play tool of this API, using its name exactly as listed. "
            "Source: 'spotify' or 'tidal' when they ask for that service (Sonos speakers only), 'deezer' for Deezer, "
            "'local' for their own music, otherwise leave it out. "
            + (f"Speakers: {nevek}; 'all' plays on every Sonos speaker together. " if nevek else "")
            + "After the tool runs, say briefly what is playing and where; if it failed, explain why and ask what they meant."
        )
        return llm.APIInstance(api=self, api_prompt=prompt, llm_context=llm_context, tools=[Lejatszas(self._zene)])


def regisztral(hass: HomeAssistant, zene: Zene) -> Callable[[], Any]:
    """Az LLM API bejegyzése; a visszaadott függvény kiveszi."""
    return llm.async_register_api(hass, CantabileAPI(hass, zene))
