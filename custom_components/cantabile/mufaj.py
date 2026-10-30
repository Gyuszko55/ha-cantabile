"""Műfajok a zenemappához: a kazettapolc GENRE füle (`cantabile/genres`).

A műfaj a zenefájlok saját címkéjéből jön (ffprobe), albumonként egyszer: egy album a zenemappa olyan mappája, amelyben
közvetlenül zenefájl van, és a műfaja az első fájl műfaja (egy albumon belül szinte mindig egyforma). Az összes fájl
helyett így csak albumonként egyet kell megnyitni. A címkében több műfaj is lehet („Rock; Blues”, „Pop/Rock”) – az album
mindegyiknél szerepel (legfeljebb háromnál); a régi ID3v1-számokat („(17)”) névre fordítja, a „hip hop” és a „Hip-Hop”
egy műfaj.

A gyűjtés a háttérben fut (egyszerre néhány ffprobe), a kártya közben a haladást mutatja. Az eredmény a HA tárolójába
kerül (mappánként a mappa módosítási idejével), így újraindítás után, és a 30 percenkénti frissítéskor is csak az új vagy
megváltozott albumok fájlját olvassa újra.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .library import HANGFAJL

_LOGGER = logging.getLogger(__name__)

TAROLO = "cantabile_mufajok"
ERVENYES = 30 * 60            # ennyi idő után a következő lekérdezés újra bejárja a mappát (csak a változást olvassa)
EGYSZERRE = 4                 # párhuzamos ffprobe
MAX_MUFAJ = 3
ID3V1 = (
    "Blues", "Classic Rock", "Country", "Dance", "Disco", "Funk", "Grunge", "Hip-Hop", "Jazz", "Metal", "New Age", "Oldies",
    "Other", "Pop", "R&B", "Rap", "Reggae", "Rock", "Techno", "Industrial", "Alternative", "Ska", "Death Metal", "Pranks",
    "Soundtrack", "Euro-Techno", "Ambient", "Trip-Hop", "Vocal", "Jazz+Funk", "Fusion", "Trance", "Classical", "Instrumental",
    "Acid", "House", "Game", "Sound Clip", "Gospel", "Noise", "Alternative Rock", "Bass", "Soul", "Punk", "Space", "Meditative",
    "Instrumental Pop", "Instrumental Rock", "Ethnic", "Gothic", "Darkwave", "Techno-Industrial", "Electronic", "Pop-Folk",
    "Eurodance", "Dream", "Southern Rock", "Comedy", "Cult", "Gangsta", "Top 40", "Christian Rap", "Pop/Funk", "Jungle",
    "Native American", "Cabaret", "New Wave", "Psychedelic", "Rave", "Showtunes", "Trailer", "Lo-Fi", "Tribal", "Acid Punk",
    "Acid Jazz", "Polka", "Retro", "Musical", "Rock & Roll", "Hard Rock",
)


def mufajok(nyers: str) -> list[str]:
    """Egy műfaj-címke műfajai: szétválasztva, az ID3v1-számok névvel, a csupa kis- / nagybetűs szó nagy kezdőbetűvel."""
    ki: list[str] = []
    for r in re.split(r"[;/,|\\\x00]+", nyers or ""):
        r = r.strip()
        if m := re.fullmatch(r"\(?(\d{1,3})\)?\s*(.*)", r):
            r = m.group(2).strip() or (ID3V1[int(m.group(1))] if int(m.group(1)) < len(ID3V1) else "")
        if not r:
            continue
        if r == r.lower() or (r == r.upper() and len(r) > 3):
            r = r.title()
        ki.append(r)
    return list(dict.fromkeys(ki))[:MAX_MUFAJ]


AZONOS = {"rnb": "rb", "rhythmandblues": "rb", "rockandroll": "rockroll"}     # ugyanaz a műfaj más írással


def kulcs(nev: str) -> str:
    k = re.sub(r"[^0-9a-z]", "", nev.casefold())
    return AZONOS.get(k, k)


def _albumok(gyoker: str, kihagy: list[str]) -> list[tuple[str, float, str]]:
    """(relatív mappa, módosítási idő, az első zenefájl) minden olyan mappára, amelyben közvetlenül zenefájl van."""
    ki: list[tuple[str, float, str]] = []
    latott: set[tuple[int, int]] = set()
    for hol, almappak, nevek in os.walk(gyoker, followlinks=True):
        rel = os.path.relpath(hol, gyoker).replace(os.sep, "/")
        if rel == ".":
            almappak[:] = [m for m in almappak if m not in kihagy and not m.startswith(".")]
        try:
            st = os.stat(hol)
        except OSError:
            almappak.clear()
            continue
        if (st.st_dev, st.st_ino) in latott:
            almappak.clear()
            continue
        latott.add((st.st_dev, st.st_ino))
        almappak.sort()
        fajlok = sorted(n for n in nevek if n.lower().endswith(HANGFAJL))
        if fajlok and rel != ".":
            ki.append((rel, st.st_mtime, os.path.join(hol, fajlok[0])))
    return ki


async def _cimke(fajl: str) -> str:
    try:
        p = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "error", "-show_entries", "format_tags:stream_tags", "-of", "json", fajl,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        try:
            ki, _ = await asyncio.wait_for(p.communicate(), 15)
        except TimeoutError:
            p.kill()
            await p.wait()
            return ""
        adat = json.loads(ki or b"{}")
    except (OSError, ValueError):
        _LOGGER.debug("Cantabile: a műfaj nem olvasható (%s)", fajl, exc_info=True)
        return ""
    for t in [(adat.get("format") or {}).get("tags") or {}] + [s.get("tags") or {} for s in adat.get("streams") or []]:
        for k, v in t.items():
            if str(k).lower() == "genre" and v:
                return str(v)
    return ""


class Gyujto:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, 1, TAROLO)
        self._tar: dict[str, dict[str, Any]] | None = None       # abszolút mappa → {"m": mtime, "g": [műfajok]}
        self._futas: dict[str, asyncio.Task] = {}
        self._albumok: dict[str, list[str]] = {}                  # gyökér → a legutóbb látott albumok (relatív)
        self._ido: dict[str, float] = {}
        self._halad: dict[str, tuple[int, int]] = {}

    async def lekerdez(self, gyoker: str, kihagy: list[str], frissit: bool) -> dict[str, Any]:
        if self._tar is None:
            self._tar = (await self._store.async_load()) or {}
        fut = self._futas.get(gyoker)
        if (fut is None or fut.done()) and (frissit or time.monotonic() - self._ido.get(gyoker, -ERVENYES) >= ERVENYES):
            self._ido[gyoker] = time.monotonic()
            self._futas[gyoker] = self.hass.async_create_background_task(self._gyujt(gyoker, kihagy, frissit), f"cantabile_mufaj_{gyoker}")
            await asyncio.sleep(0)
        csoport: dict[str, dict[str, Any]] = {}
        for rel in self._albumok.get(gyoker, []):
            bej = self._tar.get(os.path.join(gyoker, rel))
            if bej is None:
                continue
            for g in bej["g"] or [""]:
                c = csoport.setdefault(kulcs(g), {"name": g, "albums": []})
                c["albums"].append(rel)
        lista = sorted(csoport.values(), key=lambda c: (not c["name"], -len(c["albums"]), c["name"].casefold()))
        kesz, ossz = self._halad.get(gyoker, (0, 0))
        fut = self._futas.get(gyoker)
        return {"genres": lista, "done": kesz, "total": ossz, "running": bool(fut and not fut.done())}

    async def mappa_mufajai(self, mappa: str) -> list[str]:
        """Egy albummappa műfajai a tárolt gyűjtésből (üres, ha még nem olvastuk ki)."""
        if self._tar is None:
            self._tar = (await self._store.async_load()) or {}
        return list((self._tar.get(mappa) or {}).get("g") or [])

    async def _gyujt(self, gyoker: str, kihagy: list[str], frissit: bool) -> None:
        assert self._tar is not None
        albumok = await self.hass.async_add_executor_job(_albumok, gyoker, kihagy)
        self._albumok[gyoker] = [a[0] for a in albumok]
        kell = [a for a in albumok if frissit or (self._tar.get(os.path.join(gyoker, a[0])) or {}).get("m") != a[1]]
        self._halad[gyoker] = (len(albumok) - len(kell), len(albumok))
        zar = asyncio.Semaphore(EGYSZERRE)

        async def egy(rel: str, mtime: float, fajl: str) -> None:
            async with zar:
                g = mufajok(await _cimke(fajl))
            self._tar[os.path.join(gyoker, rel)] = {"m": mtime, "g": g}
            k, n = self._halad[gyoker]
            self._halad[gyoker] = (k + 1, n)
            if (k + 1) % 100 == 0:
                self._store.async_delay_save(lambda: self._tar or {}, 5)

        try:
            await asyncio.gather(*(egy(*a) for a in kell))
        finally:
            self._store.async_delay_save(lambda: self._tar or {}, 1)
        _LOGGER.debug("Cantabile: műfajok összegyűjtve (%s): %d album, %d újraolvasva", gyoker, len(albumok), len(kell))
