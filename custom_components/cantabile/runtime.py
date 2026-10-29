"""A Cantabile futási állapota és a lejátszást segítő háttérfeladatok.

- Sorozatlejátszó: a sor nélküli lejátszókon (pl. WiiM: minden play_media lecseréli az előzőt) a kazetta számait
  egymás után indítja, körönként (az ismétlésszám szerint), bekapcsolt keverésnél körönként új sorrendben. Leáll, ha
  a lejátszón közben más kezd szólni, vagy ha egy szám 30 mp alatt sem indul el. WiiM-en UPnP-n át, hézag nélkül
  (hezagmentes.py); a sorrend menet közben átrendezhető (set_order).
- Körszámláló: Sonos-féle sorral rendelkező lejátszón 2–5 körnél a lejátszó „repeat: all”-ban játszik, ez pedig
  számolja az elindult számokat, és a lista hossza × körök száma után szünetet ad (nem stopot: a Sonos stopra a sor
  elejére ugrik). Számot számol, nem sorszámot, mert keverésnél a sorszám ugrál.
- Alvásidőzítő: Sonoson a hangszóró saját időzítője (sonos.set_sleep_timer); máshol itt fut: az utolsó 30 mp-ben
  lehalkít, leállít, majd visszaállítja a hangerőt. A közös állapotot (lejátszó → leállás ideje) az alvásidőzítő
  érzékelő mutatja, így minden kártya ugyanazt a hátralévő időt látja.
- NET-adó: a hanggal indított internetes rádióadó adatai (a kártya erről ismeri fel).
"""

from __future__ import annotations

import asyncio
import logging
import random
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import quote, quote_plus

from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import Event, HomeAssistant, State, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_state_change_event
from homeassistant.util import dt as dt_util

from . import hezagmentes
from .const import ROUNDS_INFINITE, SIGNAL_NET, SIGNAL_SLEEP

_LOGGER = logging.getLogger(__name__)

AKTIV = ("playing", "paused", "buffering")


async def var(hass: HomeAssistant, entity_id: str, feltetel: Callable[[State | None], bool], ido: float | None = None) -> bool:
    """Vár, amíg a lejátszó állapota teljesíti a feltételt; időtúllépésnél False."""
    if feltetel(hass.states.get(entity_id)):
        return True
    kesz = asyncio.Event()

    @callback
    def valtozott(ev: Event) -> None:
        if feltetel(ev.data.get("new_state")):
            kesz.set()

    le = async_track_state_change_event(hass, entity_id, valtozott)
    try:
        async with asyncio.timeout(ido):
            await kesz.wait()
        return True
    except TimeoutError:
        return False
    finally:
        le()


class Sorrend:
    """A kazetta számai körönként (első kör a kezdő számtól), keverésnél körönként új sorrendben; menet közben
    átrendezhető – a szóló szám után az új sorrend szerint folytatja."""

    def __init__(self, rt: Cantabile, entity_id: str, szamok: list[str], kezdo: int) -> None:
        self.rt, self.e, self.szamok = rt, entity_id, list(szamok)
        self.kor, self.lista, self.i, self.utolso = 1, self.szamok[kezdo:], 0, None
        self.most: str | None = None       # a ténylegesen szóló szám (az utolso a már előre megadott következő)

    def __iter__(self) -> Sorrend:
        return self

    def __next__(self) -> str:
        if self.i >= len(self.lista):
            if self.rt.rounds < ROUNDS_INFINITE and self.kor >= self.rt.rounds:
                raise StopIteration
            self.kor += 1
            self.lista, self.i = list(self.szamok), 0
            s = self.rt.hass.states.get(self.e)
            if s and s.attributes.get("shuffle"):
                random.shuffle(self.lista)
        if not self.lista:
            raise StopIteration
        self.utolso = self.lista[self.i]
        self.i += 1
        return self.utolso

    def kovetkezo(self) -> str | None:
        """A soron következő szám (előkészítéshez, pl. a DLNA-s TV videójához); keverésnél a következő kör még nem ismert."""
        if self.i < len(self.lista):
            return self.lista[self.i]
        if self.rt.rounds < ROUNDS_INFINITE and self.kor >= self.rt.rounds:
            return None
        return self.szamok[0] if self.szamok else None

    def hozzaad(self, uj: list[str]) -> None:
        """Új számok a sor végére (pl. a háttérben feltöltött saját zene); az első körben még sorra kerülnek."""
        self.szamok.extend(uj)
        if self.kor == 1:
            self.lista.extend(uj)

    def atrendez(self, uj: list[str]) -> None:
        if sorted(uj) != sorted(self.szamok):
            return
        self.szamok = list(uj)
        hol = uj.index(self.utolso) if self.utolso in uj else -1
        self.lista, self.i = uj[hol + 1:] if self.kor == 1 else uj, 0 if self.kor == 1 else hol + 1


def sonos_e(hass: HomeAssistant, entity_id: str) -> bool:
    ent = er.async_get(hass).async_get(entity_id)
    return bool(ent and ent.platform == "sonos")


class Cantabile:
    """Az integráció futási állapota (egy példány, az integráció beállításához kötve)."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.rounds = 1
        self.sleep: dict[str, str] = {}             # lejátszó → leállás ideje (ISO)
        self.net: dict[str, Any] | None = None      # hanggal indított NET-adó
        self._sorozat: dict[str, asyncio.Task] = {}
        self._sorrend: dict[str, Sorrend] = {}
        self._alvas: dict[str, Callable[[], None]] = {}
        self._szamlalo: dict[str, dict[str, int]] = {}
        self._le: list[Callable[[], None]] = []

    # ---- indítás / leállítás ----
    @callback
    def start(self) -> None:
        self._le.append(self.hass.bus.async_listen(EVENT_STATE_CHANGED, self._allapot, event_filter=self._lejatszo_e))

    @callback
    def stop(self) -> None:
        for le in self._le:
            le()
        self._le.clear()
        for t in self._sorozat.values():
            t.cancel()
        for le in self._alvas.values():
            le()

    # ---- ismétlésszám ----
    @callback
    def set_rounds(self, ertek: int) -> None:
        if ertek != self.rounds:
            self.rounds = ertek
            self._szamlalo.clear()

    # ---- sorozatlejátszó (sor nélküli lejátszók) ----
    @callback
    def play_tracks(self, entity_id: str, tracks: list[str], start: int = 0) -> None:
        self.stop_tracks(entity_id)
        self._sorozat[entity_id] = self.hass.async_create_background_task(
            self._sorozat_fut(entity_id, list(tracks), max(0, int(start))), f"cantabile tracks {entity_id}"
        )

    @callback
    def stop_tracks(self, entity_id: str | None = None) -> None:
        for e in [entity_id] if entity_id else list(self._sorozat):
            if (t := self._sorozat.pop(e, None)) and not t.done():
                t.cancel()
            self._sorrend.pop(e, None)         # a leállított kazetta nyoma se maradjon (a „következő” ne indítsa újra)

    @callback
    def add_tracks(self, entity_id: str, tracks: list[str]) -> None:
        """A szóló sorozat végére fűz (a háttérben feltöltött saját zene)."""
        if (s := self._sorrend.get(entity_id)) is not None:
            s.hozzaad(tracks)

    @callback
    def set_order(self, entity_id: str, tracks: list[str]) -> None:
        """A szóló sorozat új sorrendje (a SOR fülön húzással): a szóló szám után ebben a sorrendben folytatja."""
        if (s := self._sorrend.get(entity_id)) is not None:
            s.atrendez(tracks)

    def ugrik(self, entity_id: str, lepes: int) -> bool:
        """Következő / előző szám a sorozatlejátszásban (a szóló számhoz képest); False, ha nincs futó sorozat."""
        s = self._sorrend.get(entity_id)
        if s is None or not s.szamok or not self.tracks_running(entity_id):
            return False
        most = s.szamok.index(s.most) if s.most in s.szamok else 0
        self.play_tracks(entity_id, s.szamok, max(0, min(len(s.szamok) - 1, most + lepes)))
        return True

    def tracks_info(self, entity_id: str) -> dict[str, Any] | None:
        """A szóló sorozat számai és a szóló szám helye (a kártya ebből viszi át a kazettát másik kimenetre)."""
        s = self._sorrend.get(entity_id)
        if s is None or not self.tracks_running(entity_id):
            return None
        most = s.most or s.utolso
        return {"tracks": list(s.szamok), "current": s.szamok.index(most) if most in s.szamok else -1}

    def tracks_running(self, entity_id: str) -> bool:
        t = self._sorozat.get(entity_id)
        return bool(t and not t.done())

    async def _sorozat_fut(self, entity_id: str, szamok: list[str], kezdo: int) -> None:
        try:
            dmr = None
            try:
                dmr = await hezagmentes.wiim_renderelo(self.hass, entity_id)
            except Exception:  # noqa: BLE001
                _LOGGER.debug("Cantabile: %s UPnP-n nem érhető el, számonként indítom", entity_id, exc_info=True)
            self._sorrend[entity_id] = sorrend = Sorrend(self, entity_id, szamok, kezdo)
            if dmr is not None:
                await hezagmentes.lejatszik(self.hass, dmr, entity_id, sorrend)
                return
            for id_ in sorrend:
                sorrend.most = id_
                fajl = id_.rsplit("/", 1)[-1]
                valtozatok = {fajl, quote(fajl), quote_plus(fajl)}
                elozo = self.hass.states.get(entity_id)
                elotte = str(elozo.attributes.get("media_content_id") or "") if elozo else ""   # ami eddig szólt
                await self.hass.services.async_call(
                    "media_player", "play_media",
                    {"entity_id": entity_id, "media_content_id": id_, "media_content_type": "music"}, blocking=True,
                )
                if not await var(self.hass, entity_id, lambda st: bool(st and st.state == "playing"), 30):
                    return
                # addig vár, amíg ez a szám szól vagy szünetel. A WiiM a címbe a fájl URL-jét írja; más lejátszó (pl. Music
                # Assistant, Squeezebox) saját azonosítót ad – ott az indítás után megjelenő ÚJ azonosító (ami eltér az előtte
                # szólótól) a „lenyomat”, és ha az később változik, más szól. Ha nem derül ki, csak a leállás ér véget.
                def sajat(st: State) -> bool:
                    most = f"{st.attributes.get('media_title') or ''} {st.attributes.get('media_content_id') or ''}"
                    return any(v in most for v in valtozatok)

                def lenyomat(st: State | None) -> str:
                    return str(st.attributes.get("media_content_id") or "") if st else ""

                st = self.hass.states.get(entity_id)
                fajlos, alap = bool(st and sajat(st)), None
                if not fajlos:
                    # az azonosító néha csak a kezdés után frissül (lassú NAS): legfeljebb 10 mp-ig várja az újat
                    if await var(self.hass, entity_id, lambda s: bool(s) and (sajat(s) or lenyomat(s) not in ("", elotte)), 10):
                        st = self.hass.states.get(entity_id)
                        fajlos = bool(st and sajat(st))
                        alap = None if fajlos or not st else lenyomat(st)

                def masik(st: State | None) -> bool:
                    if not st or st.state not in AKTIV:
                        return True
                    if fajlos:                       # a lejátszó a fájl nevét mutatja: ha már nem ezt, más szól
                        return not sajat(st)
                    return alap is not None and lenyomat(st) != alap

                await var(self.hass, entity_id, masik)
                st = self.hass.states.get(entity_id)
                if st and st.state in AKTIV:
                    return          # más szól a lejátszón: a magnó leáll
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Cantabile: a sorozatlejátszás hibával leállt (%s)", entity_id)
        finally:
            if self._sorozat.get(entity_id) is asyncio.current_task():
                self._sorozat.pop(entity_id, None)
                self._sorrend.pop(entity_id, None)

    # ---- körszámláló (sorral rendelkező lejátszók, pl. Sonos) ----
    @callback
    def _lejatszo_e(self, data: dict[str, Any]) -> bool:
        return data["entity_id"].startswith("media_player.")

    @callback
    def _allapot(self, ev: Event) -> None:
        e = ev.data["entity_id"]
        uj: State | None = ev.data.get("new_state")
        regi: State | None = ev.data.get("old_state")
        if uj is None:
            return
        if uj.state in ("idle", "off") and (regi is None or regi.state != uj.state):
            self._szamlalo.pop(e, None)
            return
        a, ra = uj.attributes, (regi.attributes if regi else {})
        if not (
            (regi is None or regi.state != "playing" and uj.state == "playing")
            or a.get("queue_position") != ra.get("queue_position")
            or a.get("media_content_id") != ra.get("media_content_id")
        ):
            return
        k = self.rounds
        cid = str(a.get("media_content_id") or "")
        tagok = a.get("group_members") or [e]
        if not (
            uj.state == "playing" and 2 <= k <= 5 and a.get("repeat") == "all"
            and int(a.get("queue_size") or 0) > 0 and a.get("queue_position") is not None
            and tagok[0] == e and cid and not cid.startswith(("x-rincon-mp3radio", "x-sonosapi-"))
        ):
            return
        q, hely = int(a["queue_size"]), int(a["queue_position"])
        elozo = self._szamlalo.get(e, {})
        if elozo.get("c") == hely and elozo.get("q") == q:
            return              # ugyanaz a sorszám (pl. szünet utáni folytatás): nem új szám
        n = elozo.get("n", 0) + 1 if elozo.get("q") == q else 1
        if n > q * k:
            self._szamlalo[e] = {"n": 0, "c": hely, "q": q}
            self.hass.async_create_task(
                self.hass.services.async_call("media_player", "media_pause", {"entity_id": e}), eager_start=True
            )
        else:
            self._szamlalo[e] = {"n": n, "c": hely, "q": q}

    # ---- alvásidőzítő ----
    async def set_sleep(self, entity_id: str, minutes: float) -> None:
        if le := self._alvas.pop(entity_id, None):
            le()
        most = dt_util.utcnow()
        self.sleep = {k: v for k, v in self.sleep.items() if (dt_util.parse_datetime(v) or most) > most}
        sonos = sonos_e(self.hass, entity_id)
        if minutes and minutes > 0:
            vege = most + timedelta(minutes=minutes)
            self.sleep[entity_id] = vege.isoformat()
            if sonos:
                await self.hass.services.async_call("sonos", "set_sleep_timer", {"entity_id": entity_id, "sleep_time": int(minutes * 60)}, blocking=True)
            else:
                self._utemez(entity_id, vege)
        else:
            self.sleep.pop(entity_id, None)
            if sonos:
                await self.hass.services.async_call("sonos", "clear_sleep_timer", {"entity_id": entity_id}, blocking=True)
        async_dispatcher_send(self.hass, SIGNAL_SLEEP)

    @callback
    def restore_sleep(self, tabla: dict[str, str]) -> None:
        """Újraindítás után: a még le nem járt (nem Sonos) időzítők újraütemezése."""
        most = dt_util.utcnow()
        for e, v in tabla.items():
            vege = dt_util.parse_datetime(str(v))
            if vege and vege > most:
                self.sleep[e] = vege.isoformat()
                if not sonos_e(self.hass, e):
                    self._utemez(e, vege)

    @callback
    def _utemez(self, entity_id: str, vege: datetime) -> None:
        mp = max(0.0, (vege - dt_util.utcnow()).total_seconds() - 30)

        @callback
        def indul(_now: Any) -> None:
            self._alvas.pop(entity_id, None)
            self.hass.async_create_background_task(self._elalszik(entity_id, vege.isoformat()), f"cantabile sleep {entity_id}")

        self._alvas[entity_id] = async_call_later(self.hass, mp, indul)

    async def _elalszik(self, entity_id: str, vege: str) -> None:
        s = self.hass.states.get(entity_id)
        hangero = float(s.attributes.get("volume_level") or 0.3) if s else 0.3
        hiv = self.hass.services.async_call
        try:
            for k in range(1, 11):
                if self.sleep.get(entity_id) != vege:
                    await hiv("media_player", "volume_set", {"entity_id": entity_id, "volume_level": hangero}, blocking=True)
                    return
                await hiv("media_player", "volume_set", {"entity_id": entity_id, "volume_level": round(hangero * (1 - k / 10), 2)}, blocking=True)
                await asyncio.sleep(3)
            self.stop_tracks(entity_id)
            await hiv("media_player", "media_stop", {"entity_id": entity_id}, blocking=True)
            await hiv("media_player", "volume_set", {"entity_id": entity_id, "volume_level": hangero}, blocking=True)
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Cantabile: az alvásidőzítő hibával állt le (%s)", entity_id)
        finally:
            if self.sleep.get(entity_id) == vege:
                self.sleep.pop(entity_id, None)
                async_dispatcher_send(self.hass, SIGNAL_SLEEP)

    # ---- NET-adó ----
    @callback
    def set_net(self, adat: dict[str, Any] | None) -> None:
        self.net = adat
        async_dispatcher_send(self.hass, SIGNAL_NET)
