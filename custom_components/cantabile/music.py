"""Zene indítása név alapján: a `cantabile.play` szolgáltatás és az Assist (LLM) eszköz közös motorja.

Megkapja, mit kért a felhasználó (előadó, album, szám, rádióadó vagy lista) és hol szóljon, megkeresi a legjobb
találatot, és úgy indítja, ahogy a Cantabile kártya tenné:
  - zenemappa (a kártya `magno.nas` mappája): sorral rendelkező lejátszón (Sonos) sorba töltve, a 48 kHz-es
    másolattal, ha be van állítva ilyen mappa; sor nélküli lejátszón (pl. WiiM) a sorozatlejátszóval.
    Az első számok után a többi a háttérben kerül a sorba.
  - rádió: a kártya gombjai közül, ha nincs ilyen, a Radio Browserből; Sonoson x-rincon-mp3radio:// előtaggal.
    A Radio Browserből indított adót a NET-adó érzékelő jegyzi meg, így a kártya NET-adóként ismeri fel.
  - lista: a Sonos-kedvencek albumai és lejátszási listái, végül a Deezer (csak Sonoson).
  - Deezer: ami a zenemappában nincs meg, Sonoson a Deezer nyilvános katalógusában keresi; a Sonos a saját
    Deezer-fiókjával játssza a linket.
A hangszórókat és az adókat a vezérlőpultok első Cantabile kártyájából olvassa (a kártya ⚙ Mentése mindegyikbe
ugyanazt írja). Válaszként visszaadja, mi szól és hol, vagy a hibát.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import math
import os
import random
import re
import time
import unicodedata
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import Event, HomeAssistant, ServiceCall, SupportsResponse, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_call_later, async_track_state_change_event

from . import foglalas
from .const import szoveg
from .library import ELOTAG, _bejar, media_ut
from .runtime import Cantabile

_LOGGER = logging.getLogger(__name__)

# Radio Browser: a tükörszerverek listáját a szolgáltatótól kéri (a szerverek cserélődnek), tartaléknak az ismertek
RB_ALAP = [f"https://{x}.api.radio-browser.info" for x in ("de1", "de2")]
_rb_lista: list[str] = []
_rb_ido = 0.0          # mikor kérte le utoljára a tükörszerverek listáját (sikertelenül is: 10 percig nem próbálja újra)
KARTYAK = ("custom:cantabile-card", "custom:tablet-radio")
FELTOLTES_ALAP = "Cantabile"                 # a kártya TELEFON fülének feltöltő mappája, ha nincs megadva
ALBUM_MAX, ELOADO_MAX = 80, 60               # ennyi szám kerül a sorba (a kártya is 80-at tölt be albumból)
ELORE = 3                                    # ennyi szám kerül a sorba indulás előtt, a többi a háttérben
FAJTAK = ("auto", "eloado", "album", "szam", "radio", "lista")

# a szolgáltatás (angol) mezőnevei és értékei → a belső (magyar) nevek
KIND = {"auto": "auto", "artist": "eloado", "album": "album", "track": "szam", "radio": "radio", "playlist": "lista"}
SOURCE = {"auto": "auto", "local": "nas", "deezer": "deezer", "spotify": "spotify", "tidal": "tidal"}
TIPUS_KI = {"eloado": "artist", "album": "album", "szam": "track", "radio": "radio", "lista": "playlist"}

SCHEMA = vol.Schema(
    {
        vol.Required("query"): str,
        vol.Optional("kind", default="auto"): vol.In(list(KIND)),
        vol.Optional("artist", default=""): str,
        vol.Optional("speaker", default=""): str,
        vol.Optional("shuffle"): bool,
        vol.Optional("source", default="auto"): vol.In(list(SOURCE)),
    }
)

_kartya_tar: dict[str, Any] = {}
_nas_tar: dict[str, tuple[float, dict[str, Any]]] = {}


def norm(t: str) -> str:
    """Kisbetű, ékezet és írásjel nélkül, egy szóközzel (nem latin írású nevek betűi megmaradnak)."""
    t = "".join(c for c in unicodedata.normalize("NFD", str(t or "")) if unicodedata.category(c) != "Mn").casefold()
    return " ".join(re.sub(r"[\W_]+", " ", t).split())


def tiszta(nev: str) -> str:
    """Album- és fájlnévből a sorszám, az évszám, a [..] és (..) toldalékok és a kiterjesztés nélkül."""
    n = re.sub(r"\.[A-Za-z0-9]{2,4}$", "", nev)
    n = re.sub(r"\[[^\]]*\]|\([^)]*\)", " ", n)
    n = re.sub(r"^\s*\d{1,4}[\s.\-_]+(?:-\s*)?", "", n)
    return norm(n)


def pont(kerdes: str, nev: str) -> float:
    """Mennyire illik a név a kérdésre (0 = sehogy, 100 = pontosan)."""
    q = norm(kerdes)
    if not q:
        return 0
    legjobb = 0.0
    for n in {norm(nev), tiszta(nev)}:
        if not n:
            continue
        if n == q:
            p = 100.0
        elif n.startswith(q + " ") or n.endswith(" " + q):
            p = 80 + 10 * len(q) / len(n)
        elif f" {q} " in f" {n} ":
            p = 65 + 15 * len(q) / len(n)
        elif all(f" {s} " in f" {n} " for s in q.split()):
            p = 45 + 15 * len(q) / len(n)
        elif len(q) >= 4 and q in n:
            p = 35 + 10 * len(q) / len(n)
        else:
            p = 0
        legjobb = max(legjobb, p)
    return legjobb


def cim(u: str) -> str:
    """Sémák és záró ; nélkül (mint a kártya CIM függvénye)."""
    return re.sub(r";$", "", re.sub(r"^([a-z0-9+.-]+://)+", "", str(u or ""), flags=re.I))


def termeszetes(s: str) -> list:
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", s)]


# a kártya angol kulcsai → a belső (magyar) kulcsok (a kártya ugyanígy fordítja)
KULCS = {"speakers": "hangszorok", "stations": "adok", "name": "nev", "short": "rovid", "frequency": "frekvencia",
         "mode": "mod", "tape": "magno", "media_folder": "nas", "brand": "marka", "hires_folder": "hires",
         "upload_folder": "feltoltes", "player_script": "szkript"}


def magyarit(o: Any) -> Any:
    if isinstance(o, list):
        return [magyarit(x) for x in o]
    if isinstance(o, dict):
        return {KULCS.get(k, k): magyarit(v) for k, v in o.items()}
    return o


async def kartya(hass: HomeAssistant) -> dict[str, Any]:
    """Az első Cantabile kártya beállításai, belső kulcsokkal (5 percig tárolva)."""
    if _kartya_tar and time.monotonic() - _kartya_tar["ido"] < 300:
        return _kartya_tar["c"]
    ll = hass.data.get("lovelace")
    dashboards = getattr(ll, "dashboards", None)
    if dashboards is None and isinstance(ll, dict):
        dashboards = ll.get("dashboards")

    def keres(o: Any) -> dict | None:
        if isinstance(o, dict):
            if o.get("type") in KARTYAK:
                return magyarit(o)
            o = list(o.values())
        if isinstance(o, list):
            for x in o:
                if (t := keres(x)) is not None:
                    return t
        return None

    for d in (dashboards or {}).values():
        try:
            c = keres(await d.async_load(False))
        except Exception:  # noqa: BLE001 – üres vagy YAML-hibás vezérlőpult
            continue
        if c:
            _kartya_tar.update(ido=time.monotonic(), c=c)
            return c
    raise HibaUzenet("no_card")


_hangszoro_tar: dict[str, Any] = {}


async def osszes_hangszoro(hass: HomeAssistant) -> set[str]:
    """Az összes vezérlőpult összes Cantabile kártyáján felvett hangszórók (5 percig tárolva)."""
    if _hangszoro_tar and time.monotonic() - _hangszoro_tar["ido"] < 300:
        return _hangszoro_tar["h"]
    ll = hass.data.get("lovelace")
    dashboards = getattr(ll, "dashboards", None)
    if dashboards is None and isinstance(ll, dict):
        dashboards = ll.get("dashboards")
    talalt: set[str] = set()
    adok: set[str] = set()

    def bejar(o: Any) -> None:
        if isinstance(o, dict):
            if o.get("type") in KARTYAK:
                for h in o.get("speakers") or o.get("hangszorok") or []:
                    if isinstance(h, dict) and h.get("entity"):
                        talalt.add(h["entity"])
                for a in o.get("stations") or o.get("adok") or []:
                    if isinstance(a, dict) and a.get("url"):
                        adok.add(cim(a["url"]))
            for v in o.values():
                bejar(v)
        elif isinstance(o, list):
            for v in o:
                bejar(v)

    for d in (dashboards or {}).values():
        try:
            bejar(await d.async_load(False))
        except Exception:  # noqa: BLE001 – üres vagy YAML-hibás vezérlőpult
            continue
    _hangszoro_tar.update(ido=time.monotonic(), h=talalt, a=adok)
    return talalt


@callback
def figyel(hass: HomeAssistant) -> None:
    """Vezérlőpult mentésekor (pl. a kártya ⚙ Mentés gombja) a tárolt kártya-beállítás azonnal elavul, így a hang-
    vezérlés már az újat használja."""

    @callback
    def torol(_e: Event) -> None:
        _kartya_tar.clear()
        _hangszoro_tar.clear()

    hass.bus.async_listen("lovelace_updated", torol)


async def osszes_ado(hass: HomeAssistant) -> set[str]:
    """Az összes Cantabile kártyán felvett adók címe (séma nélkül, mint a cim())."""
    await osszes_hangszoro(hass)
    return _hangszoro_tar["a"]


class HibaUzenet(Exception):
    """Kimondható hiba: üzenetkulcs (const._TEXT) és a behelyettesítendő értékek."""

    def __init__(self, kulcs: str, **kw: Any) -> None:
        super().__init__(kulcs)
        self.kulcs, self.kw = kulcs, kw

    def szoveg(self, hass: HomeAssistant) -> str:
        return szoveg(hass, self.kulcs, **self.kw)


def kihagyott(c: dict[str, Any]) -> tuple[str, ...]:
    """A zenemappa nem előadó-mappái: a 48 kHz-es másolatok és a feltöltések mappája."""
    m = c.get("magno") or {}
    return tuple(x for x in (m.get("hires"), m.get("feltoltes") or FELTOLTES_ALAP) if x)


def nas_lista(hass: HomeAssistant, nas: str) -> dict[str, Any]:
    forras, _, rel = nas[len(ELOTAG):].partition("/")
    alap = hass.config.media_dirs.get(forras)
    if not alap:
        raise HibaUzenet("nas_unavailable")
    gyoker = media_ut(alap, rel)
    if gyoker is None:
        raise HibaUzenet("nas_unavailable")
    tarolt = _nas_tar.get(gyoker)
    if tarolt and time.monotonic() - tarolt[0] < 1800:
        return tarolt[1]
    if not os.path.isdir(gyoker):
        raise HibaUzenet("nas_unavailable")
    l = _bejar(gyoker)
    albumok: dict[str, list[str]] = {}
    for f in l["fajlok"]:
        mappa, _, _ = f.rpartition("/")
        albumok.setdefault(mappa, []).append(f)
    for k in list(albumok):
        albumok[k] = [f for f in albumok[k] if ".." not in f]
    for v in albumok.values():
        v.sort(key=lambda x: termeszetes(x.rpartition("/")[2]))
    eredmeny = {"albumok": albumok}
    _nas_tar[gyoker] = (time.monotonic(), eredmeny)
    return eredmeny


def sonos_valtozat(albumok: dict[str, list[str]], szamok: list[str], hires: str | None) -> list[str]:
    """A 48 kHz-es másolat (<hires>/<előadó>/<album …>), ha van – a Sonos legfeljebb 48 kHz-et dekódol."""
    resz = szamok[0].split("/") if szamok else []
    if not hires or len(resz) != 3 or resz[0] == hires:
        return szamok
    eloado, album = resz[0], resz[1]
    for j in dict.fromkeys((album.replace("[24Bit-192kHz]", "[24Bit-48kHz]"), f"{album} [48kHz]")):
        van = {x.rpartition("/")[2]: x for x in albumok.get(f"{hires}/{eloado}/{j}", [])}
        if van:
            return [van.get(x.rpartition("/")[2], x) for x in szamok]
    return szamok


DEEZER = "https://api.deezer.com"
# a kártya csak ezeket kérdezheti a közvetítőn át (a Deezer API böngészőből nem hívható: nincs CORS-fejléc)
DEEZER_UT = re.compile(r"^/(search(/(album|artist|track|playlist))?|artist/\d+(/(top|albums|related|radio))?|album/\d+(/tracks)?|playlist/\d+"
                       r"|chart/\d+(/\w+)?|genre(/\d+(/(artists|radios))?)?|radio/\d+(/tracks)?)(\?[^#]*)?$")
_deezer_tar: dict[str, tuple[float, Any]] = {}


async def deezer(hass: HomeAssistant, ut: str) -> Any:
    """Deezer nyilvános API (kulcs nélkül), 10 percig tárolva."""
    if not DEEZER_UT.match(ut):
        raise HibaUzenet("deezer_denied")
    tarolt = _deezer_tar.get(ut)
    if tarolt and time.monotonic() - tarolt[0] < 600:
        return tarolt[1]
    sess = async_get_clientsession(hass)
    try:
        async with asyncio.timeout(10):
            r = await sess.get(DEEZER + ut, headers={"Accept-Language": str(hass.config.language or "en")})
            r.raise_for_status()
            v = await r.json(content_type=None)
    except Exception as e:  # noqa: BLE001
        raise HibaUzenet("deezer_down", hiba=e) from e
    if isinstance(v, dict) and v.get("error"):
        raise HibaUzenet("deezer_error", hiba=v["error"].get("message", v["error"]))
    if len(_deezer_tar) > 300:
        _deezer_tar.clear()
    _deezer_tar[ut] = (time.monotonic(), v)
    return v


class Zene:
    def __init__(self, hass: HomeAssistant, rt: Cantabile) -> None:
        self.hass = hass
        self.rt = rt
        self._hatter: dict[str, asyncio.Task] = {}      # Sonos-sor háttérbeli feltöltése, vezető hangszórónként
        self._alias_le: list = []

    @callback
    def stop(self) -> None:
        """Az integráció leállásakor / újratöltésekor: a háttérben futó sorfeltöltések és figyelők leállnak."""
        self._hatter_le(list(self._hatter))
        for le in self._alias_le:
            le()
        self._alias_le = []

    def _hatter_le(self, tagok: list[str]) -> None:
        """Ezeknek a hangszóróknak a futó sorfeltöltése leáll; a többi hangszóró sora tovább töltődik."""
        for eid in tagok:
            if (t := self._hatter.pop(eid, None)) and not t.done():
                t.cancel()

    async def hiv(self, domain: str, service: str, data: dict[str, Any]) -> None:
        await self.hass.services.async_call(domain, service, data, blocking=True)

    # ---- hangszóró ----
    def hangszorok(self, c: dict[str, Any], hol: str) -> tuple[str, list[str], str]:
        """(név, entitások, mód); több Sonos esetén az első a csoport vezetője."""
        hl = [h for h in c.get("hangszorok", []) if h.get("entity")]
        if not hl:
            raise HibaUzenet("no_speaker_cfg")
        sonosok = [h for h in hl if h.get("mod") == "sonos"]
        q = norm(hol)
        if q and re.search(r"\b(mind|mindket|mindketto|mindegyik|osszes|egesz|mindenhol|ketto|both|all|every|everywhere|whole)", q):
            if len(sonosok) < 2:
                raise HibaUzenet("one_sonos")
            return (" + ".join(h.get("nev", h["entity"]) for h in sonosok), [h["entity"] for h in sonosok], "sonos")
        if q:
            jo = max(hl, key=lambda h: pont(q, h.get("nev", "")) or pont(q, h["entity"].split(".")[1].replace("_", " ")))
            if not (pont(q, jo.get("nev", "")) or pont(q, jo["entity"].split(".")[1].replace("_", " "))):
                raise HibaUzenet("no_such_speaker", hol=hol, nevek=", ".join(h.get("nev", h["entity"]) for h in hl))
        else:
            # ami most szól, különben az első
            jo = next((h for h in hl if (s := self.hass.states.get(h["entity"])) and s.state in ("playing", "buffering")), hl[0])
        return (jo.get("nev", jo["entity"]), [jo["entity"]], jo.get("mod", "url"))

    async def csoport(self, tagok: list[str]) -> None:
        """Több Sonos: összekapcsolja őket; egy: kiveszi a csoportjából, hogy egyedül szóljon."""
        vezeto = tagok[0]
        s = self.hass.states.get(vezeto)
        most = list((s.attributes.get("group_members") if s else None) or [vezeto])
        if len(tagok) > 1:
            if set(tagok) - set(most):
                await self.hiv("media_player", "join", {"entity_id": vezeto, "group_members": tagok[1:]})
        elif len(most) > 1:
            tobbi = [e for e in most if e != vezeto]
            if most[0] == vezeto:
                await self.hiv("media_player", "unjoin", {"entity_id": tobbi})
            else:
                await self.hiv("media_player", "unjoin", {"entity_id": vezeto})

    # ---- keresés ----
    def nas_talalat(self, l: dict[str, Any], mit: str, fajta: str, eloado: str, kihagy: tuple[str, ...] = ()) -> tuple[str, list[str], int, str, list[str]] | None:
        """(fajta, számok, kezdő index, kimondható név, más jelöltek)"""
        albumok: dict[str, list[str]] = l["albumok"]
        ervenyes = {m: f for m, f in albumok.items() if m and m.split("/")[0] not in kihagy}

        def eloado_ok(m: str) -> bool:
            return not eloado or pont(eloado, m.split("/")[0]) >= 45

        jeloltek: list[tuple[float, str, Any]] = []
        if fajta in ("auto", "eloado"):
            for e in {m.split("/")[0] for m in ervenyes}:
                p = pont(mit, e)
                if p >= (45 if fajta == "eloado" else 80):
                    jeloltek.append((p + 3, "eloado", e))
        if fajta in ("auto", "album"):
            for m in ervenyes:
                if "/" not in m or not eloado_ok(m):
                    continue
                album = m.split("/")[1]
                p = max(pont(mit, album), pont(mit, m.replace("/", " ")) - 5)
                if p >= (45 if fajta == "album" else 65):
                    jeloltek.append((p + 2, "album", m))
        if fajta in ("auto", "szam") and not any(j[0] >= 100 for j in jeloltek):
            for m, fajlok in ervenyes.items():
                for f in fajlok:
                    # „Előadó - Cím.mp3”: a címet hasonlítjuk, az előadó-rész csak szűkít
                    nev = re.sub(r"^[\d\s.\-_]+", "", tiszta_nev(f))
                    fe, kotojel, fc = nev.partition(" - ")
                    if not kotojel:
                        fc = nev
                    elif eloado and pont(eloado, fe) < 45 and pont(eloado, m.split("/")[0]) < 45:
                        continue
                    p = max(pont(mit, fc), pont(mit, nev) - 15)
                    if p >= (45 if fajta == "szam" else 65):
                        jeloltek.append((p, "szam", f))
        if not jeloltek:
            return None
        # azonos pontnál: az eredeti album a válogatások, élő felvételek és bónuszok előtt
        def sorrend(j: tuple[float, str, Any]) -> tuple:
            szoveg = norm(str(j[2]))
            gyenge = bool(re.search(r"\b(live|bonus|demo|best of|greatest|hits|collection|va)\b", szoveg))
            return (-j[0], gyenge, len(str(j[2])))

        jeloltek.sort(key=sorrend)
        p, tipus, x = jeloltek[0]
        mas = []
        for j in jeloltek[1:6]:
            n = j[2].rpartition("/")[2] if j[1] != "eloado" else j[2]
            if n not in mas and j[0] >= p - 15:
                mas.append(re.sub(r"\.[A-Za-z0-9]{2,4}$", "", n))
        if tipus == "eloado":
            szamok = []
            for m in sorted((m for m in ervenyes if norm(m.split("/")[0]) == norm(x)), key=termeszetes):
                szamok += [f for f in ervenyes[m] if not re.search(r"\b(live|demo)\b", norm(m)) or len(ervenyes) < 3]
            return ("eloado", szamok or [f for m in ervenyes if m.split("/")[0] == x for f in ervenyes[m]], 0, x, mas[:3])
        if tipus == "album":
            album = re.sub(r"^\s*\d{1,3}[\s.\-_]+", "", x.split("/")[-1]).strip()
            return ("album", albumok[x][:ALBUM_MAX], 0, f"{x.split('/')[0]} – {album}", mas[:3])
        mappa = x.rpartition("/")[0]
        lista = albumok[mappa][:ALBUM_MAX]
        kezdo = lista.index(x) if x in lista else 0
        if x not in lista:
            lista = [x]
        cim_ = re.sub(r"^[\d\s.\-_]+", "", tiszta_nev(x))
        return ("szam", lista, kezdo, f"{mappa.split('/')[0]} – {cim_}", mas[:3])

    async def rb(self, ut: str) -> Any:
        sess = async_get_clientsession(self.hass)
        hiba: Exception | None = None
        global _rb_ido
        if time.monotonic() - _rb_ido > (86400 if _rb_lista else 600):     # naponta frissíti (hiba után 10 perc múlva)
            _rb_ido = time.monotonic()
            with contextlib.suppress(Exception):
                async with asyncio.timeout(5), sess.get("https://all.api.radio-browser.info/json/servers",
                                                        headers={"User-Agent": "Cantabile/1.0 (Home Assistant)"}) as r:
                    uj = list(dict.fromkeys([f"https://{x['name']}" for x in await r.json()] + RB_ALAP))
                    _rb_lista[:] = uj
        for sz in _rb_lista or RB_ALAP:
            try:
                async with asyncio.timeout(8), sess.get(f"{sz}{ut}", headers={"User-Agent": "Cantabile/1.0 (Home Assistant)"}) as r:
                    r.raise_for_status()
                    return await r.json()
            except Exception as e:  # noqa: BLE001 – a következő tükrözött szerver
                hiba = e
        raise HibaUzenet("rb_down", hiba=hiba)

    async def radio_talalat(self, c: dict[str, Any], mit: str, csak_gomb: bool, sonos: bool = False) -> dict[str, Any] | None:
        q = re.sub(r"\b(radio|radiot|radiora|adot|ado|fm|station)\b", " ", norm(mit)).strip() or norm(mit)
        orszag = str(self.hass.config.country or "").upper()
        legjobb = None
        for a in c.get("adok", []):
            p = max(pont(mit, a.get("nev", "")), pont(q, a.get("nev", "")), pont(q, a.get("rovid", "")) if a.get("rovid") else 0)
            if p >= 65 and (legjobb is None or p > legjobb[0]):
                legjobb = (p, a)
        if legjobb:
            a = legjobb[1]
            return {"nev": a["nev"], "url": a["url"], "gomb": True}
        if csak_gomb:
            return None
        from urllib.parse import quote

        talalat = await self.rb(f"/json/stations/search?name={quote(mit)}&hidebroken=true&order=votes&reverse=true&limit=20")
        if not talalat and q != norm(mit):
            talalat = await self.rb(f"/json/stations/search?name={quote(q)}&hidebroken=true&order=votes&reverse=true&limit=20")
        if not talalat:
            return None
        def ert(t: dict) -> tuple:
            # Sonoson az MP3/AAC adás biztosabb, mint a nagy bitrátájú FLAC/OGG
            kodek = 4 if sonos and str(t.get("codec", "")).upper() in ("MP3", "AAC", "AAC+") else 0
            return (max(pont(mit, t.get("name", "")), pont(q, t.get("name", ""))) + (8 if orszag and t.get("countrycode") == orszag else 0) + kodek, t.get("votes", 0))
        t = max(talalat, key=ert)
        return {
            "nev": (t.get("name") or "").strip(), "url": t.get("url_resolved") or t.get("url"), "gomb": False,
            "ikon": t.get("favicon") or "", "orszag": t.get("countrycode") or "", "kodek": t.get("codec") or "",
            "kbps": t.get("bitrate") or 0, "uuid": t.get("stationuuid"),
        }

    async def kedvenc_talalat(self, sonos: str, mit: str) -> dict[str, Any] | None:
        jeloltek = []
        for mappa in ("object.container.album.musicAlbum", "object.container.playlistContainer"):
            try:
                r = await self.hass.services.async_call(
                    "media_player", "browse_media",
                    {"entity_id": sonos, "media_content_type": "favorites_folder", "media_content_id": mappa},
                    blocking=True, return_response=True,
                )
            except Exception:  # noqa: BLE001
                continue
            v = (r or {}).get(sonos) or {}
            if hasattr(v, "as_dict"):   # a szolgáltatás Pythonból BrowseMedia-objektumot ad vissza
                v = v.as_dict()
            for x in v.get("children", []) or []:
                p = pont(mit, x.get("title", ""))
                if p >= 45:
                    jeloltek.append((p, x))
        if not jeloltek:
            return None
        x = max(jeloltek, key=lambda j: j[0])[1]
        return {"nev": x["title"], "id": x["media_content_id"], "tipus": x.get("media_content_type") or "favorite_item_id"}

    async def deezer_talalat(self, mit: str, fajta: str, eloado: str) -> dict[str, Any] | None:
        """{tipus, ids, poz, nev}: előadó → népszerű számai; album / lista → a linkje; szám → az albuma attól a számtól."""
        from urllib.parse import quote

        q = quote(f"{eloado} {mit}".strip())

        def legjobb(lista: list[dict], mezo: str, kuszob: float) -> tuple[float, dict] | None:
            jo = None
            for n, x in enumerate(lista or []):
                p = pont(mit, x.get(mezo, "")) - n * 0.5          # a Deezer saját sorrendje dönt holtversenynél
                if x.get("nb_fan") is not None:                    # előadónál a rajongószám (azonos nevű kis előadók ellen)
                    p += min(6.0, math.log10(1 + x["nb_fan"]))
                if eloado and x.get("artist") and pont(eloado, x["artist"].get("name", "")) < 45:
                    p -= 30
                if p >= kuszob and (jo is None or p > jo[0]):
                    jo = (p, x)
            return jo

        jeloltek: list[tuple[float, str, dict]] = []
        if fajta == "eloado" or (fajta == "auto" and not eloado):
            if j := legjobb((await deezer(self.hass, f"/search/artist?q={quote(mit)}&limit=10")).get("data"), "name", 45 if fajta == "eloado" else 80):
                jeloltek.append((j[0] + 3, "eloado", j[1]))
        if fajta in ("auto", "album"):
            if j := legjobb((await deezer(self.hass, f"/search/album?q={q}&limit=15")).get("data"), "title", 45 if fajta == "album" else 65):
                jeloltek.append((j[0] + 2, "album", j[1]))
        if fajta in ("auto", "szam"):
            if j := legjobb((await deezer(self.hass, f"/search/track?q={q}&limit=15")).get("data"), "title", 45 if fajta == "szam" else 65):
                jeloltek.append((j[0], "szam", j[1]))
        if fajta in ("auto", "lista"):
            if j := legjobb((await deezer(self.hass, f"/search/playlist?q={quote(mit)}&limit=10")).get("data"), "title", 45 if fajta == "lista" else 70):
                jeloltek.append((j[0] - 1, "lista", j[1]))
        if not jeloltek:
            return None
        jeloltek.sort(key=lambda j: -j[0])
        _, tipus, x = jeloltek[0]
        if tipus == "eloado":
            top = (await deezer(self.hass, f"/artist/{x['id']}/top?limit=30")).get("data") or []
            if top:
                return {"tipus": "eloado", "ids": [t["link"] for t in top], "poz": None, "nev": x["name"]}
            if len(jeloltek) < 2:
                return None
            _, tipus, x = jeloltek[1]
        if tipus == "album":
            return {"tipus": "album", "ids": [x["link"]], "poz": 0, "nev": f"{x['artist']['name']} – {x['title']}"}
        if tipus == "lista":
            return {"tipus": "lista", "ids": [x["link"]], "poz": 0, "nev": x["title"]}
        szamok = (await deezer(self.hass, f"/album/{x['album']['id']}/tracks?limit=200")).get("data") or []
        poz = next((n for n, t in enumerate(szamok) if t.get("id") == x["id"]), None)
        if poz is None:
            return {"tipus": "szam", "ids": [x["link"]], "poz": 0, "nev": f"{x['artist']['name']} – {x['title']}"}
        return {"tipus": "szam", "ids": [f"https://www.deezer.com/album/{x['album']['id']}"], "poz": poz, "nev": f"{x['artist']['name']} – {x['title']}"}

    async def deezer_indit(self, hsz: tuple[str, list[str], str], t: dict[str, Any], keverve: bool) -> None:
        _, tagok, mod = hsz
        if mod != "sonos":
            raise HibaUzenet("deezer_sonos")
        ids = t["ids"][:]
        if t["tipus"] == "eloado" and keverve:
            random.shuffle(ids)
        await self.sonos_sor(tagok, ids, 0, keverve and t["tipus"] != "eloado", t["poz"])

    # ---- indítás ----
    async def nas_indit(self, c: dict[str, Any], l: dict[str, Any], hsz: tuple[str, list[str], str], szamok: list[str], kezdo: int, keverve: bool) -> None:
        m = c.get("magno") or {}
        nas = m["nas"].rstrip("/")
        _, tagok, mod = hsz
        if keverve and kezdo == 0:
            szamok = szamok[:]
            random.shuffle(szamok)
        self._hatter_le(tagok)
        if mod != "sonos":
            # sor nélküli lejátszó: a beépített sorozatlejátszó (vagy a kártyán megadott saját szkript)
            ids = [f"{nas}/{x}" for x in szamok]
            if szkript := m.get("szkript"):
                await self.hiv("script", "turn_off", {"entity_id": szkript})
                await self.hiv("script", "turn_on", {"entity_id": szkript, "variables": {"entity_id": tagok[0], "szamok": ids, "kezdo": kezdo}})
            else:
                self.rt.play_tracks(tagok[0], ids, kezdo)
            return
        await self.sonos_sor(tagok, [f"{nas}/{x}" for x in sonos_valtozat(l["albumok"], szamok, m.get("hires"))], kezdo, keverve and kezdo > 0)

    async def sonos_sor(self, tagok: list[str], ids: list[str], kezdo: int, keverve: bool, poz: int | None = None) -> None:
        """Sonos-sor: kiürít, az első számok azonnal, a többi a háttérben; `keverve`: a végén Sonos-keverés. `poz`: a sor indulóhelye, ha nem az ids indexe
        (pl. egy Deezer-album linkje több számot tesz a sorba)."""
        self._hatter_le(tagok)
        await self.csoport(tagok)
        e = {"entity_id": tagok[0]}
        kor = self.rt.rounds
        await self.hiv("media_player", "shuffle_set", {**e, "shuffle": False})
        await self.hiv("media_player", "clear_playlist", e)

        async def sorba(i: str) -> bool:
            try:
                await self.hiv("media_player", "play_media", {**e, "media_content_id": i, "media_content_type": "music", "enqueue": "add"})
                return True
            except Exception as err:  # noqa: BLE001 – egy rossz fájl ne állítsa meg a többit
                _LOGGER.warning("Cantabile: kihagyva %s (%s)", i, err)
                return False

        elol = ids[: kezdo + ELORE]
        kimaradt = 0
        for n, i in enumerate(elol):
            if not await sorba(i) and n < kezdo:
                kimaradt += 1
        hely = poz if poz is not None else max(0, min(kezdo - kimaradt, len(elol) - 1))
        await self.hiv("sonos", "play_queue", {**e, "queue_position": hely})
        await self.hiv("media_player", "repeat_set", {**e, "repeat": "off" if kor == 1 else "all"})

        async def maradek() -> None:
            for i in ids[len(elol):]:
                await sorba(i)
            if keverve:   # a sor betöltése után a Sonos keveri (a szóló szám marad)
                await self.hiv("media_player", "shuffle_set", {**e, "shuffle": True})

        self._hatter[tagok[0]] = self.hass.async_create_background_task(maradek(), f"cantabile queue fill {tagok[0]}")

    async def radio_indit(self, c: dict[str, Any], hsz: tuple[str, list[str], str], ado: dict[str, Any]) -> None:
        _, tagok, mod = hsz
        self._hatter_le(tagok)
        if mod != "sonos":
            self.rt.stop_tracks(tagok[0])
            if szkript := (c.get("magno") or {}).get("szkript"):
                await self.hiv("script", "turn_off", {"entity_id": szkript})
        if mod == "sonos":
            await self.csoport(tagok)
        elotte = cim((s.attributes.get("media_content_id") if (s := self.hass.states.get(tagok[0])) else "") or "")
        if not ado["gomb"]:
            self.net_jegyez(ado, tagok[0], mod, c, elotte)
        url = f"x-rincon-mp3radio://{cim(ado['url'])}" if mod == "sonos" else ado["url"]
        await self.hiv("media_player", "play_media", {"entity_id": tagok[0], "media_content_id": url, "media_content_type": "music"})
        if ado.get("uuid"):
            self.hass.async_create_background_task(self.rb(f"/json/url/{ado['uuid']}"), "cantabile radio-browser click")

    @callback
    def net_jegyez(self, ado: dict[str, Any], entity: str, mod: str, c: dict[str, Any], elotte: str) -> None:
        """A NET-adó adatai a kártyának; 15 mp-ig figyeli, milyen (átirányított) címet jelent vissza a lejátszó."""
        adat = {k: ado.get(k) for k in ("url", "ikon", "orszag", "kodek", "kbps")}
        adat.update(nev=ado["nev"], alias="", ido=time.time())
        self.rt.set_net(adat)
        for le in self._alias_le:
            le()
        self._alias_le = []
        gombok = {cim(a.get("url")) for a in c.get("adok", [])}

        @callback
        def valtozott(ev: Event) -> None:
            s = ev.data.get("new_state")
            if not s or s.state not in ("playing", "buffering"):
                return
            cid = str(s.attributes.get("media_content_id") or "")
            c0 = cim(cid)
            radioszeru = mod != "sonos" or cid.lower().startswith("x-rincon-mp3radio:")
            akt = self.rt.net
            if akt and c0 and radioszeru and c0 not in (elotte, cim(ado["url"])) and c0 not in gombok:
                self.rt.set_net({**akt, "alias": c0})
                vege(None)

        @callback
        def vege(_now: Any) -> None:
            for le in self._alias_le:
                le()
            self._alias_le = []

        self._alias_le = [async_track_state_change_event(self.hass, entity, valtozott), async_call_later(self.hass, 15, vege)]

    async def szolg_talalat(self, szolg: str, mit: str, fajta: str, eloado: str) -> dict[str, Any] | None:
        """Spotify / Tidal (kísérleti): {tipus, ids, poz, nev} – a Sonos a szolgáltatás linkjével játssza."""
        from urllib.parse import quote

        from . import streaming

        orszag = str(self.hass.config.country or "US").upper()
        q = f"{eloado} {mit}".strip()
        cel = {"eloado": ["eloado"], "album": ["album"], "szam": ["szam"], "lista": ["lista"]}.get(fajta, ["eloado", "album", "szam", "lista"])
        jeloltek: list[tuple[float, str, dict[str, Any]]] = []
        if szolg == "spotify":
            r = await streaming.spotify(self.hass, f"/search?q={quote(q)}&type=artist,album,track,playlist&limit=10&market={orszag}")
            for tip, kulcs, mezo in (("eloado", "artists", "name"), ("album", "albums", "name"), ("szam", "tracks", "name"), ("lista", "playlists", "name")):
                if tip not in cel:
                    continue
                for n, x in enumerate([x for x in ((r.get(kulcs) or {}).get("items") or []) if x][:10]):
                    p = pont(mit, x.get(mezo, "")) - n * 0.5 + (3 if tip == "eloado" and not eloado else 0)
                    if p >= (45 if fajta != "auto" else 65):
                        jeloltek.append((p, tip, x))
            if not jeloltek:
                return None
            _, tip, x = max(jeloltek, key=lambda j: j[0])
            if tip == "eloado":
                # fejlesztői módban a top-tracks nem érhető el (403): az előadóra szűrt számkeresés, ha kevés, az első albuma
                szuro = quote('artist:"' + x["name"] + '"')
                ker = await streaming.spotify(self.hass, f"/search?q={szuro}&type=track&limit=10&market={orszag}")
                top, latott = [], set()
                for t in (ker.get("tracks") or {}).get("items") or []:
                    if t and any(a.get("id") == x["id"] for a in t.get("artists") or []) and t.get("name") not in latott:
                        latott.add(t.get("name"))
                        top.append(t)
                if len(top) < 5:
                    alb = (await streaming.spotify(self.hass, f"/artists/{x['id']}/albums?include_groups=album&limit=10&market={orszag}")).get("items") or []
                    if alb:
                        szamok = (await streaming.spotify(self.hass, f"/albums/{alb[0]['id']}/tracks?limit=50&market={orszag}")).get("items") or []
                        top += [t for t in szamok if t and t.get("name") not in latott]
                return {"tipus": "eloado", "ids": [f"https://open.spotify.com/track/{t['id']}" for t in top], "poz": None, "nev": x["name"]} if top else None
            if tip == "album":
                return {"tipus": "album", "ids": [f"https://open.spotify.com/album/{x['id']}"], "poz": 0, "nev": x["name"]}
            if tip == "lista":
                return {"tipus": "lista", "ids": [f"https://open.spotify.com/playlist/{x['id']}"], "poz": 0, "nev": x["name"]}
            alb = x.get("album") or {}
            if alb.get("id") and x.get("disc_number", 1) == 1 and x.get("track_number"):
                return {"tipus": "szam", "ids": [f"https://open.spotify.com/album/{alb['id']}"], "poz": x["track_number"] - 1, "nev": x["name"]}
            return {"tipus": "szam", "ids": [f"https://open.spotify.com/track/{x['id']}"], "poz": 0, "nev": x["name"]}
        # Tidal (JSON:API): a találatok a relationships alatt, az adataik az included-ben
        r = await streaming.tidal(self.hass, f"/searchResults/{quote(q, safe='')}?countryCode={orszag}&include=artists,albums,tracks,playlists")
        inc = {(x.get("type"), x.get("id")): x.get("attributes") or {} for x in r.get("included") or []}
        rel = ((r.get("data") or {}).get("relationships") or {})
        for tip, kulcs in (("eloado", "artists"), ("album", "albums"), ("szam", "tracks"), ("lista", "playlists")):
            if tip not in cel:
                continue
            for n, x in enumerate(((rel.get(kulcs) or {}).get("data") or [])[:10]):
                a = inc.get((x.get("type"), x.get("id")), {})
                nev = a.get("title") or a.get("name") or ""
                p = pont(mit, nev) - n * 0.5
                if p >= (45 if fajta != "auto" else 65):
                    jeloltek.append((p, tip, {"id": x.get("id"), "nev": nev}))
        if not jeloltek:
            return None
        _, tip, x = max(jeloltek, key=lambda j: j[0])
        utvonal = {"album": "album", "szam": "track", "lista": "playlist"}
        if tip == "eloado":
            alb = await streaming.tidal(self.hass, f"/artists/{x['id']}/relationships/albums?countryCode={orszag}")
            elso = ((alb.get("data") or [{}])[0] or {}).get("id")
            return {"tipus": "album", "ids": [f"https://tidal.com/browse/album/{elso}"], "poz": 0, "nev": x["nev"]} if elso else None
        return {"tipus": tip, "ids": [f"https://tidal.com/browse/{utvonal[tip]}/{x['id']}"], "poz": 0, "nev": x["nev"]}

    async def szolg_valasz(self, szolg: str, hsz: tuple[str, list[str], str], mit: str, fajta: str, eloado: str, keverve: bool | None) -> dict[str, Any]:
        from . import streaming

        if hsz[2] != "sonos":
            raise HibaUzenet("stream_sonos", szolg=szolg.capitalize())
        try:
            t = await self.szolg_talalat(szolg, mit, fajta, eloado)
        except streaming.StreamHiba as e:
            raise HibaUzenet("stream_error", szolg=szolg.capitalize(), hiba=e.szoveg(self.hass)) from e
        if not t:
            raise HibaUzenet("not_found_service", szolg=szolg.capitalize(), mit=mit)
        kev = keverve if keverve is not None else t["tipus"] == "eloado"
        await self.deezer_indit(hsz, t, kev)
        return {"success": True, "kind": TIPUS_KI[t["tipus"]], "playing": t["nev"], "speaker": hsz[0], "source": szolg.capitalize(), "shuffle": kev}

    async def deezer_valasz(self, hsz: tuple[str, list[str], str], mit: str, fajta: str, eloado: str, keverve: bool | None) -> dict[str, Any]:
        t = await self.deezer_talalat(mit, fajta, eloado)
        if not t:
            raise HibaUzenet("not_found_any", mit=mit)
        kev = keverve if keverve is not None else t["tipus"] == "eloado"
        await self.deezer_indit(hsz, t, kev)
        return {"success": True, "kind": TIPUS_KI[t["tipus"]], "playing": t["nev"], "speaker": hsz[0], "source": "Deezer", "shuffle": kev}

    # ---- a szolgáltatás ----
    async def kezel(self, call: ServiceCall) -> dict[str, Any]:
        return await self.play(call.data, call.context.user_id)

    async def play(self, d: dict[str, Any], user_id: str | None = None) -> dict[str, Any]:
        """A közös motor (szolgáltatás és LLM-eszköz): angol mezőnevek, angol kulcsú válasz. A foglalt hangszórót
        (amelyet más felhasználó használ) nem veszi el; sikeres indításkor a hangszóró a kérő felhasználóé lesz."""
        hova: list[str] = []
        v = await self._play(d, user_id, hova)
        if v.get("success") and user_id and hova:
            u = await self.hass.auth.async_get_user(user_id)
            foglalas.kozpont(self.hass).foglal(hova, user_id, (u.name if u else None) or "?", "hang")
        return v

    async def _play(self, d: dict[str, Any], user_id: str | None, hova: list[str]) -> dict[str, Any]:
        mit, fajta, eloado = str(d.get("query") or "").strip(), KIND[d.get("kind") or "auto"], str(d.get("artist") or "").strip()
        forras = SOURCE[d.get("source") or "auto"]
        beall: dict[str, Any] = {"hol": str(d.get("speaker") or "")}
        if d.get("shuffle") is not None:
            beall["keverve"] = bool(d["shuffle"])
        d = beall
        try:
            if not mit:
                raise HibaUzenet("what")
            c = await kartya(self.hass)
            deezer_be = c.get("deezer") is not False
            hsz = self.hangszorok(c, d["hol"])
            hol_szoveg, tagok, mod = hsz
            if m := foglalas.kozpont(self.hass).masik(tagok, user_id):
                nev = next((h.get("nev") for h in c.get("hangszorok", []) if h.get("entity") == m[0]), None) or hol_szoveg
                raise HibaUzenet("busy", hol=nev, ki=m[1]["nev"])
            hova.extend(tagok)
            sonos = next((h["entity"] for h in c.get("hangszorok", []) if h.get("mod") == "sonos"), None)

            if fajta == "radio":
                ado = await self.radio_talalat(c, mit, False, mod == "sonos")
                if not ado:
                    raise HibaUzenet("no_station", mit=mit)
                await self.radio_indit(c, hsz, ado)
                return {"success": True, "kind": "radio", "playing": ado["nev"], "speaker": hol_szoveg, "source": "preset" if ado["gomb"] else "Radio Browser"}

            if forras == "deezer" and deezer_be:
                return await self.deezer_valasz(hsz, mit, fajta, eloado, d.get("keverve"))
            if forras in ("spotify", "tidal"):
                return await self.szolg_valasz(forras, hsz, mit, fajta, eloado, d.get("keverve"))

            if fajta == "lista":
                if mod != "sonos" or not sonos:
                    raise HibaUzenet("lists_sonos")
                k = await self.kedvenc_talalat(sonos, mit)
                if not k:
                    if not deezer_be:
                        raise HibaUzenet("not_found_local", mit=mit)
                    return await self.deezer_valasz(hsz, mit, fajta, eloado, d.get("keverve"))
                await self.csoport(tagok)
                await self.hiv("media_player", "shuffle_set", {"entity_id": tagok[0], "shuffle": bool(d.get("keverve"))})
                await self.hiv("media_player", "play_media", {"entity_id": tagok[0], "media_content_id": k["id"], "media_content_type": k["tipus"]})
                return {"success": True, "kind": "playlist", "playing": k["nev"], "speaker": hol_szoveg, "source": "Sonos favorites"}

            nas = (c.get("magno") or {}).get("nas", "").rstrip("/")
            talalat = None
            if nas.startswith(ELOTAG) and forras != "deezer":
                l = await self.hass.async_add_executor_job(nas_lista, self.hass, nas)
                talalat = self.nas_talalat(l, mit, fajta, eloado, kihagyott(c))
            if talalat is None and fajta == "auto":
                # nem zene a NAS-on: rádióadó a gombokon, Sonos-kedvenc, végül a Radio Browser
                ado = await self.radio_talalat(c, mit, True)
                if ado:
                    await self.radio_indit(c, hsz, ado)
                    return {"success": True, "kind": "radio", "playing": ado["nev"], "speaker": hol_szoveg, "source": "preset"}
                if sonos and mod == "sonos":
                    k = await self.kedvenc_talalat(sonos, mit)
                    if k:
                        await self.csoport(tagok)
                        await self.hiv("media_player", "play_media", {"entity_id": tagok[0], "media_content_id": k["id"], "media_content_type": k["tipus"]})
                        return {"success": True, "kind": "playlist", "playing": k["nev"], "speaker": hol_szoveg, "source": "Sonos favorites"}
            if talalat is None and mod == "sonos" and forras != "nas" and deezer_be:
                # a NAS-on nincs: a Deezeren
                return await self.deezer_valasz(hsz, mit, fajta, eloado, d.get("keverve"))
            if talalat is None:
                raise HibaUzenet("not_found_local", mit=mit)
            tipus, szamok, kezdo, nev, mas = talalat
            if tipus == "eloado":
                szamok = szamok[:]
                keverve = d.get("keverve", True)
                if keverve:
                    random.shuffle(szamok)
                szamok = szamok[:ELOADO_MAX]
                await self.nas_indit(c, l, hsz, szamok, 0, False)
            else:
                keverve = d.get("keverve", False)
                await self.nas_indit(c, l, hsz, szamok, kezdo, keverve)
            v = {"success": True, "kind": TIPUS_KI[tipus], "playing": nev, "speaker": hol_szoveg, "source": "music folder", "tracks": len(szamok), "shuffle": keverve}
            if mas:
                v["alternatives"] = mas
            return v
        except HibaUzenet as e:
            return {"success": False, "error": e.szoveg(self.hass)}
        except Exception as e:  # noqa: BLE001 – a hangszóró hibája is kimondható legyen
            _LOGGER.exception("Cantabile: a lejátszás indítása nem sikerült")
            return {"success": False, "error": szoveg(self.hass, "start_failed", hiba=e)}


def tiszta_nev(rel: str) -> str:
    """Fájlnév kiterjesztés nélkül (a kimondott címhez)."""
    return re.sub(r"\.[A-Za-z0-9]{2,4}$", "", rel.rpartition("/")[2]).strip()


@callback
def regisztral(hass: HomeAssistant, rt: Cantabile) -> Zene:
    z = Zene(hass, rt)
    hass.services.async_register("cantabile", "play", z.kezel, schema=SCHEMA, supports_response=SupportsResponse.OPTIONAL)

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/deezer", vol.Required("ut"): str})
    @websocket_api.async_response
    async def ws_deezer(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            connection.send_result(msg["id"], await deezer(hass, msg["ut"]))
        except HibaUzenet as e:
            connection.send_error(msg["id"], "deezer", e.szoveg(hass))

    websocket_api.async_register_command(hass, ws_deezer)
    return z
