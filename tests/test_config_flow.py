"""A beállítás-varázsló folyamata (config_flow.py): felvétel lépésről lépésre, a lehetőségek menüje, a régi űrlap –
futó HA nélkül, kitalált hass-szal és vezérlőpultokkal."""

import asyncio
import copy
from types import SimpleNamespace

import pytest

from custom_components.cantabile import config_flow as CF
from custom_components.cantabile import varazslo as V

from .test_varazslo import ANGOL, Pult, _mp

RB = [{"id": f"uuid{i}", "nev": n, "url": f"http://radio/{i}", "info": "MP3 128 kbps"}
      for i, n in enumerate(["Retro Rádió", "Rádió 1", "Klubrádió 95,3", "Petőfi Rádió", "Kossuth Rádió", "Bartók Rádió",
                             "Dankó Rádió", "Inforádió", "Sláger FM", "Rock FM", "Jazzy", "Best FM", "MegaDance"])]


def _hass(tmp_path, pultok=None, lejatszok=None, nyelv="hu"):
    zene = tmp_path / "zene"
    for e in ("Abba", "Queen"):
        (zene / "Music" / e / "Album").mkdir(parents=True)
        (zene / "Music" / e / "Album" / "01.mp3").write_text("")
    (zene / "Music" / "Hi-Res 48kHz").mkdir()
    allapotok = {x["entity_id"]: SimpleNamespace(attributes={"friendly_name": x["nev"]}) for x in lejatszok or []}
    hatter = []
    hass = SimpleNamespace(
        config=SimpleNamespace(language=nyelv, country="HU", media_dirs={"local": str(zene)}),
        data={"lovelace": SimpleNamespace(dashboards=pultok if pultok is not None else {}), "websocket_api": {}},
        states=SimpleNamespace(get=allapotok.get),
        hatter=hatter,
    )

    async def executor(fn, *a):
        return fn(*a)

    def background(coro, name=None):
        hatter.append(name)
        coro.close()

    hass.async_add_executor_job = executor
    hass.async_create_background_task = background
    return hass


@pytest.fixture
def kornyezet(monkeypatch):
    """A felderítés kitalált eredménye: hangszórók, adók, TV-feltételek, ügynökök; a dashboards gyűjtemény."""
    lejatszok = [_mp("media_player.nappali", "sonos", "Nappali"), _mp("media_player.wiim", "wiim", "WiiM Mini"),
                 _mp("media_player.tv", "cast", "Nappali TV", model="Google Chromecast")]
    allapot = {"jel": V.osztalyoz(lejatszok), "rb": RB, "letrehozott": [], "platform": {"media_player.tv": "cast"}}
    monkeypatch.setattr(V, "hangszorok", lambda hass: copy.deepcopy(allapot["jel"]))

    async def adok(hass):
        if isinstance(allapot["rb"], Exception):
            raise allapot["rb"]
        return allapot["rb"]

    async def feltetel(hass):
        return {"https": None, "belso": "http://192.168.1.10:8123", "ffmpeg": True}

    monkeypatch.setattr(V, "nepszeru_adok", adok)
    monkeypatch.setattr(V, "tv_feltetelek", feltetel)
    monkeypatch.setattr(V, "ugynokok", lambda hass: ["Google Gemini"])
    reg = SimpleNamespace(async_get=lambda e: SimpleNamespace(platform=allapot["platform"][e]) if e in allapot["platform"] else None)
    monkeypatch.setattr(CF.er, "async_get", lambda hass: reg)

    def gyujtemeny(hass):
        class G:
            async def async_create_item(self, adat):
                allapot["letrehozott"].append(adat)
                hass.data["lovelace"].dashboards[adat["url_path"]] = Pult(None, title=adat["title"])
        return G()

    monkeypatch.setattr(V, "_gyujtemeny", gyujtemeny)
    allapot["lejatszok"] = lejatszok
    return allapot


def _flow(cls, hass, **kw):
    f = cls()
    f.hass, f.flow_id, f.context = hass, "f1", {"source": "user"}
    f.handler = kw.get("handler", "cantabile")
    return f


def run(c):
    return asyncio.run(c)


def test_felvetel_vegig_uj_vezerlopulttal(tmp_path, kornyezet):
    hass = _hass(tmp_path, {"lovelace": Pult({"views": [{"cards": []}]}, title="Áttekintés")}, kornyezet["lejatszok"])
    f = _flow(CF.CantabileConfigFlow, hass)
    r = run(f.async_step_user())
    assert (r["type"], r["step_id"], r["last_step"]) == ("form", "user", False)
    r = run(f.async_step_user({}))
    assert r["step_id"] == "speakers"
    mezok = {str(k): k for k in r["data_schema"].schema}
    assert mezok["speakers"].default() == ["media_player.nappali", "media_player.wiim"]        # a TV nincs előválasztva
    assert mezok["default_speaker"].description == {"suggested_value": "media_player.nappali"}
    assert r["description_placeholders"]["groups"] == "Sonos: 1 · WiiM: 1 · Google Cast: 1"
    r = run(f.async_step_speakers({"speakers": ["media_player.nappali"], "default_speaker": "media_player.wiim"}))
    assert r["step_id"] == "library"
    mezok = {str(k): k for k in r["data_schema"].schema}
    assert mezok["media_folder"].description == {"suggested_value": "media-source://media_source/local/Music"}
    assert mezok["hires_folder"].description == {"suggested_value": "Hi-Res 48kHz"}
    assert mezok["upload_folder"].description == {"suggested_value": "Cantabile"}
    r = run(f.async_step_library({"media_folder": "/media/Music"}))
    assert r["errors"] == {"media_folder": "folder_invalid"}
    r = run(f.async_step_library({"media_folder": "media-source://media_source/local/Music", "hires_folder": "Nincs"}))
    assert r["errors"] == {"hires_folder": "hires_not_found"}
    r = run(f.async_step_library({"media_folder": "media-source://media_source/local/Music", "hires_folder": "Hi-Res 48kHz", "upload_folder": "Cantabile"}))
    assert r["step_id"] == "radio"
    mezok = {str(k): k for k in r["data_schema"].schema}
    assert mezok["stations"].default() == [a["id"] for a in RB[:6]]
    r = run(f.async_step_radio({"stations": [a["id"] for a in RB]}))                       # 13 > 12
    assert r["errors"] == {"stations": "too_many_stations"}
    r = run(f.async_step_radio({"stations": ["uuid2", "uuid0"]}))
    assert r["step_id"] == "tv"
    mezok = {str(k): k for k in r["data_schema"].schema}
    assert mezok["tv_players"].default() == ["media_player.tv"]                               # egyértelműen TV
    assert r["description_placeholders"]["https_mark"] == V.HIANY and r["description_placeholders"]["internal_mark"] == V.OK
    r = run(f.async_step_tv({"tv_players": ["media_player.tv"]}))
    assert r["step_id"] == "voice" and "Google Gemini" in r["description_placeholders"]["agents"]
    r = run(f.async_step_voice({"llm_api": False}))
    assert r["step_id"] == "dashboard"
    r = run(f.async_step_dashboard({"placement": "new"}))
    assert r["step_id"] == "dashboard_new"
    r = run(f.async_step_dashboard_new({"title": "Zene", "icon": "mdi:radio"}))
    assert (r["step_id"], r["last_step"]) == ("summary", True)
    ph = r["description_placeholders"]
    assert ph["dashboard"] == "✅ [Zene](/cantabile-zene)"
    assert ph["speakers"] == "✅ ★ WiiM Mini, Nappali" and ph["voice"] == "❌"
    assert ph["library"].startswith("✅ `media-source://media_source/local/Music` · 48 kHz: `Hi-Res 48kHz`")
    assert ph["radio"] == "✅ 2: Klubrádió, Retro Rádió"
    assert "📺 [Cantabile TV](/cantabile-tv/tv)" in ph["tv"]
    # a vezérlőpultok: az oldalsávos „Zene” és a rejtett Cast TV-oldal
    assert [(x["url_path"], x["show_in_sidebar"], x.get("icon")) for x in kornyezet["letrehozott"]] == [
        ("cantabile-zene", True, "mdi:radio"), ("cantabile-tv", False, "mdi:television-play")]
    zene = hass.data["lovelace"].dashboards["cantabile-zene"].cfg
    kartya = zene["views"][0]["cards"][0]
    assert zene["views"][0]["panel"] is True
    assert kartya == {
        "type": "custom:cantabile-card",
        "speakers": [{"name": "WiiM Mini", "entity": "media_player.wiim", "mode": "url", "short": "WiiM"},
                     {"name": "Nappali", "entity": "media_player.nappali", "mode": "sonos"}],
        "stations": [{"name": "Klubrádió 95,3", "url": "http://radio/2", "frequency": 95.3, "short": "Klubrádió"},
                     {"name": "Retro Rádió", "url": "http://radio/0"}],
        "tape": {"media_folder": "media-source://media_source/local/Music", "hires_folder": "Hi-Res 48kHz", "upload_folder": "Cantabile"},
    }
    assert hass.data["lovelace"].dashboards["cantabile-tv"].cfg == V.tv_pult_konfig()
    assert hass.data["lovelace"].dashboards["lovelace"].mentve == []                          # a meglévő pult érintetlen
    r = run(f.async_step_summary({}))
    assert r["type"] == "create_entry" and r["title"] == "Cantabile" and r["data"] == {}
    assert r["options"] == {"llm_api": False, "tv_players": ["media_player.tv"]}
    assert hass.hatter == ["cantabile_tv_kartyara"]                                            # a TV-lejátszók a kártyára


def test_felvetel_kihagyasokkal_offline(tmp_path, kornyezet):
    kornyezet["jel"] = []
    kornyezet["rb"] = OSError("offline")
    hass = _hass(tmp_path)
    hass.config.media_dirs = {}
    f = _flow(CF.CantabileConfigFlow, hass)
    run(f.async_step_user())
    r = run(f.async_step_user({}))
    assert r["step_id"] == "speakers_none" and r["description_placeholders"]["integrations_url"] == "/config/integrations/dashboard"
    r = run(f.async_step_speakers_none({}))
    assert r["step_id"] == "library" and r["description_placeholders"]["found"] == "–"
    r = run(f.async_step_library({}))
    assert r["step_id"] == "radio_offline"
    r = run(f.async_step_radio_offline({}))
    assert r["step_id"] == "tv_none"
    r = run(f.async_step_tv_none({}))
    assert r["step_id"] == "voice" and r["description_placeholders"]["agents"] == "- Google Gemini"
    r = run(f.async_step_voice({"llm_api": True}))
    assert r["step_id"] == "dashboard_none"                                                    # hangszóró nélkül nincs kártya
    r = run(f.async_step_dashboard_none({}))
    ph = r["description_placeholders"]
    assert {ph[k] for k in ("speakers", "library", "radio", "tv", "dashboard")} == {V.KIHAGYVA}
    assert kornyezet["letrehozott"] == []
    r = run(f.async_step_summary({}))
    assert r["options"] == {"llm_api": True, "tv_players": []} and hass.hatter == []


def test_vezerlopult_meglevo_nezet_nelkul_csak_uj_vagy_semmi(tmp_path, kornyezet):
    f = _flow(CF.CantabileConfigFlow, _hass(tmp_path, {}, kornyezet["lejatszok"]))
    run(f.async_step_user())
    r = run(f.async_step_dashboard())
    assert r["data_schema"].schema["placement"].config["options"] == ["new", "skip"]


def test_felvetel_meglevo_es_yaml_vezerlopult(tmp_path, kornyezet):
    pultok = {"lovelace": Pult({"views": [{"title": "Otthon", "type": "sections", "sections": []}]}, title="Áttekintés"),
              "yaml-pult": Pult({"views": [{"title": "Y", "cards": []}]}, mode="yaml", title="Fali")}
    hass = _hass(tmp_path, pultok, kornyezet["lejatszok"])
    f = _flow(CF.CantabileConfigFlow, hass)
    run(f.async_step_user())
    f._b.update(hangszorok=[{"nev": "Nappali", "entity": "media_player.nappali", "mod": "sonos"}], adok=[], magno={})
    r = run(f.async_step_dashboard({"placement": "existing"}))
    assert r["step_id"] == "dashboard_existing"
    opciok = [(o["value"], o["label"]) for o in r["data_schema"].schema["view"].config["options"]]
    assert opciok == [("lovelace|0", "Áttekintés › Otthon"), ("yaml-pult|0", "Fali › Y (YAML)")]
    r = run(f.async_step_dashboard_existing({"view": "yaml-pult|0"}))
    assert r["step_id"] == "dashboard_yaml" and "type: custom:cantabile-card" in r["description_placeholders"]["yaml"]
    r = run(f.async_step_dashboard_yaml({}))
    assert r["step_id"] == "summary" and r["description_placeholders"]["dashboard"].startswith("📋 YAML")
    assert pultok["yaml-pult"].mentve == []
    # meglévő tárolós pult: új szekció a kártyával
    f2 = _flow(CF.CantabileConfigFlow, hass)
    run(f2.async_step_user())
    f2._b.update(hangszorok=[{"nev": "Nappali", "entity": "media_player.nappali", "mod": "sonos"}], adok=[], magno={})
    run(f2.async_step_dashboard({"placement": "existing"}))
    r = run(f2.async_step_dashboard_existing({"view": "lovelace|0"}))
    assert r["description_placeholders"]["dashboard"] == "✅ [Áttekintés › Otthon](/lovelace)"
    szekcio = pultok["lovelace"].cfg["views"][0]["sections"][-1]
    assert szekcio["cards"][0]["speakers"][0]["entity"] == "media_player.nappali"


def _opcio_flow(hass, opciok):
    bejegyzes = SimpleNamespace(entry_id="E1", options=opciok)
    hass.config_entries = SimpleNamespace(async_get_known_entry=lambda eid: bejegyzes)
    return _flow(CF.CantabileOptionsFlow, hass, handler="E1")


REGI_OPCIOK = {"llm_api": True, "duck_sources": ["assist_satellite.konyha"], "duck_level": 30, "tv_players": [],
               "spotify_client_id": "abc", "spotify_client_secret": "titok"}


def test_lehetosegek_regi_urlap_valtozatlan(tmp_path, kornyezet):
    """2.5.0-ról frissítve: a lehetőségek menüjében a régi űrlap ugyanazokkal a mezőkkel és értékekkel."""
    f = _opcio_flow(_hass(tmp_path), dict(REGI_OPCIOK))
    r = run(f.async_step_init())
    assert r["type"] == "menu" and r["menu_options"] == ["settings", "wizard"]
    r = run(f.async_step_settings())
    mezok = {str(k): k for k in r["data_schema"].schema}
    assert set(mezok) == {"llm_api", "duck_sources", "duck_level", "tv_players", "spotify_client_id", "spotify_client_secret",
                          "tidal_client_id", "tidal_client_secret"}
    assert mezok["duck_level"].default() == 30 and mezok["duck_sources"].default() == ["assist_satellite.konyha"]
    assert mezok["spotify_client_secret"].description == {"suggested_value": "titok"}
    r = run(f.async_step_settings(dict(REGI_OPCIOK)))
    assert r["type"] == "create_entry" and r["data"] == REGI_OPCIOK


def test_lehetosegek_varazslo_lepesenkent(tmp_path, kornyezet):
    tablet = Pult({"views": [{"cards": [copy.deepcopy(ANGOL)]}]}, title="Tablet")
    mobil = Pult({"views": [{"cards": [copy.deepcopy(ANGOL)]}]}, title="Mobil")
    hass = _hass(tmp_path, {"lovelace": tablet, "mobil": mobil}, kornyezet["lejatszok"])
    f = _opcio_flow(hass, dict(REGI_OPCIOK))
    r = run(f.async_step_wizard())
    assert r["type"] == "menu" and r["menu_options"] == ["welcome", "speakers", "library", "radio", "tv", "voice", "dashboard", "summary"]
    # a kártya mostani hangszórói az előválasztás; egy lépés után vissza a menübe
    r = run(f.async_step_speakers())
    assert {str(k): k for k in r["data_schema"].schema}["speakers"].default() == ["media_player.nappali"]
    r = run(f.async_step_speakers({"speakers": ["media_player.nappali", "media_player.wiim"], "default_speaker": "media_player.nappali"}))
    assert r["type"] == "menu" and r["step_id"] == "wizard"
    # rádió: a kártyán lévő adó elöl, kipipálva
    r = run(f.async_step_radio())
    assert {str(k): k for k in r["data_schema"].schema}["stations"].default() == ["kartya:https://a/petofi.mp3"]
    r = run(f.async_step_dashboard())
    assert {str(k): k for k in r["data_schema"].schema}["placement"].default() == "skip"                            # van már kártya
    r = run(f.async_step_summary())
    ph = r["description_placeholders"]
    assert ph["cards"] == "✅ Tablet, Mobil" and ph["speakers"] == "✅ ★ Nappali, WiiM Mini"
    assert ph["radio"] == ph["library"] == ph["tv"] == ph["voice"] == "–"
    for p in (tablet, mobil):
        k = p.cfg["views"][0]["cards"][0]
        assert [h["entity"] for h in k["speakers"]] == ["media_player.nappali", "media_player.wiim"]
        assert k["speakers"][0] == ANGOL["speakers"][0]                                         # a meglévő bejegyzés változatlan
        assert k["brand"] == "Technics" and k["stations"] == ANGOL["stations"] and k["tape"] == ANGOL["tape"]
    r = run(f.async_step_summary({}))
    assert r["type"] == "create_entry" and r["data"] == REGI_OPCIOK                              # a többi lehetőség megmarad


def test_lehetosegek_teljes_varazslo_uj_kartya_masolattal(tmp_path, kornyezet):
    tablet = Pult({"views": [{"cards": [copy.deepcopy(ANGOL)]}, {"title": "Üres", "cards": []}]}, title="Tablet")
    hass = _hass(tmp_path, {"lovelace": tablet}, kornyezet["lejatszok"])
    f = _opcio_flow(hass, {"llm_api": True, "tv_players": []})
    run(f.async_step_wizard())
    r = run(f.async_step_welcome({}))
    assert r["step_id"] == "speakers"
    r = run(f.async_step_speakers({"speakers": ["media_player.nappali"], "default_speaker": "media_player.nappali"}))
    r = run(f.async_step_library({"media_folder": "media-source://media_source/local/Music"}))
    r = run(f.async_step_radio({"stations": ["kartya:https://a/petofi.mp3"]}))
    r = run(f.async_step_tv({"tv_players": []}))
    r = run(f.async_step_voice({"llm_api": True}))
    r = run(f.async_step_dashboard({"placement": "existing"}))
    r = run(f.async_step_dashboard_existing({"view": "lovelace|1"}))
    assert r["step_id"] == "summary"
    kartyak = tablet.cfg["views"]
    uj, regi = kartyak[1]["cards"][0], kartyak[0]["cards"][0]
    assert uj == regi and uj["brand"] == "Technics"                                             # ugyanaz a csoport (⚙ Mentés)
    assert uj["tape"]["media_folder"] == "media-source://media_source/local/Music" and "hires_folder" not in uj["tape"]


def test_forditasok_teljesek():
    """A magyar és az angol fordítás ugyanazokat a kulcsokat és helyőrzőket tartalmazza, és minden lépésnek van szövege."""
    import json
    import re
    from pathlib import Path

    d = Path(CF.__file__).parent / "translations"
    hu, en = (json.loads((d / f"{n}.json").read_text(encoding="utf-8")) for n in ("hu", "en"))

    def lapos(o, p=""):
        if isinstance(o, dict):
            for k, v in o.items():
                yield from lapos(v, f"{p}.{k}" if p else k)
        else:
            yield p, o

    lh, le = dict(lapos(hu)), dict(lapos(en))
    assert set(lh) == set(le)
    for k in lh:
        assert set(re.findall(r"\{(\w+)\}", lh[k])) == set(re.findall(r"\{(\w+)\}", le[k])), k
        assert not re.search(r"https?://", lh[k] + le[k]), k                                  # hassfest: link helyőrzőben
    def lepesek(*osztalyok):
        return {m[len("async_step_"):] for o in osztalyok for m in vars(o) if m.startswith("async_step_")}

    for lepes in lepesek(CF._Varazslo, CF.CantabileConfigFlow):
        assert f"config.step.{lepes}.title" in le, lepes
    for lepes in lepesek(CF._Varazslo, CF.CantabileOptionsFlow):
        assert f"options.step.{lepes}.title" in le, lepes
    for o in ("new", "existing", "skip"):
        assert f"selector.placement.options.{o}" in le
