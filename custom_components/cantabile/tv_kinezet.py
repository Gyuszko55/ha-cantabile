"""A Cantabile TV-oldal kinézete: `select` (borító / bakelit / sávok / hullám / sávok és hullám) és `switch` (futó
dalszöveg). Az integráció saját tárolójában (Store) van, a vezérlőpultokhoz nem nyúl: a `custom:cantabile-tv` kártya a két
entitás állapotából olvassa (a `cantabile_tv` attribútum alapján találja meg őket), és élőben követi. A kártya saját
`visual` / `lyrics` beállítása csak akkor számít, ha az entitások nincsenek meg.

2.7.1-ig a beállítás a TV-kártyákban volt; első induláskor a meglévő értéket egyszer, csak olvasva átvesszük onnan."""

from __future__ import annotations

from collections.abc import Callable
import logging
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

_LOGGER = logging.getLogger(__name__)

KINEZETEK = ["vinyl", "cover", "bars", "wave", "both"]
ALAPBOL_DALSZOVEG = ("vinyl", "cover")     # ezeknél a dalszöveg alapból látszik
ALAP = "cover"
TAR_KULCS = "cantabile_tv_kinezet"
ATTR = "cantabile_tv"                       # a kártya ezzel az attribútummal találja meg a két entitást


def kartya_ertek(k: dict[str, Any]) -> tuple[str, bool]:
    """(kinézet, dalszöveg) egy `custom:cantabile-tv` kártya beállításából (a kártya ugyanígy értelmezi)."""
    v = k.get("visual") if k.get("visual") in KINEZETEK else ALAP
    return v, (k.get("lyrics") is not False) if v in ALAPBOL_DALSZOVEG else k.get("lyrics") is True


def _kartyak(o: Any, ki: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if isinstance(o, dict):
        if o.get("type") == "custom:cantabile-tv":
            ki.append(o)
        else:
            for v in o.values():
                _kartyak(v, ki)
    elif isinstance(o, list):
        for v in o:
            _kartyak(v, ki)
    return ki


async def regi_kartyarol(hass: HomeAssistant) -> tuple[str, bool] | None:
    """Átvétel a 2.7.1-ig használt helyről: (kinézet, dalszöveg) az első TV-kártyáról. Csak olvas, semmit nem ment."""
    ll = hass.data.get("lovelace")
    d = getattr(ll, "dashboards", None)
    if d is None and isinstance(ll, dict):
        d = ll.get("dashboards")
    for p in (d or {}).values():
        if not hasattr(p, "async_load"):
            continue
        try:
            k = _kartyak(await p.async_load(False), [])
        except Exception:  # noqa: BLE001 – üres / YAML-hibás vezérlőpult
            continue
        if k:
            return kartya_ertek(k[0])
    return None


class TvKinezet:
    """A TV-oldal kinézete és futó dalszövege, tartósan (Store); a select és a switch entitás közös állapota."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, 1, TAR_KULCS)
        self.visual = ALAP
        self.lyrics = True
        self._figyelok: list[Callable[[], None]] = []

    async def betolt(self) -> None:
        adat = await self._store.async_load()
        if adat is None:
            regi = await regi_kartyarol(self.hass)
            if regi is not None:
                self.visual, self.lyrics = regi
                _LOGGER.debug("TV-kinézet átvéve a TV-kártyáról: %s, dalszöveg %s", *regi)
            await self._store.async_save(self._adat())
            return
        self.visual = adat.get("visual") if adat.get("visual") in KINEZETEK else ALAP
        self.lyrics = bool(adat.get("lyrics", self.visual in ALAPBOL_DALSZOVEG))

    def _adat(self) -> dict[str, Any]:
        return {"visual": self.visual, "lyrics": self.lyrics}

    async def beallit(self, visual: str | None = None, lyrics: bool | None = None) -> None:
        if visual is not None:
            if visual not in KINEZETEK:
                raise ValueError(f"ismeretlen kinézet: {visual}")
            self.visual = visual
        if lyrics is not None:
            self.lyrics = bool(lyrics)
        await self._store.async_save(self._adat())
        for f in list(self._figyelok):
            f()

    @callback
    def figyel(self, f: Callable[[], None]) -> Callable[[], None]:
        self._figyelok.append(f)

        @callback
        def le() -> None:
            if f in self._figyelok:
                self._figyelok.remove(f)

        return le
