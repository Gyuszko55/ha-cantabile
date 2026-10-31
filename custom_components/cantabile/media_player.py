"""Cantabile TV-lejátszók: a beállításokban kiválasztott TV-nként egy `media_player` (lásd tv.py).

Cast-eszköznél (cast integráció) a TV-oldal szól és rajzol; DLNA-s TV-nél (dlna_dmr) a TV maga játssza a zenét, a
képernyőre pedig a szám adatlapja kerül borítóként (tv_kep.py) – ilyenkor ez a lejátszó a DLNA-lejátszót vezérli, és
annak állapotát mutatja.

Tükör: ha a kártyán a TV-ről másik hangszóróra váltanak, a (Cast-os) TV-oldal hang nélkül tovább mutatja, ami ott szól –
a szám adatait, a borítót, a váltakozó előadóképeket és a haladást –, számváltáskor frissül. Véget ér, ha a TV-n újra
lejátszás indul, a TV-t kikapcsolják, vagy ha a követett hangszóró 10 perce nem szól.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import re
import time
from datetime import datetime, timedelta
from typing import Any

from homeassistant.components import websocket_api
from homeassistant.components.media_player import (
    MediaPlayerEntity, MediaPlayerEntityFeature, MediaPlayerState, MediaType,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_call_later, async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import CONF_TV_PLAYERS
from .entity import CantabileEntity
from .tv import TV_DASHBOARD, TV_VIEW, kozpont

_LOGGER = logging.getLogger(__name__)

TUKOR_CSEND = 600          # mp: ennyi csend után a tükör véget ér (a TV elengedi a képernyőt)
# Sonos-rádió és más élő adások azonosítói (a tükörben „ON AIR” jelenik meg)
RADIO_ID = re.compile(r"^(x-rincon-mp3radio|x-sonosapi-stream|x-sonosapi-radio|x-sonosapi-hls|aac|hls-radio):", re.I)
# a Sonos szolgáltatás-azonosítója (sid=…) → a zeneszolgáltató neve (a kártya forrás-dobozával egyezően)
# amit a TV-oldaltól várunk: ha valamelyik hiányzik (egy frissítés után még a régebbi kártyakód fut a TV-n), az oldal a
# következő lejátszáskor / tükrözéskor újra kimegy (a Cast-vevő a HA újraindulásakor csak újracsatlakozik, a kódot nem tölti újra)
TUKOR_KEPES = {"mirror", "source", "clock24"}
SONOS_SID = {2: "Deezer", 9: "Spotify", 12: "Spotify", 174: "TIDAL", 204: "Apple Music", 284: "YouTube Music", 160: "SoundCloud"}

TAMOGATOTT = (
    MediaPlayerEntityFeature.PLAY_MEDIA | MediaPlayerEntityFeature.PLAY | MediaPlayerEntityFeature.PAUSE
    | MediaPlayerEntityFeature.STOP | MediaPlayerEntityFeature.SEEK | MediaPlayerEntityFeature.VOLUME_SET
    | MediaPlayerEntityFeature.VOLUME_STEP | MediaPlayerEntityFeature.VOLUME_MUTE | MediaPlayerEntityFeature.TURN_OFF
    | MediaPlayerEntityFeature.NEXT_TRACK | MediaPlayerEntityFeature.PREVIOUS_TRACK
)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities(CantabileTv(hass, entry, cast) for cast in entry.options.get(CONF_TV_PLAYERS, []))


class CantabileTv(CantabileEntity, MediaPlayerEntity):
    _attr_supported_features = TAMOGATOTT
    _attr_media_content_type = MediaType.MUSIC
    _attr_icon = "mdi:television-play"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, cast: str) -> None:
        super().__init__(entry, f"tv_{cast.split('.', 1)[-1]}")
        self.cast = cast
        st = hass.states.get(cast)
        nev = str(st.attributes.get("friendly_name") if st else cast.split(".", 1)[-1]).replace("(Cast)", "").replace("DLNA", "").strip()
        self._attr_name = f"TV · {nev}"
        self.dashboard, self.view = TV_DASHBOARD, TV_VIEW
        bej = er.async_get(hass).async_get(cast)
        self.dlna = bool(bej and bej.platform == "dlna_dmr")
        self.oldal: tuple[websocket_api.ActiveConnection, int] | None = None
        self.oldal_jott = asyncio.Event()
        self._allapot = MediaPlayerState.OFF
        self._meta: dict[str, Any] = {}
        self._mcid: str | None = None
        self._src: str | None = None
        self._poz: float | None = None
        self._hossz: float | None = None
        self._poz_ido = None
        self._cue_i: int | None = None          # CUE-s albumnál a szóló szám sorszáma (a TV-oldal jelenti)
        self._cim_tar: tuple[str | None, str | None] = (None, None)
        self._tukor: str | None = None          # a hangszóró, amelyet a TV-oldal hang nélkül mutat
        self._tukor_le: list[Any] = []
        self._tukor_kulcs: tuple[Any, ...] | None = None
        self._tukor_csend: float | None = None
        self._tukor_javit: dict[str, float] | None = None   # a tükörben: a fájl hossza és a számváltás ideje (ha a hangszóró elavultat jelent)
        self._szolt = 0.0                       # mikor szólt utoljára (a váltáskor a tükör csak a szóló TV-ről indul)
        self.oldal_kepes: set[str] = set()      # mit tud a TV-n futó oldal (a régebbi kártyakód nem ismeri a tükröt)
        self._ujrakuldes: asyncio.Task | None = None
        self._eltolas = 0.0                     # DLNA: a köztes pontról induló videó kezdete (mp)
        self._elo = False                       # DLNA: élő videó szól (nem tekerhető)
        self._dlna_ido = None                   # DLNA: mikor indult a mostani szám (ha a TV nem jelenti a helyét)
        self.ujratoltve: str | None = None     # erre a kártyaváltozatra már újraküldtük az oldalt (ne ismételje)
        self.ujratolt = False                  # az oldal újraküldése alatt a lejátszó nem megy „ki”
        self.ujrakuldes_zar = asyncio.Lock()   # egyszerre egy újraküldés; a lejátszás megvárja
        self.inditas = 0                       # a lejátszás-indítások száma (az újraküldés ne írja felül az újabbat)
        self._ugrik_le: Any = None

    async def async_added_to_hass(self) -> None:
        kp = kozpont(self.hass)
        kp.lejatszok[self.entity_id] = self
        if regi := kp.atadas.pop(self.entity_id, None):        # újratöltés: átvesszük az elődtől
            self.oldal = regi["oldal"]
            if self.oldal:
                self.oldal_jott.set()
            self._meta, self._src, self._mcid, self._cue_i = regi["meta"], regi["src"], regi["mcid"], regi["cue_i"]
            self._allapot, self._poz, self._poz_ido, self._hossz = regi["allapot"], regi["poz"], regi["poz_ido"], regi["hossz"]
        self.async_on_remove(async_track_state_change_event(self.hass, [self.cast], self._cast_valtozott))

    async def async_will_remove_from_hass(self) -> None:
        self.tukor_vege(kuld=False, felejt=False)      # újratöltés / leállás: a tükör a mentésből folytatódik
        if self._ugrik_le:
            self._ugrik_le()
            self._ugrik_le = None
        kp = kozpont(self.hass)
        kp.lejatszok.pop(self.entity_id, None)
        kp.atadas[self.entity_id] = {"oldal": self.oldal, "meta": self._meta, "src": self._src, "mcid": self._mcid, "cue_i": self._cue_i,
                                     "allapot": self._allapot, "poz": self._poz, "poz_ido": self._poz_ido, "hossz": self._hossz}

    def meta_ismert(self) -> bool:
        return bool(self._meta) or self._allapot not in (MediaPlayerState.PLAYING, MediaPlayerState.PAUSED)

    @callback
    def _cast_valtozott(self, _ev: Event) -> None:
        self.async_write_ha_state()             # hangerő, elérhetőség; DLNA-nál az állapot és a pozíció is

    def _cel(self) -> dict[str, Any]:
        st = self.hass.states.get(self.cast)
        return dict(st.attributes) if st else {}

    # ---- a TV-oldal kapcsolata ----
    @callback
    def oldal_be(self, conn: websocket_api.ActiveConnection, msg_id: int) -> None:
        self.oldal = (conn, msg_id)
        self.oldal_jott.set()
        if self._allapot == MediaPlayerState.OFF:
            self._allapot = MediaPlayerState.IDLE
        self.async_write_ha_state()
        if not self.dlna and self._tukor is None and self._allapot != MediaPlayerState.PLAYING:
            self.hass.async_create_background_task(self._tukor_folytat(), f"cantabile_tv_tukor_vissza_{self.entity_id}")

    async def _tukor_folytat(self) -> None:
        """A TV-oldal visszajelentkezett (pl. újraindítás után): ha tükrözött, folytatja – ha a hangszóró még nem szól
        (az is épp indul), legfeljebb 3 percig vár rá."""
        from .runtime import var    # noqa: PLC0415

        kp = kozpont(self.hass)
        await kp.tukrok_kesz.wait()
        m = kp.tukrok.get(self.entity_id)
        if not m or time.time() - float(m.get("ido") or 0) > 12 * 3600:
            return
        cel = m["cel"]
        szol = lambda st: bool(st and st.state in ("playing", "paused"))  # noqa: E731
        if not await var(self.hass, cel, szol, 180):
            return
        await asyncio.sleep(2)                     # az oldal berendezkedik
        if self.oldal is not None and self._tukor is None and self._allapot != MediaPlayerState.PLAYING:
            self.tukroz(cel)

    @callback
    def oldal_ki(self, conn: websocket_api.ActiveConnection, msg_id: int) -> None:
        if self.oldal == (conn, msg_id):
            self.tukor_vege(kuld=False, felejt=False)  # a kapcsolat szakadt meg (újraindítás, TV ki): a tükör megmarad
            self.oldal = None
            self.oldal_jott.clear()
            if self.ujratolt:                  # frissítés miatt újraküldjük: az állapot marad, az új oldal folytatja
                return
            self.ki()

    @callback
    def ki(self) -> None:
        """Nincs oldal a TV-n: a lejátszó „ki”."""
        self._allapot = MediaPlayerState.OFF
        self._poz = None
        self.async_write_ha_state()

    @callback
    def uzen(self, adat: dict[str, Any]) -> bool:
        if self.oldal is None:
            return False
        conn, msg_id = self.oldal
        conn.send_message(websocket_api.event_message(msg_id, adat))
        return True

    @callback
    def jelentes(self, msg: dict[str, Any]) -> None:
        if msg.get("src") and self._src and msg["src"] != self._src:
            return                              # egy előző szám késve érkező jelentése
        if msg.get("meta") and not self._meta:
            # újracsatlakozás (pl. HA-újraindítás után): a TV-oldal még szól – visszavesszük, mi az
            self._meta, self._src = msg["meta"], msg.get("src") or self._src
        if "track" in msg:
            self._cue_i = msg["track"]
        self._allapot = {"playing": MediaPlayerState.PLAYING, "paused": MediaPlayerState.PAUSED}.get(msg["state"], MediaPlayerState.IDLE)
        if self._allapot == MediaPlayerState.PLAYING:
            self._szolt = time.monotonic()
        if msg.get("position") is not None:
            self._poz, self._poz_ido = msg["position"], dt_util.utcnow()
        if msg.get("duration"):
            self._hossz = msg["duration"]
        self.async_write_ha_state()

    # ---- állapot ----
    @property
    def available(self) -> bool:
        st = self.hass.states.get(self.cast)
        return st is not None and st.state != "unavailable"

    @property
    def state(self) -> MediaPlayerState:
        if self.dlna:
            st = self.hass.states.get(self.cast)
            allapot = st.state if st else "off"
            if allapot in ("playing", "buffering"):
                return MediaPlayerState.PLAYING
            if allapot == "paused":
                return MediaPlayerState.PAUSED
            return MediaPlayerState.OFF if allapot in ("off", "unavailable", "unknown") else MediaPlayerState.IDLE
        return self._allapot

    @property
    def volume_level(self) -> float | None:
        st = self.hass.states.get(self.cast)
        return st.attributes.get("volume_level") if st else None

    @property
    def is_volume_muted(self) -> bool | None:
        st = self.hass.states.get(self.cast)
        return st.attributes.get("is_volume_muted") if st else None

    def _cue(self) -> dict[str, Any] | None:
        cue = self._meta.get("cue")
        if cue and self.dlna:
            # DLNA: nincs TV-oldal, ami jelentené – a TV lejátszási pozíciójából
            a = self._cel()
            poz = float(a.get("media_position") or 0) + self._eltolas
            if self.hass.states.get(self.cast) and self.hass.states.get(self.cast).state == "playing" and a.get("media_position_updated_at"):
                poz += (dt_util.utcnow() - a["media_position_updated_at"]).total_seconds()
            self._cue_i = max((i for i, t in enumerate(cue) if poz >= t["start"] - 0.2), default=0)
        if cue and self._cue_i is not None and 0 <= self._cue_i < len(cue):
            return cue[self._cue_i]
        return None

    @property
    def media_content_id(self) -> str | None:
        # zenemappás fájlnál belső webcím (mint a WiiM-é): a kártya ebből ismeri fel a NAS-t és a számot, a VU-elemző a fájlt
        if self._src and self._src.startswith("/media/") and not self.dlna:
            if self._cim_tar[0] != self._src:            # számonként egyszer írja alá
                self._cim_tar = (self._src, kozpont(self.hass).belso_cim(self._src.split("?")[0]))
            return self._cim_tar[1] or self._mcid
        return self._mcid

    @property
    def media_title(self) -> str | None:
        if t := self._cue():
            return t.get("title")
        return self._meta.get("title") or self._meta.get("station")

    @property
    def media_artist(self) -> str | None:
        if (t := self._cue()) and t.get("performer"):
            return t["performer"]
        return self._meta.get("artist")

    @property
    def media_track(self) -> int | None:
        if t := self._cue():
            return t.get("n")
        return int(self._meta["track"]) if str(self._meta.get("track") or "").isdigit() else None

    @property
    def media_album_name(self) -> str | None:
        return self._meta.get("album")

    def _cue_hatar(self) -> tuple[float, float | None] | None:
        """A szóló CUE-szám eleje és vége (mp) a fájlban."""
        t = self._cue()
        if t is None:
            return None
        cue, i = self._meta["cue"], self._cue_i or 0
        vege = cue[i + 1]["start"] if i + 1 < len(cue) else (self._hossz or self._meta.get("duration"))
        return t["start"], vege

    @property
    def media_duration(self) -> float | None:
        # a köztes pontról induló / élő videó hossza nem a számé: ilyenkor a szám teljes hossza
        if self.dlna and self._cel().get("media_duration") and not self._eltolas and not self._elo:
            return self._cel()["media_duration"]
        if (h := self._cue_hatar()) and h[1]:
            return round(h[1] - h[0], 1)       # CUE-s albumnál a szám hossza, nem a fájlé
        return self._hossz or self._meta.get("duration") or None

    @property
    def media_position(self) -> float | None:
        if self.dlna:
            poz = self._cel().get("media_position")
            if poz is None and self._dlna_ido is not None and self.state in (MediaPlayerState.PLAYING, MediaPlayerState.PAUSED):
                return self._eltolas            # a TV nem jelenti: a kezdőpont az indulás idejével (a kártya számol tovább)
            if poz is not None and self._eltolas:
                poz = float(poz) + self._eltolas
            if (h := self._cue_hatar()) and poz is not None:
                return max(0.0, float(poz) - h[0])          # CUE-s albumnál a számon belüli idő
            return poz
        if (h := self._cue_hatar()) and self._poz is not None:
            return max(0.0, self._poz - h[0])
        return self._poz

    @property
    def media_position_updated_at(self):  # noqa: ANN201
        if self.dlna:
            return self._cel().get("media_position_updated_at") or self._dlna_ido
        return self._poz_ido

    @property
    def media_image_url(self) -> str | None:
        kep = self._meta.get("cover") or self._meta.get("artist_image")
        if kep and kep.startswith("/"):
            return None                         # a saját (aláírt) borító a HA proxyján nem kell
        return kep

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        a = {"cast_entity": self.cast, "tv_mode": "dlna" if self.dlna else "cast", "tv_page": self.oldal is not None}
        if self._tukor:
            a["mirror_of"] = self._tukor
        if self._meta.get("cue"):
            a["cue_tracks"] = len(self._meta["cue"])       # a kártya ilyenkor a lejátszóval léptet (fájlon belül)
        return a

    def pillanat(self) -> dict[str, Any] | None:
        """Ha a TV-oldal szól vagy szünetel: mit (cím, adatlap) és honnan – az oldal újraküldése után innen folytatja."""
        if self.dlna or self._tukor or self._src is None or self._allapot not in (MediaPlayerState.PLAYING, MediaPlayerState.PAUSED):
            return None
        # a fájlon belüli (nyers) pozíció, a legutóbbi jelentés óta eltelt idővel
        poz = float(self._poz or 0.0)
        if self._allapot == MediaPlayerState.PLAYING and self._poz_ido is not None:
            poz += (dt_util.utcnow() - self._poz_ido).total_seconds()
        return {"src": self._src, "mcid": self._mcid, "meta": self._meta, "poz": float(poz), "szunet": self._allapot == MediaPlayerState.PAUSED}

    async def folytat(self, p: dict[str, Any]) -> None:
        src = p["src"]
        if p.get("mcid"):                     # friss, aláírt cím (HA-újraindítás után a régi link már érvénytelen)
            try:
                kp = kozpont(self.hass)
                src = kp.forras(await kp.feloldas(p["mcid"], self.entity_id))[0] or src
            except Exception:  # noqa: BLE001
                _LOGGER.debug("Cantabile TV: a cím újrafeloldása nem sikerült (%s)", p["mcid"], exc_info=True)
        self._src = src
        self.uzen({"cmd": "play", "src": src, "meta": p["meta"], "t": time.time()})
        self._allapot = MediaPlayerState.PLAYING

        @callback
        def ugrik(_now: Any) -> None:
            self._ugrik_le = None
            if self._src != src:              # közben más indult: azt nem tekerjük, nem állítjuk meg
                return
            if p["poz"] > 1:
                self.uzen({"cmd": "seek", "position": p["poz"]})
            if p["szunet"]:
                self.uzen({"cmd": "pause"})
        if self._ugrik_le:
            self._ugrik_le()
        self._ugrik_le = async_call_later(self.hass, 1.5, ugrik)
        self.async_write_ha_state()

    def ujrakuldes_fut(self) -> bool:
        return self._ujrakuldes is not None and not self._ujrakuldes.done()

    @callback
    def ujrakuldes_indit(self) -> None:
        async def fut() -> None:
            try:
                await kozpont(self.hass).ujrakuld(self)
            except Exception as err:  # noqa: BLE001 – a TV közben elérhetetlen lett
                _LOGGER.warning("Cantabile TV: a TV-oldal frissítése nem sikerült (%s): %s", self.cast, err)
        self._ujrakuldes = self.hass.async_create_background_task(fut(), f"cantabile_tv_ujrakuld_{self.entity_id}")

    # ---- tükör ----
    def friss_szolt(self) -> bool:
        """Szól, szünetel, vagy az elmúlt percben szólt (a kártya váltáskor előbb leállítja, csak utána vált)."""
        return self._tukor is not None or self._allapot in (MediaPlayerState.PLAYING, MediaPlayerState.PAUSED) or time.monotonic() - self._szolt < 60

    @callback
    def tukroz(self, cel: str, ellenoriz: bool = True) -> None:
        """A TV-oldal hang nélkül a `cel` hangszórót mutatja (DLNA-s TV-n nincs ilyen: ott a TV maga játszik)."""
        if self.dlna or self.oldal is None or cel == self.entity_id or cel == self._tukor:
            return
        if not TUKOR_KEPES <= self.oldal_kepes or (ellenoriz and kozpont(self.hass).regi_kod(self)):
            # régi oldal fut a TV-n: újraküldjük a friss kártyával, és utána indul a tükör
            if not self.ujrakuldes_fut() and not self.ujrakuldes_zar.locked():
                self._ujrakuldes = self.hass.async_create_background_task(self._friss_oldallal_tukroz(cel), f"cantabile_tv_ujrakuld_{self.entity_id}")
            return
        self.tukor_vege(kuld=False)
        self._tukor, self._tukor_kulcs, self._tukor_csend = cel, None, None
        self._allapot, self._src, self._meta, self._mcid, self._poz, self._cue_i = MediaPlayerState.IDLE, None, {}, None, None, None
        self._tukor_le = [
            async_track_state_change_event(self.hass, [cel], self._tukor_valtozott),
            async_track_time_interval(self.hass, self._tukor_ellenoriz, timedelta(seconds=60)),
        ]
        self._tukor_frissit(elso=True)
        kozpont(self.hass).tukor_ment(self.entity_id, cel)
        self.async_write_ha_state()

    async def _friss_oldallal_tukroz(self, cel: str) -> None:
        try:
            await kozpont(self.hass).ujrakuld(self, folytatva=False)   # a tükör jön, a régi számot nem indítjuk újra
        except Exception as err:  # noqa: BLE001 – a TV elérhetetlen lett: nincs tükör
            _LOGGER.warning("Cantabile TV: a TV-oldal frissítése nem sikerült (%s): %s", self.cast, err)
            return
        if TUKOR_KEPES <= self.oldal_kepes:
            self.tukroz(cel, ellenoriz=False)               # épp most kapta meg a friss oldalt

    @callback
    def tukor_vege(self, kuld: bool = True, felejt: bool = True) -> None:
        if self._tukor is None:
            return
        if felejt and not self.hass.is_stopping:
            kozpont(self.hass).tukor_ment(self.entity_id, None)
        for le in self._tukor_le:
            le()
        self._tukor_le, self._tukor = [], None
        if kuld:
            self.uzen({"cmd": "stop"})
        self.async_write_ha_state()

    @callback
    def _tukor_valtozott(self, _ev: Event) -> None:
        self._tukor_frissit()

    @callback
    def _tukor_ellenoriz(self, _now: Any = None) -> None:
        if self._tukor_csend is not None and time.monotonic() - self._tukor_csend >= TUKOR_CSEND:
            self.tukor_vege()

    @callback
    def _tukor_frissit(self, elso: bool = False) -> None:
        st = self.hass.states.get(self._tukor) if self._tukor else None
        if st is None:
            return
        a = st.attributes
        allapot = {"playing": "playing", "buffering": "playing", "paused": "paused"}.get(st.state, "idle")
        if allapot == "playing":
            self._tukor_csend = None
        elif self._tukor_csend is None:
            self._tukor_csend = time.monotonic()
        ido = a.get("media_position_updated_at")
        allas = self._tukor_allas({"target": self._tukor, "state": allapot, "position": a.get("media_position"), "duration": a.get("media_duration"),
                                   "at": ido.timestamp() if isinstance(ido, datetime) else time.time()})
        if elso:
            self.uzen({"cmd": "mirror", **allas})       # a TV-oldal azonnal elhallgat; az adatok utána jönnek
        kulcs = (a.get("media_content_id"), a.get("media_title"), a.get("media_artist"), a.get("media_album_name"))
        if kulcs != self._tukor_kulcs and any(kulcs):            # a NAS-számnál a Sonos csak a címet adja (cím, előadó nélkül)
            self._tukor_kulcs = kulcs
            self._tukor_javit = None                 # új szám: a régi javítás nem érvényes
            self.hass.async_create_background_task(self._tukor_meta(st, allas, kulcs), f"cantabile_tv_tukor_{self.entity_id}")
        elif not elso:
            self.uzen({"cmd": "mirror_state", **allas})

    def _tukor_allas(self, allas: dict[str, Any]) -> dict[str, Any]:
        """A hangszóró elavult hossza / helye helyett a fájl hossza és a számváltás óta eltelt idő."""
        j = getattr(self, "_tukor_javit", None)
        if not j:
            return allas
        most = time.time()
        if allas["state"] == "playing":
            if "szunet" in j:                       # szünet után: a szünet ideje nem számít bele
                j["t0"] += most - j.pop("szunet")
            return {**allas, "duration": j["hossz"], "position": 0.0, "at": j["t0"]}
        j.setdefault("szunet", most)
        return {**allas, "duration": j["hossz"], "position": min(j["hossz"], j["szunet"] - j["t0"]), "at": most}

    async def _tukor_meta(self, st: Any, allas: dict[str, Any], kulcs: tuple[Any, ...]) -> None:
        """A követett hangszóró szóló számának adatai: zenemappás fájlnál a címkék, a mappa képei és a borító (mint a TV
        saját lejátszásánál), streamnél a hangszóró adatai és borítója; mindkettőnél az előadó képei (Deezer, TheAudioDB)."""
        kp, a = kozpont(self.hass), st.attributes
        mcid = str(a.get("media_content_id") or "")
        fajl = None
        if re.match(r"^(https?://|/media/)", mcid):
            with contextlib.suppress(Exception):
                _, fajl = kp.forras(mcid)
        radio = not fajl and (bool(a.get("media_channel")) or bool(RADIO_ID.match(mcid)))
        # zenemappás fájlnál a fájl saját címkéi számítanak (a WiiM pl. a fájl nevét jelenti címként)
        extra: dict[str, Any] = {"kind": "track"} if fajl else {
            "title": a.get("media_title"), "artist": a.get("media_artist"), "album": a.get("media_album_name"),
            "kind": "stream" if radio else "track", "station": a.get("media_channel") if radio else None}
        if not fajl and a.get("entity_picture"):
            extra["cover"] = a["entity_picture"]
        if radio and re.search(r"://|^[\w.-]+\.[a-z]{2,}(/|:|$)", str(extra.get("title") or ""), re.I):
            extra["title"] = None                   # a hangszóró a stream címét adja címként: az adó neve kell helyette
        try:
            meta = await kp.adatok(mcid, fajl, extra)
        except Exception:  # noqa: BLE001 – a kép nélküli adatlap is jobb a semminél
            _LOGGER.debug("Cantabile TV: a tükör adatai nem jöttek meg (%s)", self._tukor, exc_info=True)
            meta = {k: v for k, v in extra.items() if v}
        if not radio:
            meta.pop("station", None)
        meta["source"] = await self._tukor_forras(st, mcid, fajl, radio)
        if self._tukor is None or self._tukor_kulcs != kulcs:
            return                                  # közben új szám jött, vagy véget ért a tükör
        # hézagmentes lejátszásnál (pl. WiiM) a hangszóró a régi szám hosszát / helyét jelentheti: a fájl hossza számít, és
        # a hely a számváltástól
        hossz = float(meta.get("duration") or 0)
        self._tukor_javit = None
        if fajl and hossz:
            jh = a.get("media_duration")
            if jh is None or abs(float(jh) - hossz) > 2 or allas.get("position") is None:
                self._tukor_javit = {"hossz": hossz, "t0": time.time()}
            allas = self._tukor_allas(allas)
        self.uzen({"cmd": "mirror", "meta": {k: v for k, v in meta.items() if not k.startswith("_")}, **allas})

    async def _tukor_forras(self, st: Any, mcid: str, fajl: str | None, radio: bool) -> str:
        """„Sonos 2 · Deezer”: hol szól (a kártyán beállított név) és honnan jön (NAS, a Sonos-szolgáltató, rádió)."""
        from .music import hangszoro_nev

        hol = None
        with contextlib.suppress(Exception):
            hol = await hangszoro_nev(self.hass, st.entity_id)
        hol = hol or st.attributes.get("friendly_name") or st.entity_id
        if fajl:
            honnan = "NAS"
        elif radio:
            honnan = "Radio"
        elif m := re.search(r"[?&]sid=(\d+)", mcid):
            honnan = SONOS_SID.get(int(m.group(1)))
        elif mcid.startswith(("spotify:", "x-sonos-spotify:")) or "open.spotify.com" in mcid:
            honnan = "Spotify"
        elif "deezer.com" in mcid:
            honnan = "Deezer"
        elif "tidal.com" in mcid:
            honnan = "TIDAL"
        else:
            honnan = st.attributes.get("app_name") or None
        return " · ".join(x for x in (hol, honnan) if x)

    # ---- vezérlés ----
    async def async_play_media(self, media_type: str, media_id: str, **kwargs: Any) -> None:
        self.tukor_vege(kuld=False)
        kp = kozpont(self.hass)
        self.inditas += 1
        if self.ujrakuldes_zar.locked():                  # épp újraküldjük az oldalt: megvárjuk (utána erre az oldalra megy)
            async with self.ujrakuldes_zar:
                pass
        if not self.dlna and self.oldal is not None and (not TUKOR_KEPES <= self.oldal_kepes or kp.regi_kod(self)):
            self.ujratoltve = kp.kartya_v()
            await kp.ujrakuld(self, folytatva=False)   # régebbi TV-oldal fut: a friss kártyával indul (az új szám jön)
        cim = await kp.feloldas(media_id, self.entity_id)
        src, fajl = kp.forras(cim)
        extra = dict(kwargs.get("extra") or {})
        kezdet = float(extra.pop("start_position", 0) or 0)      # hangszóróváltás: innen indul (tekerés nélkül)
        meta = await kp.adatok(cim, fajl, extra.get("metadata") or extra, hatter=not self.dlna)
        if self.dlna:
            await self._dlna_lejatszas(media_id, meta, fajl, kezdet)
            return
        meta = {k: v for k, v in meta.items() if not k.startswith("_")}
        await kp.oldalt_kuld(self)
        self._mcid, self._src, self._meta, self._cue_i = media_id, src, meta, (0 if meta.get("cue") else None)
        self._hossz, self._poz, self._poz_ido = meta.get("duration") or None, kezdet, dt_util.utcnow()
        self._allapot = MediaPlayerState.PLAYING     # az oldal jelentése felülírja (pl. hiba → idle)
        self.uzen({"cmd": "play", "src": src, "meta": meta, "t": time.time(), **({"start": kezdet} if kezdet > 1 else {})})
        self.async_write_ha_state()

    async def _dlna_lejatszas(self, media_id: str, meta: dict[str, Any], fajl: str | None, kezdet: float = 0) -> None:
        """DLNA-s TV: zenemappás számnál „videó” (álló adatlap + a zene, tv.py) – így teljes képernyőn látszik; ha az nem
        készül el (vagy webes adó), a zene borítóként kapott adatlappal megy (azt nem minden TV mutatja)."""
        kp = kozpont(self.hass)
        adat = {k: v for k, v in {"artist": meta.get("artist"), "albumName": meta.get("album"), "trackNumber": meta.get("track"),
                                   "releaseDate": meta.get("year"), "genre": meta.get("genre")}.items() if v}
        extra: dict[str, Any] = {"title": meta.get("title") or meta.get("station") or "Cantabile", "metadata": adat}
        self._mcid, self._meta = media_id, {k: v for k, v in meta.items() if not k.startswith("_")}
        if fajl and kezdet > 3 and kezdet < float(meta.get("duration") or 0) - 5:
            # hangszóróváltás: élő videó a kezdőponttól (azonnal indul, nem kell megvárni a kódolást)
            video = await kp.dlna_elo(meta, fajl, kezdet)
        elif fajl:
            # a videó legfeljebb 15 mp-ig készülhet (egy órás, CUE-lapos albumfájlnál ennél tovább tart): utána a zene
            # borítóval indul, a videó a háttérben elkészül a következő alkalomra
            # hangszóróváltásnál a videó ott kezdődik, ahol a régi tartott (a DLNA-s TV-k nem mindig tudnak tekerni)
            kesz = self.hass.async_create_background_task(kp.dlna_video(meta, fajl, kezdet), f"cantabile_tv_video_{self.entity_id}")
            try:
                video = await asyncio.wait_for(asyncio.shield(kesz), 15)
            except TimeoutError:
                video = None
                if kezdet:
                    kesz.cancel()                     # a köztes pontról induló videó később már nem kell
        elif re.match(r"^https?://", cim := await kp.feloldas(media_id, self.entity_id)):
            video = await kp.dlna_elo(meta, cim)          # webes adó: élő videó
        else:
            video = None
        hossz = float(meta.get("duration") or 0)
        # a videó a kezdőponttól indul: a TV ettől számolja az időt (a pozíció és a tekerés ennyivel eltolva)
        self._eltolas = float(round(kezdet)) if video and fajl and 3 < kezdet < hossz - 5 else 0.0
        self._elo = bool(video and "/live/" in str(video)) or bool(video and not fajl)
        self._dlna_ido = dt_util.utcnow()
        if video:
            cel, fajta = video, "video"
        else:
            cel, fajta = media_id, "music"
            if kep := await kp.dlna_kep(meta):
                extra["thumb"] = kep
        await self.hass.services.async_call("media_player", "play_media", {
            "entity_id": self.cast, "media_content_id": cel, "media_content_type": fajta, "extra": extra}, blocking=True)
        self.async_write_ha_state()
        if not self._eltolas and kezdet > 3:
            # nincs köztes pontról induló videó: a TV-t tekerjük oda (ha tudja)
            self.hass.async_create_background_task(self._dlna_teker(kezdet, time.monotonic()), f"cantabile_tv_teker_{self.entity_id}")
        if video:
            self.hass.async_create_background_task(self._kovetkezot_keszit(), f"cantabile_tv_elokeszit_{self.entity_id}")

    async def _dlna_teker(self, poz: float, t0: float) -> None:
        from .runtime import var    # noqa: PLC0415

        if await var(self.hass, self.cast, lambda st: bool(st and st.state == "playing"), 20):
            await asyncio.sleep(1.5)
            with contextlib.suppress(Exception):
                await self._cel_hiv("media_seek", seek_position=round(poz + time.monotonic() - t0))

    async def _kovetkezot_keszit(self) -> None:
        """Albumnál a következő szám videója a háttérben elkészül, így a számváltásnál nincs várakozás."""
        await asyncio.sleep(3)
        sorrend = self.rt._sorrend.get(self.entity_id)  # noqa: SLF001
        kov = sorrend.kovetkezo() if sorrend else None
        if not kov:
            return
        kp = kozpont(self.hass)
        try:
            cim = await kp.feloldas(kov, self.entity_id)
            _, fajl = kp.forras(cim)
            if fajl:
                await kp.dlna_video(await kp.adatok(cim, fajl, {}, hatter=False), fajl)
        except Exception:  # noqa: BLE001
            _LOGGER.debug("Cantabile TV: a következő szám előkészítése nem sikerült (%s)", kov, exc_info=True)

    async def _cel_hiv(self, szolg: str, **adat: Any) -> None:
        await self.hass.services.async_call("media_player", szolg, {"entity_id": self.cast, **adat}, blocking=True)

    async def async_media_pause(self) -> None:
        if self._tukor:
            return                                  # tükör: a TV nem szól, nincs mit szüneteltetni
        if self.dlna:
            await self._cel_hiv("media_pause")
            return
        self.uzen({"cmd": "pause"})

    async def async_media_play(self) -> None:
        if self._tukor:
            return
        if self.dlna:
            await self._cel_hiv("media_play")
            return
        self.uzen({"cmd": "resume"})

    async def async_media_stop(self) -> None:
        if self._tukor:
            return                                  # a kártya váltáskor leállítja a TV-t: a tükör marad
        if self.dlna:
            await self._cel_hiv("media_stop")
            return
        self.uzen({"cmd": "stop"})

    async def async_media_seek(self, position: float) -> None:
        if self._tukor:
            return
        if self.dlna:
            # sok DLNA-s TV nem tud tekerni (vagy élő videónál nem lehet): csendben kimarad, nem hibaüzenet
            st = self.hass.states.get(self.cast)
            if not st or not int(st.attributes.get("supported_features") or 0) & MediaPlayerEntityFeature.SEEK or self._elo:
                return
            try:
                await self._cel_hiv("media_seek", seek_position=max(0.0, position - self._eltolas))
            except HomeAssistantError as err:
                _LOGGER.debug("Cantabile TV: a DLNA-s TV nem tekert (%s): %s", self.cast, err)
            return
        self.uzen({"cmd": "seek", "position": position})

    async def async_media_next_track(self) -> None:
        if not self._cue_lep(1):
            self.rt.ugrik(self.entity_id, 1)    # a sorozatlejátszó lép (a TV-nek nincs saját sora)

    async def async_media_previous_track(self) -> None:
        if not self._cue_lep(-1):
            self.rt.ugrik(self.entity_id, -1)

    def _cue_lep(self, lepes: int) -> bool:
        """CUE-s albumnál a fájlon belül ugrik (Cast módban; a DLNA-videón nem lehet tekerni)."""
        cue = self._meta.get("cue")
        if not cue or self.dlna or self._cue_i is None:
            return False
        uj = self._cue_i + lepes
        if lepes < 0 and self._poz is not None and self._poz - cue[self._cue_i]["start"] > 4:
            uj = self._cue_i                    # a szám közepén: vissza az elejére (mint a CD-lejátszón)
        if not 0 <= uj < len(cue):
            return lepes < 0                    # az elejéről nem lép vissza; a végéről a sorozatlejátszó viszi tovább
        self.uzen({"cmd": "seek", "position": cue[uj]["start"] + 0.05})
        self._cue_i = uj
        self.async_write_ha_state()
        return True

    async def async_set_volume_level(self, volume: float) -> None:
        await self.hass.services.async_call("media_player", "volume_set", {"entity_id": self.cast, "volume_level": volume}, blocking=True)

    async def async_mute_volume(self, mute: bool) -> None:
        await self.hass.services.async_call("media_player", "volume_mute", {"entity_id": self.cast, "is_volume_muted": mute}, blocking=True)

    async def async_turn_off(self) -> None:
        self.tukor_vege()
        if self.dlna:
            await self._cel_hiv("media_stop")
            return
        self.uzen({"cmd": "stop"})
        await self.hass.services.async_call("media_player", "turn_off", {"entity_id": self.cast}, blocking=True)
