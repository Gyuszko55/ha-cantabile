"""Hangszóró-foglalás: egy hangszórót egyszerre csak egy felhasználó Cantabile kártyája (vagy hangparancsa) használhat.

Ha valaki egy kártyáról (vagy a saját nevében hanggal) zenét indít egy hangszórón, a hangszóró az övé lesz: a többi
felhasználó kártyáján a választóban foglaltként látszik, nem választható ki, és a parancsok sem mennek rá – a kártya
üzenetben mondja meg, ki használja. Ugyanaz a felhasználó a másik készülékén szabadon folytathatja. A foglalás
megszűnik, ha a gazdája leállítja (STOP, POWER, másik hangszóróra váltás), vagy ha a hangszóró 5 perce nem szól
(szünet, áll, ki van kapcsolva). Rendszergazda átveheti; az előző gazda kártyája erről üzenetet kap.

Websocket: `cantabile/lock/subscribe` (a foglalások és változásaik), `cantabile/lock/claim`, `cantabile/lock/release`.
A foglalás a memóriában van: HA-újraindításkor minden hangszóró szabad lesz.
"""

from __future__ import annotations

import time
from datetime import timedelta
from typing import Any, Callable

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import Unauthorized
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_time_interval

from .const import DOMAIN

TURELEM = 300                       # mp: ennyi csend után szabadul fel a hangszóró
ELLENORZES = timedelta(seconds=30)
SZOL = ("playing", "buffering")
ESZKOZOK = ("telefon", "tablet", "gep", "tv", "hang")


def kozpont(hass: HomeAssistant) -> Foglalasok:
    return hass.data[DOMAIN]["foglalas"]


class Foglalasok:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.tar: dict[str, dict[str, Any]] = {}      # entity_id → {user, nev, eszkoz, ido, csend}
        self.figyelok: set[Callable[[dict[str, Any]], None]] = set()
        self._idozito: CALLBACK_TYPE | None = None

    def lista(self) -> dict[str, dict[str, Any]]:
        return {e: {k: r[k] for k in ("user", "nev", "eszkoz", "ido")} for e, r in self.tar.items()}

    def masik(self, ids: list[str], user_id: str | None) -> tuple[str, dict[str, Any]] | None:
        """Az első hangszóró, amelyet más használ (gazda nélküli kérésnél – pl. hangállomás – bárki foglalása számít)."""
        for e in ids:
            if (r := self.tar.get(e)) and (user_id is None or r["user"] != user_id):
                return e, r
        return None

    @callback
    def foglal(self, ids: list[str], user_id: str, nev: str, eszkoz: str) -> None:
        atvett = [{"entity": e, "regi": r["user"], "uj": nev} for e in ids if (r := self.tar.get(e)) and r["user"] != user_id]
        most = time.time()
        for e in ids:
            self.tar[e] = {"user": user_id, "nev": nev, "eszkoz": eszkoz, "ido": most, "csend": None}
        if self._idozito is None:
            self._idozito = async_track_time_interval(self.hass, self._ellenoriz, ELLENORZES)
        self._ertesit(atvett)

    @callback
    def felszabadit(self, ids: list[str], user_id: str | None) -> None:
        """A saját foglalások elengedése (user_id None: mindegyiké – a lejárat)."""
        ki = [e for e in ids if (r := self.tar.get(e)) and (user_id is None or r["user"] == user_id)]
        for e in ki:
            del self.tar[e]
        if ki:
            self._ertesit()

    @callback
    def _ellenoriz(self, _now: Any = None) -> None:
        most, lejart = time.monotonic(), []
        for e, r in self.tar.items():
            s = self.hass.states.get(e)
            if s and s.state in SZOL:
                r["csend"] = None
            elif r["csend"] is None:
                r["csend"] = most
            elif most - r["csend"] >= TURELEM:
                lejart.append(e)
        self.felszabadit(lejart, None)
        if not self.tar and self._idozito:
            self._idozito()
            self._idozito = None

    @callback
    def _ertesit(self, atvett: list[dict[str, Any]] | None = None) -> None:
        uz = {"foglalt": self.lista(), **({"atvett": atvett} if atvett else {})}
        for f in list(self.figyelok):
            f(uz)

    @callback
    def stop(self) -> None:
        if self._idozito:
            self._idozito()
            self._idozito = None


def _ids(msg: dict[str, Any]) -> list[str]:
    return [e for e in msg["entity_id"] if e.startswith("media_player.")]


@callback
def regisztral(hass: HomeAssistant) -> None:
    fk = hass.data[DOMAIN]["foglalas"] = Foglalasok(hass)

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/lock/subscribe"})
    @callback
    def ws_subscribe(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        @callback
        def kuld(uz: dict[str, Any]) -> None:
            conn.send_message(websocket_api.event_message(msg["id"], uz))

        fk.figyelok.add(kuld)
        conn.subscriptions[msg["id"]] = lambda: fk.figyelok.discard(kuld)
        conn.send_result(msg["id"])
        kuld({"foglalt": fk.lista()})

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/lock/claim",
        vol.Required("entity_id"): cv.entity_ids,
        vol.Optional("device", default="gep"): vol.In(ESZKOZOK),
        vol.Optional("takeover", default=False): bool,
    })
    @callback
    def ws_claim(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        user, ids = conn.user, _ids(msg)
        if msg["takeover"] and not user.is_admin:
            raise Unauthorized
        if not msg["takeover"] and (m := fk.masik(ids, user.id)):
            e, r = m
            conn.send_result(msg["id"], {"ok": False, "entity": e, "user": r["user"], "nev": r["nev"], "eszkoz": r["eszkoz"]})
            return
        fk.foglal(ids, user.id, user.name or "?", msg["device"])
        conn.send_result(msg["id"], {"ok": True})

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/lock/release", vol.Required("entity_id"): cv.entity_ids})
    @callback
    def ws_release(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        fk.felszabadit(_ids(msg), conn.user.id)
        conn.send_result(msg["id"])

    for c in (ws_subscribe, ws_claim, ws_release):
        websocket_api.async_register_command(hass, c)
