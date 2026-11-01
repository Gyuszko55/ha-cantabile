"""Beállítás-varázsló: a felderítés és a vezérlőpult-írás (a lépéseket a config_flow.py mutatja).

  - hangszórók: a meglévő media_player entitások integrációnként (Sonos, WiiM, LinkPlay, Google Cast, DLNA DMR, Music
    Assistant, Squeezebox, egyéb), észszerű előválasztással (TV és nyilvánvalóan nem hangszóró nincs előválasztva);
  - zenemappa: a media-source helyi gyökerei (a Beállítások → Rendszer → Tárhely alatt felvett hálózati tárhely is)
    és az első szintű almappáik, hangfájl-számlálással; a 48 kHz-es másolatok és a feltöltések mappájának felismerése;
  - rádióadók: a HA országának legnépszerűbb adói a Radio Browserből (a kártya-motor kliense: music.rb_kerdez);
  - TV: Cast-eszközök képernyővel és DLNA-TV-k, a feltételekkel (https-cím / Home Assistant Cloud, belső cím, ffmpeg);
  - hang: a beszélgetőügynökök listája;
  - vezérlőpult: új (oldalsávos) vezérlőpult a dashboards gyűjteményen át, vagy kártya hozzáfűzése egy meglévő nézethez;
    a beállítások a meglévő Cantabile kártyákba ugyanúgy íródnak, mint a kártya ⚙ Mentésével (azonos lenyomatú
    kártyák, a kártya saját kulcsnyelvén – magyar vagy angol).
A tiszta (HA nélkül tesztelhető) függvények külön állnak; a `hass`-t használók ezekre épülnek.
"""

from __future__ import annotations

import asyncio
import copy
import inspect
import logging
import os
import re
import time
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

KARTYA_TIPUS = "custom:cantabile-card"
KARTYAK = ("custom:cantabile-card", "custom:tablet-radio")
NEV_MAX = 8                    # a kártyán megjelenő hangszórónév legfeljebb ennyi karakter (a kártya NEV_MAX-a)
ADO_ROVID_MAX = 12             # adógomb felirata: hosszabb névnél rövidített felirat
ADO_MAX = 12                   # a rádión 12 adógomb van
ADO_ELORE = 6                  # ennyi adó előválasztva (6–7 fér el kényelmesen)
ADO_KINALAT = 30               # ennyi adó a választóban
TV_PULT, TV_NEZET = "cantabile-tv", "tv"
PLAY_MEDIA = 512               # MediaPlayerEntityFeature.PLAY_MEDIA

# integráció → csoport neve (ebben a sorrendben), a többi „egyéb”
CSOPORTOK = {"sonos": "Sonos", "wiim": "WiiM", "linkplay": "LinkPlay", "cast": "Google Cast", "dlna_dmr": "DLNA DMR",
             "music_assistant": "Music Assistant", "squeezebox": "Squeezebox"}
# ezek hangszórók (előválasztva, ha nem képernyős és tud médiát lejátszani)
HANGSZORO_PLATFORMOK = set(CSOPORTOK) | {"yamaha_musiccast", "bluesound", "heos", "soundtouch", "frontier_silicon",
                                          "openhome", "volumio", "snapcast", "mpd", "slimproto", "bose"}
# TV-k, médiaszerverek, távirányítók – listázva, de nem előválasztva
NEM_HANGSZORO = {"androidtv", "androidtv_remote", "apple_tv", "braviatv", "webostv", "samsungtv", "philips_js", "roku",
                 "kodi", "plex", "emby", "jellyfin", "spotify", "universal", "group", "media_extractor", "vizio",
                 "panasonic_viera", "firetv", "lg_netcast", "lg_thinq", "hisense_aehw4a1", "tplink_omada", "xbox",
                 "playstation_network", "ps4", "channels", "mediaroom", "russound_rio", "cantabile"}
TV_MINTA = re.compile(r"\b(tv|television|televízió|chromecast|shield|bravia|webos|tizen|viera|aquos|regza|projector|"
                      r"projektor|nest hub|hub max|home hub|fire ?tv|mi ?box|stick|streamer|smartbox)\b", re.I)
NEM_KEPERNYO = re.compile(r"\b(audio|mini|speaker|nest audio|home max|group|csoport|soundbar|hangszóró)\b", re.I)

HANGFAJL = re.compile(r"\.(mp3|flac|m4a|aac|ogg|oga|opus|wav|wma|aiff?|alac|dsf|ape|mpc|wv)$", re.I)
ZENE_SZAVAK = {"music", "musik", "musique", "musica", "muziek", "muzyka", "zene", "zenek", "zenék", "zenetar", "zenetár", "audio",
               "nas", "mp3", "flac", "songs", "library", "hudba"}
HIRES_NEV = re.compile(r"48|hi[\s_-]?res", re.I)
FELTOLTES_NEV = re.compile(r"^(cantabile|uploads?|feltolt\w*|feltölt\w*)$", re.I)
KIHAGY_NEV = re.compile(r"^(\.|@|#recycle|lost\+found$|frigate$|recordings?$|tts$|camera$|snapshots?$|\$recycle)", re.I)
FELTOLTES_ALAP = "Cantabile"
ELOTAG = "media-source://media_source/"

# a varázsló szövegei a fordításokban vannak (a felület nyelvén); itt csak a HA nyelvéhez igazodó alapértékek
_TEXT: dict[str, dict[str, str]] = {
    "pult_cim": {"hu": "Zene", "en": "Music"},
    "pult_url": {"hu": "cantabile-zene", "en": "cantabile-music"},
    "alap_pult": {"hu": "Áttekintés", "en": "Overview"},
}
OK, HIANY, KIHAGYVA, VALTOZATLAN = "✅", "⚠️", "⏭️", "–"


def nyelv(hass: HomeAssistant) -> str:
    return "hu" if str(hass.config.language or "").lower().startswith("hu") else "en"


def t(hass: HomeAssistant, kulcs: str, **kw: Any) -> str:
    return _TEXT[kulcs][nyelv(hass)].format(**kw)


# ---- hangszórók ---------------------------------------------------------------------------------------------------


def kepernyos(platform: str, szoveg: str, device_class: str | None) -> bool:
    """Képernyős eszköz-e (TV, Cast-TV, Nest Hub): a device_class, a TV-integrációk, vagy a típus / név."""
    if device_class == "tv" or platform in {"androidtv", "androidtv_remote", "braviatv", "webostv", "samsungtv",
                                            "philips_js", "panasonic_viera", "firetv", "lg_netcast", "vizio", "roku"}:
        return True
    if not TV_MINTA.search(szoveg or ""):
        return False
    return not NEM_KEPERNYO.search(szoveg) or bool(re.search(r"\bhub\b", szoveg, re.I))


def osztalyoz(elemek: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """A media_player-ek (entity_id, platform, nev, device_class, features, model, eszkoz, eszkoznev) besorolása:
    csoport, képernyős, előválasztott, mód. A Cantabile saját lejátszói kimaradnak."""
    sajat = [e for e in elemek if e.get("platform") != "cantabile"]
    nem_dlna_eszkoz = {e.get("eszkoz") for e in sajat if e.get("platform") != "dlna_dmr" and e.get("eszkoz")}
    nem_dlna_nev = {str(e.get("eszkoznev") or e.get("nev") or "").casefold() for e in sajat if e.get("platform") != "dlna_dmr"}
    ki = []
    for e in sajat:
        p = e.get("platform") or ""
        szoveg = " ".join(str(x) for x in (e.get("model"), e.get("nev"), e.get("eszkoznev")) if x)
        kep = kepernyos(p, szoveg, e.get("device_class"))
        csoport_ = bool(re.search(r"\b(group|csoport)\b", str(e.get("model") or ""), re.I))
        dupla = p == "dlna_dmr" and (e.get("eszkoz") in nem_dlna_eszkoz
                                     or str(e.get("eszkoznev") or e.get("nev") or "").casefold() in nem_dlna_nev)
        lejatszik = bool(int(e.get("features") or 0) & PLAY_MEDIA)
        ki.append({
            "entity_id": e["entity_id"], "nev": str(e.get("nev") or e["entity_id"]), "platform": p,
            "csoport": CSOPORTOK.get(p), "kepernyo": kep, "lejatszik": lejatszik,
            "elore": p in HANGSZORO_PLATFORMOK and not kep and lejatszik and not csoport_ and not dupla,
            "mod": "sonos" if p == "sonos" else "url",
        })
    if not any(x["elore"] for x in ki):
        # ismert hangszóró-integráció nincs: ami tud lejátszani és nem TV / médiaszerver, az előválasztott
        for x in ki:
            x["elore"] = x["lejatszik"] and not x["kepernyo"] and x["platform"] not in NEM_HANGSZORO
    sorrend = list(CSOPORTOK)
    ki.sort(key=lambda x: (sorrend.index(x["platform"]) if x["platform"] in sorrend else len(sorrend), x["nev"].casefold()))
    return ki


def alapertelmezett(jeloltek: list[dict[str, Any]], valasztott: list[str]) -> str | None:
    """Az alapértelmezett hangszóró javaslata: az első választott Sonos, különben az első választott."""
    for x in jeloltek:
        if x["entity_id"] in valasztott and x["platform"] == "sonos":
            return x["entity_id"]
    return valasztott[0] if valasztott else None


def _szavak(nev: str) -> list[str]:
    return [w for w in re.split(r"[\s·\-–_/|()\[\]]+", nev.replace("(Cast)", "")) if w]


def rovid_nevek(nevek: list[str], foglalt: set[str] | None = None) -> list[str | None]:
    """A kártyán megjelenő rövid nevek (legfeljebb 8 karakter, egyediek); None, ha a teljes név megfelel.
    A minden névben közös szó (pl. „Sonos”, „Speaker”) kimarad, ha marad helyette más."""
    foglalt = {f.casefold() for f in (foglalt or set())}
    szavak = [_szavak(n) for n in nevek]
    kozos = set.intersection(*[{w.casefold() for w in s} for s in szavak]) if len(szavak) > 1 else set()
    ki: list[str | None] = []
    for nev, sz in zip(nevek, szavak):
        nev = nev.strip()
        if len(nev) <= NEV_MAX and nev.casefold() not in foglalt:
            ki.append(None)
            foglalt.add(nev.casefold())
            continue
        maradek = [w for w in sz if w.casefold() not in kozos] or sz or [nev]

        def moho(szavak: list[str]) -> str:
            ki_ = ""
            for w in szavak:
                if len((ki_ + " " + w).strip()) > NEV_MAX:
                    break
                ki_ = (ki_ + " " + w).strip()
            return ki_ or szavak[0][:NEV_MAX]

        # ütközésnél az első szó nélkül (pl. „Nappali TV” → „TV” a „Nappali” mellett), végül sorszámmal
        alap = moho(maradek)
        jelolt = alap
        if jelolt.casefold() in foglalt and len(maradek) > 1:
            jelolt = moho(maradek[1:])
        n = 2
        while jelolt.casefold() in foglalt:
            jelolt = f"{alap[:NEV_MAX - len(str(n))]}{n}"
            n += 1
        foglalt.add(jelolt.casefold())
        ki.append(jelolt)
    return ki


def integracio_nev(hass: HomeAssistant, platform: str) -> str:
    """Az integráció megjelenő neve (a csoportfelirathoz az ismert hangszóró-integrációkon kívül)."""
    from homeassistant.loader import async_get_loaded_integration

    if not platform:
        return "media_player"
    try:
        return async_get_loaded_integration(hass, platform).name
    except Exception:  # noqa: BLE001
        return platform


@callback
def hangszorok(hass: HomeAssistant) -> list[dict[str, Any]]:
    """A HA media_player entitásai besorolva (osztalyoz); a csoport az integráció neve."""
    ereg, dreg = er.async_get(hass), dr.async_get(hass)
    elemek = []
    for st in hass.states.async_all("media_player"):
        e = ereg.async_get(st.entity_id)
        if e and e.disabled_by:
            continue
        d = dreg.async_get(e.device_id) if e and e.device_id else None
        elemek.append({
            "entity_id": st.entity_id, "platform": e.platform if e else "",
            "nev": st.attributes.get("friendly_name") or st.entity_id,
            "device_class": st.attributes.get("device_class") or (e and (e.device_class or e.original_device_class)),
            "features": st.attributes.get("supported_features") or 0,
            "model": " ".join(x for x in ((d.manufacturer if d else None), (d.model if d else None)) if x),
            "eszkoz": d.id if d else None, "eszkoznev": (d.name_by_user or d.name) if d else None,
        })
    ki = osztalyoz(elemek)
    for x in ki:
        x["csoport"] = x["csoport"] or integracio_nev(hass, x["platform"])
    return ki


def hangszoro_lista(jeloltek: list[dict[str, Any]], valasztott: list[str], alap: str | None,
                    regi: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    """A kártya hangszórói (belső kulcsokkal): az alapértelmezett elöl; a kártyán már szereplők beállítása megmarad."""
    sorrend = ([alap] if alap and alap in valasztott else []) + [e for e in valasztott if e != alap]
    regiek = {h.get("entity"): h for h in regi or [] if isinstance(h, dict)}
    nevek = {x["entity_id"]: x for x in jeloltek}
    uj = [e for e in sorrend if e not in regiek]
    foglalt = {str(h.get("rovid") or h.get("nev") or "") for e, h in regiek.items() if e in sorrend}
    rovidek = dict(zip(uj, rovid_nevek([nevek[e]["nev"] if e in nevek else e.split(".", 1)[-1] for e in uj], foglalt)))
    ki = []
    for e in sorrend:
        if e in regiek:
            ki.append(regiek[e])
            continue
        x = nevek.get(e, {"nev": e.split(".", 1)[-1], "mod": "url"})
        h = {"nev": x["nev"], "entity": e, "mod": x["mod"]}
        if rovidek.get(e):
            h["rovid"] = rovidek[e]
        ki.append(h)
    return ki


# ---- zenemappa ----------------------------------------------------------------------------------------------------


def zene_nev(nev: str) -> bool:
    """Zenemappára utaló név (egész szó: „Music”, „Zene”, „NAS” – a „Zenekar” nem)."""
    return any(w in ZENE_SZAVAK for w in re.split(r"[^\w]+|_", nev.casefold()) if w)


def _hangfajlok(ut: str, melyseg: int, keret: dict[str, Any]) -> int:
    """Hangfájlok száma a mappában `melyseg` szintig; a keret (listázások száma, határidő, darabszám) korlátozza –
    egy lassú hálózati tárhely se akassza meg a varázslót."""
    db, sor = 0, [(ut, 0)]
    while sor and db < keret["max_db"]:
        if keret["listazas"] <= 0 or time.monotonic() > keret["hatarido"]:
            break
        mappa, m = sor.pop(0)
        keret["listazas"] -= 1
        try:
            with os.scandir(mappa) as it:
                for x in it:
                    if x.name.startswith((".", "@", "#")):
                        continue
                    if x.is_file() and HANGFAJL.search(x.name):
                        db += 1
                    elif m < melyseg and x.is_dir():
                        sor.append((x.path, m + 1))
        except OSError:
            continue
    return db


def _almappak(ut: str) -> list[str]:
    try:
        with os.scandir(ut) as it:
            return sorted(x.name for x in it if x.is_dir() and not KIHAGY_NEV.search(x.name))
    except OSError:
        return []


def zenemappak(media_dirs: dict[str, str], max_db: int = 200, ido: float = 8.0) -> list[dict[str, Any]]:
    """Zenemappa-jelöltek (executorban fut): minden media-source gyökér és első szintű almappája, ahol van hangfájl.
    Elem: id (media-source cím), nev, db (hangfájlok, legfeljebb max_db), hires, feltoltes (felismert almappa), pont."""
    keret = {"listazas": 1500, "hatarido": time.monotonic() + ido, "max_db": max_db}
    ki = []
    for forras, alap in media_dirs.items():
        if not os.path.isdir(alap):
            continue
        alm = _almappak(alap)
        alk: list[dict[str, Any]] = []
        try:
            with os.scandir(alap) as it:
                gyoker_db = sum(1 for x in it if x.is_file() and HANGFAJL.search(x.name))
        except OSError:
            continue
        for nev in alm:
            ut = os.path.join(alap, nev)
            db = _hangfajlok(ut, 3, keret)
            gyoker_db += db
            if not db or HIRES_NEV.search(nev) or FELTOLTES_NEV.search(nev):
                continue
            sub = _almappak(ut)
            alk.append({"id": f"{ELOTAG}{forras}/{nev}", "nev": f"{forras}/{nev}", "db": min(db, max_db),
                        "hires": next((s for s in sub if HIRES_NEV.search(s)), None),
                        "feltoltes": next((s for s in sub if FELTOLTES_NEV.search(s)), None),
                        "pont": min(db, max_db) + (100 if zene_nev(nev) else 0)})
        # az almappa akkor jelölt, ha a gyökér zenéjének legalább fele benne van, vagy a neve zenemappára utal –
        # különben (a gyökér maga a zenetár, az almappák előadók) csak a gyökér
        ki += [x for x in alk if x["db"] * 2 >= min(gyoker_db, max_db) or x["pont"] > x["db"]]
        if gyoker_db:
            ki.append({"id": f"{ELOTAG}{forras}", "nev": forras, "db": min(gyoker_db, max_db),
                       "hires": next((s for s in alm if HIRES_NEV.search(s)), None),
                       "feltoltes": next((s for s in alm if FELTOLTES_NEV.search(s)), None),
                       # a gyökér egy hajszállal az azonos számú almappa mögött (a hálózati tárhely almappaként látszik)
                       "pont": min(gyoker_db, max_db) - 1})
    ki.sort(key=lambda x: -x["pont"])
    return ki


def helyi_ut(media_dirs: dict[str, str], mappa: str) -> str | None:
    """A media-source cím helyi útja (csak a helyi gyökereknél), különben None."""
    if not mappa.startswith(ELOTAG):
        return None
    forras, _, rel = mappa[len(ELOTAG):].partition("/")
    alap = media_dirs.get(forras)
    if not alap:
        return None
    ut = os.path.realpath(os.path.join(alap, rel))
    return ut if ut == os.path.realpath(alap) or ut.startswith(os.path.realpath(alap) + os.sep) else None


# ---- rádióadók ----------------------------------------------------------------------------------------------------


TOLTELEK = {"the", "a", "an", "of", "and", "az", "és", "-", "–", "|", "·"}


def ado_rovid(nev: str) -> str | None:
    """Adógomb felirata hosszú névhez (legfeljebb 12 karakter, szóhatáron, töltelékszavak nélkül – „Oxygen The 80s
    Hits” → „Oxygen 80s”); None, ha a név elfér."""
    nev = nev.strip()
    if len(nev) <= ADO_ROVID_MAX:
        return None
    szavak = [w for w in _szavak(nev) if w.casefold() not in TOLTELEK] or _szavak(nev)
    ki = ""
    for w in szavak:
        if len((ki + " " + w).strip()) > ADO_ROVID_MAX:
            break
        ki = (ki + " " + w).strip()
    return ki or nev[:ADO_ROVID_MAX]


def adok_valogat(lista: Any, db: int = ADO_KINALAT) -> list[dict[str, Any]]:
    """A Radio Browser válaszából: név szerint egyedi, http(s) stream-című adók, a népszerűségi sorrendben."""
    ki, latott = [], set()
    for a in lista if isinstance(lista, list) else []:
        if not isinstance(a, dict):
            continue
        nev = re.sub(r"\s+", " ", str(a.get("name") or "")).strip(" -–|")
        url = str(a.get("url_resolved") or a.get("url") or "").strip()
        if not nev or not re.match(r"^https?://", url) or nev.casefold() in latott:
            continue
        latott.add(nev.casefold())
        kodek = str(a.get("codec") or "").strip().upper()
        bitrata = int(a.get("bitrate") or 0)
        ki.append({"id": str(a.get("stationuuid") or url), "nev": nev, "url": url,
                   "info": " ".join(x for x in (kodek if kodek and kodek != "UNKNOWN" else "", f"{bitrata} kbps" if bitrata else "") if x)})
        if len(ki) >= db:
            break
    return ki


async def nepszeru_adok(hass: HomeAssistant, db: int = ADO_KINALAT) -> list[dict[str, Any]]:
    """A HA országának legnépszerűbb adói (ország nélkül a világ legnépszerűbbjei); hiba: music.HibaUzenet."""
    from .music import rb_kerdez

    orszag = str(hass.config.country or "").upper()
    if re.fullmatch(r"[A-Z]{2}", orszag):
        ut = f"/json/stations/bycountrycodeexact/{orszag}?order=clickcount&reverse=true&hidebroken=true&limit={db * 2}"
    else:
        ut = f"/json/stations/topclick/{db * 2}?hidebroken=true"
    return adok_valogat(await rb_kerdez(hass, ut), db)


def frekvencia(nev: str, japan: bool = False) -> float | None:
    """Az adó nevében szereplő FM-frekvencia (pl. „Klubrádió 95,3” → 95.3), ha a kártya sávjába esik (87,5–108 MHz,
    Japánban 76–95 MHz) – így az adó a skála helyén áll; különben None (a skálán egyenletesen elosztva, WEB)."""
    for m in re.finditer(r"(?<![\d.,])(\d{2,3})[.,](\d)(?![\d.,])", nev):
        f = float(f"{m.group(1)}.{m.group(2)}")
        if (76 <= f <= 95) if japan else (87.5 <= f <= 108):
            return f
    return None


def ado_lista(valasztott: list[dict[str, Any]], regi: list[dict[str, Any]] | None = None, japan: bool = False) -> list[dict[str, Any]]:
    """A kártya adói (belső kulcsokkal); a kártyán már szereplő adó (azonos cím) beállítása – frekvencia, felirat – megmarad.
    Új adónál a névben szereplő frekvencia a skálahely."""
    regiek = {a.get("url"): a for a in regi or [] if isinstance(a, dict)}
    ki = []
    for a in valasztott:
        if a["url"] in regiek:
            ki.append(regiek[a["url"]])
            continue
        o: dict[str, Any] = {"nev": a["nev"], "url": a["url"]}
        if (f := frekvencia(a["nev"], japan)) is not None:
            o["frekvencia"] = f
        if r := ado_rovid(a["nev"]):
            o["rovid"] = r
        ki.append(o)
    # azonos felirat két gombon: a teljes név (a gomb maga rövidíti)
    feliratok = [str(a.get("rovid") or a.get("nev")) for a in ki]
    for a in ki:
        if a.get("rovid") and feliratok.count(a["rovid"]) > 1 and a not in (regi or []):
            a.pop("rovid")
    return ki


# ---- TV -----------------------------------------------------------------------------------------------------------


def tv_jeloltek(jeloltek: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """A Cast- és DLNA-lejátszók (ezekből lehet Cantabile TV); a képernyősek előválasztva (Cast-csoport kimarad)."""
    return [x for x in jeloltek if x["platform"] in ("cast", "dlna_dmr")]


async def tv_feltetelek(hass: HomeAssistant) -> dict[str, Any]:
    """A Cantabile TV feltételei: https-cím (Cast), belső cím (DLNA), ffmpeg."""
    from homeassistant.helpers.network import NoURLAvailableError, get_url

    from .tv import ffmpeg_van

    https = belso = None
    try:
        https = get_url(hass, allow_internal=False, require_ssl=True, prefer_cloud=True)
    except NoURLAvailableError:
        pass
    try:
        belso = get_url(hass, allow_external=False, allow_cloud=False, prefer_external=False)
    except NoURLAvailableError:
        pass
    return {"https": https, "belso": belso, "ffmpeg": await ffmpeg_van(hass)}


def feltetel_jelek(f: dict[str, Any]) -> dict[str, str]:
    """A feltételek a fordítás helyőrzőihez (nyelvfüggetlen jelek és címek)."""
    return {"https_mark": OK if f["https"] else HIANY, "https_url": f["https"] or "–",
            "internal_mark": OK if f["belso"] else HIANY, "internal_url": f["belso"] or "–",
            "ffmpeg_mark": OK if f["ffmpeg"] else HIANY}


# ---- hang ---------------------------------------------------------------------------------------------------------


@callback
def ugynokok(hass: HomeAssistant) -> list[str]:
    """A beszélgetőügynökök neve (a HA saját ügynöke nélkül)."""
    ereg = er.async_get(hass)
    ki = []
    for st in hass.states.async_all("conversation"):
        e = ereg.async_get(st.entity_id)
        if st.entity_id == "conversation.home_assistant" or (e and e.platform in ("conversation", "homeassistant")):
            continue
        ki.append(str(st.attributes.get("friendly_name") or st.entity_id))
    return sorted(ki, key=str.casefold)


# ---- a kártya beállításai -----------------------------------------------------------------------------------------

# a kártya angol kulcsai → belső (magyar) kulcsok (a kártya KULCS táblája)
KULCS = {"speakers": "hangszorok", "stations": "adok", "name": "nev", "short": "rovid", "frequency": "frekvencia",
         "mode": "mod", "tape": "magno", "media_folder": "nas", "brand": "marka", "hires_folder": "hires",
         "upload_folder": "feltoltes", "player_script": "szkript", "display": "vu_kijelzo", "vu_delay": "vu_kesleltetes_mp",
         "finish": "felulet"}
VISSZA = {v: k for k, v in KULCS.items()}


def atkulcsol(o: Any, tabla: dict[str, str]) -> Any:
    if isinstance(o, list):
        return [atkulcsol(x, tabla) for x in o]
    if isinstance(o, dict):
        return {tabla.get(k, k): atkulcsol(v, tabla) for k, v in o.items()}
    return o


def angol_e(kartya: dict[str, Any]) -> bool:
    """A kártya angol kulcsokkal van-e megírva (a ⚙ Mentés is abban a nyelvben ír vissza)."""
    return any(k in kartya for k in ("speakers", "stations", "tape", "brand"))


def lenyomat(kartya: dict[str, Any]) -> str:
    """A kártya ⚙ Mentésének LENYOMAT-a: a hangszórók és az adók címe – az ugyanígy beállított kártyák egy csoport."""
    import json

    c = atkulcsol(kartya or {}, KULCS)
    return json.dumps([[h.get("entity") if isinstance(h, dict) else None for h in c.get("hangszorok") or []],
                       [a.get("url") if isinstance(a, dict) else None for a in c.get("adok") or []]],
                      separators=(",", ":"), ensure_ascii=False)


def beallitas_kartyabol(kartya: dict[str, Any] | None) -> dict[str, Any]:
    """A kártya beállításai belső kulcsokkal (hangszorok, adok, magno)."""
    c = atkulcsol(kartya or {}, KULCS)
    return {"hangszorok": list(c.get("hangszorok") or []), "adok": list(c.get("adok") or []), "magno": dict(c.get("magno") or {})}


def kartyara_ir(kartya: dict[str, Any], beall: dict[str, Any], mezok: set[str]) -> dict[str, Any]:
    """A kártya új példánya a megadott mezőkkel (hangszorok, adok, magno: nas / hires / feltoltes) a kártya saját
    kulcsnyelvén; a többi kulcs (elrendezés, márka, kijelző…) változatlan."""
    angol = angol_e(kartya)
    c = atkulcsol(copy.deepcopy(kartya), KULCS)
    if "hangszorok" in mezok:
        c["hangszorok"] = copy.deepcopy(beall.get("hangszorok") or [])
    if "adok" in mezok:
        c["adok"] = copy.deepcopy(beall.get("adok") or [])
    if "magno" in mezok:
        m = dict(c.get("magno") or {})
        for k in ("nas", "hires", "feltoltes"):
            v = str((beall.get("magno") or {}).get(k) or "").strip()
            if v:
                m[k] = v
            else:
                m.pop(k, None)
        if m:
            c["magno"] = m
        else:
            c.pop("magno", None)
    return atkulcsol(c, VISSZA) if angol else c


def kartya_uj(beall: dict[str, Any]) -> dict[str, Any]:
    """Új Cantabile kártya (angol kulcsokkal, mint a README) a varázsló beállításaival."""
    return kartyara_ir({"type": KARTYA_TIPUS, "speakers": []}, beall, {"hangszorok", "adok", "magno"})


def kartya_yaml(kartya: dict[str, Any]) -> str:
    from homeassistant.util.yaml import dump

    return dump(kartya).rstrip()


def nezet_uj(cim: str, kartya: dict[str, Any]) -> dict[str, Any]:
    """Egykártyás panelnézet (a kártya kitölti a szélességet)."""
    return {"title": cim, "path": "cantabile", "icon": "mdi:radio", "panel": True, "cards": [kartya]}


def tv_pult_konfig() -> dict[str, Any]:
    return {"views": [{"title": "TV", "path": TV_NEZET, "panel": True, "cards": [{"type": "custom:cantabile-tv"}]}]}


def nezet_tipus(nezet: dict[str, Any]) -> str | None:
    """'cards' (masonry / sidebar), 'sections', 'panel_ures', vagy None (ide nem tehető: tele panel, egyedi nézet)."""
    tipus = nezet.get("type")
    if nezet.get("panel") or tipus == "panel":
        return None if nezet.get("cards") else "panel_ures"
    if tipus == "sections":
        return "sections"
    if tipus in (None, "masonry", "sidebar"):
        return "cards"
    return None


def kartya_nezetbe(konfig: dict[str, Any], index: int, kartya: dict[str, Any]) -> dict[str, Any]:
    """A vezérlőpult konfigurációjának új példánya, a kártya a nézet végén (szekciós nézetben új szekcióban)."""
    uj = copy.deepcopy(konfig)
    nezet = uj["views"][index]
    tipus = nezet_tipus(nezet)
    if tipus == "sections":
        nezet.setdefault("sections", []).append({"type": "grid", "cards": [kartya]})
    elif tipus in ("cards", "panel_ures"):
        nezet.setdefault("cards", []).append(kartya)
    else:
        raise ValueError("view")
    return uj


def kartyak_bejar(o: Any, fn: Any) -> int:
    """A konfigurációban minden Cantabile kártyát a fn(kártya) eredményére cserél (None: marad); a cserék száma."""
    db = 0
    if isinstance(o, list):
        for i, x in enumerate(o):
            if isinstance(x, dict) and x.get("type") in KARTYAK:
                if (y := fn(x)) is not None and y != x:
                    o[i] = y
                    db += 1
            else:
                db += kartyak_bejar(x, fn)
    elif isinstance(o, dict):
        for k, x in o.items():
            if isinstance(x, dict) and x.get("type") in KARTYAK:
                if (y := fn(x)) is not None and y != x:
                    o[k] = y
                    db += 1
            else:
                db += kartyak_bejar(x, fn)
    return db


def elso_kartya_konfigban(o: Any) -> dict[str, Any] | None:
    if isinstance(o, dict):
        if o.get("type") in KARTYAK:
            return o
        o = list(o.values())
    if isinstance(o, list):
        for x in o:
            if (k := elso_kartya_konfigban(x)) is not None:
                return k
    return None


# ---- vezérlőpultok ------------------------------------------------------------------------------------------------


def _ll(hass: HomeAssistant) -> Any:
    return hass.data.get("lovelace")


def pultok(hass: HomeAssistant) -> list[tuple[str | None, Any]]:
    """(url_path, vezérlőpult) párok a HA sorrendjében; 2026.2-től az alap vezérlőpult „lovelace” néven szerepel –
    ilyenkor a None kulcsú (régi) nem kell."""
    ll = _ll(hass)
    d = getattr(ll, "dashboards", None)
    if d is None and isinstance(ll, dict):
        d = ll.get("dashboards")
    d = dict(d or {})
    if "lovelace" in d:
        d.pop(None, None)
    return list(d.items())


def pult_cime(hass: HomeAssistant, url: str | None, pult: Any) -> str:
    cfg = getattr(pult, "config", None) or {}
    return str(cfg.get("title") or (t(hass, "alap_pult") if url in (None, "lovelace") else url))


def _tarolos(pult: Any) -> bool:
    return getattr(pult, "mode", None) == "storage"


async def pult_betolt(pult: Any) -> dict[str, Any] | None:
    try:
        cfg = await pult.async_load(False)
    except Exception:  # noqa: BLE001 – üres (automatikus) vagy hibás vezérlőpult
        return None
    return cfg if isinstance(cfg, dict) else None


async def nezet_lehetosegek(hass: HomeAssistant) -> list[dict[str, Any]]:
    """A meglévő vezérlőpultok nézetei, ahová a kártya tehető: érték „url|index”, felirat „Vezérlőpult › Nézet”.
    YAML-vezérlőpult: csak kódrészlet (yaml=True)."""
    ki = []
    for url, pult in pultok(hass):
        if url == TV_PULT:
            continue
        cim = pult_cime(hass, url, pult)
        cfg = await pult_betolt(pult)
        if not cfg or not isinstance(cfg.get("views"), list):
            continue
        for i, n in enumerate(cfg["views"]):
            if not isinstance(n, dict) or (_tarolos(pult) and nezet_tipus(n) is None):
                continue
            ncim = str(n.get("title") or n.get("path") or f"#{i + 1}")
            felirat = f"{cim} › {ncim}" + (" (YAML)" if not _tarolos(pult) else "")
            ki.append({"ertek": f"{url or ''}|{i}", "felirat": felirat, "yaml": not _tarolos(pult), "pult": cim, "nezet": ncim})
    return ki


def _gyujtemeny(hass: HomeAssistant) -> Any:
    """A tárolós vezérlőpultok gyűjteménye (DashboardsCollection). A HA nem teszi a hass.data-ba; a
    `lovelace/dashboards/create` websocket-parancs kezelője (a gyűjtemény websocket-osztályának metódusa) mögül
    vehető elő – ugyanazt a létrehozást végzi, mint a Beállítások → Vezérlőpultok → Új vezérlőpult."""
    kezelok = hass.data.get("websocket_api") or {}
    k = kezelok.get("lovelace/dashboards/create")
    if not k:
        return None
    metodus = inspect.unwrap(k[0])
    return getattr(getattr(metodus, "__self__", None), "storage_collection", None)


def szabad_url(hass: HomeAssistant, alap: str) -> str:
    from homeassistant.components.frontend import DATA_PANELS

    foglalt = set(dict(pultok(hass))) | set(hass.data.get(DATA_PANELS, {}))
    url, n = alap, 2
    while url in foglalt:
        url, n = f"{alap}-{n}", n + 1
    return url


async def pult_letrehoz(hass: HomeAssistant, cim: str, ikon: str | None, url: str, oldalsav: bool = True) -> Any:
    """Új tárolós vezérlőpult (oldalsávban ikonnal); a HA vezérlőpult-objektuma, vagy kivétel."""
    gy = _gyujtemeny(hass)
    if gy is None:
        raise RuntimeError("dashboards collection not available")
    adat = {"url_path": url, "title": cim, "show_in_sidebar": oldalsav, "require_admin": False, "mode": "storage"}
    if ikon:
        adat["icon"] = ikon
    await gy.async_create_item(adat)
    pult = dict(pultok(hass)).get(url)
    if pult is None:
        raise RuntimeError("dashboard not registered")
    return pult


async def kartyak_frissit(hass: HomeAssistant, fn: Any, csoport: str | None = None) -> list[str]:
    """A ⚙ Mentés megfelelője a szerveren: minden tárolós vezérlőpult azon Cantabile kártyái, amelyek lenyomata a
    csoporté (alapból az első kártyáé – a hangvezérlés is azt olvassa), a fn(kártya) eredményét kapják. A mentett
    vezérlőpultok címei."""
    if csoport is None:
        for _url, pult in pultok(hass):
            if (k := elso_kartya_konfigban(await pult_betolt(pult))) is not None:
                csoport = lenyomat(k)
                break
        if csoport is None:
            return []
    mentve = []
    for url, pult in pultok(hass):
        if not _tarolos(pult):
            continue
        cfg = await pult_betolt(pult)
        if not cfg:
            continue
        cfg = copy.deepcopy(cfg)
        if kartyak_bejar(cfg, lambda k: fn(k) if lenyomat(k) == csoport else None):
            await pult.async_save(cfg)
            mentve.append(pult_cime(hass, url, pult))
    return mentve


async def elso_kartya(hass: HomeAssistant) -> dict[str, Any] | None:
    """Az első Cantabile kártya (nyers konfiguráció), a hangvezérlés sorrendjében."""
    for _url, pult in pultok(hass):
        if (k := elso_kartya_konfigban(await pult_betolt(pult))) is not None:
            return copy.deepcopy(k)
    return None


async def tv_kartyara(hass: HomeAssistant, castok: list[str], csoport: str | None, varakozas: float = 120) -> None:
    """A beállítás (újratöltés) után: a választott TV-k Cantabile TV-lejátszói („TV · …”) felkerülnek a kártya
    hangszórói közé (a csoport minden kártyájára). Megvárja, amíg a lejátszók létrejönnek."""
    ereg = er.async_get(hass)
    hatarido = time.monotonic() + varakozas
    ids: dict[str, str] = {}
    await asyncio.sleep(2)        # az opciók mentése utáni újratöltés előbb lefusson
    while time.monotonic() < hatarido:
        bej = hass.config_entries.async_loaded_entries(DOMAIN)
        if bej:
            for c in castok:
                if e := ereg.async_get_entity_id("media_player", DOMAIN, f"{bej[0].entry_id}_tv_{c.split('.', 1)[-1]}"):
                    ids[c] = e
            if len(ids) == len(castok) and all(hass.states.get(e) for e in ids.values()):
                break
        await asyncio.sleep(1)
    if not ids:
        _LOGGER.warning("Cantabile: the TV players did not appear, add them to the card yourself (⚙ → Speakers)")
        return

    def hozzaad(k: dict[str, Any]) -> dict[str, Any]:
        b = beallitas_kartyabol(k)
        meglevo = {h.get("entity") for h in b["hangszorok"] if isinstance(h, dict)}
        ujak = [(c, e) for c, e in ids.items() if e not in meglevo]
        if not ujak:
            return k
        foglalt = {str(h.get("rovid") or h.get("nev") or "") for h in b["hangszorok"] if isinstance(h, dict)}
        nevek = []
        for c, _e in ujak:
            st = hass.states.get(c)
            nevek.append(str(st.attributes.get("friendly_name") if st else c.split(".", 1)[-1]).replace("(Cast)", "").strip())
        for (_c, e), nev, rov in zip(ujak, nevek, rovid_nevek(nevek, foglalt)):
            h = {"nev": nev, "entity": e, "mod": "url"}
            if rov:
                h["rovid"] = rov
            b["hangszorok"].append(h)
        return kartyara_ir(k, b, {"hangszorok"})

    try:
        await kartyak_frissit(hass, hozzaad, csoport)
    except Exception:  # noqa: BLE001
        _LOGGER.exception("Cantabile: adding the TV players to the card failed")
