"""Rádióadó-továbbító a BT kimenethez: `/api/cantabile/stream?url=…`.

A BT kimenet a böngészőben szól. Ha a Home Assistantot https-en éri el a készülék, a böngésző a http-s adókat nem
engedi lejátszani (vegyes tartalom), és idegen szerverről jövő hangot a VU-mérő sem elemezhet. Ezért a kártya a
webes adót ezen az útvonalon kéri: a HA letölti, és a saját címén adja tovább. Csak bejelentkezett felhasználó érheti
el (a kártya aláírt linket kér hozzá), csak http(s) cím adható meg, és csak hangot ad tovább (audio/… vagy
ogg / bináris tartalomtípus) – weboldalt, JSON-t vagy más adatot nem, így a belső hálózat szolgáltatásai nem
olvashatók vele.
"""

from __future__ import annotations

import asyncio
import logging

import aiohttp
from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import VERSION

_LOGGER = logging.getLogger(__name__)

UA = f"Cantabile/{VERSION} (Home Assistant)"
HANG_TIPUSOK = ("application/ogg", "application/octet-stream", "video/mp2t", "application/x-mpegurl")
DARAB = 16384


class Tovabbito(HomeAssistantView):
    url = "/api/cantabile/stream"
    name = "api:cantabile:stream"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request) -> web.StreamResponse:
        cel = request.query.get("url", "")
        if not cel.lower().startswith(("http://", "https://")):
            return web.Response(status=400, text="csak http(s) adó")
        sess = async_get_clientsession(self.hass)
        try:
            async with sess.get(cel, headers={"User-Agent": UA, "Icy-MetaData": "0"},
                                timeout=aiohttp.ClientTimeout(total=None, sock_connect=10, sock_read=30)) as be:
                if be.status >= 400:
                    return web.Response(status=502, text=f"az adó válasza: {be.status}")
                tipus = be.headers.get("Content-Type", "").split(";")[0].strip().lower()
                if tipus and not (tipus.startswith("audio/") or tipus in HANG_TIPUSOK):
                    return web.Response(status=415, text="nem hangfolyam")
                ki = web.StreamResponse(status=200, headers={
                    "Content-Type": be.headers.get("Content-Type", "audio/mpeg"),
                    "Cache-Control": "no-cache, no-store",
                })
                await ki.prepare(request)
                try:
                    async for darab in be.content.iter_chunked(DARAB):
                        await ki.write(darab)
                except (ConnectionResetError, aiohttp.ClientConnectionResetError):
                    pass            # a hallgató leállt / elnavigált
                return ki
        except asyncio.CancelledError:
            raise
        except (aiohttp.ClientError, TimeoutError) as err:
            _LOGGER.debug("Cantabile-továbbító: %s – %s", cel, err)
            return web.Response(status=502, text="az adó nem érhető el")
