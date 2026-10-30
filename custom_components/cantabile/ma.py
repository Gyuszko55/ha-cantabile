"""Music Assistant mint választható forrás (a kazettapolc MA füle) – ha a HA-ban be van állítva a Music Assistant.

A Cantabile MA nélkül is teljes; ez a modul csak akkor lép életbe, ha van betöltött `music_assistant` integráció. A HA
hivatalos MA-műveleteit használja (search, get_library, play_media, get_queue, transfer_queue), saját MA-kliens nélkül:
  - könyvtár és keresés: albumok, előadók, lejátszási listák, számok, rádióadók – a borítók az MA saját képtovábbítójáról,
    a Cantabile szerverén át (aláírt link), így https-oldalon és távolról is látszanak;
  - lejátszás: csak MA-lejátszón (az MA saját sorával – a sor gazdája ilyenkor az MA, nem a Cantabile);
  - sor: a szóló és a következő szám, a hossza, keverés / ismétlés (olvasásra – az átrendezéshez a HA nem ad műveletet);
  - átvitel: hangszóróváltáskor az MA sora megy át a másik MA-lejátszóra (ugyanonnan folytatja).
A lejátszás és az átvitel a hangszóró-foglalást is figyeli.

Websocket: `cantabile/ma/info`, `cantabile/ma/library`, `cantabile/ma/search`, `cantabile/ma/play`, `cantabile/ma/queue`,
`cantabile/ma/transfer`. Kép: `/api/cantabile/ma_kep/<azonosító>` (aláírt).
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from datetime import timedelta
from typing import Any

import aiohttp
import voluptuous as vol
from aiohttp import web

from homeassistant.components import websocket_api
from homeassistant.components.http import HomeAssistantView
from homeassistant.components.http.auth import async_sign_path
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from . import foglalas
from .library import ELOTAG, media_ut

_LOGGER = logging.getLogger(__name__)

MA = "music_assistant"
KEP_URL = "/api/cantabile/ma_kep"
KEP_RE = re.compile(r"/imageproxy/([0-9a-f]{16,128})")
KEP_MERET = 256
TIPUSOK = ("album", "artist", "playlist", "track", "radio")
ENQUEUE = ("play", "replace", "next", "replace_next", "add")


def bejegyzes(hass: HomeAssistant) -> Any | None:
    """A betöltött Music Assistant integráció (vagy None)."""
    for e in hass.config_entries.async_entries(MA):
        if e.state is ConfigEntryState.LOADED:
            return e
    return None


def ma_lejatszo(hass: HomeAssistant, entity_id: str) -> bool:
    st = hass.states.get(entity_id)
    return bool(st and st.attributes.get("mass_player_type"))


def ma_sor_szol(hass: HomeAssistant, entity_id: str) -> bool:
    """Az MA-lejátszón az MA saját sora szól (nem kívülről küldött cím)."""
    st = hass.states.get(entity_id)
    cid = str(st.attributes.get("media_content_id") or "") if st else ""
    return bool(st and st.attributes.get("app_id") == MA and re.match(r"^[\w.-]+://", cid) and not cid.lower().startswith(("http://", "https://")))


def parok(hass: HomeAssistant) -> dict[str, str]:
    """Saját lejátszó → ugyanannak a készüléknek az MA-lejátszója. Az MA a lejátszó azonosítóját sokszor a gyártói
    azonosítóból veszi (Sonos RINCON_…, Cast uuid, WiiM wiim_uuid:…); ahol nem (univerzális lejátszó), ott az egyetlen,
    azonos nevű eszköz dönt."""
    ereg, dreg = er.async_get(hass), dr.async_get(hass)
    sajat = [e for e in ereg.entities.values() if e.domain == "media_player" and e.platform not in (MA, "cantabile") and not e.disabled_by]
    uid = {}
    for e in sajat:
        uid.setdefault(e.unique_id.lower(), e.entity_id)
    nevek: dict[str, list[str]] = {}
    for e in sajat:
        d = dreg.async_get(e.device_id) if e.device_id else None
        if d and (n := (d.name_by_user or d.name or "").strip().casefold()):
            nevek.setdefault(n, []).append(e.entity_id)
    ki: dict[str, str] = {}
    for e in ereg.entities.values():
        if e.domain != "media_player" or e.platform != MA or e.disabled_by:
            continue
        u = e.unique_id.lower()
        cel = uid.get(u) or uid.get(re.sub(r"^[a-z]+_(?=uuid:)", "", u))
        if not cel and e.device_id and (d := dreg.async_get(e.device_id)):
            jo = nevek.get((d.name_by_user or d.name or "").strip().casefold(), [])
            cel = jo[0] if len(jo) == 1 else None
        if cel:
            ki[cel] = e.entity_id
    return ki


def _kep(hass: HomeAssistant, url: Any) -> str | None:
    """Az MA képtovábbítójának címe → aláírt Cantabile-link; https-kép marad; minden más elmarad."""
    if not isinstance(url, str) or not url:
        return None
    if m := KEP_RE.search(url):
        return async_sign_path(hass, f"{KEP_URL}/{m.group(1)}", timedelta(hours=24))
    return url if url.startswith("https://") else None


def _nevek(lista: Any) -> str:
    return ", ".join(str(a.get("name")) for a in lista or [] if isinstance(a, dict) and a.get("name"))


def _elem(hass: HomeAssistant, x: Any) -> dict[str, Any] | None:
    if not isinstance(x, dict) or not x.get("uri"):
        return None
    album = x.get("album") if isinstance(x.get("album"), dict) else {}
    return {
        "name": str(x.get("name") or ""),
        "uri": str(x["uri"]),
        "type": str(x.get("media_type") or ""),
        "artist": _nevek(x.get("artists")),
        "album": str(album.get("name") or ""),
        "image": _kep(hass, x.get("image") or album.get("image")),
        "year": x.get("year"),
        "version": str(x.get("version") or ""),
    }


async def _hiv(hass: HomeAssistant, szolg: str, adat: dict[str, Any], valasz: bool = True) -> Any:
    try:
        return await hass.services.async_call(MA, szolg, adat, blocking=True, return_response=valasz)
    except HomeAssistantError:
        raise
    except Exception as err:  # noqa: BLE001 – az MA hibája ne a websocketet döntse le
        raise HomeAssistantError(f"Music Assistant: {err}") from err


def _sor_elem(hass: HomeAssistant, x: Any) -> dict[str, Any] | None:
    if not isinstance(x, dict):
        return None
    mi = x.get("media_item") if isinstance(x.get("media_item"), dict) else {}
    e = _elem(hass, mi) or {"name": "", "artist": "", "album": "", "image": None}
    return {"name": e["name"] or str(x.get("name") or ""), "artist": e["artist"], "album": e["album"], "image": e["image"],
            "duration": x.get("duration")}


class MaKep(HomeAssistantView):
    """Az MA képtovábbítójának képe a Cantabile szerverén át (aláírt linkkel; csak az MA saját képei)."""

    url = KEP_URL + "/{kep}"
    name = "api:cantabile:ma_kep"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(self, request: web.Request, kep: str) -> web.StreamResponse:
        e = bejegyzes(self.hass)
        if not e or not re.fullmatch(r"[0-9a-f]{16,128}", kep):
            return web.Response(status=404)
        alap = str(e.data.get("url") or "").rstrip("/")
        try:
            async with asyncio.timeout(10):
                async with async_get_clientsession(self.hass).get(f"{alap}/imageproxy/{kep}?size={KEP_MERET}") as v:
                    if v.status != 200 or not str(v.content_type).startswith("image/"):
                        return web.Response(status=404)
                    tartalom = await v.read()
                    return web.Response(body=tartalom, content_type=v.content_type, headers={"Cache-Control": "private, max-age=86400"})
        except (aiohttp.ClientError, TimeoutError):
            return web.Response(status=504)


def regisztral(hass: HomeAssistant) -> None:
    hass.http.register_view(MaKep(hass))

    def _entry() -> Any:
        if not (e := bejegyzes(hass)):
            raise HomeAssistantError("A Music Assistant nincs beállítva.")
        return e

    def _foglal(conn: websocket_api.ActiveConnection, ids: list[str], eszkoz: str | None) -> None:
        fk = foglalas.kozpont(hass)
        if m := fk.masik(ids, conn.user.id):
            raise HomeAssistantError(f"busy:{m[1]['nev']}")
        if eszkoz:
            fk.foglal(ids, conn.user.id, conn.user.name or "?", eszkoz)

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/ma/info"})
    @websocket_api.async_response
    async def ws_info(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        e = bejegyzes(hass)
        jat = [{"entity_id": s.entity_id, "name": s.attributes.get("friendly_name") or s.entity_id, "available": s.state != "unavailable"}
               for s in hass.states.async_all("media_player") if s.attributes.get("mass_player_type")] if e else []
        conn.send_result(msg["id"], {"available": bool(e), "players": jat, "pairs": parok(hass) if e else {}})

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/ma/library",
        vol.Required("media_type"): vol.In(TIPUSOK),
        vol.Optional("search"): str,
        vol.Optional("limit", default=60): vol.All(int, vol.Range(1, 200)),
        vol.Optional("offset", default=0): vol.All(int, vol.Range(0, 100000)),
        vol.Optional("order_by", default="name"): vol.In(("name", "sort_name", "timestamp_added", "last_played", "year")),
    })
    @websocket_api.async_response
    async def ws_library(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            adat = {"config_entry_id": _entry().entry_id, "media_type": msg["media_type"], "limit": msg["limit"],
                    "offset": msg["offset"], "order_by": msg["order_by"]}
            if msg.get("search"):
                adat["search"] = msg["search"]
            v = await _hiv(hass, "get_library", adat)
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        nyers = (v or {}).get("items") or []
        elemek = [x for x in (_elem(hass, i) for i in nyers) if x]
        # a lapozás a nyers darabszámon megy (a szűrés után kevesebb maradhat, a következő lap mégis létezik)
        conn.send_result(msg["id"], {"items": elemek, "offset": msg["offset"], "next": msg["offset"] + len(nyers), "more": len(nyers) >= msg["limit"]})

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/ma/search",
        vol.Required("query"): vol.All(str, vol.Length(min=1, max=120)),
        vol.Optional("media_type"): [vol.In(TIPUSOK)],
        vol.Optional("limit", default=12): vol.All(int, vol.Range(1, 50)),
    })
    @websocket_api.async_response
    async def ws_search(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            adat: dict[str, Any] = {"config_entry_id": _entry().entry_id, "name": msg["query"], "limit": msg["limit"]}
            if msg.get("media_type"):
                adat["media_type"] = msg["media_type"]
            v = await _hiv(hass, "search", adat)
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        ki = {k: [x for x in (_elem(hass, i) for i in (v or {}).get(k) or []) if x]
              for k in ("albums", "artists", "playlists", "tracks", "radio")}
        conn.send_result(msg["id"], ki)

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/ma/play",
        vol.Required("entity_id"): str,
        vol.Required("uri"): vol.All(str, vol.Length(min=3, max=500)),
        vol.Optional("media_type"): vol.In(TIPUSOK),
        vol.Optional("enqueue", default="replace"): vol.In(ENQUEUE),
        vol.Optional("device", default="gep"): vol.In(foglalas.ESZKOZOK),
    })
    @websocket_api.async_response
    async def ws_play(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        e = msg["entity_id"]
        try:
            _entry()
            if not ma_lejatszo(hass, e):
                raise HomeAssistantError("not_ma")
            _foglal(conn, [e], None)
            adat = {"entity_id": e, "media_id": msg["uri"], "enqueue": msg["enqueue"]}
            if msg.get("media_type"):
                adat["media_type"] = msg["media_type"]
            await _hiv(hass, "play_media", adat, valasz=False)
            _foglal(conn, [e], msg["device"])
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        conn.send_result(msg["id"])

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/ma/queue", vol.Required("entity_id"): str})
    @websocket_api.async_response
    async def ws_queue(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        e = msg["entity_id"]
        try:
            _entry()
            v = await _hiv(hass, "get_queue", {"entity_id": e}) if ma_lejatszo(hass, e) else None
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        q = (v or {}).get(e) if isinstance(v, dict) else None
        if not isinstance(q, dict):
            conn.send_result(msg["id"], {"active": False})
            return
        conn.send_result(msg["id"], {
            "active": bool(q.get("active")), "name": q.get("name"), "items": q.get("items"), "index": q.get("current_index"),
            "shuffle": bool(q.get("shuffle_enabled")), "repeat": q.get("repeat_mode"), "elapsed": q.get("elapsed_time"),
            "current": _sor_elem(hass, q.get("current_item")), "next": _sor_elem(hass, q.get("next_item")),
        })

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/ma/now",
        vol.Required("entity_id"): str,
        vol.Optional("mappa"): str,
    })
    @websocket_api.async_response
    async def ws_now(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        """Az MA-lejátszón szóló szám – és ha a zenemappából (MA Filesystem) szól, a fájl a kártya zenemappájában
        (media-source azonosítóval), hogy a Cantabile ugyanonnan folytathassa egy nem MA-hangszórón."""
        e = msg["entity_id"]
        try:
            _entry()
            v = await _hiv(hass, "get_queue", {"entity_id": e}) if ma_lejatszo(hass, e) else None
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        q = (v or {}).get(e) if isinstance(v, dict) else None
        ci = q.get("current_item") if isinstance(q, dict) else None
        if not isinstance(ci, dict):
            conn.send_result(msg["id"], {"active": False})
            return
        sd = ci.get("stream_details") if isinstance(ci.get("stream_details"), dict) else {}
        ki: dict[str, Any] = {"active": bool(q.get("active")), "elapsed": q.get("elapsed_time"), "provider": str(sd.get("provider") or ""),
                              "current": _sor_elem(hass, ci)}
        rel = str(sd.get("item_id") or "")
        mappa = str(msg.get("mappa") or "").rstrip("/")
        if ki["provider"].startswith("filesystem") and rel and mappa.startswith(ELOTAG):
            forras, _, alrel = mappa[len(ELOTAG):].partition("/")
            alap = hass.config.media_dirs.get(forras)
            gyoker = media_ut(alap, alrel) if alap else None
            if gyoker:
                # az MA mappája lehet maga a zenemappa, vagy a fölötte lévő (pl. /media, és a relatív út NAS310/…-val kezdődik)
                elso, _, tobbi = rel.partition("/")
                for ut in (rel, tobbi if elso == os.path.basename(gyoker) else None):
                    if not ut:
                        continue
                    teljes = media_ut(gyoker, ut)
                    if teljes and await hass.async_add_executor_job(os.path.isfile, teljes):
                        ki["file"] = f"{mappa}/{ut}"
                        ki["folder"] = f"{mappa}/{ut.rsplit('/', 1)[0]}" if "/" in ut else mappa
                        break
        conn.send_result(msg["id"], ki)

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/ma/transfer",
        vol.Required("source"): str,
        vol.Required("target"): str,
        vol.Optional("device", default="gep"): vol.In(foglalas.ESZKOZOK),
    })
    @websocket_api.async_response
    async def ws_transfer(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            _entry()
            if not (ma_lejatszo(hass, msg["source"]) and ma_lejatszo(hass, msg["target"])):
                raise HomeAssistantError("not_ma")
            _foglal(conn, [msg["target"]], None)
            await _hiv(hass, "transfer_queue", {"entity_id": msg["target"], "source_player": msg["source"]}, valasz=False)
            _foglal(conn, [msg["target"]], msg["device"])
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        conn.send_result(msg["id"])

    for c in (ws_info, ws_library, ws_search, ws_play, ws_queue, ws_now, ws_transfer):
        websocket_api.async_register_command(hass, c)
