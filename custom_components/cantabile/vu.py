"""VU-jel: a magnó VU-mérőihez a valódi zenei jel szintje (bal és jobb csatorna), élőben – `cantabile/signal`.

A hangszórók (Sonos, WiiM…) a lejátszott jel szintjét nem adják ki, ezért ugyanazt a forrást, amit a lejátszó szól
(rádió-stream vagy a helyi zenefájl), a szerveren az ffmpeg is megnyitja valós idejű tempóban, és 50 ms-onként
csatornánként RMS-szintet és mintacsúcsot számol. A kártya websocket-feliratkozással kapja: {"l": dB, "r": dB, "pl": dBFS,
"pr": dBFS}, ahol az l/r a VU-skálán (a mutatós műszerhez), a pl/pr a csúcs dBFS-ben (a fluoreszcens
kijelzőhöz); 0 VU = −12 dBFS (K-12). Ha a forrás nem elemezhető (pl. titkosított streaming), egy {"allapot": "nincs"} üzenet jön,
és a kártya utánzatra vált. Forrásváltáskor egy {"formatum": {...}} üzenet is megy (ffprobe: kodek, kHz, bit, kbps).

Lejátszónként egy ffmpeg fut, akárhány feliratkozó osztozik rajta; az utolsó leiratkozáskor leáll. A lejátszó
állapotváltozásaira (szám-, adóváltás, szünet, stop) újraindul vagy leáll. Fájlnál a lejátszó pozíciójára ugrik.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import math
import os
import re
import time
from array import array
from collections.abc import Callable
from typing import Any
from urllib.parse import unquote

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import EVENT_HOMEASSISTANT_STOP
from homeassistant.core import Event, HomeAssistant, State, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from .library import media_ut

_LOGGER = logging.getLogger(__name__)

MINTA = 11025                      # Hz – a szintméréshez bőven elég
ABLAK = 0.05                       # mp – ennyi időnként megy üzenet
KERET = int(MINTA * ABLAK)         # mintapár / ablak
BAJT = KERET * 2 * 2               # 2 csatorna × 16 bit
VU_NULLA = -12.0                   # dBFS, ami a VU-skálán 0 (a mai, hangosra kevert zenéhez; −18-cal folyton a pirosban állna)
SZOLO = ("playing", "buffering")


def forras(state: State | None, media_dirs: dict[str, str] | None = None) -> tuple[str, str] | None:
    """A lejátszó állapotából az elemezhető forrás: ("fajl", útvonal) vagy ("stream", URL); None, ha nincs."""
    if state is None or state.state not in SZOLO:
        return None
    a = state.attributes
    for jelolt in (a.get("media_content_id"), a.get("media_title")):
        if not isinstance(jelolt, str) or not jelolt:
            continue
        u = re.sub(r"^x-rincon-mp3radio://", "", jelolt)
        if not re.match(r"^https?://", u):
            # a Sonos rádiónál séma nélkül is visszaadhatja; más x-… (pl. x-sonos-http Deezer) nem elemezhető
            if re.match(r"^[\w.-]+(:\d+)?/", u) and jelolt.startswith("x-rincon-mp3radio://"):
                u = "http://" + u
            else:
                continue
        # a HA saját média-forrása (/media/<mappa-azonosító>/<útvonal>): a fájlt közvetlenül olvassuk
        helyi = re.match(r"^https?://[^/]+/media/([^/?#]+)/([^?#]+)", u)
        if helyi and helyi.group(1) in (media_dirs or {}):
            fajl = media_ut(media_dirs[helyi.group(1)], unquote(helyi.group(2)))
            if fajl:
                return ("fajl", fajl)
            continue
        return ("stream", u)
    return None


def pozicio(state: State) -> float:
    """A lejátszó becsült pozíciója most (mp)."""
    a = state.attributes
    poz = float(a.get("media_position") or 0)
    frissult = a.get("media_position_updated_at")
    if state.state == "playing" and frissult:
        with contextlib.suppress(TypeError, ValueError):
            ido = frissult if not isinstance(frissult, str) else dt_util.parse_datetime(frissult)
            poz += (dt_util.utcnow() - ido).total_seconds()
    return max(0.0, poz)


def szint(adat: bytes) -> tuple[float, float, float, float]:
    """16 bites sztereó PCM → csatornánként (1) RMS a VU-skálán (dB, 0 VU = −12 dBFS, K-12) a mutatós műszerhez,
    (2) mintacsúcs dBFS-ben (0 = digitális végkitérés) a fluoreszcens kijelző csúcsmérőjéhez (IEC 60268-18 mintára)."""
    m = array("h")
    m.frombytes(adat)
    bal, jobb = m[0::2], m[1::2]
    ki, cs = [], []
    for csat in (bal, jobb):
        n = len(csat) or 1
        rms = math.sqrt(sum(x * x for x in csat) / n) / 32768.0
        dbfs = 20 * math.log10(rms) if rms > 1e-6 else -120.0
        ki.append(round(max(-40.0, dbfs - VU_NULLA), 1))
        csucs = max((abs(x) for x in csat), default=0) / 32767.0
        cs.append(round(max(-60.0, 20 * math.log10(csucs)) if csucs > 1e-6 else -60.0, 1))
    return ki[0], ki[1], cs[0], cs[1]


class Figyelo:
    """Egy lejátszó jelének elemzése; a feliratkozók osztoznak rajta."""

    def __init__(self, hass: HomeAssistant, entity_id: str, megszunt: Callable[[], None]) -> None:
        self.hass = hass
        self.entity_id = entity_id
        self._megszunt = megszunt
        self._hallgatok: set[Callable[[dict[str, Any]], None]] = set()
        self._kulcs: tuple[str, str] | None = None
        self._feladat: asyncio.Task | None = None
        self._folyamat: asyncio.subprocess.Process | None = None
        self._leiratkozas: Callable[[], None] | None = None
        self._allapot = "nincs"
        self._formatum: dict[str, Any] | None = None

    @callback
    def feliratkozik(self, hallgato: Callable[[dict[str, Any]], None]) -> Callable[[], None]:
        self._hallgatok.add(hallgato)
        if self._leiratkozas is None:
            self._leiratkozas = async_track_state_change_event(self.hass, [self.entity_id], self._valtozott)
            self._ujraertekel()
        hallgato({"allapot": self._allapot, "formatum": self._formatum})

        @callback
        def leiratkozik() -> None:
            self._hallgatok.discard(hallgato)
            if not self._hallgatok:
                self.leall()
                self._megszunt()

        return leiratkozik

    @callback
    def leall(self) -> None:
        if self._leiratkozas:
            self._leiratkozas()
            self._leiratkozas = None
        self._kulcs = None
        self._megallit()

    @callback
    def _valtozott(self, _event: Event) -> None:
        self._ujraertekel()

    @callback
    def _ujraertekel(self) -> None:
        state = self.hass.states.get(self.entity_id)
        uj = forras(state, self.hass.config.media_dirs)
        if uj == self._kulcs and (self._feladat and not self._feladat.done()):
            return
        if uj != self._kulcs and self._formatum is not None:
            self._formatum = None
            self._kuld({"formatum": None})
        self._kulcs = uj
        self._megallit()
        if uj is None:
            self._jelez("nincs" if state is not None and state.state in SZOLO else "all")
            return
        self._feladat = self.hass.async_create_background_task(self._elemez(uj, pozicio(state)), f"cantabile signal {self.entity_id}")

    @callback
    def _megallit(self) -> None:
        if self._folyamat and self._folyamat.returncode is None:
            with contextlib.suppress(ProcessLookupError):
                self._folyamat.kill()
        self._folyamat = None
        if self._feladat and not self._feladat.done():
            self._feladat.cancel()
        self._feladat = None

    @callback
    def _jelez(self, allapot: str) -> None:
        if allapot != self._allapot:
            self._allapot = allapot
            self._kuld({"allapot": allapot})

    @callback
    def _kuld(self, uzenet: dict[str, Any]) -> None:
        for h in list(self._hallgatok):
            h(uzenet)

    async def _vizsgal(self, cim: str) -> dict[str, Any] | None:
        """ffprobe: a forrás formátuma a kijelzőhöz (kodek, kHz, bit, kbps)."""
        folyamat = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "error", "-select_streams", "a:0",
            "-show_entries", "stream=codec_name,sample_rate,bits_per_raw_sample,bits_per_sample,bit_rate:format=bit_rate",
            "-of", "json", cim, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        try:
            ki, _ = await asyncio.wait_for(folyamat.communicate(), 8)
        except TimeoutError:
            with contextlib.suppress(ProcessLookupError):
                folyamat.kill()
            return None
        adat = json.loads(ki or b"{}")
        st = (adat.get("streams") or [{}])[0]
        if not st:
            return None
        bit = int(st.get("bits_per_raw_sample") or 0) or int(st.get("bits_per_sample") or 0) or None
        br = int(st.get("bit_rate") or 0) or int((adat.get("format") or {}).get("bit_rate") or 0)
        sr = int(st.get("sample_rate") or 0)
        return {
            "kodek": str(st.get("codec_name") or "").upper().replace("PCM_S16LE", "WAV").replace("PCM_S24LE", "WAV") or None,
            "khz": round(sr / 1000, 1) if sr else None,
            "bit": bit,
            "kbps": round(br / 1000) if br else None,
        }

    async def _elemez(self, kulcs: tuple[str, str], poz: float) -> None:
        fajta, cim = kulcs
        with contextlib.suppress(Exception):
            formatum = await self._vizsgal(cim)
            if formatum and self._kulcs == kulcs:
                self._formatum = formatum
                self._kuld({"formatum": formatum})
        parancs = ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-re"]
        if fajta == "fajl":
            parancs += ["-ss", f"{poz:.2f}"]
        else:
            parancs += ["-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5"]
        parancs += ["-i", cim, "-vn", "-ac", "2", "-ar", str(MINTA), "-f", "s16le", "-"]
        try:
            self._folyamat = folyamat = await asyncio.create_subprocess_exec(
                *parancs, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            self._jelez("elemzes")
            while True:
                adat = await folyamat.stdout.readexactly(BAJT)
                l, r, pl, pr = szint(adat)
                self._kuld({"l": l, "r": r, "pl": pl, "pr": pr, "t": round(time.time(), 2)})
        except asyncio.IncompleteReadError:
            pass                                  # a fájl véget ért, vagy az ffmpeg kilépett
        except asyncio.CancelledError:
            raise
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("VU-elemzés hiba (%s): %s", self.entity_id, err)
        finally:
            folyamat = self._folyamat
            if folyamat and folyamat.returncode is None:
                with contextlib.suppress(ProcessLookupError):
                    folyamat.kill()
            if folyamat and folyamat.stderr:
                with contextlib.suppress(Exception):
                    hiba = (await asyncio.wait_for(folyamat.stderr.read(), 1)).decode(errors="replace").strip()
                    if hiba:
                        _LOGGER.debug("ffmpeg (%s): %s", self.entity_id, hiba[-300:])
        if self._kulcs == kulcs:
            self._jelez("nincs")


@callback
def regisztral(hass: HomeAssistant) -> Callable[[], None]:
    """A `cantabile/signal` websocket-parancs; a visszaadott függvény leállít minden figyelőt."""
    figyelok: dict[str, Figyelo] = {}

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/signal", vol.Required("entity_id"): cv.entity_id})
    @callback
    def ws_signal(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        entity_id = msg["entity_id"]
        if entity_id not in figyelok:
            figyelok[entity_id] = Figyelo(hass, entity_id, lambda: figyelok.pop(entity_id, None))

        @callback
        def kuld(uzenet: dict[str, Any]) -> None:
            connection.send_message(websocket_api.event_message(msg["id"], uzenet))

        connection.send_result(msg["id"])
        connection.subscriptions[msg["id"]] = figyelok[entity_id].feliratkozik(kuld)

    websocket_api.async_register_command(hass, ws_signal)

    @callback
    def leallit(_event: Event | None = None) -> None:
        for f in list(figyelok.values()):
            f.leall()

    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, leallit)
    return leallit
