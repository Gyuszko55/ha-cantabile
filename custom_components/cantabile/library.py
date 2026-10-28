"""Zenemappa-lista a magnó keresőjéhez: `cantabile/nas_list` websocket-parancs.

A kártya egy média-forrás mappát ad meg (pl. media-source://media_source/local/Zene); a szerver bejárja a hozzá
tartozó helyi mappát, és visszaadja az almappák és a zenefájlok relatív útvonalát. A keresést a kártya végzi (ékezet-
és kisbetű-független), így minden leütésnél nem kell a szerverhez fordulni. A lista 30 percig gyorsítótárban marad,
`frissit: true` esetén újraolvas. Csak a média-mappán belül olvas.
"""

from __future__ import annotations

import os
import time
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import szoveg

ELOTAG = "media-source://media_source/"
HANGFAJL = (".mp3", ".flac", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".wma")
ERVENYES = 30 * 60

_tar: dict[str, tuple[float, dict[str, Any]]] = {}


def media_ut(alap: str, rel: str) -> str | None:
    """A média-mappán belüli útvonal, vagy None, ha kilépne belőle (pl. "..").

    Szöveges ellenőrzés, mint a HA saját média-forrásánál: a mappán belüli szimbolikus link (pl. a /media/Zene → NAS)
    így használható, és nem kell a lemezhez fordulni.
    """
    a = os.path.normpath(os.path.abspath(alap))
    ut = os.path.normpath(os.path.join(a, rel))
    return ut if ut == a or ut.startswith(a + os.sep) else None


def _bejar(gyoker: str) -> dict[str, Any]:
    mappak: list[str] = []
    fajlok: list[str] = []
    latott: set[tuple[int, int]] = set()
    for hol, almappak, nevek in os.walk(gyoker, followlinks=True):
        try:
            st = os.stat(hol)
        except OSError:
            almappak.clear()
            continue
        if (st.st_dev, st.st_ino) in latott:          # körbe mutató link
            almappak.clear()
            continue
        latott.add((st.st_dev, st.st_ino))
        almappak.sort()
        rel = os.path.relpath(hol, gyoker)
        if rel != ".":
            mappak.append(rel.replace(os.sep, "/"))
        for nev in sorted(nevek):
            if nev.lower().endswith(HANGFAJL):
                fajlok.append(nev if rel == "." else f"{rel}/{nev}".replace(os.sep, "/"))
    return {"mappak": mappak, "fajlok": fajlok}


@callback
def regisztral(hass: HomeAssistant) -> None:
    @websocket_api.websocket_command(
        {vol.Required("type"): "cantabile/nas_list", vol.Required("mappa"): str, vol.Optional("frissit", default=False): bool}
    )
    @websocket_api.async_response
    async def ws_nas_lista(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        mappa: str = msg["mappa"].rstrip("/")
        if not mappa.startswith(ELOTAG):
            connection.send_error(msg["id"], "rossz_mappa", szoveg(hass, "folder_not_source"))
            return
        forras, _, rel = mappa[len(ELOTAG):].partition("/")
        alap = hass.config.media_dirs.get(forras)
        if not alap:
            connection.send_error(msg["id"], "rossz_mappa", szoveg(hass, "folder_unknown_source", forras=forras))
            return
        gyoker = media_ut(alap, rel)
        if gyoker is None:
            connection.send_error(msg["id"], "rossz_mappa", szoveg(hass, "folder_outside"))
            return
        tarolt = _tar.get(gyoker)
        if tarolt and not msg["frissit"] and time.monotonic() - tarolt[0] < ERVENYES:
            connection.send_result(msg["id"], tarolt[1])
            return
        if not await hass.async_add_executor_job(os.path.isdir, gyoker):   # egy megakadt NAS ne állítsa meg a HA-t
            connection.send_error(msg["id"], "nincs_mappa", szoveg(hass, "folder_unavailable"))
            return
        eredmeny = await hass.async_add_executor_job(_bejar, gyoker)
        _tar[gyoker] = (time.monotonic(), eredmeny)
        connection.send_result(msg["id"], eredmeny)

    websocket_api.async_register_command(hass, ws_nas_lista)
