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

Websocket: `cantabile/controls` (mi állítható és hogyan áll), `cantabile/input/select`, `cantabile/tone/set`.
Mindkettő figyeli a hangszóró-foglalást; a bemenetváltás után a hangszóró a váltóé.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any
from urllib.parse import quote

import aiohttp
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from . import foglalas
from .hezagmentes import gazdagep

_LOGGER = logging.getLogger(__name__)

HATAR = 10                                   # a BASS / TREBLE fokozatai: −10 … +10
WIIM_LEPES = 2.5                             # EQ-sáv érték fokozatonként (a sáv 0–100, az 50 a semleges)
WIIM_MELY = {"band31hz": 1, "band63hz": 1, "band125hz": 1, "band250hz": 0.5}
WIIM_MAGAS = {"band2khz": 0.5, "band4khz": 1, "band8khz": 1, "band16khz": 1}
WIIM_HALO = "Network"
# a LinkPlay plm_support bitjei → a HA WiiM-integrációjának bemenetnevei
WIIM_PLM = ((4, "Bluetooth"), (2, "Line In"), (16, "Optical In"), (1024, "TV"), (65536, "Phono In"))
# a Sonos source_list-jében a valódi bemenetek (a többi kedvenc)
BEMENET_RE = re.compile(r"^(line[- ]?in|tv|hdmi|bluetooth|aux|optical( in)?|phono( in)?|coaxial|usb|cd|tuner|network|wi-?fi)$", re.I)


def _ent(hass: HomeAssistant, entity_id: str) -> er.RegistryEntry | None:
    return er.async_get(hass).async_get(entity_id)


async def _wiim(hass: HomeAssistant, host: str, parancs: str) -> Any:
    sess = async_get_clientsession(hass, verify_ssl=False)
    try:
        async with asyncio.timeout(5):
            async with sess.get(f"https://{host}/httpapi.asp?command={quote(parancs, safe=':')}") as v:
                szoveg = await v.text()
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
    host = gazdagep(hass, entity_id) if platform in ("wiim", "linkplay") else None
    lista = [s for s in a.get("source_list") or [] if isinstance(s, str)]
    if platform == "sonos":
        lista = [s for s in lista if BEMENET_RE.match(s)]
    bemenetek: list[str] = []
    if lista:
        bemenetek = lista
    elif host:
        try:
            plm = int(str((await _wiim(hass, host, "getStatusEx") or {}).get("plm_support", "0")), 0)
            bemenetek = [WIIM_HALO] + [n for b, n in WIIM_PLM if plm & b]
        except (HomeAssistantError, ValueError, AttributeError):
            _LOGGER.debug("Cantabile: a WiiM bemenetei nem olvashatók (%s)", entity_id, exc_info=True)
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
    elif host:
        try:
            eq = await _wiim(hass, host, "EQGetBand")
            if isinstance(eq, dict) and eq.get("EQBand"):
                be = str(eq.get("EQStat", "")).lower() == "on"
                hang = {"fajta": "wiim", "bass": _wiim_fok(eq["EQBand"], WIIM_MELY) if be else 0,
                        "treble": _wiim_fok(eq["EQBand"], WIIM_MAGAS) if be else 0}
        except HomeAssistantError:
            _LOGGER.debug("Cantabile: a WiiM EQ-ja nem olvasható (%s)", entity_id, exc_info=True)
    return {"inputs": bemenetek if len(bemenetek) > 1 else [], "source": a.get("source"), "tone": hang, "min": -HATAR, "max": HATAR}


async def bemenet(hass: HomeAssistant, entity_id: str, forras: str, context: Any) -> None:
    st = hass.states.get(entity_id)
    hangero = st.attributes.get("volume_level") if st else None
    ent = _ent(hass, entity_id)
    if ent and ent.platform == "sonos" and forras == "Network":
        # a Sonos bemenetről csak lejátszással jön vissza: a kártya ilyenkor maga indít zenét – itt csak megállítjuk
        await hass.services.async_call("media_player", "media_stop", {"entity_id": entity_id}, blocking=True, context=context)
        return
    await hass.services.async_call("media_player", "select_source", {"entity_id": entity_id, "source": forras},
                                   blocking=True, context=context)
    if hangero is None:
        return
    for _ in range(12):        # a WiiM a bemenet saját hangerejére ugrik: ha átváltott, visszaállítjuk az előzőt
        await asyncio.sleep(0.5)
        s = hass.states.get(entity_id)
        if s and s.attributes.get("source") == forras:
            break
    await asyncio.sleep(0.5)
    s = hass.states.get(entity_id)
    if s and s.attributes.get("volume_level") is not None and abs(s.attributes["volume_level"] - hangero) > 0.005:
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
            _foglal(conn, msg["entity_id"], msg["device"])
            await bemenet(hass, msg["entity_id"], msg["source"], conn.context(msg))
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

    for c in (ws_controls, ws_input, ws_tone):
        websocket_api.async_register_command(hass, c)
