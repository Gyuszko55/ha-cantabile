"""Sonos-sor: automatikus folytatás HA-újraindítás után, és áthelyezés a sorban.

- Folytatás: a zenemappa számait a Sonos aláírt linkkel (authSig) kapja, és a HA induláskor új aláíró kulcsot
  használ, így újraindítás után a sorban lévő linkek érvénytelenek (401): a szóló szám még végigszól, a következőt a
  Sonos már nem tudja letölteni. Induláskor ezért megnézzük minden szóló Sonos sorát; ha csupa zenemappás, régi
  linkből áll, a szám végén (a szóló számot nem szakítjuk meg) friss linkekkel újraépítjük, és a következő számmal
  folytatjuk. A sor végén (REPEAT 1) csak újraépítjük, nem indítjuk el. Szünetelő vagy álló Sonosnál nem nyúlunk
  hozzá – ott a kártya a következő gombnyomásnál tölt újra.
- Áthelyezés: a HA Sonos-integrációjának nincs sor-átrendező szolgáltatása; a hangszóró SoCo-objektumán át az
  AVTransport ReorderTracksInQueue műveletét hívjuk. Ha ez a szóló zenét megállítja (a szóló számot érintő
  átrendezésnél a Sonos ezt teszi), a szóló számot az új helyén, ugyanonnan folytatjuk.
"""

from __future__ import annotations

import base64
import json
import logging
import re
import time
from typing import Any
from urllib.parse import unquote, urlsplit

from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, Event, HomeAssistant, State, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.event import async_call_later, async_track_state_change_event

from .const import szoveg

_LOGGER = logging.getLogger(__name__)

_MEDIA = re.compile(r"/media/([^/?#]+)/([^?#]+)")
_ALAIRAS = re.compile(r"[?&]authSig=([^&\s]+)")
VARAKOZAS = 25          # mp induláskor, amíg a Sonosok csatlakoznak
SZUNET_TURES = 8        # mp: ennyivel a szám vége előtti szünet felhasználói szünet, nem a szám vége


def kiallitva(url: str) -> float | None:
    """Az aláírt link kiállítási ideje (iat, Unix mp), ha van."""
    m = _ALAIRAS.search(url or "")
    if not m:
        return None
    try:
        resz = m.group(1).split(".")[1]
        return float(json.loads(base64.urlsafe_b64decode(resz + "=" * (-len(resz) % 4)))["iat"])
    except (IndexError, ValueError, KeyError, TypeError):
        return None


def media_source_id(url: str) -> str | None:
    m = _MEDIA.search(url or "")
    return f"media-source://media_source/{m.group(1)}/{unquote(m.group(2))}" if m else None


async def sor(hass: HomeAssistant, entity_id: str) -> list[dict[str, Any]]:
    v = await hass.services.async_call("sonos", "get_queue", {"entity_id": entity_id}, blocking=True, return_response=True)
    return list((v or {}).get(entity_id) or [])


def elavult(elemek: list[dict[str, Any]], indult: float) -> list[str] | None:
    """A sor media-source azonosítói, ha a sor csupa zenemappás szám, és a linkek az indulás előttiek; különben None."""
    ids, regi = [], False
    for x in elemek:
        cid = str(x.get("media_content_id") or "")
        iat, mid = kiallitva(cid), media_source_id(cid)
        if iat is None or mid is None:
            return None
        regi = regi or iat < indult - 2
        ids.append(mid)
    return ids if ids and regi else None


async def ujraepit(hass: HomeAssistant, entity_id: str, ids: list[str], hely: int | None) -> None:
    """A sor újraépítése friss linkekkel (a HA a media-source azonosítót lejátszáskor írja alá); hely: innen indul."""
    hiv = hass.services.async_call
    s = hass.states.get(entity_id)
    ismetles = s.attributes.get("repeat") if s else None
    await hiv("media_player", "clear_playlist", {"entity_id": entity_id}, blocking=True)
    for id_ in ids:
        await hiv("media_player", "play_media", {"entity_id": entity_id, "media_content_id": id_, "media_content_type": "music", "enqueue": "add"}, blocking=True)
    if hely is not None:
        await hiv("sonos", "play_queue", {"entity_id": entity_id, "queue_position": hely}, blocking=True)
    if ismetles:
        await hiv("media_player", "repeat_set", {"entity_id": entity_id, "repeat": ismetles}, blocking=True)


class Folytato:
    """HA-újraindítás után a szóló Sonosok elavult sorának cseréje a szám végén."""

    def __init__(self, hass: HomeAssistant, indult: float) -> None:
        self.hass = hass
        self.indult = indult
        self._figyelt: dict[str, dict[str, Any]] = {}
        self._le: list[Any] = []
        self._figyelo: Any = None

    @callback
    def start(self) -> None:
        @callback
        def atnez(_most: Any) -> None:
            self.hass.async_create_task(self._atnez())

        @callback
        def indul(_: Any = None) -> None:
            self._le.append(async_call_later(self.hass, VARAKOZAS, atnez))

        if self.hass.state is CoreState.running:
            indul()
        else:
            self._le.append(self.hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, indul))

    @callback
    def stop(self) -> None:
        for le in self._le:
            le()
        self._le.clear()
        if self._figyelo:
            self._figyelo()
            self._figyelo = None

    def _sonosok(self) -> list[str]:
        reg = er.async_get(self.hass)
        return [e.entity_id for e in reg.entities.values() if e.platform == "sonos" and e.domain == "media_player" and not e.disabled]

    async def _atnez(self) -> None:
        for e in self._sonosok():
            s = self.hass.states.get(e)
            if not s or s.state != "playing" or (s.attributes.get("group_members") or [e])[0] != e:
                continue
            try:
                ids = elavult(await sor(self.hass, e), self.indult)
            except Exception:  # noqa: BLE001
                _LOGGER.debug("Cantabile: %s sora nem olvasható", e, exc_info=True)
                continue
            if not ids:
                continue
            hely = int(s.attributes.get("queue_position") or 1) - 1
            self._figyelt[e] = {"ids": ids, "hely": hely}
            _LOGGER.info("Cantabile: %s sorában újraindítás előtti linkek – a(z) %d. szám végén friss linkekkel folytatom", e, hely + 1)
        if self._figyelt and not self._figyelo:
            self._figyelo = async_track_state_change_event(self.hass, list(self._figyelt), self._valtozott)

    @callback
    def _valtozott(self, ev: Event) -> None:
        e = ev.data["entity_id"]
        f = self._figyelt.get(e)
        uj: State | None = ev.data.get("new_state")
        regi: State | None = ev.data.get("old_state")
        if not f or uj is None:
            return
        a = uj.attributes
        hely = int(a.get("queue_position") or 0) - 1
        if uj.state == "playing" and hely == f["hely"]:
            return
        if uj.state == "paused" and hely == f["hely"] and regi and regi.state == "playing":
            poz, hossz = float(a.get("media_position") or 0), float(a.get("media_duration") or 0)
            if hossz and poz < hossz - SZUNET_TURES:
                return          # felhasználói szünet a szám közben: a kártya tölt újra a következő gombnyomásnál
        self._figyelt.pop(e, None)
        if not self._figyelt and self._figyelo:
            self._figyelo()
            self._figyelo = None
        self.hass.async_create_task(self._folytat(e, f, a.get("repeat")))

    async def _folytat(self, e: str, f: dict[str, Any], ismetles: str | None) -> None:
        try:
            ids = elavult(await sor(self.hass, e), self.indult)
            if not ids:
                return          # közben máshonnan (pl. a kártyáról) már friss linkekkel újratöltötték
            kov = f["hely"] + 1
            if kov >= len(ids):
                kov = 0 if ismetles == "all" else None
            _LOGGER.info("Cantabile: %s sora friss linkekkel újraépítve%s", e, f", folytatás a(z) {kov + 1}. számmal" if kov is not None else " (a kazetta végén, megállítva)")
            await ujraepit(self.hass, e, ids, kov)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Cantabile: %s sorának újraépítése nem sikerült", e)


_SOCO_TAR: dict[str, Any] = {}       # Sonos-azonosító (RINCON_…) → SoCo, ha a hálózatról kellett megkeresni


def _soco_halozatrol(uid: str) -> Any:
    """Tartalék: a hangszóró megkeresése a hálózaton (SoCo-felfedezés), ha a HA Sonos-integrációjának belső tárolója
    nem érhető el (más HA-verzióban más a szerkezete)."""
    if uid in _SOCO_TAR:
        return _SOCO_TAR[uid]
    from soco import discovery  # noqa: PLC0415 – a Sonos-integráció függősége, csak ha kell

    for z in discovery.discover(timeout=3) or ():
        _SOCO_TAR[z.uid] = z
    return _SOCO_TAR.get(uid)


async def _soco(hass: HomeAssistant, entity_id: str) -> Any:
    ent = er.async_get(hass).async_get(entity_id)
    if not ent or ent.platform != "sonos":
        raise HomeAssistantError(szoveg(hass, "not_sonos", entity=entity_id))
    # elsőként a HA Sonos-integrációjának saját példánya (gyors, és a HA is ezt használja)
    try:
        for bej in hass.config_entries.async_entries("sonos"):
            hangszoro = getattr(getattr(bej, "runtime_data", None), "discovered", {}).get(ent.unique_id)
            if hangszoro is not None:
                return hangszoro.soco
    except Exception:  # noqa: BLE001 – más HA-verzióban más a belső szerkezet
        _LOGGER.debug("Cantabile: a Sonos-integráció belső tárolója nem olvasható", exc_info=True)
    # második: az eszköz-nyilvántartás beállítási címéből (http://<ip>:1400/…) – nyilvános adat, minden HA-verzióban
    eszk = dr.async_get(hass).async_get(ent.device_id) if ent.device_id else None
    host = urlsplit(eszk.configuration_url or "").hostname if eszk else None
    if host:
        try:
            from soco import SoCo  # noqa: PLC0415

            z = await hass.async_add_executor_job(SoCo, host)
            if await hass.async_add_executor_job(lambda: z.uid) == ent.unique_id:
                return z
        except Exception:  # noqa: BLE001
            _LOGGER.debug("Cantabile: %s nem érhető el SoCo-val", host, exc_info=True)
    try:
        z = await hass.async_add_executor_job(_soco_halozatrol, ent.unique_id)
    except ImportError as err:
        raise HomeAssistantError(szoveg(hass, "soco_missing")) from err
    if z is None:
        raise HomeAssistantError(szoveg(hass, "sonos_unavailable", entity=entity_id))
    return z


def uj_hely(c: int, honnan: int, hova: int) -> int:
    """A `c`. elem (0-tól) új helye, ha a `honnan`. elemet a `hova`. helyre tesszük."""
    if c == honnan:
        return hova
    if honnan < c <= hova:
        return c - 1
    if hova <= c < honnan:
        return c + 1
    return c


def _athelyez_szinkron(soco: Any, honnan: int, hova: int) -> str:
    """Áthelyezés; ha közben szólt a zene, és a Sonos az átrendezéstől megállt vagy máshová ugrott (a szóló számot
    érintő átrendezésnél ezt teszi), a szóló számot az új helyén, ugyanonnan folytatja."""
    info = soco.get_current_track_info()
    szolt = soco.get_current_transport_info().get("current_transport_state") == "PLAYING"
    c = int(info.get("playlist_position") or 0) - 1
    poz = info.get("position") or "0:00:00"
    # ReorderTracksInQueue: 1-től számozott, InsertBefore az eredeti számozásban értendő
    ele = hova + 1 if hova < honnan else hova + 2
    soco.avTransport.ReorderTracksInQueue(
        [("InstanceID", 0), ("StartingIndex", honnan + 1), ("NumberOfTracks", 1), ("InsertBefore", ele), ("UpdateID", 0)]
    )
    if not szolt or c < 0:
        return "nem szólt"
    uj = uj_hely(c, honnan, hova)
    for _ in range(6):
        time.sleep(0.5)
        allapot = soco.get_current_transport_info().get("current_transport_state")
        hely = int(soco.get_current_track_info().get("playlist_position") or 0) - 1
        if allapot == "PLAYING" and hely == uj:
            return "szól tovább"
        if allapot != "TRANSITIONING":
            break
    soco.play_from_queue(uj)
    try:
        soco.seek(poz)
    except Exception:  # noqa: BLE001
        _LOGGER.debug("Cantabile: a tekerés nem sikerült (%s)", poz, exc_info=True)
    return f"folytatva: {uj + 1}. szám, {poz}"


async def pozicio(hass: HomeAssistant, entity_id: str) -> dict[str, Any]:
    """A szóló szám helye és pozíciója közvetlenül a hangszórótól (a HA zenemappás számnál nem mindig jelenti)."""
    soco = await _soco(hass, entity_id)
    info = await hass.async_add_executor_job(soco.get_current_track_info)
    ora, perc, mp = ([0, 0] + [int(x) for x in str(info.get("position") or "0:00:00").split(":")])[-3:]
    return {"position": ora * 3600 + perc * 60 + mp, "track": int(info.get("playlist_position") or 0) - 1}


async def athelyez(hass: HomeAssistant, entity_id: str, honnan: int, hova: int) -> None:
    """A sor `honnan`. elemét (0-tól) a `hova`. helyre teszi (a többi elcsúszik); a szóló zene nem áll le."""
    if honnan == hova:
        return
    soco = await _soco(hass, entity_id)
    eredmeny = await hass.async_add_executor_job(_athelyez_szinkron, soco, honnan, hova)
    _LOGGER.debug("Cantabile: %s sorában %d → %d (%s)", entity_id, honnan + 1, hova + 1, eredmeny)
