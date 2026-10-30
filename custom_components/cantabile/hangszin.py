"""Bemenet és hangszín: a kártya lenyíló előlapja (INPUT · BASS · TREBLE).

A régi hi-fi előlapjának alsó, lenyitható részén voltak a ritkábban használt kezelőszervek; a kártya ezt egy lenyíló
ablakban mutatja. Ami mögötte van:
  - bemenet: a hangszóró saját bemenetei (Bluetooth, Line In, optikai, TV…) – ahol a lejátszó kiadja a bemenetlistáját,
    abból (a Sonos-nál csak a vonal- és TV-bemenet, a lista többi eleme kedvenc), WiiM / LinkPlay eszköznél, ha a HA
    nem adja, a készülék saját jelentéséből (`plm_support`). A váltás a szokásos `select_source`; a WiiM bemenetenként
    külön hangerőt tárol, ezért utána visszaállítjuk az előzőt (különben egy rég beállított 60%-on szólalhat meg);
  - hangszín: ±10 fokozat. A Sonos a saját mély / magas entitásait kapja; a WiiM a 10 sávos EQ-ját: a BASS a 31–125 Hz-es
    sávokat (a 250 Hz-est félig), a TREBLE a 4–16 kHz-eseket (a 2 kHz-est félig) emeli vagy vágja. Az EQ bemenetenként
    tárolódik; ha mindkettő 0, kikapcsoljuk (változatlan jel).

  - equalizer (WiiM): a 10 sáv egyenként, a WiiM beépített hangzásai (EQLoad), EQ be / ki; a BASS / TREBLE ugyanezeket a
    sávokat mozgatja. Sonos-on a LOUDNESS kapcsoló (a hangszóró saját entitása);
  - zenei profilok: saját, névvel mentett sávállások (a HA tárolójában, közös minden kártyán), és automatikus profil-
    választás a szóló zene forrása (rádió, NAS, Deezer, BT IN…) vagy – a zenemappánál – az album műfaja (mufaj.py) szerint.
    A műfaj erősebb a forrásnál. Csak akkor vált, amikor a forrás vagy az album megváltozik, így a kézi állítás a
    következő albumig / forrásig megmarad.

Websocket: `cantabile/controls` (mi állítható és hogyan áll), `cantabile/input/select`, `cantabile/tone/set`,
`cantabile/eq/set`, `cantabile/eq/profiles`, `cantabile/eq/profile/save`, `cantabile/eq/profile/delete`,
`cantabile/eq/auto/set`, `cantabile/bt/pair` (párosítási mód a BT-bemeneten). A közös profil törlése / felülírása és
az AUTO-szabályok csak rendszergazdának; új profilt mentani és párosítani bárki tud. A hangszórót állítók figyelik a hangszóró-foglalást; a bemenetváltás után a hangszóró a váltóé.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any
from urllib.parse import quote, unquote, urlsplit

import aiohttp
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.storage import Store

from . import foglalas
from .const import DOMAIN
from .hezagmentes import gazdagep
from .library import media_ut
from .mufaj import kulcs as mufaj_kulcs

_LOGGER = logging.getLogger(__name__)

HATAR = 10                                   # a BASS / TREBLE fokozatai: −10 … +10
WIIM_LEPES = 2.5                             # EQ-sáv érték fokozatonként (a sáv 0–100, az 50 a semleges)
WIIM_MELY = {"band31hz": 1, "band63hz": 1, "band125hz": 1, "band250hz": 0.5}
WIIM_MAGAS = {"band2khz": 0.5, "band4khz": 1, "band8khz": 1, "band16khz": 1}
WIIM_HALO = "Network"
# a LinkPlay plm_support bitjei → a HA WiiM-integrációjának bemenetnevei
WIIM_PLM = ((4, "Bluetooth"), (2, "Line In"), (16, "Optical In"), (1024, "TV"), (65536, "Phono In"))
# a Sonos source_list-jében a valódi bemenetek (a többi kedvenc)
# a szóló zene forrása az automatikus profilhoz (a kártya ugyanezekkel a kulcsokkal mutatja)
FORRASOK = ("radio", "nas", "deezer", "tidal", "qobuz", "spotify", "bt", "line", "optical", "tv", "phono", "egyeb")
# a HA WiiM-integrációjának bemenetnevei → a WiiM saját módnevei (setPlayerCmd:switchmode), ha a lejátszó nem tud váltani
WIIM_MOD = {"Network": "wifi", "Bluetooth": "bluetooth", "Line In": "line-in", "Optical In": "optical", "TV": "HDMI", "Phono In": "phono"}
SAV_RE = re.compile(r"^band\d+k?hz$", re.I)
PROFIL_RE = re.compile(r"^[\w .&+'()/-]{1,32}$")
IDOKORLAT = 3
PROFIL_TAR = "cantabile_eq_profilok"
BEMENET_RE = re.compile(r"^(line[- ]?in|tv|hdmi|bluetooth|aux|optical( in)?|phono( in)?|coaxial|usb|cd|tuner|network|wi-?fi)$", re.I)


def _ent(hass: HomeAssistant, entity_id: str) -> er.RegistryEntry | None:
    return er.async_get(hass).async_get(entity_id)


async def _wiim(hass: HomeAssistant, host: str, parancs: str) -> Any:
    sess = async_get_clientsession(hass, verify_ssl=False)
    cim = f"[{host}]" if ":" in host and not host.startswith("[") else host
    try:
        async with asyncio.timeout(IDOKORLAT):
            async with sess.get(f"https://{cim}/httpapi.asp?command={quote(parancs, safe=':')}") as v:
                v.raise_for_status()
                szoveg = await v.text(errors="replace")
    except (aiohttp.ClientError, TimeoutError) as err:
        raise HomeAssistantError(f"WiiM ({host}): {err}") from err
    try:
        return json.loads(szoveg)
    except ValueError:
        return szoveg.strip()


def _sonos_szint(hass: HomeAssistant, ent: er.RegistryEntry) -> dict[str, str]:
    """A Sonos-eszköz mély / magas number-entitásai (egyedi azonosítójuk „<uid>-bass”, „<uid>-treble”)."""
    ki: dict[str, str] = {}
    for e in er.async_entries_for_device(er.async_get(hass), ent.device_id or ""):
        if e.platform == "sonos" and e.domain == "number" and not e.disabled_by:
            for fajta in ("bass", "treble"):
                if e.unique_id.endswith(f"-{fajta}"):
                    ki[fajta] = e.entity_id
    return ki


def _savok(eqv: Any) -> list[dict[str, Any]]:
    """Az EQGetBand válaszának ép sávjai (név + szám)."""
    lista = eqv.get("EQBand") if isinstance(eqv, dict) else None
    return [s for s in lista or [] if isinstance(s, dict) and isinstance(s.get("param_name"), str)
            and isinstance(s.get("value"), (int, float))]


def _wiim_fok(savok: list[dict[str, Any]], alak: dict[str, float]) -> int:
    ertek = {str(s.get("param_name", "")).lower(): s.get("value") for s in savok}
    teljes = [ertek[n] for n, s in alak.items() if s == 1 and isinstance(ertek.get(n), (int, float))]
    if not teljes:
        return 0
    return max(-HATAR, min(HATAR, round((sum(teljes) / len(teljes) - 50) / WIIM_LEPES)))


async def allapot(hass: HomeAssistant, entity_id: str) -> dict[str, Any]:
    st = hass.states.get(entity_id)
    ent = _ent(hass, entity_id)
    a = st.attributes if st else {}
    platform = ent.platform if ent else None
    elerheto = st is not None and st.state != "unavailable"
    host = gazdagep(hass, entity_id) if elerheto and platform in ("wiim", "linkplay") else None
    lista = [s for s in a.get("source_list") or [] if isinstance(s, str)]
    if platform == "sonos" or (len(lista) > 8 and any(BEMENET_RE.match(s) for s in lista)):
        # Sonos: a lista többi eleme kedvenc; TV-k, médialejátszók: a bemenetek mellett appok is (Netflix, YouTube…)
        lista = [s for s in lista if BEMENET_RE.match(s)]
    bemenetek: list[str] = []
    allas: dict[str, Any] = {}
    if host:
        try:
            allas = await _wiim(hass, host, "getStatusEx")
            allas = allas if isinstance(allas, dict) else {}
        except HomeAssistantError:
            _LOGGER.debug("Cantabile: a WiiM nem válaszol (%s)", entity_id, exc_info=True)
            host = None                   # ne várjunk a többi lekérdezésre is
    tort: Any = None
    eqv: Any = None
    if host:
        async def _csendes(parancs: str) -> Any:
            try:
                return await _wiim(hass, host, parancs)
            except HomeAssistantError:
                _LOGGER.debug("Cantabile: WiiM %s nem olvasható (%s)", parancs, entity_id, exc_info=True)
                return None
        tort, eqv = await asyncio.gather(_csendes("getbthistory"), _csendes("EQGetBand"))
    if lista:
        bemenetek = lista
    elif allas:
        try:
            plm = int(str(allas.get("plm_support", "0")), 0)
            bemenetek = [WIIM_HALO] + [n for b, n in WIIM_PLM if plm & b]
        except ValueError:
            _LOGGER.debug("Cantabile: a WiiM bemenetei nem olvashatók (%s)", entity_id, exc_info=True)
    bt: dict[str, Any] | None = None
    if host and "Bluetooth" in bemenetek and isinstance(tort, dict):
        # a párosításhoz: a WiiM Bluetooth-neve és az ismert (párosított) eszközök, hogy melyik csatlakozik most
        bt = {"name": str(allas.get("DeviceName") or allas.get("ssid") or ""),
              "devices": [{"name": str(d.get("name") or "?"), "connected": str(d.get("ct")) == "1"}
                          for d in tort.get("list") or [] if isinstance(d, dict) and str(d.get("role", "")).lower() == "audio source"]}
    if platform == "sonos" and bemenetek:
        bemenetek = ["Network", *bemenetek]          # a Sonos „vissza a hálózatra” állása: a bemenetről zene indításával
    hang: dict[str, Any] | None = None
    if platform == "sonos" and ent and (sz := _sonos_szint(hass, ent)):
        hang = {"fajta": "sonos"}
        for fajta, eid in sz.items():
            try:
                hang[fajta] = round(float(hass.states.get(eid).state))  # type: ignore[union-attr]
            except (AttributeError, TypeError, ValueError):
                hang[fajta] = 0
    eq: dict[str, Any] | None = None
    hangossag: bool | None = None
    if platform == "sonos" and ent and (le := _sonos_loudness(hass, ent)) and (ls := hass.states.get(le)) and ls.state in ("on", "off"):
        hangossag = ls.state == "on"
    elif host and (savok := _savok(eqv)):
        be = str(eqv.get("EQStat", "")).lower() == "on"
        hang = {"fajta": "wiim", "bass": _wiim_fok(savok, WIIM_MELY) if be else 0, "treble": _wiim_fok(savok, WIIM_MAGAS) if be else 0}
        eq = {"on": be, "name": str(eqv.get("Name") or ""), "source": eqv.get("source_name"),
              "bands": [{"n": s["param_name"], "v": s["value"]} for s in savok], "presets": await _wiim_lista(hass, host)}
    return {"inputs": bemenetek if len(bemenetek) > 1 else [], "source": a.get("source"), "tone": hang, "min": -HATAR, "max": HATAR,
            "eq": eq, "loudness": hangossag, "bt": bt}


_LISTAK: dict[str, list[str]] = {}


async def _wiim_lista(hass: HomeAssistant, host: str) -> list[str]:
    """A WiiM beépített hangzásai (egyszer kérdezzük le eszközönként; hibánál üres, és legközelebb újra próbálja)."""
    if host not in _LISTAK:
        try:
            lista = await _wiim(hass, host, "EQGetList")
        except HomeAssistantError:
            return []
        if not isinstance(lista, list) or not lista:
            return []
        _LISTAK[host] = [str(x) for x in lista]
    return _LISTAK[host]


def _sonos_loudness(hass: HomeAssistant, ent: er.RegistryEntry) -> str | None:
    for e in er.async_entries_for_device(er.async_get(hass), ent.device_id or ""):
        if e.platform == "sonos" and e.domain == "switch" and not e.disabled_by and e.unique_id.endswith("-loudness"):
            return e.entity_id
    return None


async def equalizer(hass: HomeAssistant, entity_id: str, msg: dict[str, Any], context: Any, profilok: Profilok) -> None:
    """Sávok, beépített hangzás, saját profil, EQ be / ki (WiiM) és LOUDNESS (Sonos)."""
    ent = _ent(hass, entity_id)
    if "loudness" in msg:
        le = _sonos_loudness(hass, ent) if ent and ent.platform == "sonos" else None
        if not le:
            raise HomeAssistantError("Ezen a hangszórón nincs LOUDNESS.")
        await hass.services.async_call("switch", "turn_on" if msg["loudness"] else "turn_off", {"entity_id": le},
                                       blocking=True, context=context)
        return
    host = gazdagep(hass, entity_id) if ent and ent.platform in ("wiim", "linkplay") else None
    if not host:
        raise HomeAssistantError("Ezen a hangszórón nincs equalizer.")
    if msg.get("preset"):
        if msg["preset"] not in await _wiim_lista(hass, host):
            raise HomeAssistantError(f"Ismeretlen hangzás: {msg['preset']}")
        await _wiim(hass, host, f"EQLoad:{msg['preset']}")
    elif msg.get("profile"):
        await profilok.alkalmaz(host, f"own:{msg['profile']}")
    elif msg.get("bands"):
        uj = [{"param_name": n, "value": max(0, min(100, round(float(v), 1)))} for n, v in msg["bands"].items()
              if SAV_RE.match(n) and float(v) == float(v)]
        if not uj:
            raise HomeAssistantError("Nincs érvényes EQ-sáv.")
        await _wiim(hass, host, "EQSetBand:" + json.dumps({"EQBand": uj}, separators=(",", ":")))
    if "on" in msg:
        await _wiim(hass, host, "EQOn" if msg["on"] else "EQOff")


class Profilok:
    """Saját EQ-profilok és az automatikus választás (forrás / műfaj → profil); a HA tárolójában."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, 1, PROFIL_TAR)
        self.adat: dict[str, Any] | None = None
        self._utolso: dict[str, tuple[Any, ...]] = {}      # entity → (forrás, album) – csak ennek változásakor vált
        self._alkalmazott: dict[str, str] = {}             # entity → az utoljára magától feltett profil
        self._zar = asyncio.Lock()

    async def betolt(self) -> dict[str, Any]:
        async with self._zar:                              # párhuzamos első hívásnál se töltse kétszer (felülírná a mentést)
            if self.adat is None:
                adat = (await self._store.async_load()) or {}
                adat = adat if isinstance(adat, dict) else {}
                if not isinstance(adat.get("own"), dict):
                    adat["own"] = {}
                auto = adat.get("auto") if isinstance(adat.get("auto"), dict) else {}
                auto["source"] = auto.get("source") if isinstance(auto.get("source"), dict) else {}
                auto["genre"] = {k: v for k, v in (auto.get("genre") or {}).items() if isinstance(v, dict)} if isinstance(auto.get("genre"), dict) else {}
                adat["auto"] = auto
                self.adat = adat
        return self.adat

    def ment(self) -> None:
        self._store.async_delay_save(lambda: self.adat or {}, 1)

    async def alkalmaz(self, host: str, ref: str) -> None:
        """„wiim:<név>”: beépített hangzás, „own:<név>”: saját profil, „off”: EQ ki."""
        if ref == "off":
            await _wiim(self.hass, host, "EQOff")
        elif ref.startswith("wiim:"):
            await _wiim(self.hass, host, f"EQLoad:{ref[5:]}")
        elif ref.startswith("own:"):
            savok = (await self.betolt())["own"].get(ref[4:])
            if not savok:
                raise HomeAssistantError(f"Nincs ilyen profil: {ref[4:]}")
            uj = [{"param_name": n, "value": v} for n, v in savok.items() if SAV_RE.match(n) and isinstance(v, (int, float))]
            await _wiim(self.hass, host, "EQSetBand:" + json.dumps({"EQBand": uj}, separators=(",", ":")))
            await _wiim(self.hass, host, "EQOn")

    @callback
    def figyel(self) -> None:
        self.hass.bus.async_listen(EVENT_STATE_CHANGED, self._valtozott)

    @callback
    def _valtozott(self, ev: Event) -> None:
        e = ev.data.get("entity_id", "")
        uj = ev.data.get("new_state")
        if not e.startswith("media_player.") or uj is None or uj.state not in ("playing", "buffering"):
            return
        if not self.adat or not (self.adat["auto"]["source"] or self.adat["auto"]["genre"]):
            return
        ent = _ent(self.hass, e)
        if not ent or ent.platform not in ("wiim", "linkplay"):
            return
        forras, mappa = _forras(self.hass, uj)
        if self._utolso.get(e) == (forras, mappa):
            return
        self._utolso[e] = (forras, mappa)
        self.hass.async_create_background_task(self._automatikus(e, forras, mappa), f"cantabile_eq_{e}")

    async def _automatikus(self, e: str, forras: str, mappa: str | None) -> None:
        auto = (await self.betolt())["auto"]
        ref = None
        if mappa and auto["genre"] and (gy := self.hass.data.get(DOMAIN, {}).get("mufaj")):
            for g in await gy.mappa_mufajai(mappa):
                if (r := auto["genre"].get(mufaj_kulcs(g))) and r.get("profile"):
                    ref = r["profile"]
                    break
        if ref is None:
            ref = auto["source"].get(forras) or None
        # közben már másik album / forrás szól (gyors váltás): annak a feladata dönt
        if not ref or self._alkalmazott.get(e) == f"{ref}|{forras}|{mappa}" or self._utolso.get(e) != (forras, mappa):
            return
        host = gazdagep(self.hass, e)
        if not host:
            return
        try:
            await self.alkalmaz(host, ref)
            self._alkalmazott[e] = f"{ref}|{forras}|{mappa}"
            _LOGGER.debug("Cantabile: EQ-profil %s → %s (%s, %s)", ref, e, forras, mappa)
        except HomeAssistantError:
            # a következő állapotváltozáskor újra próbálja (pl. épp újracsatlakozó WiiM)
            if self._utolso.get(e) == (forras, mappa):
                self._utolso.pop(e, None)
            _LOGGER.debug("Cantabile: az EQ-profil nem tehető fel (%s)", e, exc_info=True)


def _forras(hass: HomeAssistant, st: Any) -> tuple[str, str | None]:
    """A szóló zene forrása (FORRASOK egyike) és – zenemappánál – az album mappája."""
    a = st.attributes
    src = str(a.get("source") or "").lower()
    if src == "bluetooth":
        return "bt", None
    if src.startswith("line") or src == "aux":
        return "line", None
    if src.startswith(("optical", "coax")):
        return "optical", None
    if src in ("tv", "hdmi", "arc"):
        return "tv", None
    if src.startswith("phono"):
        return "phono", None
    cid = str(a.get("media_content_id") or "")
    u = urlsplit(cid)
    if u.path.startswith("/media/") and "authSig" in (u.query or ""):
        forras, _, rel = unquote(u.path[len("/media/"):]).partition("/")
        alap = hass.config.media_dirs.get(forras)
        ut = media_ut(alap, rel.rsplit("/", 1)[0]) if alap and "/" in rel else None
        return "nas", ut
    for kulcsszo, nev in (("dzcdn", "deezer"), ("deezer", "deezer"), ("tidal", "tidal"), ("qobuz", "qobuz"), ("spotify", "spotify")):
        if kulcsszo in cid.lower():
            return nev, None
    if not a.get("media_duration"):
        return "radio", None
    return "egyeb", None


async def bemenet(hass: HomeAssistant, entity_id: str, forras: str, context: Any) -> None:
    st = hass.states.get(entity_id)
    hangero = st.attributes.get("volume_level") if st else None
    ent = _ent(hass, entity_id)
    if ent and ent.platform == "sonos" and forras == "Network":
        # a Sonos bemenetről csak lejátszással jön vissza: a kártya ilyenkor maga indít zenét – itt csak megállítjuk
        await hass.services.async_call("media_player", "media_stop", {"entity_id": entity_id}, blocking=True, context=context)
        return
    tud = int(st.attributes.get("supported_features") or 0) & 2048 if st else 0      # SELECT_SOURCE
    host = gazdagep(hass, entity_id) if ent and ent.platform in ("wiim", "linkplay") else None
    if not tud and host and forras in WIIM_MOD:
        # a lejátszó nem tud bemenetet váltani, de a WiiM igen (a bemeneteit is tőle kérdeztük)
        if str(await _wiim(hass, host, f"setPlayerCmd:switchmode:{WIIM_MOD[forras]}")).strip().upper() != "OK":
            raise HomeAssistantError(f"A hangszóró nem váltott át: {forras}")
    else:
        await hass.services.async_call("media_player", "select_source", {"entity_id": entity_id, "source": forras},
                                       blocking=True, context=context)
    if not isinstance(hangero, (int, float)):
        return
    for _ in range(12):        # a WiiM a bemenet saját hangerejére ugrik: ha átváltott, visszaállítjuk az előzőt
        await asyncio.sleep(0.5)
        s = hass.states.get(entity_id)
        if s and s.attributes.get("source") == forras:
            break
    await asyncio.sleep(0.5)
    s = hass.states.get(entity_id)
    if s and isinstance(s.attributes.get("volume_level"), (int, float)) and abs(s.attributes["volume_level"] - hangero) > 0.005:
        await hass.services.async_call("media_player", "volume_set", {"entity_id": entity_id, "volume_level": hangero},
                                       blocking=True, context=context)


async def hangszin(hass: HomeAssistant, entity_id: str, mely: int | None, magas: int | None, context: Any) -> None:
    ent = _ent(hass, entity_id)
    if ent and ent.platform == "sonos":
        sz = _sonos_szint(hass, ent)
        for fajta, ertek in (("bass", mely), ("treble", magas)):
            if ertek is not None and fajta in sz:
                await hass.services.async_call("number", "set_value", {"entity_id": sz[fajta], "value": ertek},
                                               blocking=True, context=context)
        return
    host = gazdagep(hass, entity_id) if ent and ent.platform in ("wiim", "linkplay") else None
    if not host:
        raise HomeAssistantError("Ezen a hangszórón nem állítható a hangszín.")
    eq = await _wiim(hass, host, "EQGetBand")
    savok = eq.get("EQBand") if isinstance(eq, dict) else None
    if not savok:
        raise HomeAssistantError("A WiiM nem adta meg az EQ-sávjait.")
    be = str(eq.get("EQStat", "")).lower() == "on"
    if mely is None:
        mely = _wiim_fok(savok, WIIM_MELY) if be else 0
    if magas is None:
        magas = _wiim_fok(savok, WIIM_MAGAS) if be else 0
    if mely == 0 and magas == 0:
        uj = [{"param_name": s["param_name"], "value": 50} for s in savok
              if str(s.get("param_name", "")).lower() in WIIM_MELY | WIIM_MAGAS]
        await _wiim(hass, host, "EQSetBand:" + json.dumps({"EQBand": uj}, separators=(",", ":")))
        if all(s.get("value") == 50 for s in savok if str(s.get("param_name", "")).lower() not in WIIM_MELY | WIIM_MAGAS):
            await _wiim(hass, host, "EQLoad:Flat")     # minden sáv semleges: a WiiM appjában is „Flat” legyen a neve
        await _wiim(hass, host, "EQOff")
        return
    uj = []
    for s in savok:
        n = str(s.get("param_name", "")).lower()
        if n in WIIM_MELY:
            uj.append({"param_name": s["param_name"], "value": round(50 + mely * WIIM_LEPES * WIIM_MELY[n], 1)})
        elif n in WIIM_MAGAS:
            uj.append({"param_name": s["param_name"], "value": round(50 + magas * WIIM_LEPES * WIIM_MAGAS[n], 1)})
    await _wiim(hass, host, "EQSetBand:" + json.dumps({"EQBand": uj}, separators=(",", ":")))


def regisztral(hass: HomeAssistant) -> None:
    def _foglal(conn: websocket_api.ActiveConnection, entity_id: str, eszkoz: str | None) -> None:
        """Más foglalta: hiba; a bemenetváltás (eszkoz) a hangszórót a váltóé teszi, a hangszín csak ellenőriz."""
        fk = foglalas.kozpont(hass)
        if m := fk.masik([entity_id], conn.user.id):
            raise HomeAssistantError(f"busy:{m[1]['nev']}")
        if eszkoz:
            fk.foglal([entity_id], conn.user.id, conn.user.name or "?", eszkoz)

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/controls", vol.Required("entity_id"): str})
    @websocket_api.async_response
    async def ws_controls(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        conn.send_result(msg["id"], await allapot(hass, msg["entity_id"]))

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/input/select",
        vol.Required("entity_id"): str,
        vol.Required("source"): str,
        vol.Optional("device", default="gep"): vol.In(foglalas.ESZKOZOK),
    })
    @websocket_api.async_response
    async def ws_input(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            _foglal(conn, msg["entity_id"], None)         # más használja: hiba; a hangszóró csak sikeres váltás után a miénk
            await bemenet(hass, msg["entity_id"], msg["source"], conn.context(msg))
            _foglal(conn, msg["entity_id"], msg["device"])
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        conn.send_result(msg["id"])

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/tone/set",
        vol.Required("entity_id"): str,
        vol.Optional("bass"): vol.All(int, vol.Range(-HATAR, HATAR)),
        vol.Optional("treble"): vol.All(int, vol.Range(-HATAR, HATAR)),
    })
    @websocket_api.async_response
    async def ws_tone(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            _foglal(conn, msg["entity_id"], None)
            await hangszin(hass, msg["entity_id"], msg.get("bass"), msg.get("treble"), conn.context(msg))
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        conn.send_result(msg["id"])

    profilok = hass.data[DOMAIN]["eq_profilok"] = Profilok(hass)
    profilok.figyel()
    hass.async_create_background_task(profilok.betolt(), "cantabile_eq_profilok")

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/eq/set",
        vol.Required("entity_id"): str,
        vol.Optional("bands"): {str: vol.Coerce(float)},
        vol.Optional("preset"): str,
        vol.Optional("profile"): str,
        vol.Optional("on"): bool,
        vol.Optional("loudness"): bool,
    })
    @websocket_api.async_response
    async def ws_eq(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            _foglal(conn, msg["entity_id"], None)
            await equalizer(hass, msg["entity_id"], msg, conn.context(msg), profilok)
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        conn.send_result(msg["id"])

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/eq/profiles"})
    @websocket_api.async_response
    async def ws_profilok(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        a = await profilok.betolt()
        conn.send_result(msg["id"], {"own": a["own"], "auto": a["auto"], "sources": list(FORRASOK)})

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/eq/profile/save",
        vol.Required("name"): vol.All(str, vol.Length(min=1, max=32)),
        vol.Required("entity_id"): str,
    })
    @websocket_api.async_response
    async def ws_mentes(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        """A hangszóró mostani sávállása saját profilként (a WiiM-ből olvasva – ami szól, az kerül el: kikapcsolt EQ-nál
        a semleges állás)."""
        nev = msg["name"].strip()
        host = gazdagep(hass, msg["entity_id"])
        try:
            if not PROFIL_RE.match(nev):
                raise HomeAssistantError("A profil neve 1–32 betű, szám, szóköz vagy . & + ' ( ) / - lehet.")
            eqv = await _wiim(hass, host, "EQGetBand") if host else None
            savok = _savok(eqv)
            if not savok:
                raise HomeAssistantError("A WiiM nem adta meg az EQ-sávjait.")
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        be = str(eqv.get("EQStat", "")).lower() == "on"
        a = await profilok.betolt()
        if nev in a["own"] and not conn.user.is_admin:
            conn.send_error(msg["id"], "nem_sikerult", "Meglévő közös profilt csak rendszergazda írhat felül – adj neki új nevet.")
            return
        a["own"][nev] = {s["param_name"]: (s["value"] if be else 50) for s in savok}
        profilok.ment()
        conn.send_result(msg["id"])

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/eq/profile/delete", vol.Required("name"): str})
    @websocket_api.require_admin
    @websocket_api.async_response
    async def ws_torles(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        a = await profilok.betolt()
        a["own"].pop(msg["name"], None)
        ref = f"own:{msg['name']}"
        for k in [k for k, v in a["auto"]["source"].items() if v == ref]:
            del a["auto"]["source"][k]
        for k in [k for k, v in a["auto"]["genre"].items() if isinstance(v, dict) and v.get("profile") == ref]:
            del a["auto"]["genre"][k]
        profilok.ment()
        conn.send_result(msg["id"])

    @websocket_api.websocket_command({
        vol.Required("type"): "cantabile/eq/auto/set",
        vol.Required("kind"): vol.In(("source", "genre")),
        vol.Required("key"): str,
        vol.Optional("profile", default=""): str,
    })
    @websocket_api.require_admin
    @websocket_api.async_response
    async def ws_auto(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        """Forrás- vagy műfaj-profil („wiim:<név>”, „own:<név>”, „off”; üres: törlés). Műfajnál a kulcs a műfaj neve."""
        a = await profilok.betolt()
        prof = msg["profile"]
        if prof and not (prof == "off" or (prof.startswith("wiim:") and PROFIL_RE.match(prof[5:]))
                         or (prof.startswith("own:") and prof[4:] in a["own"])):
            conn.send_error(msg["id"], "rossz_profil", prof)
            return
        if msg["kind"] == "source":
            if msg["key"] not in FORRASOK:
                conn.send_error(msg["id"], "rossz_forras", msg["key"])
                return
            if prof:
                a["auto"]["source"][msg["key"]] = prof
            else:
                a["auto"]["source"].pop(msg["key"], None)
        else:
            k = mufaj_kulcs(msg["key"])
            if prof:
                a["auto"]["genre"][k] = {"name": msg["key"], "profile": prof}
            else:
                a["auto"]["genre"].pop(k, None)
        profilok._utolso.clear()           # a következő állapotváltozáskor újra eldönti
        profilok.ment()
        conn.send_result(msg["id"])

    @websocket_api.websocket_command({vol.Required("type"): "cantabile/bt/pair", vol.Required("entity_id"): str})
    @websocket_api.async_response
    async def ws_parosit(hass: HomeAssistant, conn: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        """A WiiM Bluetooth-bemenete párosítási módba (`btavkenterpair`; a fénye lassan villog zölden), hogy egy új
        telefon / tablet megtalálja. Csak akkor látszik, ha épp nem csatlakozik hozzá másik eszköz."""
        host = gazdagep(hass, msg["entity_id"])
        try:
            _foglal(conn, msg["entity_id"], None)
            if not host:
                raise HomeAssistantError("Ezen a hangszórón nincs Bluetooth-párosítás.")
            if str(await _wiim(hass, host, "btavkenterpair")).strip().upper() != "OK":
                raise HomeAssistantError("A hangszóró nem lépett párosítási módba.")
        except HomeAssistantError as err:
            conn.send_error(msg["id"], "nem_sikerult", str(err))
            return
        conn.send_result(msg["id"])

    for c in (ws_parosit, ws_controls, ws_input, ws_tone, ws_eq, ws_profilok, ws_mentes, ws_torles, ws_auto):
        websocket_api.async_register_command(hass, c)
