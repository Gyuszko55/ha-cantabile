"""Útmátrix: forrás × hangszóró → a lehetséges utak sorrendben.

Egy cella (egy forrás egy hangszórón) az utak listája; egy út:
- bemenet: a feltételek, amelyek kellenek hozzá (pl. Deezer-fiók a WiiM-ben, Music Assistant-lejátszó, zenemappa), egyenként
  igaz / hamis / ismeretlen (`None`: nem ellenőrizhető, pl. a Spotify még nem látta az eszközt);
- kimenet: melyik lejátszón szól (a készülék fő lejátszója vagy a Music Assistant-lejátszója), és milyen módon (közvetlen,
  vagy helyettesítés: ugyanaz a zene más forrásból);
- állapot: „ok” (minden feltétel teljesül), „hianyzik” (valamelyik nem), „?” (valamelyik nem ellenőrizhető).

A mátrix a beállításból és a HA-ból épül (`bemenetek` → `epit`), a HA tárolójában megmarad (minden indításkor azonnal
megvan), és frissül: indításkor, ha a lejátszók vagy a vezérlőpultok (a kártya beállítása) változnak, óránként, és kérésre.

2.7.0b1: a mátrix csak megfigyel – a kártya még a régi úton dönt; a `cantabile/matrix` paranccsal lekérdezhető.
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from datetime import timedelta
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN, VERSION

_LOGGER = logging.getLogger(__name__)

TAR_KULCS = f"{DOMAIN}.matrix"
TAR_VERZIO = 1
FRISSITES = timedelta(hours=1)
KESLELTETES = 60                 # registry- / vezérlőpult-változás után ennyi mp múlva (a sorozatos változások egybe)

WIIM = ("wiim", "linkplay")
SONOS = ("sonos", "sonos_csoport")       # a Multiroom (a Sonosok csoportja) a Sonos útjain szól
MULTIROOM = "cantabile:multiroom"
BT = "helyi:bt"                          # a böngésző (a kártyát mutató telefon / tablet) saját hangja
# a böngészőn csak ezek az utak élnek (Deezer, Spotify, MA nem szól a böngészőben)
BT_UTAK = {"sajat", "ideiglenes", "preset_forditva"}
# TV-n (Cantabile TV-oldallal) a zenemappás helyettesítés áll elöl (kép, borító, dalszöveg); az MA csak hangként, utána
TV_ELORE = {"nas_helyett"}

# a feltételek (bemenetek) nevei
FELTETELEK: dict[str, str] = {
    "url": "a lejátszó fogad zenei címet",
    "zenemappa": "zenemappa beállítva",
    "ma": "Music Assistant-lejátszó a készüléken",
    "ma_deezer": "Deezer a Music Assistantban",
    "wiim_deezer": "Deezer-fiók a WiiM-ben",
    "sonos_deezer": "Deezer a Sonosban",
    "sonos_spotify": "Spotify a Sonosban",
    "spotify_ha": "a HA Spotify-integrációja",
    "spotify_eszkoz": "Spotify Connect-eszközként ismert",
    "tidal": "Tidal-hozzáférés",
    "deezer_cella": "a Deezer szól ezen a hangszórón",
    "preset_cella": "a preset tartalma (Deezer / rádió) szól ezen a hangszórón",
}

# út: (kulcs, név, kimenet: "fo" | "ma", mód: "kozvetlen" | "helyettesites", platformok (None = bármelyik), feltételek)
# a sorrend a cellán belüli elsőbbség – ugyanaz, ahogy ma a kártya választ
_SAJAT = ("sajat", "a készülék saját lejátszója", "fo", "kozvetlen", None)
FORRASOK: list[tuple[str, str, list[tuple[Any, ...]]]] = [
    ("nas", "Zenemappa", [
        (*_SAJAT, ["url", "zenemappa"]),
        ("ma_url", "Music Assistant (a fájl címével)", "ma", "kozvetlen", None, ["ma", "zenemappa"]),
    ]),
    ("radio", "Rádió", [
        (*_SAJAT, ["url"]),
        ("ma_url", "Music Assistant (az adó címével)", "ma", "kozvetlen", None, ["ma"]),
    ]),
    ("deezer", "Deezer-album / -lista", [
        ("sonos_deezer", "a Sonos saját Deezere", "fo", "kozvetlen", SONOS, ["sonos_deezer"]),
        ("wiim_deezer", "a WiiM saját Deezere (lossless)", "fo", "kozvetlen", WIIM, ["wiim_deezer"]),
        ("ma_deezer", "a Music Assistant Deezere", "ma", "kozvetlen", None, ["ma", "ma_deezer"]),
        ("nas_helyett", "ugyanazok a számok a zenemappából", "fo", "helyettesites", None, ["url", "zenemappa"]),
    ]),
    ("deezer_szamok", "Deezer-számok (előadó, keresés)", [
        ("sonos_deezer", "a Sonos saját Deezere", "fo", "kozvetlen", SONOS, ["sonos_deezer"]),
        ("ma_deezer", "a Music Assistant Deezere", "ma", "kozvetlen", None, ["ma", "ma_deezer"]),
        ("nas_helyett", "ugyanazok a számok a zenemappából", "fo", "helyettesites", None, ["url", "zenemappa"]),
    ]),
    ("spotify", "Spotify", [
        ("sonos_spotify", "a Sonos saját Spotify-ja", "fo", "kozvetlen", SONOS, ["sonos_spotify"]),
        ("spotify_connect", "Spotify Connect", "fo", "kozvetlen", None, ["spotify_ha", "spotify_eszkoz"]),
        ("deezer_tartalek", "album és szám a Deezerről (lista nem)", "fo", "helyettesites", None, ["deezer_cella"]),
    ]),
    ("tidal", "Tidal", [
        ("sonos_tidal", "a Sonos saját Tidalja", "fo", "kozvetlen", SONOS, ["tidal"]),
    ]),
    ("wiim_preset", "WiiM-preset", [
        ("wiim_preset", "a WiiM saját presetje", "fo", "kozvetlen", WIIM, []),
        ("preset_forditva", "a preset tartalma: Deezer-album vagy rádió", "fo", "helyettesites", None, ["preset_cella"]),
    ]),
    ("sonos_kedvenc", "Sonos-kedvencek", [
        ("sonos_kedvenc", "a Sonos kedvence", "fo", "kozvetlen", SONOS, []),
    ]),
    ("ma_konyvtar", "Music Assistant-könyvtár", [
        ("ma_sajat", "a Music Assistant saját sora", "ma", "kozvetlen", None, ["ma"]),
        ("sonos_helyett", "egyes szám a Sonos Deezeréről", "fo", "helyettesites", SONOS, ["sonos_deezer"]),
        ("nas_helyett", "egyes szám a zenemappából", "fo", "helyettesites", None, ["url", "zenemappa"]),
    ]),
    ("telefon", "Telefonról", [
        ("ideiglenes", "ideiglenes feltöltéssel a saját lejátszón", "fo", "kozvetlen", None, ["url"]),
    ]),
    ("airplay", "AirPlay", [
        ("airplay", "a készülék saját AirPlay-vevője (a telefon küldi)", "fo", "kozvetlen", ("sonos", *WIIM), []),
    ]),
    ("party", "PARTY", [
        ("party", "a Cantabile sora a zenemappából, mindig előre töltve", "fo", "kozvetlen", None, ["url", "zenemappa"]),
    ]),
    ("sajat_lista", "Saját lista", [
        ("sajat_lista", "a lista számai a saját lejátszón (Sonoson a Deezer-számok is)", "fo", "kozvetlen", None, ["url", "zenemappa"]),
    ]),
]


def _ut_allapot(ertekek: list[bool | None]) -> str:
    if any(v is False for v in ertekek):
        return "hianyzik"
    if any(v is None for v in ertekek):
        return "?"
    return "ok"


def _feltetel(k: str, h: dict[str, Any], be: dict[str, Any], kesz: dict[str, dict[str, Any]]) -> bool | None:
    """Egy feltétel értéke a hangszórón (`h`) a bemenetek (`be`) és a már kész cellák (`kesz`) alapján."""
    e = h["entity_id"]
    if k == "url":
        return bool(h.get("lejatszik"))
    if k == "zenemappa":
        return bool(be.get("zenemappa"))
    if k == "ma":
        return bool(h.get("ma"))
    if k == "ma_deezer":
        return be.get("ma_deezer")
    if k == "wiim_deezer":
        return (be.get("wiim_deezer") or {}).get(e)
    if k == "sonos_deezer":
        return (be.get("sonos_szolg") or {}).get("deezer")
    if k == "sonos_spotify":
        return (be.get("sonos_szolg") or {}).get("spotify")
    if k == "spotify_ha":
        return bool(be.get("spotify_ha"))
    if k == "spotify_eszkoz":
        if e in (be.get("spotify_eszkozok") or {}):
            return True
        return None if be.get("spotify_ha") else False      # a Spotify a tétlen eszközt gyakran nem mutatja
    if k == "tidal":
        return bool(be.get("tidal"))
    if k in ("deezer_cella", "preset_cella"):
        forrasok = ("deezer",) if k == "deezer_cella" else ("deezer", "radio")
        allapotok = [kesz.get(f, {}).get(e, {}).get("allapot") for f in forrasok]
        return True if "ok" in allapotok or "helyettesites" in allapotok else None if "?" in allapotok else False
    return None


def epit(be: dict[str, Any]) -> dict[str, Any]:
    """A mátrix a bemenetekből (tiszta függvény: tesztelhető, a HA-tól független).

    `be`: {"hangszorok": [{entity_id, nev, platform, lejatszik, ma, kartyan, elerheto}], "zenemappa": bool,
    "ma_deezer": bool | None, "wiim_deezer": {entity: bool | None}, "sonos_szolg": {"deezer": …, "spotify": …},
    "spotify_ha": bool, "spotify_eszkozok": {entity: név}, "tidal": bool}."""
    cellak: dict[str, dict[str, Any]] = {}
    for fk, _fn, utak in FORRASOK:
        sor: dict[str, Any] = {}
        for h in be.get("hangszorok") or []:
            lista = []
            for kulcs, nev, kimenet, mod, platformok, felt in utak:
                if platformok and h.get("platform") not in platformok:
                    continue                                    # ez az út ennél a készüléknél nem létezik
                if h.get("platform") == "bongeszo" and kulcs not in BT_UTAK:
                    continue
                ertek = {k: _feltetel(k, h, be, cellak) for k in felt}
                ki = h["entity_id"] if kimenet == "fo" else h.get("ma")
                if kimenet == "fo" and h.get("tv"):
                    ki, nev = h["tv"], f"{nev} – a TV-oldalon" if kulcs != "sajat" else "a TV-oldal (kép, borító, dalszöveg)"
                if kulcs == "preset_forditva":
                    # a preset tartalma közvetlenül szól, ha a mögötte lévő cellák (Deezer, rádió) közvetlenek
                    al = [cellak.get(f, {}).get(h["entity_id"], {}).get("allapot") for f in ("deezer", "radio")]
                    mod = "kozvetlen" if all(a in ("ok", "nem") for a in al) and "ok" in al else "helyettesites"
                lista.append({
                    "ut": kulcs, "nev": nev, "mod": mod, "kimenet": ki,
                    "feltetelek": [{"k": k, "nev": FELTETELEK[k], "ok": v} for k, v in ertek.items()],
                    "allapot": _ut_allapot(list(ertek.values())),
                })
            if h.get("tv"):
                lista.sort(key=lambda u: u["ut"] not in TV_ELORE)          # stabil: a többi sorrendje marad
            elso = next((i for i, u in enumerate(lista) if u["allapot"] == "ok"), None)
            if elso is not None:
                allapot = "ok" if lista[elso]["mod"] == "kozvetlen" else "helyettesites"
            else:
                allapot = "?" if any(u["allapot"] == "?" for u in lista) else "nem"
            sor[h["entity_id"]] = {"utak": lista, "elso": elso, "allapot": allapot, "elerheto": h.get("elerheto", True)}
        cellak[fk] = sor
    return {
        "forrasok": [{"k": k, "nev": n} for k, n, _ in FORRASOK],
        "hangszorok": [{x: h.get(x) for x in ("entity_id", "nev", "platform", "ma", "tv", "kartyan", "elerheto")}
                       for h in be.get("hangszorok") or []],
        "cellak": cellak,
    }


# ---- bemenetek a HA-ból ----

async def _kartya_beallitas(hass: HomeAssistant) -> dict[str, Any]:
    from . import varazslo  # noqa: PLC0415

    try:
        return varazslo.beallitas_kartyabol(await varazslo.elso_kartya(hass))
    except Exception:  # noqa: BLE001 – nincs kártya / vezérlőpult még nem töltött be
        _LOGGER.debug("Útmátrix: a kártya beállítása nem olvasható", exc_info=True)
        return {"hangszorok": [], "adok": [], "magno": {}}


async def _sonos_szolgaltatasok(hass: HomeAssistant, sonosok: list[str]) -> dict[str, bool | None]:
    """A Sonosban bekötött zeneszolgáltatások a kedvencekből (sid=2 Deezer, sid=9 Spotify); ha a kedvencekben nincs
    nyoma, ismeretlen (None) – a Sonos ettől még tudhatja."""
    from . import wiim_deezer  # noqa: PLC0415

    for s in sonosok:
        try:
            kedv = await asyncio.wait_for(wiim_deezer._sonos_kedvencek(hass, s), 15)  # noqa: SLF001
        except Exception:  # noqa: BLE001
            continue
        sidek = {m.group(1) for _, u in kedv for m in re.finditer(r"[?&;]sid=(\d+)", u)}
        return {"deezer": True if "2" in sidek else None, "spotify": True if "9" in sidek else None}
    return {"deezer": None, "spotify": None}


async def _spotify_eszkozok(hass: HomeAssistant, hangszorok: list[dict[str, Any]]) -> dict[str, str]:
    """A hangszórók közül, amelyeket a Spotify Connect-eszközként ismer (a most látott és a megjegyzett nevek alapján)."""
    from . import streaming  # noqa: PLC0415

    nevek: list[dict[str, Any]] = []
    try:
        _store, tar = await streaming._eszk_tar(hass)  # noqa: SLF001
        nevek = [{"name": n} for n in tar.values()]
        nevek += [x for x in await asyncio.wait_for(streaming.spotify_eszkozok(hass), 15) if x.get("name")]
    except Exception:  # noqa: BLE001 – nincs Spotify-belépés / nem elérhető
        _LOGGER.debug("Útmátrix: a Spotify-eszközök nem olvashatók", exc_info=True)
    if not nevek:
        return {}
    ki = {}
    for h in hangszorok:
        if h["entity_id"] in (MULTIROOM, BT):
            continue
        if x := streaming.eszkoz_valaszt(nevek, h.get("_nevek") or [h.get("nev")]):
            ki[h["entity_id"]] = x["name"]
    return ki


async def bemenetek(hass: HomeAssistant) -> dict[str, Any]:
    from . import helyettesit, ma, streaming, varazslo, wiim_deezer  # noqa: PLC0415

    kartya = await _kartya_beallitas(hass)
    jeloltek = varazslo.hangszorok(hass)
    fo = varazslo.terkep(jeloltek)["fo"]          # a kártya régi bejegyzése (pl. az MA-lejátszó) a készülék fő lejátszója
    # a Cantabile TV-lejátszói (TV-oldal / DLNA-videó): Cantabile-TV → a TV saját lejátszója; a kártyán a TV gombja ez
    try:
        from . import tv  # noqa: PLC0415

        tvk = {lj.entity_id: lj.cast for lj in tv.kozpont(hass).lejatszok.values()} if "tv" in hass.data.get(DOMAIN, {}) else {}
    except Exception:  # noqa: BLE001
        tvk = {}
    tv_of = {fo.get(c, c): t for t, c in tvk.items()}
    # a kártya sorrendje és nevei (a rövid név, mint a választón)
    kartya_nev: dict[str, str] = {}
    for x in kartya.get("hangszorok") or []:
        e = str(x.get("entity") if isinstance(x, dict) else x)
        e = fo.get(tvk.get(e, e), tvk.get(e, e))
        if e not in kartya_nev:
            kartya_nev[e] = str((x.get("rovid") or x.get("nev")) if isinstance(x, dict) else "") or ""
    kartyan = set(kartya_nev)
    ereg, dreg = er.async_get(hass), dr.async_get(hass)
    hangszorok = []
    for x in jeloltek:
        st = hass.states.get(x["entity_id"])
        ent = ereg.async_get(x["entity_id"])
        d = dreg.async_get(ent.device_id) if ent and ent.device_id else None
        hangszorok.append({
            "entity_id": x["entity_id"], "nev": kartya_nev.get(x["entity_id"]) or x["nev"], "platform": x["platform"],
            "lejatszik": x["lejatszik"], "ma": x.get("ma"), "tv": tv_of.get(x["entity_id"]),
            "kartyan": x["entity_id"] in kartyan, "elerheto": bool(st and st.state != "unavailable"),
            "_nevek": [n for n in (x["nev"], d and d.name_by_user, d and d.name) if n],
        })
    # a kártyán lévők elöl, a kártya sorrendjében; utána a többi
    sorrend = list(kartya_nev)
    hangszorok.sort(key=lambda h: (sorrend.index(h["entity_id"]) if h["entity_id"] in kartyan else len(sorrend)))
    sonosok = [h for h in hangszorok if h["platform"] == "sonos"]
    if len(sonosok) > 1:
        hangszorok.insert(max(hangszorok.index(sonosok[-1]) + 1, 0), {
            "entity_id": MULTIROOM, "nev": "Multiroom", "platform": "sonos_csoport", "lejatszik": True, "ma": None, "tv": None,
            "kartyan": any(h["kartyan"] for h in sonosok), "elerheto": any(h["elerheto"] for h in sonosok)})
    hangszorok.append({"entity_id": BT, "nev": "BT", "platform": "bongeszo", "lejatszik": True, "ma": None, "tv": None,
                       "kartyan": True, "elerheto": True})
    wiim = {}
    for h in hangszorok:
        if h["platform"] in WIIM:
            try:
                wiim[h["entity_id"]] = bool(await asyncio.wait_for(wiim_deezer.deezer_alap(hass, h["entity_id"]), 20))
            except Exception:  # noqa: BLE001
                wiim[h["entity_id"]] = None
    ma_dz: bool | None = None
    if ma.bejegyzes(hass) is not None:
        try:
            ma_dz = bool(await asyncio.wait_for(helyettesit._ma_deezer_peldany(hass, {}), 15))  # noqa: SLF001
        except Exception:  # noqa: BLE001
            ma_dz = None
    else:
        ma_dz = False
    stream = streaming.allapot(hass)
    return {
        "hangszorok": hangszorok,
        "zenemappa": bool(str((kartya.get("magno") or {}).get("nas") or "").strip()),
        "ma_deezer": ma_dz,
        "wiim_deezer": wiim,
        "sonos_szolg": await _sonos_szolgaltatasok(hass, [h["entity_id"] for h in hangszorok if h["platform"] == "sonos"]),
        "spotify_ha": bool(stream.get("spotify_entity")),
        "spotify_eszkozok": await _spotify_eszkozok(hass, hangszorok) if stream.get("spotify_entity") else {},
        "tidal": bool(stream.get("tidal")),
    }


class UtMatrix:
    """A mátrix tárolása és frissítése."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.store: Store[dict[str, Any]] = Store(hass, TAR_VERZIO, TAR_KULCS)
        self.adat: dict[str, Any] | None = None
        self._zar = asyncio.Lock()
        self._kesleltetett: Any = None
        self._leiratkozas: list[Any] = []

    async def betolt(self) -> None:
        """A tárolt mátrix (az előző futásból): induláskor azonnal megvan, a friss a HA elindulása után készül."""
        self.adat = await self.store.async_load()

    async def frissit(self, ok: str = "kérés") -> dict[str, Any]:
        async with self._zar:
            t0 = time.monotonic()
            be = await bemenetek(self.hass)
            m = epit(be)
            m.update({
                "verzio": VERSION, "ido": dt_util.utcnow().isoformat(), "ok": ok, "tartam": round(time.monotonic() - t0, 1),
                "feltetelek": FELTETELEK,
                "bemenet": {k: v for k, v in be.items() if k != "hangszorok"},
            })
            self.adat = m
            await self.store.async_save(m)
            _LOGGER.debug("Útmátrix frissítve (%s, %.1f mp)", ok, m["tartam"])
            return m

    @callback
    def kesobb(self, ok: str) -> None:
        if self._kesleltetett:
            self._kesleltetett()

        @callback
        def _fut(_now: Any) -> None:
            self._kesleltetett = None
            self.hass.async_create_background_task(self._biztos(ok), "cantabile_utmatrix")

        self._kesleltetett = async_call_later(self.hass, KESLELTETES, _fut)

    async def _biztos(self, ok: str) -> None:
        try:
            await self.frissit(ok)
        except Exception:  # noqa: BLE001 – a mátrix hiánya nem állíthatja meg a lejátszást
            _LOGGER.warning("Cantabile: az útmátrix nem frissült (%s)", ok, exc_info=True)

    @callback
    def indit(self) -> None:
        hass = self.hass

        @callback
        def _registry(ev: Event) -> None:
            if str(ev.data.get("entity_id") or "").startswith("media_player."):
                self.kesobb("lejátszó változott")

        @callback
        def _pult(_ev: Event) -> None:
            self.kesobb("vezérlőpult változott")

        @callback
        def _oras(_now: Any) -> None:
            hass.async_create_background_task(self._biztos("óránkénti"), "cantabile_utmatrix")

        @callback
        def _indult(_ev: Event) -> None:
            self.kesobb("indulás")

        self._leiratkozas += [
            hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, _registry),
            hass.bus.async_listen("lovelace_updated", _pult),
            async_track_time_interval(hass, _oras, FRISSITES),
        ]
        if hass.state is CoreState.running:
            self.kesobb("indulás")
        else:
            self._leiratkozas.append(hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _indult))


def matrix(hass: HomeAssistant) -> UtMatrix:
    return hass.data[DOMAIN]["matrix"]


async def regisztral(hass: HomeAssistant) -> None:
    m = UtMatrix(hass)
    hass.data[DOMAIN]["matrix"] = m
    await m.betolt()
    m.indit()

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/matrix", vol.Optional("refresh", default=False): bool})
    @websocket_api.async_response
    async def ws_matrix(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        mx = matrix(hass)
        adat = await mx.frissit("kérés") if msg["refresh"] or mx.adat is None else mx.adat
        conn.send_result(msg["id"], adat)

    websocket_api.async_register_command(hass, ws_matrix)
