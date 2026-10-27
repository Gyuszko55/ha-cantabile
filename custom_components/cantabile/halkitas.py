"""Halkítás bemondáskor: amíg egy bemondó eszköz beszél, a szóló zene halkabban szól, utána visszaáll.

Bemondó eszköz (a beállításokban választható):
  - Assist-segédállomás (assist_satellite, pl. Voice PE): hallgat, gondolkodik vagy válaszol;
  - médialejátszó (pl. Nest Hub): szöveget mond (a lejátszott tartalom a TTS-ből jön).
A halkított lejátszók: minden szóló Sonos, WiiM és LinkPlay, valamint a Cantabile kártyán hangszóróként felvett minden
lejátszó, bármilyen platformon (Cast, DLNA, Music Assistant…) – a csoport minden tagja külön, mert a hangerő
hangszórónkénti. A
hangerőt rövid áttűnéssel a beállított arányra viszi, a bemondás után 1,5 mp-cel visszaállítja – kivéve, ha közben
valaki kézzel állított rajta. Biztonsági korlát: 2 perc után mindenképp visszaállít.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from homeassistant.core import Event, HomeAssistant, State, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later, async_track_state_change_event

_LOGGER = logging.getLogger(__name__)

PLATFORMOK = ("sonos", "wiim", "linkplay")
SEGED_AKTIV = ("listening", "processing", "responding")
VISSZA_KESES = 1.5
MAX_IDO = 120
LEPES = 4
HANGERO_ALLITAS = 4      # MediaPlayerEntityFeature.VOLUME_SET


def bemond(s: State | None) -> bool:
    if s is None:
        return False
    if s.domain == "assist_satellite":
        return s.state in SEGED_AKTIV
    if s.domain == "media_player" and s.state in ("playing", "buffering"):
        a = s.attributes
        tartalom = f"{a.get('media_content_id') or ''} {a.get('entity_picture') or ''}".lower()
        return "tts" in tartalom or a.get("media_content_type") == "tts"
    return False


class Halkito:
    def __init__(self, hass: HomeAssistant, forrasok: list[str], szint: float) -> None:
        self.hass = hass
        self.forrasok = [f for f in forrasok if f]
        self.szint = max(0.0, min(1.0, szint))
        self._eredeti: dict[str, float] = {}       # lejátszó → hangerő a halkítás előtt
        self._halk: dict[str, float] = {}          # lejátszó → a beállított halk hangerő
        self._le: list[Any] = []
        self._vissza: Any = None
        self._korlat: Any = None
        self._zar = asyncio.Lock()

    @callback
    def start(self) -> None:
        if self.forrasok:
            self._le.append(async_track_state_change_event(self.hass, self.forrasok, self._valtozott))

    @callback
    def stop(self) -> None:
        for le in self._le:
            le()
        self._le.clear()
        self._torol_idozitok()
        if self._eredeti:
            self.hass.async_create_task(self._visszaallit())

    @callback
    def _torol_idozitok(self) -> None:
        for nev in ("_vissza", "_korlat"):
            if f := getattr(self, nev):
                f()
                setattr(self, nev, None)

    def _aktiv(self) -> bool:
        return any(bemond(self.hass.states.get(f)) for f in self.forrasok)

    @callback
    def _valtozott(self, _ev: Event) -> None:
        if self._aktiv():
            if self._vissza:
                self._vissza()
                self._vissza = None
            if not self._eredeti:
                self.hass.async_create_task(self._halkit())
                self._korlat = async_call_later(self.hass, MAX_IDO, self._ido_lejart)
        elif self._eredeti and not self._vissza:
            self._vissza = async_call_later(self.hass, VISSZA_KESES, self._ido_lejart)

    @callback
    def _ido_lejart(self, _most: Any) -> None:
        # @callback: az időzítő az eseményhurokban hívja (egy sima lambdát a HA külön szálon futtatna)
        self.hass.async_create_task(self._visszaallit())

    async def _kartya_hangszorok(self) -> set[str]:
        """A Cantabile kártyán felvett hangszórók (bármilyen platform)."""
        from . import music  # noqa: PLC0415 – körkörös import elkerülése

        try:
            return await music.osszes_hangszoro(self.hass)
        except Exception:  # noqa: BLE001 – olvashatatlan vezérlőpult
            return set()

    def _celok(self, kartyan: set[str] | None = None) -> list[str]:
        reg = er.async_get(self.hass)
        celok = []
        for s in self.hass.states.async_all("media_player"):
            if s.entity_id in self.forrasok or s.state != "playing" or s.attributes.get("volume_level") is None \
                    or not int(s.attributes.get("supported_features") or 0) & HANGERO_ALLITAS:
                continue
            ent = reg.async_get(s.entity_id)
            if (ent and ent.platform in PLATFORMOK) or s.entity_id in (kartyan or ()):
                celok.append(s.entity_id)
        return celok

    async def _hangero(self, cel: dict[str, float], kezdo: dict[str, float]) -> None:
        for k in range(1, LEPES + 1):
            await asyncio.gather(*(
                self.hass.services.async_call("media_player", "volume_set", {"entity_id": e, "volume_level": round(kezdo[e] + (v - kezdo[e]) * k / LEPES, 3)}, blocking=True)
                for e, v in cel.items()
            ), return_exceptions=True)
            if k < LEPES:
                await asyncio.sleep(0.15)

    async def _halkit(self) -> None:
        async with self._zar:
            if self._eredeti or not self._aktiv():
                return
            for e in self._celok(await self._kartya_hangszorok()):
                v = float(self.hass.states.get(e).attributes.get("volume_level") or 0)
                self._eredeti[e] = v
                self._halk[e] = round(v * self.szint, 3)
            if self._eredeti:
                _LOGGER.debug("Cantabile: bemondás – halkítás: %s", list(self._eredeti))
                await self._hangero(self._halk, dict(self._eredeti))

    async def _visszaallit(self) -> None:
        async with self._zar:
            self._torol_idozitok()
            if not self._eredeti:
                return
            cel, kezdo = {}, {}
            for e, v in self._eredeti.items():
                s = self.hass.states.get(e)
                most = float(s.attributes.get("volume_level") or 0) if s else None
                if most is None or abs(most - self._halk.get(e, most)) > 0.03:
                    continue        # közben kézzel állítottak rajta: marad, ahogy beállították
                cel[e], kezdo[e] = v, most
            self._eredeti.clear()
            self._halk.clear()
            if cel:
                await self._hangero(cel, kezdo)
