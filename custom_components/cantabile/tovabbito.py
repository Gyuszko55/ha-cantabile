"""Rádióadó-továbbító a BT kimenethez: `/api/cantabile/stream?url=…`.

A BT kimenet a böngészőben szól. Ha a Home Assistantot https-en éri el a készülék, a böngésző a http-s adókat nem
engedi lejátszani (vegyes tartalom), és idegen szerverről jövő hangot a VU-mérő sem elemezhet. Ezért a kártya a
webes adót ezen az útvonalon kéri: a HA letölti, és a saját címén adja tovább. Csak bejelentkezett felhasználó érheti
el (a kártya aláírt linket kér hozzá), csak http(s) cím adható meg, és csak hangot ad tovább (audio/… vagy
ogg / bináris tartalomtípus) – weboldalt, JSON-t vagy más adatot nem. Belső hálózati címet csak rendszergazda, a HA
saját rendszer-felhasználója (pl. az integráció által aláírt TV-cím) vagy egy kártyán felvett adó kérhet. Mindenki más
kérését egy saját névfeloldón át küldi, amely a nem nyilvános címeket és a HA saját hálózatait (a globális IPv6-os
otthoni hálózatot is) kiszűri – a kapcsolat oda megy, amit ellenőrzött, így az átirányítás és a kettős névfeloldás
(DNS-rebinding) sem kerülheti meg; ami nem oldható fel, az nem megy át.
"""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import socket
import time
from typing import Any
from urllib.parse import urljoin, urlsplit

import aiohttp
from aiohttp import web
from aiohttp.abc import AbstractResolver
from aiohttp.resolver import ThreadedResolver

from homeassistant.components.http import KEY_HASS_USER, HomeAssistantView
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import VERSION

_LOGGER = logging.getLogger(__name__)

UA = f"Cantabile/{VERSION} (Home Assistant)"
HANG_TIPUSOK = ("application/ogg", "application/octet-stream", "video/mp2t", "application/x-mpegurl")
DARAB = 16384

_halok: tuple[float, list[ipaddress.IPv4Network | ipaddress.IPv6Network]] = (0.0, [])


async def helyi_halok(hass: HomeAssistant) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    """A HA gépének hálózatai (a hálózati csatolókból, 10 percig tárolva) – a globális IPv6-os otthoni hálózat is."""
    global _halok
    if time.monotonic() - _halok[0] < 600:
        return _halok[1]
    halok: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
    try:
        from homeassistant.components import network

        for csatolo in await network.async_get_adapters(hass):
            for c in (*csatolo.get("ipv4", []), *csatolo.get("ipv6", [])):
                halok.append(ipaddress.ip_network(f"{c['address']}/{c['network_prefix']}", strict=False))
    except Exception:  # noqa: BLE001 – csatolók nélkül is működik (a nem nyilvános címeket akkor is szűri)
        _LOGGER.debug("Cantabile-továbbító: a hálózati csatolók nem olvashatók", exc_info=True)
    _halok = (time.monotonic(), halok)
    return halok


class Tiltott(OSError):
    """A cím a belső hálózatra mutat (nem rendszergazdai kérésben)."""


class _SzurtFeloldo(AbstractResolver):
    """Névfeloldó, amely csak nyilvános, a HA saját hálózatain kívüli címeket ad vissza."""

    def __init__(self, halok: list[ipaddress.IPv4Network | ipaddress.IPv6Network]) -> None:
        self._r = ThreadedResolver()
        self._halok = halok

    def _jo(self, cim: str) -> bool:
        try:
            ip = ipaddress.ip_address(cim.split("%")[0])
        except ValueError:
            return False
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        return ip.is_global and not any(ip in h for h in self._halok if h.version == ip.version)

    async def resolve(self, host: str, port: int = 0, family: socket.AddressFamily = socket.AF_INET) -> list[dict[str, Any]]:
        cimek = await self._r.resolve(host, port, family)
        jo = [c for c in cimek if self._jo(c["host"])]
        if not jo:
            raise Tiltott(f"{host}: local network address not allowed")
        return jo

    async def close(self) -> None:
        await self._r.close()


class Tovabbito(HomeAssistantView):
    url = "/api/cantabile/stream"
    name = "api:cantabile:stream"
    requires_auth = True
    cors_allowed = True          # a Cantabile TV-oldal a Cast-vevő címéről kéri (tv.py)

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def _megbizhato(self, request: web.Request, cel: str) -> bool:
        """Rendszergazda, a HA rendszer-felhasználója, vagy egy kártyán felvett adó: bármely cím kérhető."""
        user = request.get(KEY_HASS_USER)
        if user and (user.is_admin or user.system_generated):
            return True
        from .music import cim, osszes_ado

        return cim(cel) in await osszes_ado(self.hass)

    async def get(self, request: web.Request) -> web.StreamResponse:
        cel = request.query.get("url", "")
        if not cel.lower().startswith(("http://", "https://")):
            return web.Response(status=400, text="only http(s) stations")
        try:
            if not urlsplit(cel).hostname:
                return web.Response(status=400, text="bad address")
        except ValueError:
            return web.Response(status=400, text="bad address")
        sajat = feloldo = None
        if await self._megbizhato(request, cel):
            sess = async_get_clientsession(self.hass)
        else:
            feloldo = _SzurtFeloldo(await helyi_halok(self.hass))
            sess = sajat = aiohttp.ClientSession(connector=aiohttp.TCPConnector(resolver=feloldo))
        try:
            # szűrt kérésnél az átirányításokat egyenként követi: az IP-címmel megadott célt az aiohttp névfeloldás
            # nélkül érné el, ezért azt itt kell ellenőrizni
            for _ in range(6):
                if feloldo is not None:
                    host = urlsplit(cel).hostname or ""
                    try:
                        ipaddress.ip_address(host.split("%")[0])
                        ip_cel = True
                    except ValueError:
                        ip_cel = False
                    if ip_cel and not feloldo._jo(host):
                        return web.Response(status=403, text="local network address not allowed")
                be = await sess.get(cel, headers={"User-Agent": UA, "Icy-MetaData": "0"}, allow_redirects=feloldo is None,
                                    max_redirects=5, timeout=aiohttp.ClientTimeout(total=None, sock_connect=10, sock_read=30))
                hova = be.headers.get("Location") if feloldo is not None and be.status in (301, 302, 303, 307, 308) else None
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
                except (ConnectionResetError, aiohttp.ClientError, TimeoutError) as err:
                    # a hallgató leállt, vagy az adó menet közben megszakadt: a fejléc már elment, új választ nem küldhet
                    _LOGGER.debug("Cantabile-továbbító: vége (%s – %s)", cel, err)
                return ki
        except asyncio.CancelledError:
            raise
        except aiohttp.ClientConnectorError as err:
            if isinstance(err.os_error, Tiltott):
                return web.Response(status=403, text="local network address not allowed")
            _LOGGER.debug("Cantabile-továbbító: %s – %s", cel, err)
            return web.Response(status=502, text="station not reachable")
        except (aiohttp.ClientError, TimeoutError, ValueError) as err:
            _LOGGER.debug("Cantabile-továbbító: %s – %s", cel, err)
            return web.Response(status=502, text="station not reachable")
        finally:
            if sajat is not None:
                await sajat.close()
