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
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN

if TYPE_CHECKING:
    from .media_player import CantabileTv

_LOGGER = logging.getLogger(__name__)

TV_DASHBOARD = "cantabile-tv"
TV_VIEW = "tv"
OLDAL_VARAS = 35                     # mp – ennyit vár, hogy a kiküldött TV-oldal bejelentkezzen
ALAIRAS = timedelta(hours=8)
KEP_URL = "/api/cantabile/tv/image"
MAPPAKEPEK = ("cover", "folder", "front", "album", "albumart", "albumartsmall")
KEPKITERJ = (".jpg", ".jpeg", ".png", ".webp")
DEEZER = "https://api.deezer.com"


def kozpont(hass: HomeAssistant) -> TvKozpont:
    return hass.data[DOMAIN]["tv"]


class TvKozpont:
    """A TV-lejátszók és a TV-oldalak (böngésző-munkamenetek) összekötése."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.lejatszok: dict[str, CantabileTv] = {}     # entity_id → lejátszó
        self._var: CantabileTv | None = None             # erre a lejátszóra vár egy éppen kiküldött oldal
        self._deezer: dict[str, str | None] = {}

    # ---- oldal ↔ lejátszó ----
    @callback
    def bejelentkezik(self, conn: websocket_api.ActiveConnection, msg_id: int, kert: str | None) -> CantabileTv | None:
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
        jelolt.oldal_be(conn, msg_id)
        return jelolt

    async def oldalt_kuld(self, lj: CantabileTv) -> None:
        """Kiküldi a TV-oldalt a Cast-eszközre, és megvárja, amíg bejelentkezik."""
        if lj.oldal is not None:
            return
        st = self.hass.states.get(lj.cast)
        if st is None or st.state == "unavailable":
            raise HomeAssistantError(f"{lj.name}: a Cast-eszköz ({lj.cast}) nem érhető el")
        self._var = lj
        lj.oldal_jott.clear()
        await self.hass.services.async_call("cast", "show_lovelace_view", {
            "entity_id": lj.cast, "dashboard_path": lj.dashboard, "view_path": lj.view}, blocking=True)
        try:
            async with asyncio.timeout(OLDAL_VARAS):
                await lj.oldal_jott.wait()
        except TimeoutError as err:
            raise HomeAssistantError(f"{lj.name}: a TV-oldal nem jelentkezett be ({lj.dashboard}/{lj.view})") from err
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
            alap = os.path.realpath(self.hass.config.media_dirs[m.group(1)])
            f = os.path.realpath(os.path.join(alap, unquote(m.group(2))))
            fajl = f if f.startswith(alap + os.sep) else None
        if "authSig=" not in ut:
            ut = async_sign_path(self.hass, ut.split("?")[0], ALAIRAS)
        return ut, fajl

    def _sajat_hostok(self) -> set[str]:
        hostok = set()
        for u in (self.hass.config.internal_url, self.hass.config.external_url):
            if u:
                hostok.add(urlsplit(u).netloc)
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
    async def adatok(self, mcid: str, fajl: str | None, extra: dict[str, Any]) -> dict[str, Any]:
        meta: dict[str, Any] = {k: v for k, v in (extra or {}).items() if v not in (None, "")}
        if fajl:
            meta = {**await self._cimkek(fajl), **meta}
            if not meta.get("cover"):
                kep = await self.hass.async_add_executor_job(_mappakep, fajl)
                if kep:
                    meta["cover"] = async_sign_path(self.hass, f"{KEP_URL}?f={quote(kep, safe='')}", ALAIRAS)
                elif meta.pop("_beagyazott", False):
                    meta["cover"] = async_sign_path(self.hass, f"{KEP_URL}?e={quote(fajl, safe='')}", ALAIRAS)
            meta.pop("_beagyazott", None)
            meta.setdefault("kind", "file")
        else:
            meta.setdefault("kind", "stream")
            if not meta.get("station"):
                meta["station"] = await self._adonev(mcid)
        eloado = meta.get("artist")
        if eloado:
            meta.setdefault("artist_image", await self._deezer_kep("artist", eloado))
            if not meta.get("cover") and meta.get("album"):
                meta["cover"] = await self._deezer_kep("album", f'artist:"{eloado}" album:"{meta["album"]}"')
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
        mappak = self._mappak(fajl)
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
            a = os.path.realpath(alap)
            if fajl.startswith(a + os.sep):
                resz = [x for x in os.path.relpath(os.path.dirname(fajl), a).split(os.sep) if x and x != "."]
                if resz and os.path.ismount(os.path.join(a, resz[0])):
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


class TvKep(HomeAssistantView):
    """Borító a TV-oldalnak: a zenemappa egy képe (`f`) vagy egy zenefájlba ágyazott kép (`e`); aláírt címmel."""

    url = KEP_URL
    name = "api:cantabile:tv:image"
    requires_auth = True
    cors_allowed = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    def _engedett(self, ut: str) -> str | None:
        valodi = os.path.realpath(ut)
        for alap in self.hass.config.media_dirs.values():
            a = os.path.realpath(alap)
            if valodi.startswith(a + os.sep) and os.path.isfile(valodi):
                return valodi
        return None

    async def get(self, request: web.Request) -> web.StreamResponse:
        if f := request.query.get("f"):
            ut = self._engedett(f)
            if not ut or not ut.lower().endswith(KEPKITERJ):
                return web.Response(status=404)
            return web.FileResponse(ut, headers={"Cache-Control": "max-age=86400"})
        ut = self._engedett(request.query.get("e", ""))
        if not ut:
            return web.Response(status=404)
        tar = self.hass.config.path(".cache", "cantabile_tv")
        cel = os.path.join(tar, hashlib.sha1(ut.encode()).hexdigest() + ".jpg")
        if not os.path.exists(cel):
            await self.hass.async_add_executor_job(lambda: os.makedirs(tar, exist_ok=True))
            p = await asyncio.create_subprocess_exec(
                "ffmpeg", "-v", "error", "-y", "-i", ut, "-an", "-frames:v", "1", "-vf", "scale='min(800,iw)':-2", cel,
                stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(p.wait(), 20)
            if not os.path.exists(cel):
                return web.Response(status=404)
        return web.FileResponse(cel, headers={"Cache-Control": "max-age=86400"})


@websocket_api.websocket_command({vol.Required("type"): "cantabile/tv/subscribe", vol.Optional("tv"): str})
@callback
def ws_subscribe(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """A TV-oldal bejelentkezése: innentől ezen az előfizetésen kapja a parancsokat."""
    lj = kozpont(hass).bejelentkezik(conn, msg["id"], msg.get("tv"))
    if lj is None:
        conn.send_error(msg["id"], "no_tv", "Nincs ehhez az oldalhoz rendelhető Cantabile TV-lejátszó")
        return
    conn.subscriptions[msg["id"]] = lambda: lj.oldal_ki(conn, msg["id"])
    conn.send_result(msg["id"])
    lj.uzen({"cmd": "hello", "tv": lj.entity_id, "name": lj.name})


@websocket_api.websocket_command({
    vol.Required("type"): "cantabile/tv/report", vol.Required("tv"): str, vol.Required("state"): vol.In(["playing", "paused", "idle"]),
    vol.Optional("position"): vol.Any(None, vol.Coerce(float)), vol.Optional("duration"): vol.Any(None, vol.Coerce(float)),
    vol.Optional("src"): vol.Any(None, str), vol.Optional("error"): vol.Any(None, str),
})
@callback
def ws_report(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    lj = kozpont(hass).lejatszok.get(msg["tv"])
    if lj is not None:
        lj.jelentes(msg)
    conn.send_result(msg["id"])


def regisztral(hass: HomeAssistant) -> None:
    hass.data[DOMAIN]["tv"] = TvKozpont(hass)
    hass.http.register_view(TvKep(hass))
    websocket_api.async_register_command(hass, ws_subscribe)
    websocket_api.async_register_command(hass, ws_report)
