"""Dalszöveg a kártyához: `cantabile/lyrics` websocket-parancs.

A forrás az LRCLIB (lrclib.net) nyilvános, kulcs nélküli API-ja: előadó + cím (+ album és hossz, ha van) alapján
keres, és ha van, időzített (LRC) szöveget ad – ebből a kártya a lejátszással együtt kiemeli az épp szóló sort. Ha
pontos egyezés nincs, a keresőből a hosszban legközelebbi, lehetőleg időzített találatot választja. Ha az LRCLIB nem
érhető el, vagy nincs nála a szám, a lyrics.ovh-ból pótolja (az csak sima, időzítés nélküli szöveget ad); ha egyik sem
válaszol, hibát ad (és nem tárolja el, hogy később újra lehessen próbálni). A szöveget a
szerver a zenemappa számainál a fájl mellé menti (.lrc), a többi forrásnál (Deezer, Spotify, Music Assistant, rádió…)
a streaming-tárolóba (.cache/cantabile_dalszoveg/Előadó/Cím.lrc); ha a streamingről szóló szám a zenemappában is megvan,
a fájl mellé is. A begyűjtő a tárolóban is végigmegy: a csak sima szövegűhöz 30 naponta időzítettet keres.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
import time
import re
from collections import OrderedDict
from typing import Any
from urllib.parse import quote, unquote

import aiohttp
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import VERSION, szoveg

_LOGGER = logging.getLogger(__name__)

API = "https://lrclib.net/api"
OVH = "https://api.lyrics.ovh/v1"        # tartalék: kulcs nélküli, csak sima (időzítés nélküli) szöveg
UA = f"Cantabile/{VERSION} (https://github.com/Gyuszko55/ha-cantabile)"
TAR_MERET = 200
IDOTURES = 8          # mp eltérés a hosszban, ami még ugyanaz a felvétel

_tar: OrderedDict[str, dict[str, Any]] = OrderedDict()
_IDO = re.compile(r"\[(\d+):(\d+(?:[.:]\d+)?)\]")
_LRC_FEJ = re.compile(r"^\[(ar|ti|al|au|by|re|ve|length|offset|#):[^\]]*\]\s*$", re.I)
HANGFAJL = (".mp3", ".flac", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".wma")


def lrc_ut(hass: HomeAssistant, media_id: str | None) -> str | None:
    """A zenefájl melletti .lrc útja a szám azonosítójából (media-source vagy a HA /media/ címe) – csak a média-mappákon
    belül, létező hangfájlnál."""
    from .library import ELOTAG, media_ut

    m = str(media_id or "")
    if m.startswith(ELOTAG):
        forras, _, rel = m[len(ELOTAG):].partition("/")
    elif h := re.search(r"/media/([^/?#]+)/([^?#]+)", m):
        forras, rel = h.group(1), unquote(h.group(2))
    else:
        return None
    alap = hass.config.media_dirs.get(forras)
    ut = media_ut(alap, rel) if alap else None
    if not ut or not ut.lower().endswith(HANGFAJL) or not os.path.isfile(ut):
        return None
    return os.path.splitext(ut)[0] + ".lrc"


def lrc_olvas(lrc: str) -> dict[str, Any] | None:
    """A helyi .lrc: időzített, ha van benne időbélyeg, különben sima szöveg."""
    try:
        with open(lrc, encoding="utf-8-sig", errors="replace") as f:
            szoveg = f.read()
    except OSError:
        return None
    if _IDO.search(szoveg):
        sorok = _lrc(szoveg)
        if sorok:
            return {"found": True, "instrumental": False, "synced": sorok, "plain": None, "source": "file"}
    sima = "\n".join(x for x in szoveg.splitlines() if not _LRC_FEJ.match(x)).strip()
    return {"found": True, "instrumental": False, "synced": None, "plain": sima, "source": "file"} if sima else None


def lrc_fej(lrc: str) -> dict[str, Any]:
    """A .lrc fejléce (előadó, cím, album, hossz) – a streaming-tároló újrakérdezéséhez."""
    ki: dict[str, Any] = {}
    try:
        with open(lrc, encoding="utf-8-sig", errors="replace") as f:
            for sor in f:
                if not (m := re.match(r"^\[(ar|ti|al|length):(.*)\]\s*$", sor.strip(), re.I)):
                    if _IDO.match(sor.strip()) or (sor.strip() and not _LRC_FEJ.match(sor.strip())):
                        break                    # a fejléc után a szöveg jön
                    continue
                k, v = m.group(1).lower(), m.group(2).strip()
                if k == "length" and (h := re.match(r"^(\d+):(\d+)$", v)):
                    ki["hossz"] = int(h.group(1)) * 60 + int(h.group(2))
                elif k != "length" and v:
                    ki[{"ar": "eloado", "ti": "cim", "al": "album"}[k]] = v
    except OSError:
        pass
    return ki


def lrc_ir(lrc: str, e: dict[str, Any], eloado: str, cim: str, album: str | None, hossz: float | None) -> bool:
    """A megtalált szöveg mentése a zenefájl mellé (.lrc – a Kodi és más lejátszók is olvassák). Időzített szöveg felülírja
    a sima szöveget, fordítva nem."""
    if not e.get("found") or e.get("instrumental") or not (e.get("synced") or e.get("plain")):
        return False
    if os.path.exists(lrc) and (not e.get("synced") or (lrc_olvas(lrc) or {}).get("synced")):
        return False
    fej = [f"[ar:{eloado}]", f"[ti:{cim}]"] + ([f"[al:{album}]"] if album else []) \
        + ([f"[length:{int(hossz) // 60:02d}:{int(hossz) % 60:02d}]"] if hossz else []) + [f"[re:Cantabile ({e.get('source') or 'LRCLIB'})]"]
    if e.get("synced"):
        test = [f"[{int(t) // 60:02d}:{t % 60:05.2f}]{sor}" for t, sor in e["synced"]]
    else:
        test = str(e["plain"]).splitlines()
    try:
        os.makedirs(os.path.dirname(lrc), exist_ok=True)
        with open(lrc + ".tmp", "w", encoding="utf-8") as f:
            f.write("\n".join(fej + test) + "\n")
        os.replace(lrc + ".tmp", lrc)
    except OSError as err:
        _LOGGER.debug("A dalszöveg nem menthető (%s): %s", lrc, err)
        return False
    return True


TAROLO = (".cache", "cantabile_dalszoveg")      # a streaming-tároló a HA konfigurációs mappájában
_NEVBE_NEM = re.compile(r'[\x00-\x1f/\\:*?"<>|]+')


def _nev(t: str) -> str:
    """Fájl- / mappanév az előadóból vagy a címből (tiltott jelek nélkül, legfeljebb 120 karakter)."""
    return _NEVBE_NEM.sub(" ", t).strip().strip(".").strip()[:120].strip() or "_"


def tarolo_ut(hass: HomeAssistant, eloado: str, cim: str) -> str:
    """A streamingről szóló szám dalszövege a tárolóban: Előadó/Cím.lrc (a cím a zárójeles toldalékok nélkül)."""
    return os.path.join(hass.config.path(*TAROLO), _nev(eloado), _nev(_TOLDALEK.sub("", cim).strip() or cim) + ".lrc")


_beolvas: dict[str, Any] = {}


async def _zenemappaban(hass: HomeAssistant, eloado: str, cim: str, varhat: bool = False) -> str | None:
    """A streamingről szóló szám .lrc-útja a zenemappában, ha ott is megvan (előadó és cím szerint, mint a helyettesítés).
    Lejátszás közben (`varhat=False`) csak a már beolvasott mappalistában keres: a hideg beolvasás percekig tarthat, azt
    a háttérben indítja el, és most nem vár rá."""
    from .helyettesit import _nas_index, _nas_keres
    from .library import ELOTAG, media_ut
    from .music import _nas_tar, kartya

    try:
        nas = str((await kartya(hass)).get("magno", {}).get("nas") or "").rstrip("/")
        if not nas.startswith(ELOTAG):
            return None
        if not varhat:
            forras, _, rel = nas[len(ELOTAG):].partition("/")
            alap = hass.config.media_dirs.get(forras)
            gy = media_ut(alap, rel) if alap else None
            t = _nas_tar.get(gy) if gy else None
            if not t or time.monotonic() - t[0] >= 1800:
                if not (f := _beolvas.get(nas)) or f.done():
                    async def beolvas() -> None:
                        with contextlib.suppress(Exception):
                            await hass.async_add_executor_job(_nas_index, hass, nas)
                    _beolvas[nas] = hass.async_create_background_task(beolvas(), "cantabile lyrics music index")
                return None
        idx = await hass.async_add_executor_job(_nas_index, hass, nas)
        mid = _nas_keres(idx, eloado, cim)
        return await hass.async_add_executor_job(lrc_ut, hass, mid) if mid else None
    except Exception:  # noqa: BLE001 – a zenemappa nélkül is megy (csak a tárolóba ment)
        _LOGGER.debug("Cantabile: a zenemappában nem kerestem (%s – %s)", eloado, cim, exc_info=True)
        return None
# zárójeles / kötőjeles toldalékok, amelyek a keresést elrontják: (Remastered 2011), - Live, [Radio Edit], feat. X
_TOLDALEK = re.compile(r"\s*[\(\[][^)\]]*(remaster|live|edit|version|mono|stereo|mix|feat|deluxe|bonus)[^)\]]*[\)\]]"
                       r"|\s+-\s+.*(remaster|live|edit|version|mono|stereo|mix).*$|\s+feat\.?\s.*$", re.I)


def _lrc(szoveg: str) -> list[list[Any]]:
    """[mm:ss.xx] sorok → [[mp, sor], …] időrendben (egy sor több időbélyeget is kaphat)."""
    sorok: list[list[Any]] = []
    for nyers in szoveg.splitlines():
        idok = _IDO.findall(nyers)
        if not idok:
            continue
        sor = _IDO.sub("", nyers).strip()
        for perc, mp in idok:
            sorok.append([round(int(perc) * 60 + float(mp.replace(":", ".")), 2), sor])
    sorok.sort(key=lambda x: x[0])
    return sorok


def _eredmeny(adat: dict[str, Any] | None) -> dict[str, Any]:
    if not adat:
        return {"found": False}
    szinkron = adat.get("syncedLyrics") or ""
    return {
        "found": True,
        "instrumental": bool(adat.get("instrumental")),
        "synced": _lrc(szinkron) if szinkron else None,
        "plain": adat.get("plainLyrics") or None,
        "artist": adat.get("artistName"),
        "title": adat.get("trackName"),
    }


class Korlat(aiohttp.ClientError):
    """Az LRCLIB 429-cel jelzi, hogy túl sok volt a kérés; `varj` mp múlva lehet újra kérni."""

    def __init__(self, varj: float) -> None:
        super().__init__(f"LRCLIB: túl sok kérés, {varj:.0f} mp múlva újra")
        self.varj = varj


KERES_KOZ = 1.0          # mp legalább két LRCLIB-kérés között
_lrclib = {"utolso": 0.0, "tilt": 0.0}
_zar = asyncio.Lock()


async def _ker(sess: aiohttp.ClientSession, ut: str, param: dict[str, Any]) -> Any:
    for proba in range(3):          # az LRCLIB néha átmeneti 503-at / időtúllépést ad – kétszer újra
        if (hatra := _lrclib["tilt"] - time.monotonic()) > 0:
            raise Korlat(hatra)                  # korlátozás alatt nem kérdezzük (a lejátszás a tartalékot kéri)
        async with _zar:                         # a kérések között legalább KERES_KOZ mp
            await asyncio.sleep(max(0.0, _lrclib["utolso"] + KERES_KOZ - time.monotonic()))
            _lrclib["utolso"] = time.monotonic()
        try:
            async with sess.get(f"{API}/{ut}", params=param, headers={"User-Agent": UA}, timeout=aiohttp.ClientTimeout(total=10)) as v:
                if v.status == 404:
                    return None
                if v.status == 429:
                    try:
                        varj = float(v.headers.get("Retry-After") or 60)
                    except ValueError:
                        varj = 60.0
                    varj = min(max(varj, 60.0), 3600.0)
                    _lrclib["tilt"] = time.monotonic() + varj
                    raise Korlat(varj)
                v.raise_for_status()             # tartós 5xx: hiba (nem „nincs dalszöveg”)
                return await v.json()
        except Korlat:
            raise
        except (aiohttp.ClientError, asyncio.TimeoutError) as err:
            if proba == 2 or (isinstance(err, aiohttp.ClientResponseError) and err.status < 500):
                raise
            await asyncio.sleep(1 + proba)
    return None


async def _ovh(sess: aiohttp.ClientSession, eloado: str, cim: str) -> str | None:
    """lyrics.ovh: sima szöveg, vagy None, ha nincs; hálózati / szerverhibánál kivétel."""
    url = f"{OVH}/{quote(eloado, safe='')}/{quote(cim, safe='')}"
    async with sess.get(url, headers={"User-Agent": UA}, timeout=aiohttp.ClientTimeout(total=10)) as v:
        if v.status == 404:
            return None
        v.raise_for_status()
        szoveg = str((await v.json(content_type=None)).get("lyrics") or "").replace("\r\n", "\n").strip()
    sorok = [s for s in szoveg.split("\n") if not s.lower().startswith("paroles de la chanson")]
    return "\n".join(sorok).strip() or None


def _legjobb(talalatok: list[dict[str, Any]], hossz: float | None) -> dict[str, Any] | None:
    def pont(t: dict[str, Any]) -> tuple[int, float]:
        elteres = abs((t.get("duration") or 0) - hossz) if hossz else 0
        return (0 if t.get("syncedLyrics") else 1, elteres)
    jo = [t for t in talalatok if t.get("syncedLyrics") or t.get("plainLyrics") or t.get("instrumental")]
    if hossz:
        jo = [t for t in jo if not t.get("duration") or abs(t["duration"] - hossz) <= IDOTURES * 3] or jo
    return min(jo, key=pont) if jo else None


async def keres(hass: HomeAssistant, eloado: str, cim: str, album: str | None, hossz: float | None,
                media_id: str | None = None, csak_lrclib: bool = False, lrc_fajl: str | None = None) -> dict[str, Any]:
    """Dalszöveg: előbb a zenefájl melletti .lrc, aztán az LRCLIB, végül a lyrics.ovh; a megtaláltat a fájl mellé menti.
    `csak_lrclib`: a begyűjtő csak az LRCLIB-et kérdezi, és annak hibájánál kivételt ad (nem a tartalékkal pótol)."""
    lrc = lrc_fajl or (await hass.async_add_executor_job(lrc_ut, hass, media_id) if media_id else None)
    masik: str | None = None                 # streamingnél a zenemappa azonos száma (oda is ment)
    if lrc is None:
        # nem zenemappás szám (Deezer, Spotify, MA, rádió…): a zenemappa azonos száma, különben a streaming-tároló
        masik = await _zenemappaban(hass, eloado, cim)
        lrc = tarolo_ut(hass, eloado, cim)
        if masik and (helyi := await hass.async_add_executor_job(lrc_olvas, masik)) and (helyi.get("synced") or not csak_lrclib):
            return helyi
    if lrc and (helyi := await hass.async_add_executor_job(lrc_olvas, lrc)):
        if helyi.get("synced") or not csak_lrclib:
            if masik:
                await hass.async_add_executor_job(lrc_ir, masik, helyi, eloado, cim, album, hossz)
            return helyi
    kulcs = f"{eloado.casefold()}|{cim.casefold()}|{round(hossz or 0)}"
    if kulcs in _tar and not csak_lrclib:
        _tar.move_to_end(kulcs)
        e = _tar[kulcs]
        for ut in (lrc, masik):
            if ut:
                await hass.async_add_executor_job(lrc_ir, ut, e, eloado, cim, album, hossz)
        return e
    sess = async_get_clientsession(hass)
    adat = None
    tiszta = _TOLDALEK.sub("", cim).strip() or cim
    lrclib_hiba: Exception | None = None
    try:
        if hossz:
            param = {"artist_name": eloado, "track_name": cim, "duration": round(hossz)}
            if album:
                param["album_name"] = album
            adat = await _ker(sess, "get", param)
        if not adat:
            talalatok = await _ker(sess, "search", {"artist_name": eloado, "track_name": tiszta}) or []
            if not talalatok and tiszta != cim:
                talalatok = await _ker(sess, "search", {"artist_name": eloado, "track_name": cim}) or []
            adat = _legjobb(talalatok, hossz)
    except (aiohttp.ClientError, asyncio.TimeoutError) as err:
        if csak_lrclib:
            raise
        lrclib_hiba = err
        _LOGGER.debug("LRCLIB nem elérhető, a tartalékot próbálom: %s", err)
    eredmeny = _eredmeny(adat)
    if eredmeny.get("found"):
        eredmeny["source"] = "LRCLIB"
    elif csak_lrclib:
        pass
    else:
        # tartalék: lyrics.ovh (sima szöveg) – ha az LRCLIB nem érhető el, vagy nincs nála a szám
        try:
            sima = await _ovh(sess, eloado, tiszta)
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError) as err:
            _LOGGER.debug("lyrics.ovh nem elérhető: %s", err)
            sima = None
        if sima:
            eredmeny = {"found": True, "instrumental": False, "synced": None, "plain": sima, "artist": eloado, "title": cim, "source": "lyrics.ovh"}
        elif lrclib_hiba is not None:
            # egyik sem válaszolt rendesen: hiba (nem tároljuk – később újra próbálható)
            raise lrclib_hiba
    _tar[kulcs] = eredmeny
    while len(_tar) > TAR_MERET:
        _tar.popitem(last=False)
    for ut in (lrc, masik):
        if ut:
            await hass.async_add_executor_job(lrc_ir, ut, eredmeny, eloado, cim, album, hossz)
    return eredmeny


UJRA_NAP = 30            # a nem talált / csak sima szövegű számot ennyi nap múlva kérdezi újra
KOZ = 5.0                # mp két szám között (az LRCLIB kímélése); 429 után nő, legfeljebb KOZ_MAX-ig
KOZ_MAX = 30.0
VARAKOZAS = (10, 30, 60, 60)   # mp: LRCLIB-hiba után ennyit vár, mielőtt ugyanazt a számot újra kéri
HIBA_MAX = 5             # ennyi egymás utáni hiba után az LRCLIB-et leállnak veszi (30 perc múlva folytatja)


def _cimkek(ut: str) -> dict[str, Any]:
    """Előadó, cím, album és hossz a fájl címkéiből (a begyűjtőhöz)."""
    try:
        import mutagen    # noqa: PLC0415 – a HA-ban megvan

        f = mutagen.File(ut, easy=True)
    except Exception:  # noqa: BLE001
        return {}
    if f is None:
        return {}
    t = getattr(f, "tags", None) or {}
    egy = lambda k: str((t.get(k) or [""])[0]).strip() if hasattr(t, "get") else ""  # noqa: E731
    return {"eloado": egy("artist") or egy("albumartist"), "cim": egy("title"), "album": egy("album") or None,
            "hossz": float(getattr(f.info, "length", 0) or 0) or None}


class Gyujto:
    """Időzített dalszövegek begyűjtése a zenetárra: amikor az LRCLIB elérhető, a háttérben, számonként 2 mp-es
    szünettel végigmegy a zenemappán, és a megtalált szöveget a fájl mellé menti (.lrc). Amit már próbált, megjegyzi
    (.cache/cantabile_dalszoveg.json): az időzítettet nem kérdezi újra, a nem találtat / csak sima szövegűt 30 nap múlva."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.fajl = hass.config.path(".cache", "cantabile_dalszoveg.json")
        self.allapot: dict[str, dict[str, Any]] = {}
        self.statusz: dict[str, Any] = {"fut": False, "kesz": 0, "osszes": 0, "szinkron": 0, "sima": 0, "nincs": 0, "lrclib": None,
                                        "szunet": KOZ}

    def _betolt(self) -> dict[str, dict[str, Any]]:
        try:
            with open(self.fajl, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return {}

    def _ment(self) -> None:
        os.makedirs(os.path.dirname(self.fajl), exist_ok=True)
        with open(self.fajl + ".tmp", "w", encoding="utf-8") as f:
            json.dump(self.allapot, f)
        os.replace(self.fajl + ".tmp", self.fajl)

    async def _lrclib_el(self) -> bool:
        try:
            await _ker(async_get_clientsession(self.hass), "get", {"artist_name": "Queen", "track_name": "Bohemian Rhapsody"})
        except Korlat:
            return True                              # elérhető, csak korlátoz: a kör kivárja
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError):
            return False
        return True

    async def fut(self) -> None:
        await asyncio.sleep(300)                     # az indulás után ne terheljen
        self.allapot = await self.hass.async_add_executor_job(self._betolt)
        while True:
            try:
                kesz = await self._kor()
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Cantabile: a dalszöveg-begyűjtés hibával leállt")
                kesz = False
            self.statusz["fut"] = False
            await asyncio.sleep(24 * 3600 if kesz else 1800)

    async def _kor(self) -> bool:
        """Egy kör a zenetáron; True, ha végigért (vagy nincs mit tenni), False, ha az LRCLIB közben elérhetetlen lett."""
        from .library import ELOTAG, _bejar, media_ut
        from .music import HibaUzenet, kartya

        self.statusz["lrclib"] = await self._lrclib_el()
        if not self.statusz["lrclib"]:
            return False
        try:
            nas = str((await kartya(self.hass)).get("magno", {}).get("nas") or "").rstrip("/")
        except HibaUzenet:
            return await self._tarolo_kor()   # zenemappa nélkül is: a tároló
        if not nas.startswith(ELOTAG):
            return await self._tarolo_kor()   # zenemappa nélkül is: a tároló
        forras, _, rel = nas[len(ELOTAG):].partition("/")
        alap = self.hass.config.media_dirs.get(forras)
        gyoker = media_ut(alap, rel) if alap else None
        if not gyoker:
            return await self._tarolo_kor()   # zenemappa nélkül is: a tároló
        fajlok = (await self.hass.async_add_executor_job(_bejar, gyoker))["fajlok"]
        most = time.time()
        teendo = [f for f in fajlok if not f.startswith("_Azonosítatlan/")
                  and not ((a := self.allapot.get(f)) and (a.get("e") == "szinkron" or most - a.get("t", 0) < UJRA_NAP * 86400))]
        self.statusz.update(fut=True, osszes=len(teendo), kesz=0)
        koz = KOZ
        for n, f in enumerate(teendo, 1):
            ut = os.path.join(gyoker, f)
            c = await self.hass.async_add_executor_job(_cimkek, ut)
            if not c.get("eloado") or not c.get("cim"):
                self.allapot[f] = {"e": "cimke", "t": time.time()}
            else:
                hiba = 0
                while True:
                    try:
                        e = await keres(self.hass, c["eloado"], c["cim"], c.get("album"), c.get("hossz"), csak_lrclib=True,
                                        lrc_fajl=os.path.splitext(ut)[0] + ".lrc")
                        koz = max(KOZ, koz * 0.95)       # sikeres kérések után lassan visszaáll az alaptempó
                        self.statusz["szunet"] = round(koz, 1)
                        break
                    except Korlat as err:
                        # túl sok kérés: kivárja, amennyit az LRCLIB kér, és ezután ritkábban kérdez (nem számít hibának)
                        koz = min(koz * 1.5, KOZ_MAX)
                        self.statusz["szunet"] = round(koz, 1)
                        _LOGGER.debug("Cantabile: %s; a begyűjtő ezután %.1f mp-enként kérdez", err, koz)
                        await asyncio.sleep(err.varj + 1)
                    except (aiohttp.ClientError, asyncio.TimeoutError) as err:
                        hiba += 1
                        if hiba >= HIBA_MAX:
                            _LOGGER.debug("Cantabile: az LRCLIB %d hiba után leállt (%s), 30 perc múlva folytatom", hiba, err)
                            await self.hass.async_add_executor_job(self._ment)
                            self.statusz["lrclib"] = False
                            return False             # az LRCLIB tartósan nem válaszol: később folytatja
                        await asyncio.sleep(VARAKOZAS[hiba - 1])   # átmeneti hiba: kis szünet, aztán ugyanez a szám újra
                eredm = "szinkron" if e.get("synced") else "sima" if e.get("found") and e.get("plain") else "nincs"
                self.allapot[f] = {"e": eredm, "t": time.time()}
                self.statusz[eredm] += 1
                await asyncio.sleep(koz)
            self.statusz["kesz"] = n
            if n % 25 == 0:
                await self.hass.async_add_executor_job(self._ment)
        await self.hass.async_add_executor_job(self._ment)
        return await self._tarolo_kor()

    def _tarolo_lista(self) -> list[tuple[str, str]]:
        """A streaming-tároló csak sima szövegű fájljai, amelyeket 30 napja nem kérdeztünk: (kulcs, út)."""
        gy, most, ki = self.hass.config.path(*TAROLO), time.time(), []
        for mappa, _, fajlok in os.walk(gy):
            for f in sorted(fajlok):
                if not f.endswith(".lrc"):
                    continue
                ut = os.path.join(mappa, f)
                kulcs = "tarolo/" + os.path.relpath(ut, gy)
                a = self.allapot.get(kulcs)
                if a and a.get("e") == "szinkron":
                    continue
                with contextlib.suppress(OSError):
                    t = a.get("t", 0) if a else os.path.getmtime(ut)     # új fájl: a mentéskor már kérdeztük
                    if most - t >= UJRA_NAP * 86400 and not (lrc_olvas(ut) or {}).get("synced"):
                        ki.append((kulcs, ut))
        return ki

    async def _tarolo_kor(self) -> bool:
        """A streaming-tároló sima szövegeihez időzített változat (LRCLIB); ha van, kicseréli."""
        teendo = await self.hass.async_add_executor_job(self._tarolo_lista)
        self.statusz.update(fut=True, tarolo=len(teendo), tarolo_kesz=0)
        for n, (kulcs, ut) in enumerate(teendo, 1):
            c = await self.hass.async_add_executor_job(lrc_fej, ut)
            if c.get("eloado") and c.get("cim"):
                while True:
                    try:
                        e = await keres(self.hass, c["eloado"], c["cim"], c.get("album"), c.get("hossz"), csak_lrclib=True, lrc_fajl=ut)
                        break
                    except Korlat as err:
                        await asyncio.sleep(err.varj + 1)
                    except (aiohttp.ClientError, asyncio.TimeoutError):
                        await self.hass.async_add_executor_job(self._ment)
                        self.statusz["lrclib"] = False
                        return False
                self.allapot[kulcs] = {"e": "szinkron" if e.get("synced") else "sima", "t": time.time()}
                if e.get("synced"):
                    self.statusz["tarolo_csere"] = self.statusz.get("tarolo_csere", 0) + 1
                    # ha a szám a zenemappában is megvan, oda is kerül az időzített
                    if masik := await _zenemappaban(self.hass, c["eloado"], c["cim"], varhat=True):
                        await self.hass.async_add_executor_job(lrc_ir, masik, e, c["eloado"], c["cim"], c.get("album"), c.get("hossz"))
                await asyncio.sleep(KOZ)
            self.statusz["tarolo_kesz"] = n
        await self.hass.async_add_executor_job(self._ment)
        return True


@callback
def regisztral(hass: HomeAssistant) -> None:
    @websocket_api.websocket_command(
        {
            vol.Required("type"): "cantabile/lyrics",
            vol.Required("artist"): str,
            vol.Required("title"): str,
            vol.Optional("album"): vol.Any(str, None),
            vol.Optional("duration"): vol.Any(vol.Coerce(float), None),
            vol.Optional("media_id"): vol.Any(str, None),          # a szám fájlja (a .lrc mellé mentéshez / olvasáshoz)
        }
    )
    @websocket_api.async_response
    async def ws_dalszoveg(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        eloado, cim = msg["artist"].strip(), msg["title"].strip()
        if not eloado or not cim:
            connection.send_result(msg["id"], {"found": False})
            return
        try:
            eredmeny = await keres(hass, eloado, cim, msg.get("album"), msg.get("duration"), msg.get("media_id"))
        except (aiohttp.ClientError, asyncio.TimeoutError) as err:
            _LOGGER.debug("LRCLIB: %s", err)
            connection.send_error(msg["id"], "nem_elerheto", szoveg(hass, "lyrics_down"))
            return
        connection.send_result(msg["id"], eredmeny)

    websocket_api.async_register_command(hass, ws_dalszoveg)

    # a zenetár időzített dalszövegeinek begyűjtése a háttérben (egyszer indul)
    if "cantabile_dalszoveg_gyujto" not in hass.data:
        gy = hass.data["cantabile_dalszoveg_gyujto"] = Gyujto(hass)
        hass.async_create_background_task(gy.fut(), "cantabile lyrics collector")

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/lyrics/collect_status"})
    @callback
    def ws_gyujtes(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        gy = hass.data.get("cantabile_dalszoveg_gyujto")
        connection.send_result(msg["id"], gy.statusz if gy else {})

    websocket_api.async_register_command(hass, ws_gyujtes)
