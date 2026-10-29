"""Cantabile TV-lejátszók: a beállításokban kiválasztott TV-nként egy `media_player` (lásd tv.py).

Cast-eszköznél (cast integráció) a TV-oldal szól és rajzol; DLNA-s TV-nél (dlna_dmr) a TV maga játssza a zenét, a
képernyőre pedig a szám adatlapja kerül borítóként (tv_kep.py) – ilyenkor ez a lejátszó a DLNA-lejátszót vezérli, és
annak állapotát mutatja.
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import Any

from homeassistant.components import websocket_api
from homeassistant.components.media_player import (
    MediaPlayerEntity, MediaPlayerEntityFeature, MediaPlayerState, MediaType,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from .const import CONF_TV_PLAYERS
from .entity import CantabileEntity
from .tv import TV_DASHBOARD, TV_VIEW, kozpont

_LOGGER = logging.getLogger(__name__)

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

    @callback
    def oldal_ki(self, conn: websocket_api.ActiveConnection, msg_id: int) -> None:
        if self.oldal == (conn, msg_id):
            self.oldal = None
            self.oldal_jott.clear()
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
            poz = float(a.get("media_position") or 0)
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
        if self.dlna and self._cel().get("media_duration"):
            return self._cel()["media_duration"]
        if (h := self._cue_hatar()) and h[1]:
            return round(h[1] - h[0], 1)       # CUE-s albumnál a szám hossza, nem a fájlé
        return self._hossz or self._meta.get("duration") or None

    @property
    def media_position(self) -> float | None:
        if self.dlna:
            poz = self._cel().get("media_position")
            if (h := self._cue_hatar()) and poz is not None:
                return max(0.0, float(poz) - h[0])          # CUE-s albumnál a számon belüli idő
            return poz
        if (h := self._cue_hatar()) and self._poz is not None:
            return max(0.0, self._poz - h[0])
        return self._poz

    @property
    def media_position_updated_at(self):  # noqa: ANN201
        return self._cel().get("media_position_updated_at") if self.dlna else self._poz_ido

    @property
    def media_image_url(self) -> str | None:
        kep = self._meta.get("cover") or self._meta.get("artist_image")
        if kep and kep.startswith("/"):
            return None                         # a saját (aláírt) borító a HA proxyján nem kell
        return kep

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        a = {"cast_entity": self.cast, "tv_mode": "dlna" if self.dlna else "cast", "tv_page": self.oldal is not None}
        if self._meta.get("cue"):
            a["cue_tracks"] = len(self._meta["cue"])       # a kártya ilyenkor a lejátszóval léptet (fájlon belül)
        return a

    # ---- vezérlés ----
    async def async_play_media(self, media_type: str, media_id: str, **kwargs: Any) -> None:
        kp = kozpont(self.hass)
        cim = await kp.feloldas(media_id, self.entity_id)
        src, fajl = kp.forras(cim)
        extra = kwargs.get("extra") or {}
        meta = await kp.adatok(cim, fajl, extra.get("metadata") or extra, hatter=not self.dlna)
        if self.dlna:
            await self._dlna_lejatszas(media_id, meta, fajl)
            return
        meta = {k: v for k, v in meta.items() if not k.startswith("_")}
        await kp.oldalt_kuld(self)
        self._mcid, self._src, self._meta, self._cue_i = media_id, src, meta, (0 if meta.get("cue") else None)
        self._hossz, self._poz, self._poz_ido = meta.get("duration") or None, 0.0, dt_util.utcnow()
        self._allapot = MediaPlayerState.PLAYING     # az oldal jelentése felülírja (pl. hiba → idle)
        self.uzen({"cmd": "play", "src": src, "meta": meta, "t": time.time()})
        self.async_write_ha_state()

    async def _dlna_lejatszas(self, media_id: str, meta: dict[str, Any], fajl: str | None) -> None:
        """DLNA-s TV: zenemappás számnál „videó” (álló adatlap + a zene, tv.py) – így teljes képernyőn látszik; ha az nem
        készül el (vagy webes adó), a zene borítóként kapott adatlappal megy (azt nem minden TV mutatja)."""
        kp = kozpont(self.hass)
        adat = {k: v for k, v in {"artist": meta.get("artist"), "albumName": meta.get("album"), "trackNumber": meta.get("track"),
                                   "releaseDate": meta.get("year"), "genre": meta.get("genre")}.items() if v}
        extra: dict[str, Any] = {"title": meta.get("title") or meta.get("station") or "Cantabile", "metadata": adat}
        self._mcid, self._meta = media_id, {k: v for k, v in meta.items() if not k.startswith("_")}
        if fajl:
            video = await kp.dlna_video(meta, fajl)
        elif re.match(r"^https?://", cim := await kp.feloldas(media_id, self.entity_id)):
            video = await kp.dlna_elo(meta, cim)          # webes adó: élő videó
        else:
            video = None
        if video:
            cel, fajta = video, "video"
        else:
            cel, fajta = media_id, "music"
            if kep := await kp.dlna_kep(meta):
                extra["thumb"] = kep
        await self.hass.services.async_call("media_player", "play_media", {
            "entity_id": self.cast, "media_content_id": cel, "media_content_type": fajta, "extra": extra}, blocking=True)
        self.async_write_ha_state()
        if video:
            self.hass.async_create_background_task(self._kovetkezot_keszit(), f"cantabile_tv_elokeszit_{self.entity_id}")

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
        if self.dlna:
            await self._cel_hiv("media_pause")
            return
        self.uzen({"cmd": "pause"})

    async def async_media_play(self) -> None:
        if self.dlna:
            await self._cel_hiv("media_play")
            return
        self.uzen({"cmd": "resume"})

    async def async_media_stop(self) -> None:
        if self.dlna:
            await self._cel_hiv("media_stop")
            return
        self.uzen({"cmd": "stop"})

    async def async_media_seek(self, position: float) -> None:
        if self.dlna:
            await self._cel_hiv("media_seek", seek_position=position)
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
        if self.dlna:
            await self._cel_hiv("media_stop")
            return
        self.uzen({"cmd": "stop"})
        await self.hass.services.async_call("media_player", "turn_off", {"entity_id": self.cast}, blocking=True)
