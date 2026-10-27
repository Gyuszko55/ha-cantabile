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

ELOTAG = "media-source://media_source/"
HANGFAJL = (".mp3", ".flac", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".wma")
ERVENYES = 30 * 60

_tar: dict[str, tuple[float, dict[str, Any]]] = {}


def _bejar(gyoker: str) -> dict[str, Any]:
    mappak: list[str] = []
    fajlok: list[str] = []
    for hol, almappak, nevek in os.walk(gyoker):
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
            connection.send_error(msg["id"], "rossz_mappa", "Csak media-source mappa adható meg.")
            return
        forras, _, rel = mappa[len(ELOTAG):].partition("/")
        alap = hass.config.media_dirs.get(forras)
        if not alap:
            connection.send_error(msg["id"], "rossz_mappa", f"Ismeretlen média-forrás: {forras}")
            return
        alap_valos = os.path.realpath(alap)
        gyoker = os.path.realpath(os.path.join(alap, rel))
        if gyoker != alap_valos and not gyoker.startswith(alap_valos + os.sep):
            connection.send_error(msg["id"], "rossz_mappa", "A mappa a média-mappán kívül van.")
            return
        tarolt = _tar.get(gyoker)
        if tarolt and not msg["frissit"] and time.monotonic() - tarolt[0] < ERVENYES:
            connection.send_result(msg["id"], tarolt[1])
            return
        if not os.path.isdir(gyoker):
            connection.send_error(msg["id"], "nincs_mappa", "A mappa nem érhető el.")
            return
        eredmeny = await hass.async_add_executor_job(_bejar, gyoker)
        _tar[gyoker] = (time.monotonic(), eredmeny)
        connection.send_result(msg["id"], eredmeny)

    websocket_api.async_register_command(hass, ws_nas_lista)
