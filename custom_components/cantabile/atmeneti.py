"""Átmeneti feltöltés: a készüléken (telefon, notebook) választott saját zene más hangszórón is szólhat.

A saját zene a böngészőben van; a Sonos / WiiM / Cast viszont webcímről tölti le, amit játszik. Ezért ha a saját
zenét nem a BT-n (a böngészőben) hallgatjuk, a kártya számonként feltölti ide: `POST /api/cantabile/upload`
(bejelentkezett felhasználó, fájlonként legfeljebb 300 MB). A fájlok a helyi médiamappa rejtett
`.cantabile_atmeneti` mappájába kerülnek (a zenemappa listájában és a keresőben nem látszanak), és 24 óra múlva
maguktól törlődnek – a takarítás induláskor és utána óránként fut. A mappa legfeljebb 2 GB; fölötte a legrégebbi
fájlok törlődnek.
"""

from __future__ import annotations

import logging
import os
import re
import time
from datetime import timedelta
from pathlib import Path
from typing import Any

from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_interval

_LOGGER = logging.getLogger(__name__)

MAPPA = ".cantabile_atmeneti"
MAX_MERET = 300 * 1024 * 1024
ELETTARTAM = 24 * 3600
OSSZES_MAX = 2 * 1024 * 1024 * 1024     # az átmeneti mappa legfeljebb ennyi; fölötte a legrégebbiek törlődnek
_NEM_JO = re.compile(r"[^\w .,()&'+-]+", re.UNICODE)


def _forras(hass: HomeAssistant) -> tuple[str, Path]:
    dirs = hass.config.media_dirs or {}
    kulcs = "local" if "local" in dirs else next(iter(dirs), "")
    return kulcs, Path(dirs.get(kulcs, "/media")) / MAPPA


def _helyet(mappa: Path, kell: int) -> None:
    """Ha az új fájllal együtt túllépnénk a keretet, a legrégebbi átmeneti fájlok törlődnek."""
    if not mappa.is_dir():
        return
    fajlok = sorted((f for f in mappa.iterdir() if f.is_file()), key=lambda f: f.stat().st_mtime)
    osszes = sum(f.stat().st_size for f in fajlok)
    for f in fajlok:
        if osszes + kell <= OSSZES_MAX:
            break
        try:
            osszes -= f.stat().st_size
            f.unlink()
        except OSError:
            continue


def _takarit(mappa: Path) -> int:
    if not mappa.is_dir():
        return 0
    hatar, db = time.time() - ELETTARTAM, 0
    for f in mappa.iterdir():
        try:
            if f.is_file() and f.stat().st_mtime < hatar:
                f.unlink()
                db += 1
        except OSError:
            continue
    return db


@callback
def regisztral(hass: HomeAssistant) -> None:
    hass.http.register_view(Feltolto(hass))

    async def takarit(_most: Any = None) -> None:
        db = await hass.async_add_executor_job(_takarit, _forras(hass)[1])
        if db:
            _LOGGER.debug("Cantabile: %d átmeneti fájl törölve", db)

    hass.async_create_task(takarit())
    async_track_time_interval(hass, takarit, timedelta(hours=1))


class Feltolto(HomeAssistantView):
    url = "/api/cantabile/upload"
    name = "api:cantabile:upload"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: web.Request) -> web.Response:
        request._client_max_size = MAX_MERET  # noqa: SLF001
        kulcs, mappa = _forras(self.hass)
        if not kulcs:
            return web.json_response({"error": "nincs médiamappa"}, status=400)
        try:
            olvaso = await request.multipart()
            mezo = await olvaso.next()
            while mezo is not None and mezo.name != "file":
                mezo = await olvaso.next()
        except ValueError:
            return web.json_response({"error": "hibás kérés"}, status=400)
        if mezo is None or not mezo.filename:
            return web.json_response({"error": "nincs fájl"}, status=400)
        nev = _NEM_JO.sub("_", os.path.basename(mezo.filename)).strip(" ._") or "zene"
        cel = mappa / f"{int(time.time() * 1000)}_{nev}"
        await self.hass.async_add_executor_job(lambda: mappa.mkdir(parents=True, exist_ok=True))
        await self.hass.async_add_executor_job(_helyet, mappa, int(request.content_length or 0))
        fajl = await self.hass.async_add_executor_job(cel.open, "wb")
        meret = 0
        try:
            while darab := await mezo.read_chunk(1024 * 1024):
                meret += len(darab)
                if meret > MAX_MERET:
                    raise ValueError("túl nagy")
                await self.hass.async_add_executor_job(fajl.write, darab)
        except ValueError:
            await self.hass.async_add_executor_job(fajl.close)
            await self.hass.async_add_executor_job(cel.unlink, True)
            return web.json_response({"error": "a fájl túl nagy (legfeljebb 300 MB)"}, status=413)
        finally:
            if not fajl.closed:
                await self.hass.async_add_executor_job(fajl.close)
        return web.json_response({"media_content_id": f"media-source://media_source/{kulcs}/{MAPPA}/{cel.name}"})
