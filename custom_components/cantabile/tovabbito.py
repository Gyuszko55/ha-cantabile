"""Rádióadó-továbbító a BT kimenethez: `/api/cantabile/stream?url=…`.

A BT kimenet a böngészőben szól. Ha a Home Assistantot https-en éri el a készülék, a böngésző a http-s adókat nem
engedi lejátszani (vegyes tartalom), és idegen szerverről jövő hangot a VU-mérő sem elemezhet. Ezért a kártya a
webes adót ezen az útvonalon kéri: a HA letölti, és a saját címén adja tovább. Csak bejelentkezett felhasználó érheti
el (a kártya aláírt linket kér hozzá), csak http(s) cím adható meg, és csak hangot ad tovább (audio/… vagy
ogg / bináris tartalomtípus) – weboldalt, JSON-t vagy más adatot nem. Belső hálózati (magán-, helyi) címet – az
átirányítások céljait is – csak rendszergazda, a HA saját rendszer-felhasználója (pl. az integráció által aláírt TV-cím)
vagy egy kártyán felvett adó kérhet; így más felhasználó a továbbítóval nem fér hozzá a belső hálózat eszközeihez.
"""

from __future__ import annotations

import asyncio
import ipaddress
import logging
from urllib.parse import urljoin, urlsplit

import aiohttp
from aiohttp import web

from homeassistant.components.http import KEY_HASS_USER, HomeAssistantView
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
    cors_allowed = True          # a Cantabile TV-oldal a Cast-vevő címéről kéri (tv.py)

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def _szabad(self, request: web.Request, cel: str) -> bool:
        """Kérheti-e ezt a címet: nyilvános cím bárkinek; belső hálózati csak rendszergazdának, a HA rendszer-
        felhasználójának, vagy ha egy kártyán felvett adó."""
        user = request.get(KEY_HASS_USER)
        if user and (user.is_admin or user.system_generated):
            return True
        host = urlsplit(cel).hostname or ""
        try:
            cimek = [ipaddress.ip_address(host)]
        except ValueError:
            try:
                infok = await asyncio.get_running_loop().getaddrinfo(host, None)
            except OSError:
                return True                     # nem oldható fel: a letöltés úgyis hibát ad
            cimek = [ipaddress.ip_address(str(i[4][0]).split("%")[0]) for i in infok]
        if all(c.is_global for c in cimek):
            return True
        from .music import cim, osszes_ado

        return cim(cel) in await osszes_ado(self.hass)

    async def get(self, request: web.Request) -> web.StreamResponse:
        cel = request.query.get("url", "")
        if not cel.lower().startswith(("http://", "https://")):
            return web.Response(status=400, text="only http(s) stations")
        sess = async_get_clientsession(self.hass)
        try:
            for _ in range(6):                  # az átirányításokat egyenként követi, hogy a cél is ellenőrizhető legyen
                if not await self._szabad(request, cel):
                    return web.Response(status=403, text="local network address not allowed")
                be = await sess.get(cel, headers={"User-Agent": UA, "Icy-MetaData": "0"}, allow_redirects=False,
                                    timeout=aiohttp.ClientTimeout(total=None, sock_connect=10, sock_read=30))
                hova = be.headers.get("Location") if be.status in (301, 302, 303, 307, 308) else None
                if not hova:
                    break
                be.release()
                cel = urljoin(cel, hova)
                if not cel.lower().startswith(("http://", "https://")):
                    return web.Response(status=400, text="only http(s) stations")
            else:
                be.release()
                return web.Response(status=502, text="too many redirects")
            async with be:
                if be.status >= 400:
                    return web.Response(status=502, text=f"station replied {be.status}")
                tipus = be.headers.get("Content-Type", "").split(";")[0].strip().lower()
                if tipus and not (tipus.startswith("audio/") or tipus in HANG_TIPUSOK):
                    return web.Response(status=415, text="not an audio stream")
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
            return web.Response(status=502, text="station not reachable")
