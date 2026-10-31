"""Cantabile TV: a zene egy Cast-os TV-n szól, a képernyőn látványos TV-oldallal (equalizer / hullámforma, előadókép,
a szám adatai, haladásjelző).

Működés:
  - A beállításokban kiválasztott Cast-eszközökhöz (pl. Mi TV Stick) egy-egy `media_player` jön létre („TV · …”). Ez a
    kártyán egy hangszóró a többi mellett, és a sorozatlejátszó / a hangvezérlés is ugyanúgy használja, mint egy WiiM-et.
  - Lejátszáskor, ha a TV-n még nem fut a TV-oldal, a lejátszó `cast.show_lovelace_view`-val kiküldi a Cantabile TV
    vezérlőpultot (alapból `cantabile-tv` / `tv`, benne a `custom:cantabile-tv` kártya), és megvárja, amíg az oldal
    bejelentkezik (`cantabile/tv/subscribe`).
  - A hangot maga a TV-oldal játssza (böngészőben, Web Audio-elemzéssel); a lejátszó aláírt, rövid ideig érvényes
    címet küld neki: a zenemappa fájljait a HA saját /media útvonalán, a webes adókat a Cantabile-továbbítón át (mindkettő
    engedi a Cast-vevő címét, így a hang elemezhető).
  - Az oldal 2 mp-enként és minden változáskor visszajelez (`cantabile/tv/report`): ebből lesz a lejátszó állapota,
    pozíciója, a szám vége („idle”) – erre lép a sorozatlejátszó a következő számra.
  - A szám adatai: a zenemappa fájljainál ffprobe-bal a címkékből (cím, előadó, album, év, sorszám, formátum), a borító a
    mappa képe (cover/folder/front.jpg …) vagy a fájlba ágyazott kép; az előadó képe (és borító híján az albumé) a Deezer
    nyilvános katalógusából. Webes adónál az adó neve a kártya adógombjai közül.
"""

from __future__ import annotations

import asyncio
import contextlib
import hashlib
import json
import logging
import os
import re
import shutil
import time
from datetime import timedelta
from typing import TYPE_CHECKING, Any
from urllib.parse import quote, unquote, urlsplit

import voluptuous as vol
from aiohttp import web

from homeassistant.components import media_source, websocket_api
from homeassistant.components.http import HomeAssistantView
from homeassistant.components.http.auth import async_sign_path
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import CARD_URL, DOMAIN, VERSION, szoveg
from .library import media_ut

if TYPE_CHECKING:
    from .media_player import CantabileTv

_LOGGER = logging.getLogger(__name__)
VIDEO_MAX = 20 * 60                 # ennél hosszabb fájlból nem készül DLNA-videó (sokáig tartana, és terhelné a gépet)

_ffmpeg: bool | None = None


async def ffmpeg_van(hass: HomeAssistant) -> bool:
    """Van-e ffmpeg a gépen (HA OS-en és a hivatalos konténerben van; Core/venv telepítésen nem mindig). Ha nincs,
    egyszer figyelmeztet: a VU szimulált, a DLNA-s TV videó helyett a zenét és a borítóképet kapja."""
    global _ffmpeg
    if _ffmpeg is None:
        _ffmpeg = await hass.async_add_executor_job(shutil.which, "ffmpeg") is not None
        if not _ffmpeg:
            _LOGGER.warning("Cantabile: ffmpeg not found – the VU meters are simulated, and DLNA TVs get the music and the "
                            "cover only, without the track card video; install ffmpeg (it comes with Home Assistant OS and "
                            "the official container) to get them")
    return _ffmpeg


_x264: bool | None = None


async def x264_van() -> bool:
    """Tud-e az ffmpeg libx264-gyel kódolni (egyes Core/venv telepítéseken nem; ott az mpeg4 a tartalék)."""
    global _x264
    if _x264 is None:
        try:
            p = await asyncio.create_subprocess_exec("ffmpeg", "-hide_banner", "-encoders",
                                                     stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
            try:
                ki, _ = await asyncio.wait_for(p.communicate(), 10)
            except TimeoutError:
                with contextlib.suppress(ProcessLookupError):
                    p.kill()
                return False                    # most lassú volt: nem jegyzi meg, legközelebb újra megnézi
            _x264 = b"libx264" in ki
        except OSError:
            _x264 = False
    return _x264


TV_DASHBOARD = "cantabile-tv"
TV_VIEW = "tv"
OLDAL_VARAS = 35                     # mp – ennyit vár, hogy a kiküldött TV-oldal bejelentkezzen
ALAIRAS = timedelta(hours=8)
KEP_URL = "/api/cantabile/tv/image"
VIDEO_URL = "/api/cantabile/tv/video"
ELO_URL = "/api/cantabile/tv/live"
MAPPAKEPEK = ("cover", "folder", "front", "album", "albumart", "albumartsmall")
KEPKITERJ = (".jpg", ".jpeg", ".png", ".webp")
DEEZER = "https://api.deezer.com"
AUDIODB = "https://www.theaudiodb.com/api/v1/json/123"   # a TheAudioDB nyilvános (ingyenes) kulcsa


def kozpont(hass: HomeAssistant) -> TvKozpont:
    return hass.data[DOMAIN]["tv"]


class TvKozpont:
    """A TV-lejátszók és a TV-oldalak (böngésző-munkamenetek) összekötése."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.lejatszok: dict[str, CantabileTv] = {}     # entity_id → lejátszó
        # az integráció újratöltésekor (pl. új TV felvétele) a lejátszó újra létrejön: a TV-oldal kapcsolata és a szóló szám
        # adatai itt várják meg az utódot (entity_id szerint), így a futó lejátszás nem „felejtődik el”
        self.atadas: dict[str, dict[str, Any]] = {}
        self._var: CantabileTv | None = None             # erre a lejátszóra vár egy éppen kiküldött oldal
        self._deezer: dict[str, str | None] = {}
        self._adb: dict[str, tuple[float, list[str]]] = {}
        self._video_zar: dict[str, asyncio.Lock] = {}
        self.elo: dict[str, tuple[str, str]] = {}      # élő DLNA-videó: kulcs → (adatlap képe, adó címe)

    # ---- oldal ↔ lejátszó ----
    @callback
    def bejelentkezik(self, conn: websocket_api.ActiveConnection, msg_id: int, kert: str | None, kepes: list[str] | None = None) -> CantabileTv | None:
        jelolt = self.lejatszok.get(kert or "")
        if jelolt is None and self._var is not None:
            jelolt = self._var
        if jelolt is None:
            szabad = [lj for lj in self.lejatszok.values() if lj.oldal is None]
            jelolt = szabad[0] if len(szabad) == 1 else None
        if jelolt is None:
            return None
        if self._var is jelolt:
            self._var = None
        jelolt.oldal_kepes = set(kepes or [])
        jelolt.oldal_be(conn, msg_id)
        return jelolt

    def kartya_vk(self) -> list[str]:
        """A kártya címeinek változat-része (pl. „?v=2.1.0”), amellyel egy frissen kiküldött oldal betöltheti. Tárolós
        módban az erőforrásé; YAML-módban a beinjektált cím (?v=VERSION) és a kézi bejegyzés(ek) is – ott mindkettő betöltődik."""
        ll = self.hass.data.get("lovelace")
        res = getattr(ll, "resources", None)
        tarolos = getattr(ll, "resource_mode", "storage") == "storage" and hasattr(res, "async_create_item")
        vk: list[str] = [] if tarolos else [f"?v={VERSION}"]
        try:
            for elem in res.async_items() if res is not None else []:
                url = str(elem.get("url", ""))
                if url.split("?")[0] == CARD_URL:
                    vk.append(url[len(CARD_URL):] or "?")
        except Exception:  # noqa: BLE001 – még nem betöltött erőforrások
            pass
        return vk or [f"?v={VERSION}"]

    def kartya_v(self) -> str:
        return self.kartya_vk()[0]

    def regi_kod(self, lj: CantabileTv) -> bool:
        """A TV-n futó oldal régebbi kártyakóddal fut (nincs változata, vagy egyik mostani címé sem)."""
        if lj.dlna or lj.oldal is None:
            return False
        v = next((k[2:] for k in lj.oldal_kepes if k.startswith("v:")), None)
        return v not in self.kartya_vk()

    @callback
    def _frissit_ellenoriz(self, _now: Any = None) -> None:
        """Percenként: ahol a TV-n régi kártyakód fut és épp nem szól semmi, az oldalt újraküldi (változatonként egyszer)."""
        if not 7 <= dt_util.now().hour < 22:      # éjjel nem: a Cast-alkalmazás indítása (HDMI-CEC) felkeltheti a TV-t
            return
        v = self.kartya_v()
        for lj in list(self.lejatszok.values()):
            if lj.ujratoltve == v or not self.regi_kod(lj) or lj.friss_szolt():
                continue
            if lj.ujrakuldes_fut() or lj.ujrakuldes_zar.locked():
                continue
            lj.ujratoltve = v
            _LOGGER.info("Cantabile TV: %s régi kártyakóddal fut, újraküldöm az oldalt (%s)", lj.entity_id, v)
            lj.ujrakuldes_indit()

    async def ujrakuld(self, lj: CantabileTv, folytatva: bool = True) -> None:
        """A TV-n futó oldal régebbi kártyakóddal fut (egy frissítés után a Cast-vevő csak újracsatlakozik, a kódot nem tölti
        újra): bezárja és újra kiküldi, így a TV a friss kártyát tölti be."""
        async with lj.ujrakuldes_zar:                    # egyszerre egy; a lejátszás-indítás megvárja
            await self._ujrakuld(lj, folytatva)

    async def _ujrakuld(self, lj: CantabileTv, folytatva: bool) -> None:
        folytat = lj.pillanat() if folytatva else None   # ha szól: mit és honnan – az új oldalon onnan megy tovább
        lj.ujratolt = folytat is not None                # közben ne legyen „ki” (a sorozatlejátszó ne lépjen tovább)
        inditas = lj.inditas
        try:
            try:
                await self.hass.services.async_call("media_player", "turn_off", {"entity_id": lj.cast}, blocking=True)
            except HomeAssistantError as err:
                _LOGGER.debug("Cantabile TV: a régi oldal bezárása nem sikerült (%s): %s", lj.cast, err)
            for _ in range(20):                                # a régi oldal kapcsolata megszűnik
                if lj.oldal is None:
                    break
                await asyncio.sleep(0.5)
            lj.oldal = None
            await asyncio.sleep(2)
            await self.oldalt_kuld(lj)
            if folytat and lj.inditas == inditas:           # közben nem indult más
                await lj.folytat(folytat)
        except BaseException:
            if folytat and lj.oldal is None:               # nincs oldal a TV-n: ne maradjon „lejátszás”-ban
                lj.ki()
            raise
        finally:
            lj.ujratolt = False

    async def oldalt_kuld(self, lj: CantabileTv) -> None:
        """Kiküldi a TV-oldalt a Cast-eszközre, és megvárja, amíg bejelentkezik."""
        if lj.oldal is not None:
            return
        st = self.hass.states.get(lj.cast)
        if st is None or st.state == "unavailable":
            raise HomeAssistantError(szoveg(self.hass, "cast_unavailable", nev=lj.name, cast=lj.cast))
        self._var = lj
        lj.oldal_jott.clear()
        if not lj.dlna and st.attributes.get("app_name") == "Home Assistant Lovelace":
            # a TV-n még a HA fut, de nincs bejelentkezett TV-oldal (pl. HA-újraindítás után a régi munkamenet nem kapcsolódott
            # vissza): előbb bezárjuk, különben a Cast-vevő nem tölti be újra az oldalt
            try:
                await self.hass.services.async_call("media_player", "turn_off", {"entity_id": lj.cast}, blocking=True)
            except HomeAssistantError as err:
                # pl. ébredő TV-bot: „Failed to execute quit app” – az oldal kiküldése ettől még sikerülhet
                _LOGGER.debug("Cantabile TV: a régi oldal bezárása nem sikerült (%s): %s", lj.cast, err)
            await asyncio.sleep(3)
        await self.hass.services.async_call("cast", "show_lovelace_view", {
            "entity_id": lj.cast, "dashboard_path": lj.dashboard, "view_path": lj.view}, blocking=True)
        try:
            async with asyncio.timeout(OLDAL_VARAS):
                await lj.oldal_jott.wait()
        except TimeoutError as err:
            raise HomeAssistantError(szoveg(self.hass, "tv_page_missing", nev=lj.name, oldal=f"{lj.dashboard}/{lj.view}")) from err
        finally:
            if self._var is lj:
                self._var = None

    # ---- hang címe a TV-oldalnak ----
    def forras(self, mcid: str) -> tuple[str, str | None]:
        """(aláírt relatív cím, helyi fájl vagy None) egy lejátszandó azonosítóhoz / URL-hez."""
        ut, fajl = mcid, None
        if re.match(r"^https?://", mcid):
            r = urlsplit(mcid)
            if r.path.startswith("/media/") and r.netloc in self._sajat_hostok():
                ut = r.path + (f"?{r.query}" if r.query else "")
            else:
                return async_sign_path(self.hass, f"/api/cantabile/stream?url={quote(mcid, safe='')}", ALAIRAS), None
        m = re.match(r"^/media/([^/?#]+)/([^?#]+)", ut)
        if m and m.group(1) in self.hass.config.media_dirs:
            fajl = media_ut(self.hass.config.media_dirs[m.group(1)], unquote(m.group(2)))
        if "authSig=" not in ut:
            ut = async_sign_path(self.hass, ut.split("?")[0], ALAIRAS)
        return ut, fajl

    def _sajat_hostok(self) -> set[str]:
        hostok = set()
        for u in (self.hass.config.internal_url, self.hass.config.external_url):
            if u and u.strip():
                hostok.add(urlsplit(u.strip()).netloc)            # a beállításban maradt szóköz ne rontsa el
        with contextlib.suppress(Exception):
            from homeassistant.helpers.network import get_url
            hostok.add(urlsplit(get_url(self.hass)).netloc)
        return hostok

    async def feloldas(self, mcid: str, entity_id: str) -> str:
        if media_source.is_media_source_id(mcid):
            lejatszhato = await media_source.async_resolve_media(self.hass, mcid, entity_id)
            return lejatszhato.url
        return mcid

    # ---- a szám adatai ----
    async def adatok(self, mcid: str, fajl: str | None, extra: dict[str, Any], hatter: bool = True) -> dict[str, Any]:
        meta: dict[str, Any] = {k: v for k, v in (extra or {}).items() if v not in (None, "")}
        if fajl:
            meta = {**await self._cimkek(fajl), **meta}
            if cue := await self.hass.async_add_executor_job(_cue, fajl):
                # egyetlen fájlos album CUE-lappal: a számok listája (a TV-oldal az időből tudja, melyik szól)
                meta["cue"] = cue["tracks"]
                meta["album"] = cue.get("title") or meta.get("album")
                meta["artist"] = cue.get("performer") or meta.get("artist")
                meta["year"] = cue.get("date") or meta.get("year")
                meta["genre"] = (cue.get("genre") or meta.get("genre") or "").split(" / ")[0]
                meta["title"] = cue["tracks"][0]["title"]
            if not meta.get("cover"):
                kep = await self.hass.async_add_executor_job(_mappakep, fajl)
                if kep:
                    meta["cover"] = async_sign_path(self.hass, f"{KEP_URL}?f={quote(kep, safe='')}", ALAIRAS)
                    meta["_cover_file"] = kep
                elif meta.pop("_beagyazott", False):
                    meta["cover"] = async_sign_path(self.hass, f"{KEP_URL}?e={quote(fajl, safe='')}", ALAIRAS)
                    meta["_cover_embedded"] = fajl
            meta.pop("_beagyazott", None)
            meta.setdefault("kind", "file")
        else:
            meta.setdefault("kind", "stream")
            if not meta.get("station"):
                meta["station"] = await self._adonev(mcid)
        eloado = str(meta.get("artist") or "")
        if eloado:
            # a képkeresések egyszerre futnak (egy lassú szolgáltatás ne késleltesse sorban a lejátszást); a váltakozó
            # háttérképek (NAS-mappa + TheAudioDB) csak a Cast-os TV-oldalnak kellenek, a DLNA-snak nem
            async def semmi() -> Any:
                return None
            albumker = self._deezer_kep("album", f'artist:"{eloado}" album:"{meta["album"]}"') if not meta.get("cover") and meta.get("album") else semmi()
            kep, adb, alb = await asyncio.gather(self._deezer_kep("artist", eloado), self._adb_hatterek(eloado) if hatter else semmi(), albumker)
            meta.setdefault("artist_image", kep)
            if alb:
                meta["cover"] = alb
            if hatter:
                helyi = await self.hass.async_add_executor_job(_helyi_hatterek, fajl, list(self.hass.config.media_dirs.values())) if fajl else []
                meta["backgrounds"] = list(dict.fromkeys(
                    [async_sign_path(self.hass, f"{KEP_URL}?f={quote(k, safe='')}", ALAIRAS) for k in helyi] + (adb or [])))[:10]
        return meta

    async def _cimkek(self, fajl: str) -> dict[str, Any]:
        try:
            p = await asyncio.create_subprocess_exec(
                "ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", fajl,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
            ki, _ = await asyncio.wait_for(p.communicate(), 15)
            adat = json.loads(ki or b"{}")
        except (OSError, TimeoutError, ValueError):
            _LOGGER.debug("Cantabile TV: ffprobe nem futott (%s)", fajl, exc_info=True)
            adat = {}
        fo = adat.get("format") or {}
        cimke = {str(k).lower(): v for k, v in (fo.get("tags") or {}).items()}
        hang = next((s for s in adat.get("streams") or [] if s.get("codec_type") == "audio"), {})
        for s in adat.get("streams") or []:
            if s.get("codec_type") == "video":          # beágyazott borító
                cimke.setdefault("_beagyazott", True)
                for k, v in (s.get("tags") or {}).items():
                    cimke.setdefault(str(k).lower(), v)
        # címke híján a fájlnévből („01 - Előadó - Cím (2).mp3”) és a mappákból (<előadó>/<album>/…), ha a zenemappán belül
        # valóban ilyen mélyen van; a csupa kisbetűs nevet nagy kezdőbetűssé teszi, a másolat-toldalékot („(2)”) levágja
        nev = re.sub(r"\s*\(\d+\)$", "", os.path.splitext(os.path.basename(fajl))[0]).replace("_", " ")
        eloado_cim = re.match(r"^\s*(?:\d+[\s.\-]+)?(.+?)\s+-\s+(.+)$", nev)
        szep = lambda x: x.title() if x and x == x.lower() else x  # noqa: E731
        mappak = await self.hass.async_add_executor_job(self._mappak, fajl)   # ismount: a NAS-on lassú lehet
        meta: dict[str, Any] = {
            "title": cimke.get("title") or szep(eloado_cim.group(2) if eloado_cim else re.sub(r"^\d+[\s.\-]+", "", nev)),
            "artist": cimke.get("artist") or cimke.get("album_artist") or szep(eloado_cim.group(1) if eloado_cim else (mappak[-2] if len(mappak) >= 2 else "")),
            "album": cimke.get("album") or (mappak[-1] if len(mappak) >= 2 else ""),
            "year": (cimke.get("date") or cimke.get("year") or "")[:4],
            "track": str(cimke.get("track") or "").split("/")[0],
            "genre": cimke.get("genre") or "",
            "codec": (hang.get("codec_name") or "").upper().replace("PCM_S16LE", "WAV"),
            "rate": int(hang.get("sample_rate") or 0),
            "bits": int(hang.get("bits_per_raw_sample") or hang.get("bits_per_sample") or 0),
            "kbps": round(int(fo.get("bit_rate") or hang.get("bit_rate") or 0) / 1000),
            "duration": float(fo.get("duration") or 0),
        }
        if cimke.get("_beagyazott"):
            meta["_beagyazott"] = True
        return meta

    def _mappak(self, fajl: str) -> list[str]:
        """A fájl mappái a médiamappa gyökere alatt (pl. ["NAS310", "Queen", "A Kind of Magic"] → a gyökér nélkül)."""
        for alap in self.hass.config.media_dirs.values():
            a = os.path.normpath(os.path.abspath(alap))
            if fajl.startswith(a + os.sep):
                resz = [x for x in os.path.relpath(os.path.dirname(fajl), a).split(os.sep) if x and x != "."]
                if resz and os.path.ismount(os.path.realpath(os.path.join(a, resz[0]))):   # szimbolikus linken át is
                    resz = resz[1:]                                  # a csatolt megosztás (pl. NAS310) nem előadó
                return resz
        return []

    async def _adonev(self, url: str) -> str:
        from .music import HibaUzenet, kartya
        with contextlib.suppress(HibaUzenet, Exception):
            c = await kartya(self.hass)
            for a in c.get("adok", []):
                if str(a.get("url", "")).rstrip("/") == url.rstrip("/"):
                    return a.get("nev") or ""
        return urlsplit(url).hostname or ""

    async def _deezer_kep(self, fajta: str, q: str) -> str | None:
        kulcs = f"{fajta}:{q.lower()}"
        if kulcs in self._deezer:
            return self._deezer[kulcs]
        kep = None
        try:
            sess = async_get_clientsession(self.hass)
            async with asyncio.timeout(8), sess.get(f"{DEEZER}/search/{fajta}", params={"q": q, "limit": 1}) as r:
                talalat = ((await r.json(content_type=None)).get("data") or [None])[0] or {}
            kep = talalat.get("picture_xl" if fajta == "artist" else "cover_xl") or None
            if kep and "/artist//" in kep:            # a Deezer üres képe
                kep = None
        except Exception:  # noqa: BLE001
            _LOGGER.debug("Cantabile TV: Deezer-kép (%s) nem jött", q, exc_info=True)
        if len(self._deezer) > 500:
            self._deezer.clear()
        self._deezer[kulcs] = kep
        return kep


    async def _adb_hatterek(self, eloado: str) -> list[str]:
        """Az előadó széles háttérképei (fanart, széles fotó) a TheAudioDB nyilvános adatbázisából; előadónként 1 napig tárolva."""
        kulcs = eloado.lower()
        tarolt = self._adb.get(kulcs)
        if tarolt and time.monotonic() - tarolt[0] < 86400:
            return tarolt[1]
        kepek: list[str] = []
        sikeres = False
        try:
            sess = async_get_clientsession(self.hass)
            async with asyncio.timeout(8), sess.get(f"{AUDIODB}/search.php", params={"s": eloado}) as r:
                r.raise_for_status()
                talalat = ((await r.json(content_type=None)) or {}).get("artists") or []
            sikeres = True
            a = next((x for x in talalat if str(x.get("strArtist") or "").lower() == kulcs), talalat[0] if talalat else {})
            kepek = [a[k] for k in ("strArtistFanart", "strArtistFanart2", "strArtistFanart3", "strArtistFanart4", "strArtistWideThumb")
                     if str(a.get(k) or "").startswith("https://")]
        except Exception:  # noqa: BLE001
            _LOGGER.debug("Cantabile TV: TheAudioDB-kép (%s) nem jött", eloado, exc_info=True)
        if len(self._adb) > 500:
            self._adb.clear()
        # a hibát (időtúllépés, túl sok kérés) csak 10 percig jegyzi meg, a sikeres választ egy napig
        self._adb[kulcs] = (time.monotonic() if sikeres else time.monotonic() - 86400 + 600, kepek)
        return kepek

    # ---- DLNA mód: a szám adatlapja képként (tv_kep.py) ----
    async def dlna_kep(self, meta: dict[str, Any]) -> str | None:
        """Megrajzolja (vagy a tárból veszi) az adatlapot, és a TV számára bejelentkezés nélkül olvasható, aláírt belső
        címét adja vissza (a DLNA-s TV a borítót maga tölti le)."""
        ut = await self.dlna_kepfajl(meta)
        return self.belso_cim(f"{KEP_URL}?d={os.path.basename(ut)}") if ut else None

    def belso_cim(self, ut: str) -> str | None:
        from homeassistant.helpers.network import NoURLAvailableError, get_url

        try:
            alap = get_url(self.hass, allow_external=False, allow_cloud=False, prefer_external=False)
        except NoURLAvailableError:
            return None
        return alap + async_sign_path(self.hass, ut, ALAIRAS)

    async def dlna_video(self, meta: dict[str, Any], fajl: str) -> str | None:
        """A szám „videóként”: egyetlen álló képkocka (az adatlap) + a zene, MP4-be (a tárba). A Samsung és más DLNA-s TV-k
        így teljes képernyőn mutatják az adatlapot, a saját haladásjelzőjükkel; a fájl tekerhető. Aláírt belső cím, vagy None."""
        if not await ffmpeg_van(self.hass):
            return None
        if float(meta.get("duration") or 0) > VIDEO_MAX:
            return None                              # hosszú fájl (pl. CUE-lapos album egyben): nem készül el időben – borítóval szól
        kep = await self.dlna_kepfajl(meta)
        if not kep:
            return None
        hossz = float(meta.get("duration") or 0)    # a hang hossza: a kép ne nyújtsa meg a videót
        try:
            mtime = await self.hass.async_add_executor_job(os.path.getmtime, fajl)
        except OSError:
            return None
        kulcs = hashlib.sha1(f"{kep}|{fajl}|{mtime}".encode()).hexdigest()[:20]
        tar = self.hass.config.path(".cache", "cantabile_tv")
        cel = os.path.join(tar, f"video_{kulcs}.mp4")
        if not os.path.exists(cel):
            async with self._video_zar.setdefault(cel, asyncio.Lock()):
                if not os.path.exists(cel):
                    ideig = cel + ".tmp.mp4"
                    for kodolo in (["-c:v", "libx264", "-preset", "ultrafast", "-tune", "stillimage", "-pix_fmt", "yuv420p"],
                                   ["-c:v", "mpeg4", "-q:v", "3", "-pix_fmt", "yuv420p"]):
                        p = await asyncio.create_subprocess_exec(
                            "ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", "1", "-i", kep, "-i", fajl,
                            "-map", "0:v", "-map", "1:a", "-vf", "scale=1280:720", *kodolo, "-r", "1", "-g", "10",
                            "-c:a", "aac", "-b:a", "256k", "-shortest", *(["-t", f"{hossz:.2f}"] if hossz else []),
                            "-movflags", "+faststart", ideig,
                            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE)
                        try:
                            _, hiba = await asyncio.wait_for(p.communicate(), 180)
                        except TimeoutError:
                            with contextlib.suppress(ProcessLookupError):
                                p.kill()
                            await p.wait()
                            hiba = b"timeout"
                        except asyncio.CancelledError:
                            # megszakított kérés: az ffmpeg ne írjon tovább a közös ideiglenes fájlba
                            with contextlib.suppress(ProcessLookupError):
                                p.kill()
                            with contextlib.suppress(OSError):
                                os.remove(ideig)
                            self._video_zar.pop(cel, None)
                            raise
                        if p.returncode == 0 and os.path.exists(ideig):
                            await self.hass.async_add_executor_job(os.replace, ideig, cel)
                            break
                        _LOGGER.warning("Cantabile TV: a DLNA-videó nem készült el (%s): %s", kodolo[1], (hiba or b"")[-300:].decode(errors="replace"))
                    self._video_zar.pop(cel, None)
                    await self.hass.async_add_executor_job(_takarit, tar)
        if not os.path.exists(cel):
            return None
        return self.belso_cim(f"{VIDEO_URL}/{os.path.basename(cel)}")

    async def dlna_elo(self, meta: dict[str, Any], url: str) -> str | None:
        """Webes adó „élő videóként” (az adatlap + az adó hangja, menet közben kódolva, MPEG-TS); aláírt belső cím."""
        if not await ffmpeg_van(self.hass):
            return None
        kep = await self.dlna_kepfajl(meta)
        if not kep:
            return None
        kulcs = hashlib.sha1(f"{kep}|{url}".encode()).hexdigest()[:20]
        if len(self.elo) > 50:
            self.elo.clear()
        self.elo[kulcs] = (kep, url)
        return self.belso_cim(f"{ELO_URL}/{kulcs}.ts")

    async def dlna_kepfajl(self, meta: dict[str, Any]) -> str | None:
        """Az adatlap képfájlja a tárban (szükség esetén megrajzolja)."""
        from . import tv_kep

        # az aláírt címek (authSig) másodpercenként változnak: a kulcsba nem kerülhetnek, különben sosem lenne tártalálat
        kulcs = hashlib.sha1(json.dumps({k: v for k, v in meta.items() if (not k.startswith("_") or k == "_cover_file") and k != "backgrounds"
                                         and not (isinstance(v, str) and "authSig=" in v)},
                                        sort_keys=True, default=str).encode()).hexdigest()[:20]
        tar = self.hass.config.path(".cache", "cantabile_tv")
        cel = os.path.join(tar, f"dlna_{kulcs}.jpg")
        if not os.path.exists(cel):
            borito = None
            if meta.get("_cover_file"):
                borito = await self.hass.async_add_executor_job(_olvas, meta["_cover_file"])
            elif meta.get("_cover_embedded"):
                ut = await beagyazott(self.hass, meta["_cover_embedded"])
                borito = await self.hass.async_add_executor_job(_olvas, ut) if ut else None
            elif str(meta.get("cover") or "").startswith("http"):
                borito = await self._letolt(meta["cover"])
            eloado = await self._letolt(meta["artist_image"]) if meta.get("artist_image") else None
            kep = await self.hass.async_add_executor_job(tv_kep.rajzol, meta, eloado, borito)

            def ment() -> None:
                os.makedirs(tar, exist_ok=True)
                regiek = sorted((os.path.join(tar, n) for n in os.listdir(tar) if n.startswith("dlna_")), key=os.path.getmtime)
                for r in regiek[:-200]:                    # legfeljebb 200 adatlap marad a tárban
                    with contextlib.suppress(OSError):
                        os.remove(r)
                with open(cel, "wb") as f:
                    f.write(kep)

            await self.hass.async_add_executor_job(ment)
        return cel

    async def _letolt(self, url: str) -> bytes | None:
        try:
            async with asyncio.timeout(10), async_get_clientsession(self.hass).get(url) as r:
                return await r.read() if r.status == 200 else None
        except Exception:  # noqa: BLE001
            return None


def _takarit(tar: str) -> None:
    """A tárban legfeljebb ~1,5 GB DLNA-videó és 200 kibontott (beágyazott) borító marad (a legrégebbiek törlődnek)."""
    try:
        boritok = sorted((os.path.join(tar, n) for n in os.listdir(tar) if re.fullmatch(r"[0-9a-f]{40}\.jpg", n)), key=os.path.getmtime)
        for b in boritok[:-200]:
            os.remove(b)
        videok = sorted((os.path.join(tar, n) for n in os.listdir(tar) if n.startswith("video_") and n.endswith(".mp4")), key=os.path.getmtime)
        osszes = sum(os.path.getsize(v) for v in videok)
        for v in videok:
            if osszes < 1_500_000_000:
                break
            osszes -= os.path.getsize(v)
            os.remove(v)
    except OSError:
        pass


def _cue(fajl: str) -> dict[str, Any] | None:
    """A zenefájlhoz tartozó CUE-lap (azonos nevű, vagy a mappában az, amelyik erre a fájlra hivatkozik), feldolgozva:
    {title, performer, date, genre, tracks: [{n, title, performer, start}]} – a start másodpercben (INDEX 01)."""
    mappa, nev = os.path.dirname(fajl), os.path.basename(fajl)
    try:
        jeloltek = [n for n in os.listdir(mappa) if n.lower().endswith(".cue")]
    except OSError:
        return None
    jeloltek.sort(key=lambda n: os.path.splitext(n)[0] != os.path.splitext(nev)[0])
    for n in jeloltek:
        try:
            with open(os.path.join(mappa, n), "rb") as f:
                nyers = f.read(200_000)
        except OSError:
            continue
        for kod in ("utf-8-sig", "cp1250", "latin-1"):
            try:
                szoveg = nyers.decode(kod)
                break
            except UnicodeDecodeError:
                continue
        lap: dict[str, Any] = {"tracks": []}
        fajlok, akt = [], None
        for sor in szoveg.splitlines():
            sor = sor.strip()
            m = re.match(r'^(REM\s+)?(\w+)\s+(.*)$', sor)
            if not m:
                continue
            kulcs, ertek = m.group(2).upper(), m.group(3).strip()
            ertek_t = ertek[1:ertek.rfind('"')] if ertek.startswith('"') and '"' in ertek[1:] else ertek
            if kulcs == "FILE":
                fajlok.append(ertek_t)
            elif kulcs == "TRACK":
                akt = {"n": int(re.match(r"\d+", ertek).group(0)) if re.match(r"\d+", ertek) else len(lap["tracks"]) + 1}
                lap["tracks"].append(akt)
            elif kulcs == "INDEX" and akt is not None:
                im = re.match(r"(\d+)\s+(\d+):(\d+):(\d+)", ertek)
                if im and int(im.group(1)) == 1:
                    akt["start"] = int(im.group(2)) * 60 + int(im.group(3)) + int(im.group(4)) / 75
            elif kulcs in ("TITLE", "PERFORMER"):
                (akt if akt is not None else lap)[kulcs.lower()] = ertek_t
            elif kulcs in ("DATE", "GENRE") and akt is None:
                lap[kulcs.lower()] = ertek_t
        if len(fajlok) != 1 or os.path.basename(fajlok[0]).lower() != nev.lower():
            continue                            # több fájlos vagy más fájlra szóló lap: nem ehhez a fájlhoz tartozik
        szamok = [t for t in lap["tracks"] if "start" in t]
        if len(szamok) < 2:
            continue
        for t in szamok:
            t.setdefault("title", f"Track {t['n']}")
            t.setdefault("performer", lap.get("performer", ""))
        lap["tracks"] = szamok
        return lap
    return None


def _olvas(ut: str) -> bytes | None:
    try:
        with open(ut, "rb") as f:
            return f.read()
    except OSError:
        return None


async def beagyazott(hass: HomeAssistant, ut: str) -> str | None:
    """A zenefájlba ágyazott borító kibontva a tárba (ffmpeg); a tárbeli kép útja, vagy None."""
    tar = hass.config.path(".cache", "cantabile_tv")
    cel = os.path.join(tar, hashlib.sha1(ut.encode()).hexdigest() + ".jpg")
    if not os.path.exists(cel):
        if not await ffmpeg_van(hass):
            return None
        await hass.async_add_executor_job(lambda: os.makedirs(tar, exist_ok=True))
        # ideiglenes fájlba, és csak a kész kép kerül a helyére (félkész kép ne maradjon a tárban)
        ideig = f"{cel}.{os.getpid()}.{id(asyncio.current_task())}.tmp.jpg"
        p = await asyncio.create_subprocess_exec(
            "ffmpeg", "-v", "error", "-y", "-i", ut, "-an", "-frames:v", "1", "-vf", "scale='min(800,iw)':-2", ideig,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
        try:
            await asyncio.wait_for(p.wait(), 20)
        except TimeoutError:
            with contextlib.suppress(ProcessLookupError):
                p.kill()
            await p.wait()
        except asyncio.CancelledError:
            with contextlib.suppress(ProcessLookupError):
                p.kill()
            with contextlib.suppress(OSError):
                os.remove(ideig)
            raise

        def helyere() -> None:
            if p.returncode == 0 and os.path.exists(ideig):
                os.replace(ideig, cel)
            elif os.path.exists(ideig):
                os.remove(ideig)

        await hass.async_add_executor_job(helyere)
        await hass.async_add_executor_job(_takarit, tar)
    return cel if os.path.exists(cel) else None


HATTER_NEV = re.compile(r"^(fanart|backdrop|background|artist|extrafanart)[-_ ]?\d*\.(jpe?g|png|webp)$", re.I)


def _helyi_hatterek(fajl: str, media_dirs: list[str]) -> list[str]:
    """Kodi-szokás szerinti háttérképek az album és az előadó mappájában (fanart.jpg, backdrop2.jpg, extrafanart/…).
    Csak a médiamappán belül keres (a médiamappa gyökerében sem – az nem egy előadó mappája)."""
    kepek: list[str] = []
    gyokerek = [os.path.normpath(os.path.abspath(m)) for m in media_dirs]
    belul = lambda m: any(m.startswith(g + os.sep) for g in gyokerek)  # noqa: E731
    album = os.path.dirname(fajl)
    for mappa in [m for m in (album, os.path.dirname(album)) if belul(m)]:
        for hely in (mappa, os.path.join(mappa, "extrafanart")):
            try:
                nevek = sorted(os.listdir(hely))
            except OSError:
                continue
            kiterj = hely.endswith("extrafanart")
            kepek += [os.path.join(hely, n) for n in nevek
                      if (HATTER_NEV.match(n) or (kiterj and n.lower().endswith(KEPKITERJ))) and os.path.isfile(os.path.join(hely, n))]
    return kepek[:6]


def _mappakep(fajl: str) -> str | None:
    mappa = os.path.dirname(fajl)
    try:
        nevek = os.listdir(mappa)
    except OSError:
        return None
    kepek = [n for n in nevek if n.lower().endswith(KEPKITERJ)]
    for alap in MAPPAKEPEK:
        for n in kepek:
            if os.path.splitext(n)[0].lower() == alap:
                return os.path.join(mappa, n)
    return os.path.join(mappa, sorted(kepek)[0]) if kepek else None


class TvBetu(HomeAssistantView):
    """A kártya betűi (woff2) a TV-oldalnak: a Cast-vevő oldala más címről fut, ezért CORS-szal (a /cantabile_static nem
    küld ilyet). Nyilvános, mint a /cantabile_static."""

    url = "/api/cantabile/font/{nev}"
    name = "api:cantabile:font"
    requires_auth = False
    cors_allowed = True

    async def get(self, request: web.Request, nev: str) -> web.StreamResponse:
        ut = os.path.join(os.path.dirname(__file__), "www", nev)
        if not re.fullmatch(r"[A-Za-z0-9-]+\.woff2", nev) or not os.path.isfile(ut):
            return web.Response(status=404)
        return web.FileResponse(ut, headers={"Cache-Control": "max-age=604800", "Content-Type": "font/woff2"})


class TvKep(HomeAssistantView):
    """Borító a TV-oldalnak: a zenemappa egy képe (`f`) vagy egy zenefájlba ágyazott kép (`e`); aláírt címmel."""

    url = KEP_URL
    name = "api:cantabile:tv:image"
    requires_auth = True
    cors_allowed = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    def _engedett(self, ut: str) -> str | None:
        f = os.path.normpath(ut)
        for alap in self.hass.config.media_dirs.values():
            if f.startswith(os.path.normpath(os.path.abspath(alap)) + os.sep) and os.path.isfile(f):
                return f
        return None

    async def head(self, request: web.Request) -> web.StreamResponse:
        return await self.get(request)

    async def get(self, request: web.Request) -> web.StreamResponse:
        if f := request.query.get("f"):
            ut = await self.hass.async_add_executor_job(self._engedett, f)
            if not ut or not ut.lower().endswith(KEPKITERJ):
                return web.Response(status=404)
            return web.FileResponse(ut, headers={"Cache-Control": "max-age=86400"})
        if d := request.query.get("d"):                    # DLNA-adatlap a tárból
            if not re.fullmatch(r"dlna_[0-9a-f]{20}\.jpg", d):
                return web.Response(status=404)
            ut = self.hass.config.path(".cache", "cantabile_tv", d)
            if not await self.hass.async_add_executor_job(os.path.isfile, ut):
                return web.Response(status=404)
            return web.FileResponse(ut, headers={"Cache-Control": "max-age=86400"})
        ut = await self.hass.async_add_executor_job(self._engedett, request.query.get("e", ""))
        if not ut:
            return web.Response(status=404)
        cel = await beagyazott(self.hass, ut)
        if not cel:
            return web.Response(status=404)
        return web.FileResponse(cel, headers={"Cache-Control": "max-age=86400"})


class TvVideo(HomeAssistantView):
    """A DLNA-videó a tárból (aláírt címmel; a FileResponse tekerhető, Range-kérést kezel)."""

    url = VIDEO_URL + "/{v}"                # a cím .mp4-re végződik: egyes TV-k ebből döntik el a fajtát
    name = "api:cantabile:tv:video"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def head(self, request: web.Request, v: str) -> web.StreamResponse:
        return await self.get(request, v)       # a DLNA-s TV-k (pl. Samsung) lejátszás előtt HEAD-del kérdeznek

    async def get(self, request: web.Request, v: str) -> web.StreamResponse:
        if not re.fullmatch(r"video_[0-9a-f]{20}\.mp4", v):
            return web.Response(status=404)
        ut = self.hass.config.path(".cache", "cantabile_tv", v)
        if not await self.hass.async_add_executor_job(os.path.isfile, ut):
            return web.Response(status=404)
        return web.FileResponse(ut, headers={"Content-Type": "video/mp4", "transferMode.dlna.org": "Streaming",
                                             "contentFeatures.dlna.org": "DLNA.ORG_OP=01;DLNA.ORG_CI=1"})


class TvElo(HomeAssistantView):
    """Élő DLNA-videó webes adóhoz: az ffmpeg az adatlapot és az adó hangját folyamatosan MPEG-TS-be kódolja."""

    url = ELO_URL + "/{v}"
    name = "api:cantabile:tv:live"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    def _cel(self, v: str) -> tuple[str, str] | None:
        m = re.fullmatch(r"([0-9a-f]{20})\.ts", v)
        return kozpont(self.hass).elo.get(m.group(1)) if m else None

    async def head(self, request: web.Request, v: str) -> web.StreamResponse:
        if not self._cel(v):
            return web.Response(status=404)
        return web.Response(status=200, headers={"Content-Type": "video/mp2t", "transferMode.dlna.org": "Streaming",
                                                 "contentFeatures.dlna.org": "DLNA.ORG_OP=00;DLNA.ORG_CI=1"})

    async def get(self, request: web.Request, v: str) -> web.StreamResponse:
        cel = self._cel(v)
        if not cel:
            return web.Response(status=404)
        kep, url = cel
        kodolo = ["-c:v", "libx264", "-preset", "ultrafast", "-tune", "stillimage"] if await x264_van() else ["-c:v", "mpeg4", "-q:v", "3"]
        try:
            p = await asyncio.create_subprocess_exec(
                "ffmpeg", "-v", "error", "-loop", "1", "-framerate", "1", "-i", kep, "-user_agent", "Cantabile (Home Assistant)",
                "-reconnect", "1", "-reconnect_streamed", "1", "-i", url, "-map", "0:v", "-map", "1:a", "-vf", "scale=1280:720",
                *kodolo, "-pix_fmt", "yuv420p", "-r", "1", "-g", "4", "-c:a", "aac", "-b:a", "192k", "-f", "mpegts", "pipe:1",
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        except OSError:
            return web.Response(status=503)
        ki = web.StreamResponse(status=200, headers={"Content-Type": "video/mp2t", "Cache-Control": "no-cache",
                                                     "transferMode.dlna.org": "Streaming", "contentFeatures.dlna.org": "DLNA.ORG_OP=00;DLNA.ORG_CI=1"})
        await ki.prepare(request)
        try:
            while darab := await p.stdout.read(32768):
                await ki.write(darab)
        except ConnectionResetError:
            pass                                # a TV leállt / másra váltott
        finally:
            if p.returncode is None:
                p.kill()
                with contextlib.suppress(Exception):
                    await p.wait()
        return ki


@websocket_api.websocket_command({vol.Required("type"): "cantabile/tv/subscribe", vol.Optional("tv"): str, vol.Optional("features"): [str]})
@callback
def ws_subscribe(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """A TV-oldal bejelentkezése: innentől ezen az előfizetésen kapja a parancsokat."""
    lj = kozpont(hass).bejelentkezik(conn, msg["id"], msg.get("tv"), msg.get("features"))
    if lj is None:
        conn.send_error(msg["id"], "no_tv", szoveg(hass, "no_tv"))
        return
    tv_id = lj.entity_id
    conn.subscriptions[msg["id"]] = lambda: (kozpont(hass).lejatszok.get(tv_id) or lj).oldal_ki(conn, msg["id"])
    conn.send_result(msg["id"])
    lj.uzen({"cmd": "hello", "tv": lj.entity_id, "name": lj.name})


@websocket_api.websocket_command({
    vol.Required("type"): "cantabile/tv/report", vol.Required("tv"): str, vol.Required("state"): vol.In(["playing", "paused", "idle"]),
    vol.Optional("position"): vol.Any(None, vol.Coerce(float)), vol.Optional("duration"): vol.Any(None, vol.Coerce(float)),
    vol.Optional("src"): vol.Any(None, str), vol.Optional("error"): vol.Any(None, str),
    vol.Optional("track"): vol.Any(None, vol.Coerce(int)), vol.Optional("meta"): vol.Any(None, dict),
})
@callback
def ws_report(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    lj = kozpont(hass).lejatszok.get(msg["tv"])
    if lj is not None:
        lj.jelentes(msg)
    # a lejátszó nem tudja, mi szól, vagy nem ehhez az oldalhoz kötött (pl. újratöltés után): az oldal küldje újra az
    # adatokat, és jelentkezzen be újra
    conn.send_result(msg["id"], {"resend": bool(lj is not None and (not lj.meta_ismert() or lj.oldal is None))})


@websocket_api.websocket_command({vol.Required("type"): "cantabile/tv/follow", vol.Required("source"): str, vol.Required("target"): str})
@callback
def ws_follow(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """A kártyán hangszórót váltottak (`source` → `target`): a TV, amelyről elváltottak – vagy amelyik az előzőt
    tükrözte –, ezentúl hang nélkül az újat mutatja; ha épp erre a TV-re váltottak, a tükre véget ér."""
    cel_t = terulet(hass, msg["target"])
    for lj in list(kozpont(hass).lejatszok.values()):
        if lj.entity_id == msg["target"]:
            lj.tukor_vege()
        elif (lj.entity_id == msg["source"] and lj.friss_szolt()) or lj._tukor == msg["source"]:  # noqa: SLF001
            tv_t = terulet(hass, lj.entity_id, lj.cast)
            if tv_t and cel_t and tv_t != cel_t:
                lj.tukor_vege()             # más szobában szól: a TV nem mutatja (csak az azonos területű hangszórót)
            elif msg["target"].startswith("media_player."):
                lj.tukroz(msg["target"])
    conn.send_result(msg["id"])


def terulet(hass: HomeAssistant, *entity_ids: str | None) -> str | None:
    """Az első ismert terület az entitások közül (az entitásé, különben a készüléké); MA-lejátszónál a párjáé is."""
    from .ma import parok    # noqa: PLC0415

    ent, eszk = er.async_get(hass), dr.async_get(hass)
    jeloltek = [e for e in entity_ids if e]
    jeloltek += [n for e in list(jeloltek) for n, m in parok(hass).items() if m == e]   # Sonos MA → Sonos
    for e in jeloltek:
        if (r := ent.async_get(e)) is None:
            continue
        if r.area_id:
            return r.area_id
        if r.device_id and (d := eszk.async_get(r.device_id)) and d.area_id:
            return d.area_id
    return None


@websocket_api.websocket_command({vol.Required("type"): "cantabile/tv/reload", vol.Required("entity_id"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_reload(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """A TV-oldal újraküldése a friss kártyakóddal; ha szól, ugyanonnan folytatja."""
    kp = kozpont(hass)
    lj = kp.lejatszok.get(msg["entity_id"])
    if lj is None or lj.dlna:
        conn.send_error(msg["id"], "no_tv", szoveg(hass, "no_tv"))
        return
    lj.ujratoltve = kp.kartya_v()
    try:
        await kp.ujrakuld(lj)
    except HomeAssistantError as err:
        conn.send_error(msg["id"], "reload_failed", str(err))
        return
    conn.send_result(msg["id"], {"reloaded": True})


def regisztral(hass: HomeAssistant) -> None:
    kp = hass.data[DOMAIN]["tv"] = TvKozpont(hass)
    # a régi kártyakóddal futó, épp nem szóló TV-oldalak újraküldése (frissítés után)
    async_track_time_interval(hass, kp._frissit_ellenoriz, timedelta(seconds=60))
    hass.http.register_view(TvKep(hass))
    hass.http.register_view(TvBetu())
    hass.http.register_view(TvVideo(hass))
    hass.http.register_view(TvElo(hass))
    websocket_api.async_register_command(hass, ws_subscribe)
    websocket_api.async_register_command(hass, ws_report)
    websocket_api.async_register_command(hass, ws_follow)
    websocket_api.async_register_command(hass, ws_reload)
