"""Beállítás a felületen: varázsló az integráció felvételekor (üdvözlés → hangszórók → zenemappa → rádióadók → TV →
hang → vezérlőpult → összefoglaló), és ugyanez később a lehetőségek közül, lépésenként is („Beállítás varázsló”).
A lehetőségek között a régi űrlap is megmaradt (Assist-eszköz, halkítás bemondáskor, TV-lejátszók, Spotify / Tidal).

A varázsló a kártya beállításait (hangszórók, adók, zenemappa) a kártyába írja: új vezérlőpultra / meglévő nézetbe tett
kártyába, a lehetőségekből futtatva pedig a meglévő Cantabile kártyákba is – mint a kártya ⚙ Mentése (varazslo.py).
A meglévő telepítéseket nem érinti: a 2.5.0-s bejegyzés változatlanul működik, a varázsló csak új felvételkor fut
magától.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import selector

from . import varazslo
from .const import (
    CONF_DUCK_LEVEL, CONF_DUCK_SOURCES, CONF_LLM_API, CONF_SPOTIFY_ID, CONF_SPOTIFY_SECRET, CONF_TIDAL_ID, CONF_TIDAL_SECRET, CONF_TV_PLAYERS,
    DOMAIN,
    DUCK_LEVEL_DEFAULT,
)

_LOGGER = logging.getLogger(__name__)

SORREND = ["speakers", "library", "radio", "tv", "voice", "dashboard", "summary"]
LINKEK = {
    "integrations_url": "/config/integrations/dashboard",
    "storage_url": "/config/storage",
    "media_url": "/media-browser/browser",
    "network_url": "/config/network",
    "dashboards_url": "/config/lovelace/dashboards",
}


def _sorok(sorok: list[str], ures: str = "–") -> str:
    return "\n".join(f"- {s}" for s in sorok) if sorok else ures


class _Varazslo:
    """A varázsló lépései – közös a felvételi (ConfigFlow) és a lehetőségek (OptionsFlow) folyamatában."""

    hass: Any
    _opciok = False          # a lehetőségekből fut (meglévő kártyák frissítése, vissza a menübe)
    _linearis = True         # lépésről lépésre (különben minden lépés után vissza a menübe)

    def _b_init(self, kartya: dict[str, Any] | None = None, opciok: dict[str, Any] | None = None) -> None:
        b = varazslo.beallitas_kartyabol(kartya) if kartya else {"hangszorok": None, "adok": None, "magno": None}
        opciok = opciok or {}
        self._b: dict[str, Any] = {
            **b, "tv": list(opciok.get(CONF_TV_PLAYERS, [])), "llm_api": bool(opciok.get(CONF_LLM_API, True)),
            "pult": None, "valtozott": set(), "regi_tv": list(opciok.get(CONF_TV_PLAYERS, [])),
        }
        self._van_kartya = kartya is not None
        self._hsz: list[dict[str, Any]] | None = None
        self._mappak: list[dict[str, Any]] | None = None
        self._kinalat: list[dict[str, Any]] | None = None
        self._nezetek: list[dict[str, Any]] = []
        self._osszegzes: dict[str, str] | None = None
        self._csoport: str | None = None

    def _jeloltek(self) -> list[dict[str, Any]]:
        if self._hsz is None:
            self._hsz = varazslo.hangszorok(self.hass)
            # a kártyán már szereplő hangszórók a készülék fő lejátszójára (pl. a Music Assistant „Nappali” → a Sonos
            # „Nappali”); egy készülék egyszer
            regi = self._b["hangszorok"]
            uj = varazslo.regi_atir(regi, varazslo.terkep(self._hsz)["fo"])
            if uj != regi:
                self._b["hangszorok"] = uj
        return self._hsz

    def _nev(self, entity_id: str) -> str:
        st = self.hass.states.get(entity_id)
        return str(st.attributes.get("friendly_name") if st else entity_id)

    async def _tovabb(self, lepes: str) -> ConfigFlowResult:
        """A következő lépés: végigfutásnál a sorrendben következő, egy-egy lépésnél vissza a varázsló menüjébe."""
        if self._linearis:
            return await getattr(self, f"async_step_{SORREND[SORREND.index(lepes) + 1]}")()
        return await self.async_step_wizard()  # type: ignore[attr-defined]

    # ---- 2. hangszórók ----

    async def async_step_speakers(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        jel = self._jeloltek()
        regi = self._b["hangszorok"]
        # a kártyán szereplő, de a jelöltek között nem lévő lejátszók (pl. Cantabile TV) is választhatók maradnak
        jel_ids = {x["entity_id"] for x in jel}
        extra = [h["entity"] for h in regi or [] if isinstance(h, dict) and h.get("entity") and h["entity"] not in jel_ids]
        if not jel and not extra:
            return await self.async_step_speakers_none()
        if user_input is not None:
            valasztott = list(user_input.get("speakers") or [])
            alap = user_input.get("default_speaker") or None
            if alap and alap not in valasztott:
                valasztott.insert(0, alap)
            alap = alap or varazslo.alapertelmezett(jel, valasztott)
            self._b["hangszorok"] = varazslo.hangszoro_lista(jel, valasztott, alap, regi)
            self._b["valtozott"].add("hangszorok")
            return await self._tovabb("speakers")
        if regi is not None:
            elore = [h["entity"] for h in regi if isinstance(h, dict) and h.get("entity")]
            alap = elore[0] if elore else None
        else:
            elore = [x["entity_id"] for x in jel if x["elore"]]
            alap = varazslo.alapertelmezett(jel, elore)
        opciok = [selector.SelectOptionDict(value=x["entity_id"], label=f"{x['csoport']} · {x['nev']}" + (" 📺" if x["kepernyo"] else "")
                                            + varazslo.tartalek_felirat(x, self.hass.config.language)) for x in jel]
        opciok += [selector.SelectOptionDict(value=e, label=f"Cantabile · {self._nev(e)}") for e in extra]
        csoportok: dict[str, int] = {}
        for x in jel:
            csoportok[x["csoport"]] = csoportok.get(x["csoport"], 0) + 1
        schema = vol.Schema({
            vol.Optional("speakers", default=elore): selector.SelectSelector(
                selector.SelectSelectorConfig(options=opciok, multiple=True, mode=selector.SelectSelectorMode.LIST)),
            vol.Optional("default_speaker", description={"suggested_value": alap} if alap else None): selector.SelectSelector(
                selector.SelectSelectorConfig(options=opciok, mode=selector.SelectSelectorMode.DROPDOWN)),
        })
        return self.async_show_form(step_id="speakers", data_schema=schema, last_step=False, description_placeholders={
            "groups": " · ".join(f"{k}: {v}" for k, v in csoportok.items()) or "–", "count": str(len(jel))})

    async def async_step_speakers_none(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            self._b["hangszorok"] = []
            self._b["valtozott"].add("hangszorok")
            return await self._tovabb("speakers")
        return self.async_show_form(step_id="speakers_none", data_schema=vol.Schema({}), last_step=False, description_placeholders=LINKEK)

    # ---- 3. zenemappa ----

    async def async_step_library(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        hass = self.hass
        dirs = dict(hass.config.media_dirs or {})
        if self._mappak is None:
            try:
                self._mappak = await hass.async_add_executor_job(varazslo.zenemappak, dirs)
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Cantabile: scanning the media folders failed")
                self._mappak = []
        errors: dict[str, str] = {}
        if user_input is not None:
            nas = str(user_input.get("media_folder") or "").strip().rstrip("/")
            hires = str(user_input.get("hires_folder") or "").strip().strip("/")
            fel = str(user_input.get("upload_folder") or "").strip().strip("/")
            if nas and not nas.startswith("media-source://"):
                errors["media_folder"] = "folder_invalid"
            elif nas and hires and (ut := varazslo.helyi_ut(dirs, nas)) and not await hass.async_add_executor_job(os.path.isdir, os.path.join(ut, hires)):
                errors["hires_folder"] = "hires_not_found"
            if not errors:
                self._b["magno"] = {"nas": nas, "hires": hires if nas else "", "feltoltes": fel if nas else ""}
                self._b["valtozott"].add("magno")
                return await self._tovabb("library")
        m = self._b["magno"] or {}
        javasolt = m.get("nas") or (self._mappak[0]["id"] if self._mappak else "")
        jel = next((x for x in self._mappak if x["id"] == javasolt), None)
        if m.get("nas"):
            hires_j, fel_j = m.get("hires") or "", m.get("feltoltes") or ""
        else:
            hires_j, fel_j = (jel or {}).get("hires") or "", (jel or {}).get("feltoltes") or varazslo.FELTOLTES_ALAP

        def db(x: dict[str, Any]) -> str:
            return f"♪ {x['db']}+" if x["db"] >= 200 else f"♪ {x['db']}"

        opciok = [selector.SelectOptionDict(value=x["id"], label=f"{x['nev']} – {db(x)}") for x in self._mappak]
        if javasolt and javasolt not in {x["id"] for x in self._mappak}:
            opciok.insert(0, selector.SelectOptionDict(value=javasolt, label=javasolt))
        talalt = "\n".join(f"- `{x['id']}` – {db(x)}" for x in self._mappak[:6]) or "–"
        schema = vol.Schema({
            vol.Optional("media_folder", description={"suggested_value": javasolt} if javasolt else None): selector.SelectSelector(
                selector.SelectSelectorConfig(options=opciok, custom_value=True, mode=selector.SelectSelectorMode.DROPDOWN)),
            vol.Optional("hires_folder", description={"suggested_value": hires_j} if hires_j else None): selector.TextSelector(),
            vol.Optional("upload_folder", description={"suggested_value": fel_j} if fel_j else None): selector.TextSelector(),
        })
        return self.async_show_form(step_id="library", data_schema=schema, errors=errors, last_step=False,
                                    description_placeholders={**LINKEK, "found": talalt})

    # ---- 4. rádióadók ----

    async def async_step_radio(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._kinalat is None:
            try:
                self._kinalat = await varazslo.nepszeru_adok(self.hass)
            except Exception as err:  # noqa: BLE001 – nincs internet / a Radio Browser nem válaszol
                _LOGGER.info("Cantabile: Radio Browser not reachable for the setup wizard: %s", err)
                self._kinalat = []
        regi = [a for a in self._b["adok"] or [] if isinstance(a, dict) and a.get("url")]
        if not self._kinalat and not regi:
            return await self.async_step_radio_offline()
        # a kártyán már szereplő adók elöl, aztán a népszerűek (azonos cím csak egyszer)
        kinalat = [{"id": f"kartya:{a['url']}", "nev": str(a.get("nev") or a["url"]), "url": a["url"], "info": "✓"}
                   for a in regi]
        cimek = {a["url"] for a in regi}
        kinalat += [a for a in self._kinalat if a["url"] not in cimek]
        errors: dict[str, str] = {}
        if user_input is not None:
            ids = list(user_input.get("stations") or [])
            if len(ids) > varazslo.ADO_MAX:
                errors["stations"] = "too_many_stations"
            else:
                szerint = {a["id"]: a for a in kinalat}
                self._b["adok"] = varazslo.ado_lista([szerint[i] for i in ids if i in szerint], regi, str(self.hass.config.country or "").upper() == "JP")
                self._b["valtozott"].add("adok")
                return await self._tovabb("radio")
        if user_input is not None:
            elore = list(user_input.get("stations") or [])
        elif self._b["adok"] is not None:
            elore = [a["id"] for a in kinalat[:len(regi)]]
        else:
            elore = [a["id"] for a in kinalat[:varazslo.ADO_ELORE]]
        opciok = [selector.SelectOptionDict(value=a["id"], label=a["nev"] + (f" · {a['info']}" if a.get("info") else "")) for a in kinalat]
        return self.async_show_form(
            step_id="radio", errors=errors, last_step=False,
            description_placeholders={"country": str(self.hass.config.country or "–"), "max": str(varazslo.ADO_MAX)},
            data_schema=vol.Schema({vol.Optional("stations", default=elore): selector.SelectSelector(
                selector.SelectSelectorConfig(options=opciok, multiple=True, mode=selector.SelectSelectorMode.LIST))}))

    async def async_step_radio_offline(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            self._kinalat = None          # legközelebb újra próbálja
            if self._b["adok"] is None:
                self._b["adok"] = []
            return await self._tovabb("radio")
        return self.async_show_form(step_id="radio_offline", data_schema=vol.Schema({}), last_step=False)

    # ---- 5. TV ----

    async def async_step_tv(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        jel = varazslo.tv_jeloltek(self._jeloltek())
        jel_ids = {x["entity_id"] for x in jel}
        extra = [c for c in self._b["tv"] if c not in jel_ids]
        if not jel and not extra:
            return await self.async_step_tv_none()
        if user_input is not None:
            self._b["tv"] = list(user_input.get("tv_players") or [])
            self._b["valtozott"].add("tv")
            return await self._tovabb("tv")
        f = await varazslo.tv_feltetelek(self.hass)
        if self._opciok or "tv" in self._b["valtozott"]:
            elore = list(self._b["tv"])
        else:          # csak ami egyértelműen TV
            elore = [x["entity_id"] for x in jel if x["kepernyo"]]
        opciok = [selector.SelectOptionDict(value=x["entity_id"], label=f"{x['csoport']} · {x['nev']}" + (" 📺" if x["kepernyo"] else "")
                                            + varazslo.tartalek_felirat(x, self.hass.config.language)) for x in jel]
        opciok += [selector.SelectOptionDict(value=c, label=self._nev(c)) for c in extra]
        return self.async_show_form(
            step_id="tv", last_step=False, description_placeholders={**LINKEK, **varazslo.feltetel_jelek(f)},
            data_schema=vol.Schema({vol.Optional("tv_players", default=elore): selector.SelectSelector(
                selector.SelectSelectorConfig(options=opciok, multiple=True, mode=selector.SelectSelectorMode.LIST))}))

    async def async_step_tv_none(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return await self._tovabb("tv")
        f = await varazslo.tv_feltetelek(self.hass)
        return self.async_show_form(step_id="tv_none", data_schema=vol.Schema({}), last_step=False,
                                    description_placeholders={**LINKEK, **varazslo.feltetel_jelek(f)})

    # ---- 6. hang ----

    async def async_step_voice(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            self._b["llm_api"] = bool(user_input.get(CONF_LLM_API, True))
            self._b["valtozott"].add("llm_api")
            return await self._tovabb("voice")
        ugy = varazslo.ugynokok(self.hass)
        return self.async_show_form(step_id="voice", last_step=False, description_placeholders={
            **LINKEK, "agents": _sorok(ugy)},
            data_schema=vol.Schema({vol.Required(CONF_LLM_API, default=self._b["llm_api"]): bool}))

    # ---- 7. vezérlőpult ----

    async def async_step_dashboard(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if not self._kitoltott()["hangszorok"]:          # a kártyának legalább egy hangszóró kell
            return await self.async_step_dashboard_none()
        self._nezetek = await varazslo.nezet_lehetosegek(self.hass)
        if user_input is not None:
            hova = user_input.get("placement", "new")
            if hova == "new":
                return await self.async_step_dashboard_new()
            if hova == "existing" and self._nezetek:
                return await self.async_step_dashboard_existing()
            self._b["pult"] = {"mod": "skip"}
            return await self._tovabb("dashboard")
        lehet = ["new", "existing", "skip"] if self._nezetek else ["new", "skip"]
        alap = "skip" if self._opciok and self._van_kartya else "new"
        return self.async_show_form(step_id="dashboard", last_step=False, description_placeholders=LINKEK, data_schema=vol.Schema({
            vol.Required("placement", default=alap): selector.SelectSelector(selector.SelectSelectorConfig(
                options=lehet, translation_key="placement", mode=selector.SelectSelectorMode.LIST))}))

    async def async_step_dashboard_none(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            self._b["pult"] = {"mod": "skip"}
            return await self._tovabb("dashboard")
        return self.async_show_form(step_id="dashboard_none", data_schema=vol.Schema({}), last_step=False, description_placeholders=LINKEK)

    async def async_step_dashboard_new(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            self._b["pult"] = {"mod": "new", "cim": str(user_input.get("title") or varazslo.t(self.hass, "pult_cim")).strip(),
                               "ikon": user_input.get("icon") or "mdi:radio"}
            return await self._tovabb("dashboard")
        return self.async_show_form(step_id="dashboard_new", last_step=False, data_schema=vol.Schema({
            vol.Required("title", default=varazslo.t(self.hass, "pult_cim")): selector.TextSelector(),
            vol.Optional("icon", default="mdi:radio"): selector.IconSelector(),
        }))

    async def async_step_dashboard_existing(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if not self._nezetek:
            self._nezetek = await varazslo.nezet_lehetosegek(self.hass)
        if user_input is not None:
            n = next((x for x in self._nezetek if x["ertek"] == user_input.get("view")), None)
            if n is None:
                return await self.async_step_dashboard()
            url, _, i = n["ertek"].rpartition("|")
            self._b["pult"] = {"mod": "yaml" if n["yaml"] else "existing", "url": url or None, "index": int(i), "pult": n["pult"], "nezet": n["nezet"]}
            if n["yaml"]:
                return await self.async_step_dashboard_yaml()
            return await self._tovabb("dashboard")
        opciok = [selector.SelectOptionDict(value=x["ertek"], label=x["felirat"]) for x in self._nezetek]
        return self.async_show_form(step_id="dashboard_existing", last_step=False, data_schema=vol.Schema({
            vol.Required("view", default=self._nezetek[0]["ertek"]): selector.SelectSelector(
                selector.SelectSelectorConfig(options=opciok, mode=selector.SelectSelectorMode.DROPDOWN))}))

    async def async_step_dashboard_yaml(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return await self._tovabb("dashboard")
        kartya = await self._kartya()
        return self.async_show_form(step_id="dashboard_yaml", data_schema=vol.Schema({}), last_step=False,
                                    description_placeholders={"yaml": f"```yaml\n{varazslo.kartya_yaml(kartya)}\n```"})

    async def _kartya(self) -> dict[str, Any]:
        """Az új kártya: a lehetőségekből futtatva az első meglévő kártya másolata a varázsló beállításaival (így a ⚙
        Mentés egy csoportként kezeli őket), különben új kártya."""
        b = self._kitoltott()
        alap = await varazslo.elso_kartya(self.hass) if self._opciok else None
        return varazslo.kartyara_ir(alap, b, {"hangszorok", "adok", "magno"}) if alap else varazslo.kartya_uj(b)

    def _kitoltott(self) -> dict[str, Any]:
        """A varázsló beállításai, a ki nem töltött részek az előválasztással (hangszórók) vagy üresen."""
        b = dict(self._b)
        if b["hangszorok"] is None:
            jel = self._jeloltek()
            elore = [x["entity_id"] for x in jel if x["elore"]]
            b["hangszorok"] = varazslo.hangszoro_lista(jel, elore, varazslo.alapertelmezett(jel, elore))
        b["adok"] = b["adok"] or []
        b["magno"] = b["magno"] or {}
        return b

    # ---- 8. összefoglaló ----

    async def async_step_summary(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None and self._osszegzes is not None:
            return self._befejez()
        if self._osszegzes is None:
            self._osszegzes = await self._vegrehajt()
        return self.async_show_form(step_id="summary", data_schema=vol.Schema({}), last_step=True, description_placeholders=self._osszegzes)

    async def _vegrehajt(self) -> dict[str, str]:
        """A választások végrehajtása (kártyák, vezérlőpult, TV-oldal); az összefoglaló sorai nyelvfüggetlen jelekkel
        (✅ beállítva, ⏭️ kihagyva, – nem változott, ⚠️ hiba) – a szöveg a fordításban van."""
        hass, b = self.hass, self._b
        OK, KI, NEM, HIBA = varazslo.OK, varazslo.KIHAGYVA, varazslo.VALTOZATLAN, varazslo.HIANY
        mezok = b["valtozott"] & {"hangszorok", "adok", "magno"}
        kb = self._kitoltott()
        p = b["pult"] or ({"mod": "skip"} if not self._opciok else None)
        sor = {k: NEM for k in ("speakers", "library", "radio", "tv", "voice", "dashboard", "cards")}
        # a lehetőségekből: a meglévő kártyák (az első kártya csoportja) megkapják a módosított részeket
        if self._opciok and mezok:
            try:
                mentve = await varazslo.kartyak_frissit(hass, lambda k: varazslo.kartyara_ir(k, kb, mezok))
                sor["cards"] = f"{OK} {', '.join(mentve)}" if mentve else f"{HIBA} 0"
            except Exception as err:  # noqa: BLE001
                _LOGGER.exception("Cantabile: writing the card settings failed")
                sor["cards"] = f"{HIBA} {err}"
        if p and p["mod"] in ("new", "existing"):
            try:
                kartya = await self._kartya()
                self._csoport = varazslo.lenyomat(kartya)
                if p["mod"] == "new":
                    url = varazslo.szabad_url(hass, varazslo.t(hass, "pult_url"))
                    pult = await varazslo.pult_letrehoz(hass, p["cim"], p["ikon"], url)
                    await pult.async_save({"title": p["cim"], "views": [varazslo.nezet_uj(p["cim"], kartya)]})
                    sor["dashboard"] = f"{OK} [{p['cim']}](/{url})"
                else:
                    pult = dict(varazslo.pultok(hass))[p["url"]]
                    cfg = await varazslo.pult_betolt(pult)
                    await pult.async_save(varazslo.kartya_nezetbe(cfg or {}, p["index"], kartya))
                    sor["dashboard"] = f"{OK} [{p['pult']} › {p['nezet']}](/{p['url'] or 'lovelace'})"
            except Exception as err:  # noqa: BLE001
                _LOGGER.exception("Cantabile: creating the dashboard / adding the card failed")
                sor["dashboard"] = f"{HIBA} {err}"
        elif p and p["mod"] == "yaml":
            sor["dashboard"] = f"📋 YAML – {p['pult']} › {p['nezet']}"
        elif p and p["mod"] == "skip":
            sor["dashboard"] = KI
        # a Cast TV-oldal vezérlőpultja (egyszer)
        ereg = er.async_get(hass)
        castok = [c for c in b["tv"] if (e := ereg.async_get(c)) and e.platform == "cast"]
        tv_pult = ""
        if castok and "tv" in b["valtozott"] and varazslo.TV_PULT not in dict(varazslo.pultok(hass)):
            try:
                pult = await varazslo.pult_letrehoz(hass, "Cantabile TV", "mdi:television-play", varazslo.TV_PULT, oldalsav=False)
                await pult.async_save(varazslo.tv_pult_konfig())
                tv_pult = f" · 📺 [Cantabile TV](/{varazslo.TV_PULT}/{varazslo.TV_NEZET})"
            except Exception as err:  # noqa: BLE001
                _LOGGER.exception("Cantabile: creating the Cantabile TV dashboard failed")
                tv_pult = f" · {HIBA} Cantabile TV: {err}"
        # a beállítások (a lehetőségekből csak a módosított részek; a többi „–”)
        osszes = not self._opciok
        if osszes or "hangszorok" in b["valtozott"]:
            h = kb["hangszorok"]
            sor["speakers"] = f"{OK} " + ", ".join(("★ " if i == 0 else "") + str(x.get("nev") or x.get("entity")) for i, x in enumerate(h)) if h else KI
        if osszes or "magno" in b["valtozott"]:
            m = kb["magno"]
            sor["library"] = (f"{OK} `{m['nas']}`" + (f" · 48 kHz: `{m['hires']}`" if m.get("hires") else "")
                              + (f" · ⬆ `{m['feltoltes']}`" if m.get("feltoltes") else "")) if m.get("nas") else KI
        if osszes or "adok" in b["valtozott"]:
            sor["radio"] = f"{OK} {len(kb['adok'])}: " + ", ".join(str(a.get("rovid") or a.get("nev")) for a in kb["adok"]) if kb["adok"] else KI
        if osszes or "tv" in b["valtozott"]:
            sor["tv"] = (f"{OK} " + ", ".join(self._nev(c) for c in b["tv"]) + tv_pult) if b["tv"] else KI
        if osszes or "llm_api" in b["valtozott"]:
            sor["voice"] = OK if b["llm_api"] else "❌"
        return {**LINKEK, **sor}

    def _tv_utemez(self) -> None:
        """Az új TV-lejátszók a kártyára (a bejegyzés betöltése / újratöltése után, a háttérben)."""
        ujak = [c for c in self._b["tv"] if c not in self._b["regi_tv"]]
        if ujak and (self._csoport or self._van_kartya):
            self.hass.async_create_background_task(varazslo.tv_kartyara(self.hass, ujak, self._csoport), name="cantabile_tv_kartyara")

    def _befejez(self) -> ConfigFlowResult:
        raise NotImplementedError


class CantabileConfigFlow(_Varazslo, ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """1. Üdvözlés: mi kerül beállításra, mi választható."""
        if not hasattr(self, "_b"):
            self._b_init()
        if user_input is not None:
            return await self.async_step_speakers()
        return self.async_show_form(step_id="user", data_schema=vol.Schema({}), last_step=False, description_placeholders=LINKEK)

    def _befejez(self) -> ConfigFlowResult:
        self._tv_utemez()
        return self.async_create_entry(title="Cantabile", data={},
                                       options={CONF_LLM_API: self._b["llm_api"], CONF_TV_PLAYERS: list(self._b["tv"])})

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return CantabileOptionsFlow()


class CantabileOptionsFlow(_Varazslo, OptionsFlow):
    _opciok = True

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return self.async_show_menu(step_id="init", menu_options=["settings", "wizard"])

    async def async_step_wizard(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """A varázsló menüje: végig (üdvözléstől), vagy egy-egy lépés; az összefoglaló menti és befejezi."""
        if not hasattr(self, "_b"):
            self._b_init(await varazslo.elso_kartya(self.hass), dict(self.config_entry.options))
        self._linearis = False
        return self.async_show_menu(step_id="wizard", menu_options=["welcome", *SORREND])

    async def async_step_welcome(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            self._linearis = True
            return await self.async_step_speakers()
        return self.async_show_form(step_id="welcome", data_schema=vol.Schema({}), last_step=False, description_placeholders=LINKEK)

    def _befejez(self) -> ConfigFlowResult:
        self._tv_utemez()
        return self.async_create_entry(data={**self.config_entry.options, CONF_LLM_API: self._b["llm_api"], CONF_TV_PLAYERS: list(self._b["tv"])})

    async def async_step_settings(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """A régi lehetőségek űrlapja (Assist-eszköz, halkítás, TV-lejátszók, Spotify / Tidal kulcsok)."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        o = self.config_entry.options
        return self.async_show_form(
            step_id="settings",
            data_schema=vol.Schema({
                vol.Required(CONF_LLM_API, default=o.get(CONF_LLM_API, True)): bool,
                vol.Optional(CONF_DUCK_SOURCES, default=o.get(CONF_DUCK_SOURCES, [])): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain=["assist_satellite", "media_player"], multiple=True)
                ),
                vol.Required(CONF_DUCK_LEVEL, default=o.get(CONF_DUCK_LEVEL, DUCK_LEVEL_DEFAULT)): selector.NumberSelector(
                    selector.NumberSelectorConfig(min=0, max=100, step=5, unit_of_measurement="%", mode=selector.NumberSelectorMode.SLIDER)
                ),
                vol.Optional(CONF_TV_PLAYERS, default=o.get(CONF_TV_PLAYERS, [])): selector.EntitySelector(
                    selector.EntitySelectorConfig(multiple=True, filter=[
                        selector.EntityFilterSelectorConfig(domain="media_player", integration="cast"),
                        selector.EntityFilterSelectorConfig(domain="media_player", integration="dlna_dmr"),
                    ])
                ),
                vol.Optional(CONF_SPOTIFY_ID, description={"suggested_value": o.get(CONF_SPOTIFY_ID)}): selector.TextSelector(),
                vol.Optional(CONF_SPOTIFY_SECRET, description={"suggested_value": o.get(CONF_SPOTIFY_SECRET)}): selector.TextSelector(
                    selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD)
                ),
                vol.Optional(CONF_TIDAL_ID, description={"suggested_value": o.get(CONF_TIDAL_ID)}): selector.TextSelector(),
                vol.Optional(CONF_TIDAL_SECRET, description={"suggested_value": o.get(CONF_TIDAL_SECRET)}): selector.TextSelector(
                    selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD)
                ),
            }),
        )
