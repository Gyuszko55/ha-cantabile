"""Zenemappa-lista a magnó keresőjéhez: `cantabile/nas_list` websocket-parancs (és a GENRE fül műfajai: `cantabile/genres`, mufaj.py).

A kártya egy média-forrás mappát ad meg (pl. media-source://media_source/local/Zene); a szerver bejárja a hozzá
tartozó helyi mappát, és visszaadja az almappák és a zenefájlok relatív útvonalát. A keresést a kártya végzi (ékezet-
és kisbetű-független), így minden leütésnél nem kell a szerverhez fordulni. A lista 30 percig gyorsítótárban marad,
`frissit: true` esetén újraolvas. Csak a média-mappán belül olvas.
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, szoveg

ELOTAG = "media-source://media_source/"
HANGFAJL = (".mp3", ".flac", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".wma")
ERVENYES = 30 * 60

_tar: dict[str, tuple[float, dict[str, Any]]] = {}

# a számok sorrendje az albumon belül: a sorszám- és lemezszám-címke (a rendezett könyvtárban a fájlnévben nincs sorszám);
# fájlonként (módosítási idővel) megjegyezve, a HA .cache mappájában – csak az új / változott fájlt kell újraolvasni
_sorszam: dict[str, list] = {}
_sorszam_fajl: str | None = None
_sorszam_zar = threading.Lock()
_sorszam_valtozott = False


def _termeszetes(s: str) -> list:
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", s)]


def _szam(ertek: Any) -> int | None:
    m = re.match(r"\s*(\d+)", str(ertek[0] if isinstance(ertek, list) and ertek else ertek or ""))
    return int(m.group(1)) if m else None


def _sorszam_olvas(ut: str) -> tuple[int | None, int | None]:
    """(lemez, sorszám) a fájl címkéiből; a tárolt értéket használja, ha a fájl azóta nem változott (executorban fut)."""
    global _sorszam_valtozott
    try:
        mt = os.path.getmtime(ut)
    except OSError:
        return None, None
    with _sorszam_zar:
        t = _sorszam.get(ut)
    if t and t[0] == mt:
        return t[1], t[2]
    lemez = szam = None
    try:
        import mutagen    # noqa: PLC0415 – a HA-ban megvan (tts)

        f = mutagen.File(ut, easy=True)
        tags = getattr(f, "tags", None) or {}
        if hasattr(tags, "get"):
            szam, lemez = _szam(tags.get("tracknumber")), _szam(tags.get("discnumber"))
        if szam is None and f is not None:          # WMA: nincs „easy” felület
            g = mutagen.File(ut)
            for k in ("WM/TrackNumber", "trkn", "TRCK"):
                if g is not None and getattr(g, "tags", None) and k in g.tags:
                    v = g.tags[k]
                    szam = v[0][0] if k == "trkn" else _szam(getattr(v[0], "value", v[0]) if isinstance(v, list) else v)
                    break
    except Exception:  # noqa: BLE001 – olvashatatlan fájl: a neve szerint
        pass
    with _sorszam_zar:
        _sorszam[ut] = [mt, lemez, szam]
        _sorszam_valtozott = True
    return lemez, szam


def rendez(mappa: str, nevek: list[str]) -> list[str]:
    """Egy album számai: ha mindnek van sorszáma, lemez- és sorszám szerint, különben a fájlnév szerint (executorban)."""
    kulcs = {n: _sorszam_olvas(os.path.join(mappa, n)) for n in nevek}
    if nevek and all(k[1] is not None for k in kulcs.values()):
        return sorted(nevek, key=lambda n: (kulcs[n][0] or 1, kulcs[n][1], _termeszetes(n)))
    return sorted(nevek, key=_termeszetes)


def sorszam_betolt(fajl: str) -> None:
    global _sorszam_fajl
    _sorszam_fajl = fajl
    try:
        with open(fajl, encoding="utf-8") as f:
            _sorszam.update(json.load(f))
    except (OSError, ValueError):
        pass


def sorszam_ment() -> None:
    global _sorszam_valtozott
    if not _sorszam_fajl or not _sorszam_valtozott:
        return
    with _sorszam_zar:
        adat, _sorszam_valtozott = dict(_sorszam), False
    os.makedirs(os.path.dirname(_sorszam_fajl), exist_ok=True)
    with open(_sorszam_fajl + ".tmp", "w", encoding="utf-8") as f:
        json.dump(adat, f)
    os.replace(_sorszam_fajl + ".tmp", _sorszam_fajl)


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
        hang = [n for n in nevek if n.lower().endswith(HANGFAJL)]
        for nev in rendez(hol, hang):               # az albumon belül sorszám szerint (ha a címkékben van)
            fajlok.append(nev if rel == "." else f"{rel}/{nev}".replace(os.sep, "/"))
    sorszam_ment()
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
    hass.async_add_executor_job(sorszam_betolt, hass.config.path(".cache", "cantabile_sorszam.json"))

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/album_order", vol.Required("mappa"): str})
    @websocket_api.async_response
    async def ws_album_sorrend(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        """Egy mappa számai a lejátszás sorrendjében (sorszám-címke, különben fájlnév): media-source azonosítók."""
        mappa: str = msg["mappa"].rstrip("/")
        forras, _, rel = mappa[len(ELOTAG):].partition("/") if mappa.startswith(ELOTAG) else ("", "", "")
        alap = hass.config.media_dirs.get(forras) if forras else None
        ut = media_ut(alap, rel) if alap else None
        if ut is None:
            connection.send_error(msg["id"], "rossz_mappa", szoveg(hass, "folder_outside"))
            return

        def olvas() -> list[str]:
            try:
                nevek = [n for n in os.listdir(ut) if n.lower().endswith(HANGFAJL) and not n.startswith(".")]
            except OSError:
                return []
            l = rendez(ut, nevek)
            sorszam_ment()
            return l

        nevek = await hass.async_add_executor_job(olvas)
        connection.send_result(msg["id"], {"szamok": [f"{mappa}/{n}" for n in nevek]})

    websocket_api.async_register_command(hass, ws_album_sorrend)

    from .mufaj import Gyujto
    gyujto = hass.data[DOMAIN]["mufaj"] = Gyujto(hass)     # az EQ-profil műfaj szerinti választása is ezt kérdezi (hangszin.py)

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/genres", vol.Required("mappa"): str,
        vol.Optional("kihagy", default=[]): [str], vol.Optional("frissit", default=False): bool,
    })
    @websocket_api.async_response
    async def ws_mufajok(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        """A zenemappa albumai műfajonként (a fájlok címkéiből; mufaj.py) – a GENRE fülhöz."""
        mappa: str = msg["mappa"].rstrip("/")
        forras, _, rel = mappa[len(ELOTAG):].partition("/") if mappa.startswith(ELOTAG) else ("", "", "")
        alap = hass.config.media_dirs.get(forras) if forras else None
        gyoker = media_ut(alap, rel) if alap else None
        if gyoker is None:
            connection.send_error(msg["id"], "rossz_mappa", szoveg(hass, "folder_not_source"))
            return
        if not await hass.async_add_executor_job(os.path.isdir, gyoker):
            connection.send_error(msg["id"], "nincs_mappa", szoveg(hass, "folder_unavailable"))
            return
        connection.send_result(msg["id"], await gyujto.lekerdez(gyoker, msg["kihagy"], msg["frissit"]))

    websocket_api.async_register_command(hass, ws_mufajok)
