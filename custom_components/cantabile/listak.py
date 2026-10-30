"""Saját Cantabile-listák: vegyes forrásból (zenemappa, Deezer, Music Assistant), a szerveren tárolva – minden kártyán és
felhasználónál ugyanazok.

Egy elem: `{"t": "nas" | "dz" | "ma", "id": …, "cim": …, "eloado": …, "kep": …}` – zenemappánál a media-source azonosító,
Deezernél a szám linkje, Music Assistantnál az MA-azonosító. Lejátszáskor az szól, amit a hangszóró tud: Sonoson a
zenemappa és a Deezer (a Sonos saját sorában), Music Assistant-lejátszón az MA-elemek, máshol a zenemappa számai.

Websocket: `cantabile/lists`, `cantabile/list/get`, `…/create`, `…/rename`, `…/delete` (a létrehozó vagy rendszergazda),
`…/add`, `…/remove`, `…/now` (a hangszórón szóló szám vagy a teljes sor elemként), `…/play`.
"""

from __future__ import annotations

import asyncio
import logging
import re
import secrets
import time
from typing import Any
from urllib.parse import unquote

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError, Unauthorized
from homeassistant.helpers.storage import Store

from . import foglalas, sonossor
from .const import DOMAIN
from .library import ELOTAG
from .music import nas_lista, sonos_valtozat

_LOGGER = logging.getLogger(__name__)

TAROLO = "cantabile_listak"
ELEM_MAX = 500
LISTA_MAX = 200
DZ_SZAM = re.compile(r"(?:tr(?:%3a|:|-flac:)|deezer\.com/(?:\w+/)?track/)(\d+)", re.I)
MA_URI = re.compile(r"^[\w.-]+://(track|album|playlist|artist|radio)/")

ELEM = vol.Schema({
    vol.Required("t"): vol.In(("nas", "dz", "ma")),
    vol.Required("id"): vol.All(str, vol.Length(min=3, max=800)),
    vol.Optional("cim", default=""): vol.All(str, vol.Length(max=200)),
    vol.Optional("eloado", default=""): vol.All(str, vol.Length(max=200)),
    vol.Optional("kep"): vol.Any(None, vol.All(str, vol.Length(max=800))),
}, extra=vol.REMOVE_EXTRA)


def _ervenyes(e: dict[str, Any]) -> bool:
    if e["t"] == "nas":
        return e["id"].startswith(ELOTAG) and ".." not in e["id"]
    if e["t"] == "dz":
        return bool(re.match(r"^https://www\.deezer\.com/(\w+/)?track/\d+$", e["id"]))
    return bool(MA_URI.match(e["id"]))


class Listak:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.store: Store[dict[str, Any]] = Store(hass, 1, TAROLO)
        self.adat: dict[str, Any] | None = None
        self._zar = asyncio.Lock()

    async def betolt(self) -> dict[str, Any]:
        async with self._zar:
            if self.adat is None:
                v = await self.store.async_load()
                self.adat = v if isinstance(v, dict) and isinstance(v.get("listak"), dict) else {"listak": {}}
        return self.adat

    def ment(self) -> None:
        self.store.async_delay_save(lambda: self.adat or {"listak": {}}, 1)

    async def lista(self, lid: str) -> dict[str, Any]:
        l = (await self.betolt())["listak"].get(lid)
        if not l:
            raise HomeAssistantError("no_list")
        return l


def _jog(conn: websocket_api.ActiveConnection, l: dict[str, Any]) -> None:
    if not (conn.user.is_admin or l.get("gazda") == conn.user.id):
        raise Unauthorized()


def _osszegzes(l: dict[str, Any]) -> dict[str, Any]:
    kep = next((e.get("kep") for e in l["elemek"] if e.get("kep")), None)
    forrasok = sorted({e["t"] for e in l["elemek"]})
    return {"id": l["id"], "nev": l["nev"], "db": len(l["elemek"]), "gazda_nev": l.get("gazda_nev"), "kep": kep, "forrasok": forrasok,
            "modositva": l.get("modositva")}


def _nas_elem(hass: HomeAssistant, mid: str, st_attr: dict[str, Any] | None = None) -> dict[str, Any]:
    t = unquote(mid).split("/")
    a = st_attr or {}
    return {"t": "nas", "id": mid, "cim": str(a.get("media_title") or re.sub(r"\.[A-Za-z0-9]{2,4}$", "", t[-1])),
            "eloado": str(a.get("media_artist") or (t[-3] if len(t) >= 3 else "")), "kep": None}


def _elembol(hass: HomeAssistant, cid: str, attr: dict[str, Any]) -> dict[str, Any] | None:
    """A lejátszó állapotából (vagy a Sonos-sor egy eleméből) listaelem."""
    if not cid:
        return None
    if mid := sonossor.media_source_id(cid):
        return _nas_elem(hass, mid, attr)
    if cid.startswith(ELOTAG):
        return _nas_elem(hass, cid, attr)
    if m := DZ_SZAM.search(cid):
        return {"t": "dz", "id": f"https://www.deezer.com/track/{m.group(1)}", "cim": str(attr.get("media_title") or ""),
                "eloado": str(attr.get("media_artist") or ""), "kep": None}
    if MA_URI.match(cid) and not cid.startswith("http"):
        return {"t": "ma", "id": cid, "cim": str(attr.get("media_title") or ""), "eloado": str(attr.get("media_artist") or ""), "kep": None}
    return None


def regisztral(hass: HomeAssistant) -> None:
    lk = hass.data[DOMAIN]["listak"] = Listak(hass)

    def _foglal(conn: websocket_api.ActiveConnection, ids: list[str]) -> None:
        if m := foglalas.kozpont(hass).masik(ids, conn.user.id):
            raise HomeAssistantError(f"busy:{m[1]['nev']}")

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/lists"})
    @websocket_api.async_response
    async def ws_lists(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        a = await lk.betolt()
        l = sorted(a["listak"].values(), key=lambda x: -(x.get("modositva") or 0))
        conn.send_result(msg["id"], {"listak": [_osszegzes(x) for x in l], "admin": conn.user.is_admin, "user": conn.user.id})

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/list/get", vol.Required("lista"): str})
    @websocket_api.async_response
    async def ws_get(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            l = await lk.lista(msg["lista"])
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "no_list", str(err))
            return
        conn.send_result(msg["id"], {**_osszegzes(l), "elemek": l["elemek"], "sajat": conn.user.is_admin or l.get("gazda") == conn.user.id})

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/list/create", vol.Required("nev"): vol.All(str, vol.Length(min=1, max=60)),
                                      vol.Optional("elemek", default=[]): vol.All([ELEM], vol.Length(max=ELEM_MAX))})
    @websocket_api.async_response
    async def ws_create(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        a = await lk.betolt()
        if len(a["listak"]) >= LISTA_MAX:
            conn.send_error(msg["id"], "too_many", "too_many")
            return
        lid = secrets.token_hex(6)
        a["listak"][lid] = {"id": lid, "nev": msg["nev"].strip(), "gazda": conn.user.id, "gazda_nev": conn.user.name or "?",
                            "letrehozva": time.time(), "modositva": time.time(), "elemek": [e for e in msg["elemek"] if _ervenyes(e)]}
        lk.ment()
        conn.send_result(msg["id"], _osszegzes(a["listak"][lid]))

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/list/rename", vol.Required("lista"): str, vol.Required("nev"): vol.All(str, vol.Length(min=1, max=60))})
    @websocket_api.async_response
    async def ws_rename(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        l = await lk.lista(msg["lista"])
        _jog(conn, l)
        l["nev"], l["modositva"] = msg["nev"].strip(), time.time()
        lk.ment()
        conn.send_result(msg["id"], _osszegzes(l))

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/list/delete", vol.Required("lista"): str})
    @websocket_api.async_response
    async def ws_delete(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        a = await lk.betolt()
        l = await lk.lista(msg["lista"])
        _jog(conn, l)
        a["listak"].pop(msg["lista"], None)
        lk.ment()
        conn.send_result(msg["id"], {})

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/list/add", vol.Required("lista"): str,
                                      vol.Required("elemek"): vol.All([ELEM], vol.Length(min=1, max=ELEM_MAX))})
    @websocket_api.async_response
    async def ws_add(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        l = await lk.lista(msg["lista"])
        uj = [e for e in msg["elemek"] if _ervenyes(e)]
        l["elemek"] = (l["elemek"] + uj)[:ELEM_MAX]
        l["modositva"] = time.time()
        lk.ment()
        conn.send_result(msg["id"], {**_osszegzes(l), "hozzaadva": len(uj)})

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/list/remove", vol.Required("lista"): str, vol.Required("index"): vol.All(int, vol.Range(min=0))})
    @websocket_api.async_response
    async def ws_remove(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        l = await lk.lista(msg["lista"])
        _jog(conn, l)
        if msg["index"] < len(l["elemek"]):
            l["elemek"].pop(msg["index"])
            l["modositva"] = time.time()
            lk.ment()
        conn.send_result(msg["id"], _osszegzes(l))

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/list/now", vol.Required("entity_id"): str, vol.Optional("mind", default=False): bool})
    @websocket_api.async_response
    async def ws_now(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        """A hangszórón szóló szám (vagy a teljes sor: Sonos-sor, sorozatlejátszó) listaelemként."""
        e = msg["entity_id"]
        s = hass.states.get(e)
        if s is None:
            conn.send_result(msg["id"], {"elemek": []})
            return
        a = dict(s.attributes)
        elemek: list[dict[str, Any]] = []
        entries = hass.config_entries.async_loaded_entries(DOMAIN)
        rt = entries[0].runtime_data if entries else None
        sorrend = rt.sorrend(e) if rt else None
        if msg["mind"] and sorrend is not None and getattr(sorrend, "szamok", None):
            elemek = [_nas_elem(hass, x) for x in sorrend.szamok if str(x).startswith(ELOTAG)]
        elif msg["mind"] and a.get("queue_size") and not a.get("mass_player_type"):
            try:
                for x in await sonossor.sor(hass, e):
                    if el := _elembol(hass, str(x.get("media_content_id") or ""), {"media_title": x.get("media_title") or x.get("title"),
                                                                                 "media_artist": x.get("media_artist") or x.get("artist")}):
                        elemek.append(el)
            except Exception as err:  # noqa: BLE001
                _LOGGER.debug("Cantabile: a Sonos-sor nem olvasható (%s): %s", e, err)
        if not elemek:
            most = getattr(sorrend, "most", None) if sorrend is not None else None
            el = _nas_elem(hass, most, a) if most and str(most).startswith(ELOTAG) else _elembol(hass, str(a.get("media_content_id") or ""), a)
            if el:
                elemek = [el]
        conn.send_result(msg["id"], {"elemek": elemek[:ELEM_MAX]})

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/list/play",
        vol.Required("lista"): str,
        vol.Required("entity_id"): str,
        vol.Optional("tagok"): [str],
        vol.Required("mod"): vol.In(("sonos", "url")),
        vol.Optional("kezdo", default=0): vol.All(int, vol.Range(min=0)),
        vol.Optional("hires"): vol.Any(None, str),
        vol.Optional("mappa"): vol.Any(None, str),
        vol.Optional("device", default="gep"): vol.In(foglalas.ESZKOZOK),
    })
    @websocket_api.async_response
    async def ws_play(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        e = msg["entity_id"]
        tagok = [e] + [t for t in msg.get("tagok") or [] if t != e]
        try:
            _foglal(conn, tagok)
            l = await lk.lista(msg["lista"])
            elemek = l["elemek"][msg["kezdo"]:] + l["elemek"][:msg["kezdo"]]
            st = hass.states.get(e)
            ma = bool(st and st.attributes.get("mass_player_type"))
            zene = hass.data[DOMAIN].get("zene")
            entries = hass.config_entries.async_loaded_entries(DOMAIN)
            if zene is None or not entries:
                raise HomeAssistantError("not_configured")
            rt = entries[0].runtime_data
            if ma:
                jo = [x for x in elemek if x["t"] == "ma"]
                if jo:
                    await hass.services.async_call("music_assistant", "play_media", {"entity_id": e, "media_id": [x["id"] for x in jo], "enqueue": "replace"}, blocking=True)
            elif msg["mod"] == "sonos":
                jo = [x for x in elemek if x["t"] in ("nas", "dz")]
                # a zenemappa számaiból a 48 kHz-es másolat, ha van (a Sonos legfeljebb 48 kHz-et dekódol)
                gyoker = str(msg.get("mappa") or "").rstrip("/")
                ossz = None
                if gyoker and msg.get("hires"):
                    try:
                        ossz = (await hass.async_add_executor_job(nas_lista, hass, gyoker))["albumok"]
                    except Exception:  # noqa: BLE001
                        ossz = None
                ids = []
                for x in jo:
                    if x["t"] == "nas" and ossz is not None and x["id"].startswith(f"{gyoker}/"):
                        ids.append(f"{gyoker}/{sonos_valtozat(ossz, [x['id'][len(gyoker) + 1:]], msg['hires'])[0]}")
                    else:
                        ids.append(x["id"])
                if ids:
                    await zene.sonos_sor(tagok, ids, 0, False)
            else:
                jo = [x for x in elemek if x["t"] == "nas"]
                if jo:
                    rt.play_tracks(e, [x["id"] for x in jo], 0)
            if not jo:
                raise HomeAssistantError("nothing_playable")
            foglalas.kozpont(hass).foglal(tagok, conn.user.id, conn.user.name or "?", msg["device"])
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "list_failed", str(err))
            return
        conn.send_result(msg["id"], {"szol": len(jo), "kimaradt": len(elemek) - len(jo)})

    for cmd in (ws_lists, ws_get, ws_create, ws_rename, ws_delete, ws_add, ws_remove, ws_now, ws_play):
        websocket_api.async_register_command(hass, cmd)
