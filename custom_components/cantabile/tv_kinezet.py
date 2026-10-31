"""A Cantabile TV-oldal kinézete HA-entitásként: `select` (bakelit / sávok / hullám / sávok és hullám) és `switch` (futó
dalszöveg). Ugyanazt a beállítást írják, mint a kártya ⚙ paneljének TV-kinézet része: a vezérlőpultok `custom:cantabile-tv`
kártyáinak `visual` és `lyrics` kulcsát. A vezérlőpult mentésekor (lovelace_updated) az állapotuk magától követi."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.core import Event, HomeAssistant, callback

KINEZETEK = ["vinyl", "bars", "wave", "both"]
EVENT = "lovelace_updated"


def _pultok(hass: HomeAssistant) -> list[Any]:
    ll = hass.data.get("lovelace")
    d = getattr(ll, "dashboards", None)
    if d is None and isinstance(ll, dict):
        d = ll.get("dashboards")
    return [x for x in (d or {}).values() if hasattr(x, "async_save")]


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


async def olvas(hass: HomeAssistant) -> tuple[str, bool] | None:
    """(kinézet, dalszöveg) az első TV-kártyáról; None, ha nincs TV-oldal."""
    for p in _pultok(hass):
        try:
            k = _kartyak(await p.async_load(False), [])
        except Exception:  # noqa: BLE001 – üres / YAML-hibás vezérlőpult
            continue
        if k:
            v = k[0].get("visual") if k[0].get("visual") in KINEZETEK else "vinyl"
            return v, (k[0].get("lyrics") is not False) if v == "vinyl" else k[0].get("lyrics") is True
    return None


async def ir(hass: HomeAssistant, visual: str | None = None, lyrics: bool | None = None) -> int:
    """A kinézet és / vagy a dalszöveg beírása minden TV-kártyába (a TV-oldal a vezérlőpult frissülésekor átveszi)."""
    most = await olvas(hass)
    if most is None:
        return 0
    v = visual or most[0]
    d = most[1] if lyrics is None else lyrics
    db = 0
    for p in _pultok(hass):
        try:
            cfg = await p.async_load(False)
        except Exception:  # noqa: BLE001
            continue
        k = _kartyak(cfg, [])
        if not k:
            continue
        for x in k:
            x["visual"] = v
            if v == "vinyl":
                if d:
                    x.pop("lyrics", None)
                else:
                    x["lyrics"] = False
            elif d:
                x["lyrics"] = True
            else:
                x.pop("lyrics", None)
        await p.async_save(cfg)
        db += len(k)
    return db


class KinezetKoveto:
    """Az entitás állapota a vezérlőpult minden mentésekor (⚙ panel, szerkesztő) újraolvasva."""

    _leiras: Callable[[], None] | None = None

    def _kovet(self, hass: HomeAssistant, frissit: Callable[[tuple[str, bool] | None], None]) -> Callable[[], None]:
        async def ujra(_ev: Event | None = None) -> None:
            frissit(await olvas(hass))

        @callback
        def esemeny(ev: Event) -> None:
            hass.async_create_task(ujra(ev))

        hass.async_create_task(ujra())
        return hass.bus.async_listen(EVENT, esemeny)
