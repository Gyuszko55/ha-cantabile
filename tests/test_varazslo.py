"""A beállítás-varázsló felderítő és kártyaíró függvényei (varazslo.py) – futó HA nélkül, kitalált adatokkal."""

import asyncio
import copy
import os
from types import SimpleNamespace

import pytest

from custom_components.cantabile import varazslo as V


def _mp(eid, platform, nev, features=V.PLAY_MEDIA | 4, **kw):
    return {"entity_id": eid, "platform": platform, "nev": nev, "features": features, **kw}


# ---- hangszórók ----


def test_rovid_nevek_kozos_szo_kimarad_es_egyedi():
    assert V.rovid_nevek(["Sonos Nappali", "Sonos Konyha"]) == ["Nappali", "Konyha"]
    assert V.rovid_nevek(["Living Room Speaker", "Kitchen Speaker"]) == ["Living", "Kitchen"]
    # a rövid név legfeljebb 8 karakter; ami elfér, nem kap rövid nevet
    ki = V.rovid_nevek(["WiiM Mini", "Iroda", "Hálószoba hangszóró"])
    assert ki[0] == "WiiM" and ki[1] is None and len(ki[2]) <= 8
    # ütközés: az első szó nélkül, végül sorszámmal
    assert V.rovid_nevek(["Kitchen Speaker A", "Kitchen Speaker B"], {"Kitchen"}) == ["A", "B"]
    assert V.rovid_nevek(["Nappali TV"], {"Nappali"}) == ["TV"]
    assert V.rovid_nevek(["Nappali Sonos", "Nappali Sonos"], set()) == ["Nappali", "Sonos"]
    assert V.rovid_nevek(["Hálószobaszekrény"], {"Hálószob"}) == ["Hálószo2"]
    assert all(len(x) <= V.NEV_MAX for x in V.rovid_nevek(["Egészenhosszúnévvagyok", "Másikhosszúnevűeszköz"]) if x)


def test_kepernyos():
    assert V.kepernyos("cast", "Google Chromecast Nappali TV", None)
    assert V.kepernyos("cast", "Google Nest Hub Konyha", None)
    assert not V.kepernyos("cast", "Google Nest Mini Konyha", None)
    assert not V.kepernyos("cast", "Google Chromecast Audio Iroda", None)
    assert V.kepernyos("dlna_dmr", "Samsung Living room TV", None)
    assert V.kepernyos("sonos", "Arc", "tv")
    assert V.kepernyos("webostv", "LG", None)
    assert not V.kepernyos("sonos", "Sonos One Nappali", None)


def test_osztalyoz_elovalasztas():
    ki = V.osztalyoz([
        _mp("media_player.tv", "cast", "Nappali TV", model="Google Chromecast", eszkoz="c1", eszkoznev="Nappali TV"),
        _mp("media_player.mini", "cast", "Konyha", model="Google Nest Mini", eszkoz="c2", eszkoznev="Konyha"),
        _mp("media_player.csoport", "cast", "Mindenhol", model="Google Cast Group", eszkoz="c3", eszkoznev="Mindenhol"),
        _mp("media_player.nappali", "sonos", "Nappali", eszkoz="d1"),
        _mp("media_player.wiim", "wiim", "WiiM Mini", eszkoz="d2", eszkoznev="WiiM Mini"),
        _mp("media_player.wiim_dlna", "dlna_dmr", "WiiM Mini", eszkoz="d3", eszkoznev="WiiM Mini"),
        _mp("media_player.lg", "webostv", "LG TV", eszkoz="d4"),
        _mp("media_player.spotify", "spotify", "Spotify", eszkoz="d5", features=4),
        _mp("media_player.nem_jatszik", "squeezebox", "Régi", features=4, eszkoz="d6"),
        _mp("media_player.cantabile_tv", "cantabile", "TV · Nappali", eszkoz="d7"),
    ])
    e = {x["entity_id"]: x for x in ki}
    assert "media_player.cantabile_tv" not in e                      # a saját lejátszók kimaradnak
    assert e["media_player.nappali"]["elore"] and e["media_player.nappali"]["mod"] == "sonos"
    assert e["media_player.wiim"]["elore"] and e["media_player.wiim"]["mod"] == "url"
    assert e["media_player.mini"]["elore"]
    assert not e["media_player.tv"]["elore"] and e["media_player.tv"]["kepernyo"]
    assert not e["media_player.csoport"]["elore"]                     # Cast-csoport
    # ugyanaz a készülék DLNA-n: nem külön sor, hanem a WiiM tartalék útja
    assert "media_player.wiim_dlna" not in e
    assert [u["entity_id"] for u in e["media_player.wiim"]["utak"]] == ["media_player.wiim_dlna"]
    assert not e["media_player.lg"]["elore"]
    # semmilyen úton nem fogad zenét: nem hangszóró
    assert "media_player.spotify" not in e and "media_player.nem_jatszik" not in e
    # sorrend: Sonos, WiiM, …, Google Cast, majd az egyéb integrációk
    assert [x["platform"] for x in ki][:2] == ["sonos", "wiim"]
    assert ki[-1]["platform"] not in V.CSOPORTOK


def test_osztalyoz_ismeretlen_integracioknal_is_van_elovalasztas():
    ki = V.osztalyoz([_mp("media_player.a", "demo", "Kitchen", eszkoz="a"), _mp("media_player.tv", "demo", "Lounge", device_class="tv", eszkoz="b"),
                      _mp("media_player.p", "plex", "Plex", eszkoz="c")])
    assert [x["entity_id"] for x in ki if x["elore"]] == ["media_player.a"]


def _valodi():
    """Egy valódi telepítés lejátszói (2026-11): minden saját lejátszó mellett a Music Assistanté, külön HA-eszközön."""
    M = V.MA
    return [
        _mp("media_player.haloszoba_tv", "sonos", "Hálószoba", eszkoz="s1", eszkoznev="Hálószoba", mac=["54:2a:1b:58:71:9a"]),
        _mp("media_player.haloszoba", M, "Hálószoba", eszkoz="m1", eszkoznev="Hálószoba"),
        _mp("media_player.szonosz", "sonos", "Nappali", eszkoz="s2", eszkoznev="Nappali", mac=["54:2a:1b:65:1f:40"]),
        _mp("media_player.nappali", M, "Nappali", eszkoz="m2", eszkoznev="Nappali"),
        _mp("media_player.wiim_mini_a16a_4", "wiim", "WiiM Mini", eszkoz="w1", eszkoznev="WiiM Mini-A16A"),
        _mp("media_player.wiim_mini_a16a", M, "WiiM Mini", eszkoz="m3", eszkoznev="WiiM Mini-A16A"),
        # SmartBox: Cast + Android TV Remote (külön HA-eszköz, a név köti össze) + MA
        _mp("media_player.smartbox", "cast", "SmartBox", eszkoz="c1", eszkoznev="SmartBox"),
        _mp("media_player.smartbox_2", "androidtv_remote", "SmartBox", eszkoz="a1", eszkoznev="SmartBox", mac=["b0:2e:ba:7e:13:c1"]),
        _mp("media_player.smartbox_3", M, "SmartBox", eszkoz="m4", eszkoznev="SmartBox"),
        # Samsung TV: a saját és a DLNA-lejátszója más néven, de ugyanazzal a MAC-címmel; a DLNA most nem elérhető
        _mp("media_player.samsung_7_series_43", "samsungtv", "Samsung 7 Series (43)", eszkoz="t1", eszkoznev="Samsung 7 Series (43)",
            mac=["24:fc:e5:de:7a:c0"], device_class="tv"),
        _mp("media_player.nappali_tv", "dlna_dmr", "Nappali TV", eszkoz="t2", eszkoznev="[TV] Samsung 7 Series (43)",
            mac=["24:fc:e5:de:7a:c0"], features=0),
        _mp("media_player.samsung_7_series_43_2", M, "Samsung 7 Series (43)", eszkoz="m5", eszkoznev="Samsung 7 Series (43)"),
        _mp("media_player.voice", "esphome", "Home Assistant Voice", eszkoz="e1", eszkoznev="Home Assistant Voice 093239"),
        _mp("media_player.voice_ma", M, "Home Assistant Voice", eszkoz="m6", eszkoznev="Home Assistant Voice 093239"),
        _mp("media_player.fali_tablet", "fully_kiosk", "Fali tablet", eszkoz="f1", eszkoznev="Npad Pro"),
        _mp("media_player.browser_mod_1", "browser_mod", "browser_mod_1", eszkoz="b1", eszkoznev="browser_mod_1"),
        _mp("media_player.cantabile_tv_smartbox", "cantabile", "TV · SmartBox", eszkoz="x1", eszkoznev="Cantabile"),
        _mp("media_player.csak_ma", M, "Valami", eszkoz="m7", eszkoznev="Valami"),
        _mp("media_player.eszkoz_nelkul", "universal", "Univerzális"),
        _mp("media_player.spotify", "spotify", "Spotify Gyula", eszkoz="sp", eszkoznev="Spotify Gyula", features=4),
    ]


def test_keszulekenkent_egy_hangszoro_valodi_telepitesen():
    parok = {"media_player.haloszoba_tv": "media_player.haloszoba", "media_player.szonosz": "media_player.nappali"}
    ki = V.osztalyoz(_valodi(), parok)
    e = {x["entity_id"]: x for x in ki}
    assert set(e) == {"media_player.haloszoba_tv", "media_player.szonosz", "media_player.wiim_mini_a16a_4", "media_player.smartbox",
                      "media_player.nappali_tv", "media_player.voice"}
    # a fő út mindig a saját integráció, a Music Assistant a tartalék
    assert e["media_player.szonosz"]["ma"] == "media_player.nappali" and e["media_player.szonosz"]["mod"] == "sonos"
    assert e["media_player.wiim_mini_a16a_4"]["ma"] == "media_player.wiim_mini_a16a"           # név szerint párosítva
    # SmartBox: a Cast a fő (hangszóró-integráció), az Android TV Remote és az MA tartalék
    assert [u["entity_id"] for u in e["media_player.smartbox"]["utak"]] == ["media_player.smartbox_2", "media_player.smartbox_3"]
    # Samsung TV: MAC-cím köti össze; a DLNA a fő út (zenét fogad – kikapcsolt TV-nél sincs funkciója), a TV saját
    # lejátszója tartalék; képernyős
    tv = e["media_player.nappali_tv"]
    assert {u["entity_id"] for u in tv["utak"]} == {"media_player.samsung_7_series_43", "media_player.samsung_7_series_43_2"}
    assert tv["kepernyo"] and not tv["elore"]
    # a felirat a tartalék utakkal
    assert V.tartalek_felirat({"utak": [{"csoport": "Music Assistant", "platform": V.MA}]}) == " · tartalék: Music Assistant"
    assert V.tartalek_felirat({"utak": []}) == ""
    # térkép a kártyának
    t = V.terkep(ki)
    assert t["fo"]["media_player.nappali"] == "media_player.szonosz" and t["fo"]["media_player.smartbox_2"] == "media_player.smartbox"
    assert t["ma"]["media_player.haloszoba_tv"] == "media_player.haloszoba"
    assert "media_player.fali_tablet" not in t["fo"] and "media_player.browser_mod_1" not in t["fo"]


def test_azonos_nevu_ket_hangszoro_nem_vonodik_ossze():
    ki = V.osztalyoz([_mp("media_player.a", "cast", "Google Home Mini", eszkoz="a", eszkoznev="Google Home Mini"),
                      _mp("media_player.b", "cast", "Google Home Mini", eszkoz="b", eszkoznev="Google Home Mini")])
    assert len(ki) == 2


def test_csak_ma_uton_jatszo_keszulek_is_hangszoro():
    # a saját lejátszó csak távirányítható, de a Music Assistant fogad zenét: a fő marad a saját, az MA a tartalék
    ki = V.osztalyoz([_mp("media_player.tv", "samsungtv", "TV", eszkoz="t", eszkoznev="TV", features=4),
                      _mp("media_player.tv_ma", V.MA, "TV", eszkoz="m", eszkoznev="TV")])
    assert [(x["entity_id"], x["ma"]) for x in ki] == [("media_player.tv", "media_player.tv_ma")]


def test_regi_kartya_atirasa_a_fo_lejatszora():
    fo = V.terkep(V.osztalyoz(_valodi(), {"media_player.szonosz": "media_player.nappali"}))["fo"]
    regi = [{"nev": "Nappali", "entity": "media_player.szonosz", "mod": "sonos"},
            {"nev": "WiiM", "entity": "media_player.wiim_mini_a16a_4"},
            {"nev": "WiiM MA", "entity": "media_player.wiim_mini_a16a"},                    # ugyanaz a készülék: kimarad
            {"nev": "Nappali MA", "entity": "media_player.nappali", "mod": "url"},          # a Sonos már fent: kimarad
            {"nev": "Box", "entity": "media_player.smartbox_2", "mod": "url", "rovid": "Box"},
            {"nev": "TV", "entity": "media_player.cantabile_tv_smartbox"}]                   # Cantabile TV: marad
    ki = V.regi_atir(regi, fo)
    assert [h["entity"] for h in ki] == ["media_player.szonosz", "media_player.wiim_mini_a16a_4", "media_player.smartbox",
                                         "media_player.cantabile_tv_smartbox"]
    assert ki[2] == {"nev": "Box", "entity": "media_player.smartbox", "rovid": "Box"}       # a típus újra a platformból
    assert V.regi_atir(None, fo) is None


def test_tv_jeloltek_a_masodlagos_cast_dlna_is():
    jel = V.osztalyoz(_valodi(), {})
    tv = {x["entity_id"] for x in V.tv_jeloltek(jel)}
    assert {"media_player.smartbox", "media_player.nappali_tv"} <= tv
    assert "media_player.samsung_7_series_43" not in tv


def test_alapertelmezett_es_hangszoro_lista():
    jel = V.osztalyoz([_mp("media_player.wiim", "wiim", "WiiM Mini", eszkoz="w"), _mp("media_player.nappali", "sonos", "Nappali Sonos One", eszkoz="n")])
    assert V.alapertelmezett(jel, ["media_player.wiim", "media_player.nappali"]) == "media_player.nappali"
    assert V.alapertelmezett(jel, ["media_player.wiim"]) == "media_player.wiim"
    assert V.alapertelmezett(jel, []) is None
    regi = [{"nev": "Iroda", "entity": "media_player.wiim", "mod": "url", "spotify_device": "Iroda WiiM"}]
    ki = V.hangszoro_lista(jel, ["media_player.wiim", "media_player.nappali"], "media_player.nappali", regi)
    assert [h["entity"] for h in ki] == ["media_player.nappali", "media_player.wiim"]     # az alapértelmezett elöl
    assert ki[1] == regi[0]                                                                  # a régi beállítás megmarad
    assert ki[0] == {"nev": "Nappali Sonos One", "entity": "media_player.nappali", "mod": "sonos", "rovid": "Nappali"}


# ---- zenemappa ----


def _fajl(ut, *nevek):
    os.makedirs(ut, exist_ok=True)
    for n in nevek:
        open(os.path.join(ut, n), "w").close()


def test_zenemappak_halozati_tarhely_almappakent(tmp_path):
    media = tmp_path / "media"
    for e in ("Abba", "Queen", "Zenekar"):
        _fajl(media / "Music" / e / "Album", "01 a.mp3", "02 b.flac", "cover.jpg")
    _fajl(media / "Music" / "Hi-Res 48kHz" / "Queen" / "Album [48kHz]", "01 a.flac")
    _fajl(media / "Music" / "Cantabile", "feltoltott.mp3")
    _fajl(media / "recordings", "kapu.mp4", "csengo.wav")
    _fajl(media / "frigate", "x.mp3")
    ki = V.zenemappak({"local": str(media)})
    assert ki[0]["id"] == "media-source://media_source/local/Music"
    assert ki[0]["hires"] == "Hi-Res 48kHz" and ki[0]["feltoltes"] == "Cantabile"
    ids = [x["id"] for x in ki]
    assert "media-source://media_source/local/recordings" not in ids     # a gyökér zenéjének kis része, nem zenés név
    assert not any("frigate" in i for i in ids)


def test_zenemappak_a_gyoker_a_zenetar(tmp_path):
    zene = tmp_path / "zene"
    for e in ("Rozsda Zenekar", "Duna Kórus", "Kelemen Kvartett"):
        _fajl(zene / e / "Album", "01 a.mp3", "02 b.mp3")
    ki = V.zenemappak({"local": str(zene), "nincs": str(tmp_path / "nincs")})
    assert [x["id"] for x in ki] == ["media-source://media_source/local"]  # az előadó-mappák nem külön jelöltek
    assert ki[0]["db"] == 6 and ki[0]["feltoltes"] is None


def test_zene_nev():
    assert V.zene_nev("Music") and V.zene_nev("NAS-Zene") and V.zene_nev("my_music")
    assert not V.zene_nev("Rozsda Zenekar") and not V.zene_nev("Fotók")


def test_helyi_ut(tmp_path):
    (tmp_path / "Music").mkdir()
    dirs = {"local": str(tmp_path)}
    assert V.helyi_ut(dirs, "media-source://media_source/local/Music") == os.path.realpath(tmp_path / "Music")
    assert V.helyi_ut(dirs, "media-source://media_source/local") == os.path.realpath(tmp_path)
    assert V.helyi_ut(dirs, "media-source://media_source/local/../../etc") is None
    assert V.helyi_ut(dirs, "media-source://dlna_dms/x") is None
    assert V.helyi_ut(dirs, "media-source://media_source/mas/x") is None


# ---- rádióadók ----


def test_adok_valogat():
    rb = [
        {"name": "Petőfi Rádió ", "url_resolved": "https://a/petofi.mp3", "stationuuid": "1", "codec": "MP3", "bitrate": 128},
        {"name": "petőfi rádió", "url_resolved": "https://b/petofi2.mp3", "stationuuid": "2"},           # név szerint ismétlődik
        {"name": "Nincs cím", "url": "", "stationuuid": "3"},
        {"name": "", "url": "http://x", "stationuuid": "4"},
        {"name": "Régi", "url": "rtsp://x", "stationuuid": "5"},
        {"name": "Klubrádió 95,3", "url": "http://k/radio.mp3", "stationuuid": "6", "codec": "UNKNOWN"},
        "szemét",
    ]
    ki = V.adok_valogat(rb)
    assert [a["id"] for a in ki] == ["1", "6"]
    assert ki[0] == {"id": "1", "nev": "Petőfi Rádió", "url": "https://a/petofi.mp3", "info": "MP3 128 kbps"}
    assert ki[1]["info"] == ""
    assert len(V.adok_valogat([{"name": f"A{i}", "url": f"http://a/{i}"} for i in range(50)], 30)) == 30
    assert V.adok_valogat(None) == []


def test_ado_rovid_es_frekvencia():
    assert V.ado_rovid("Retro Rádió") is None
    assert V.ado_rovid("Oxygen The 80s Hits") == "Oxygen 80s"
    assert V.ado_rovid("Rádió 1 - Budapest") == "Rádió 1"
    assert V.frekvencia("Klubrádió 95,3") == 95.3
    assert V.frekvencia("Best FM 99.5 Budapest") == 99.5
    assert V.frekvencia("Rádió 1") is None and V.frekvencia("Radio 2.0") is None and V.frekvencia("Rádió 120.5") is None
    assert V.frekvencia("J-WAVE 81.3", japan=True) == 81.3 and V.frekvencia("J-WAVE 81.3") is None


def test_ado_lista():
    regi = [{"nev": "Petőfi", "url": "https://a/petofi.mp3", "frekvencia": 94.8, "rovid": "P"}]
    ki = V.ado_lista([{"nev": "Petőfi Rádió", "url": "https://a/petofi.mp3"},
                      {"nev": "Klubrádió 95,3", "url": "http://k"},
                      {"nev": "Oxygen The 80s Hits", "url": "http://o80"},
                      {"nev": "Oxygen The 80s Hits!", "url": "http://o80b"}], regi)
    assert ki[0] == regi[0]                                   # a kártyán lévő adó beállítása megmarad
    assert ki[1] == {"nev": "Klubrádió 95,3", "url": "http://k", "frekvencia": 95.3, "rovid": "Klubrádió"}
    assert "rovid" not in ki[2] and "rovid" not in ki[3]      # azonos felirat két gombon: a teljes név marad


def test_nepszeru_adok_az_orszag_szerint(monkeypatch):
    from custom_components.cantabile import music

    kert = []

    async def rb(_hass, ut):
        kert.append(ut)
        return [{"name": "A", "url": "http://a"}]

    monkeypatch.setattr(music, "rb_kerdez", rb)
    asyncio.run(V.nepszeru_adok(SimpleNamespace(config=SimpleNamespace(country="hu"))))
    asyncio.run(V.nepszeru_adok(SimpleNamespace(config=SimpleNamespace(country=None))))
    assert kert[0].startswith("/json/stations/bycountrycodeexact/HU?order=clickcount&reverse=true")
    assert kert[1].startswith("/json/stations/topclick/")


# ---- a kártya beállításai ----

ANGOL = {"type": "custom:cantabile-card", "brand": "Technics", "finish": "black",
         "speakers": [{"name": "Nappali", "entity": "media_player.nappali", "mode": "sonos"}],
         "stations": [{"name": "Petőfi", "url": "https://a/petofi.mp3"}],
         "tape": {"media_folder": "media-source://media_source/local/Music", "display": "vfd", "hires_folder": "HR"}}
MAGYAR = {"type": "custom:cantabile-card", "marka": "Cantabile",
          "hangszorok": [{"nev": "Nappali", "entity": "media_player.nappali", "mod": "sonos"}],
          "adok": [{"nev": "Petőfi", "url": "https://a/petofi.mp3"}], "magno": {"nas": "media-source://media_source/local", "vu_kijelzo": "fluor"}}
BEALL = {"hangszorok": [{"nev": "Konyha", "entity": "media_player.konyha", "mod": "url"}],
         "adok": [{"nev": "Klubrádió 95,3", "url": "http://k", "frekvencia": 95.3, "rovid": "Klubrádió"}],
         "magno": {"nas": "media-source://media_source/local/NAS", "hires": "", "feltoltes": "Cantabile"}}


def test_kartyara_ir_megtartja_a_kulcsnyelvet_es_a_tobbi_kulcsot():
    a = V.kartyara_ir(ANGOL, BEALL, {"hangszorok", "adok", "magno"})
    assert a["brand"] == "Technics" and a["finish"] == "black" and a["type"] == "custom:cantabile-card"
    assert a["speakers"] == [{"name": "Konyha", "entity": "media_player.konyha", "mode": "url"}]
    assert a["stations"] == [{"name": "Klubrádió 95,3", "url": "http://k", "frequency": 95.3, "short": "Klubrádió"}]
    assert a["tape"] == {"media_folder": "media-source://media_source/local/NAS", "display": "vfd", "upload_folder": "Cantabile"}
    assert "hangszorok" not in a and ANGOL["speakers"][0]["entity"] == "media_player.nappali"   # az eredeti nem változik
    m = V.kartyara_ir(MAGYAR, BEALL, {"adok"})
    assert m["hangszorok"] == MAGYAR["hangszorok"] and m["magno"] == MAGYAR["magno"] and m["marka"] == "Cantabile"
    assert m["adok"][0]["frekvencia"] == 95.3 and "stations" not in m
    # üres zenemappa: a magnó-kulcsok kikerülnek
    u = V.kartyara_ir(MAGYAR, {"magno": {"nas": ""}}, {"magno"})
    assert u["magno"] == {"vu_kijelzo": "fluor"}


def test_kartya_uj_a_readme_kulcsaival():
    k = V.kartya_uj(BEALL)
    assert list(k) == ["type", "speakers", "stations", "tape"]
    assert k["tape"] == {"media_folder": "media-source://media_source/local/NAS", "upload_folder": "Cantabile"}
    assert V.kartya_uj({"hangszorok": [], "adok": [], "magno": {}}) == {"type": "custom:cantabile-card", "speakers": [], "stations": []}


def test_lenyomat_nyelvfuggetlen():
    assert V.lenyomat(ANGOL) == V.lenyomat(MAGYAR)
    assert V.lenyomat(ANGOL) != V.lenyomat(V.kartyara_ir(ANGOL, BEALL, {"hangszorok"}))
    assert V.beallitas_kartyabol(ANGOL)["magno"]["hires"] == "HR"


def test_kartya_nezetbe():
    k = {"type": "custom:cantabile-card"}
    cfg = {"views": [{"title": "A", "cards": [{"type": "entities"}]},
                     {"title": "B", "type": "sections", "sections": [{"type": "grid", "cards": []}]},
                     {"title": "C", "panel": True, "cards": []},
                     {"title": "D", "panel": True, "cards": [{"type": "map"}]},
                     {"title": "E", "type": "custom:valami"}]}
    eredeti = copy.deepcopy(cfg)
    assert V.kartya_nezetbe(cfg, 0, k)["views"][0]["cards"][-1] == k
    assert V.kartya_nezetbe(cfg, 1, k)["views"][1]["sections"][-1] == {"type": "grid", "cards": [k]}
    assert V.kartya_nezetbe(cfg, 2, k)["views"][2]["cards"] == [k]
    for i in (3, 4):
        with pytest.raises(ValueError):
            V.kartya_nezetbe(cfg, i, k)
    assert cfg == eredeti
    assert [V.nezet_tipus(n) for n in cfg["views"]] == ["cards", "sections", "panel_ures", None, None]


# ---- vezérlőpultok (kitalált LovelaceStorage / LovelaceYAML) ----


class Pult:
    def __init__(self, cfg, mode="storage", title=None):
        self.cfg, self.mode, self.config, self.mentve = cfg, mode, {"title": title} if title else None, []

    async def async_load(self, force):
        if self.cfg is None:
            raise RuntimeError("config not found")
        return self.cfg

    async def async_save(self, cfg):
        self.mentve.append(cfg)
        self.cfg = cfg


def _hass(pultok, nyelv="hu"):
    return SimpleNamespace(data={"lovelace": SimpleNamespace(dashboards=pultok)}, config=SimpleNamespace(language=nyelv))


def _pultok():
    tablet = Pult({"views": [{"cards": [copy.deepcopy(ANGOL)]}]}, title="Tablet")
    mobil = Pult({"views": [{"type": "sections", "sections": [{"cards": [copy.deepcopy(MAGYAR)]}]},
                            {"title": "Szoba", "cards": [V.kartyara_ir(ANGOL, BEALL, {"hangszorok"})]}]}, title="Mobil")
    yaml = Pult({"views": [{"title": "Y", "cards": [copy.deepcopy(ANGOL)]}]}, mode="yaml", title="YAML pult")
    ures = Pult(None, title="Üres")
    return {None: Pult({"views": []}), "lovelace": tablet, "mobil": mobil, "yaml-pult": yaml, "ures": ures,
            V.TV_PULT: Pult({"views": [{"cards": [{"type": "custom:cantabile-tv"}]}]})}


def test_pultok_es_lehetosegek():
    hass = _hass(_pultok())
    assert [u for u, _ in V.pultok(hass)] == ["lovelace", "mobil", "yaml-pult", "ures", V.TV_PULT]   # a régi None kulcs nélkül
    lehet = asyncio.run(V.nezet_lehetosegek(hass))
    assert [(x["ertek"], x["yaml"]) for x in lehet] == [("lovelace|0", False), ("mobil|0", False), ("mobil|1", False), ("yaml-pult|0", True)]
    assert lehet[2]["felirat"] == "Mobil › Szoba" and lehet[3]["felirat"] == "YAML pult › Y (YAML)"


def test_kartyak_frissit_csak_az_elso_kartya_csoportjat_irja():
    p = _pultok()
    hass = _hass(p)
    elso = asyncio.run(V.elso_kartya(hass))
    assert elso == ANGOL
    mentve = asyncio.run(V.kartyak_frissit(hass, lambda k: V.kartyara_ir(k, BEALL, {"adok"})))
    assert mentve == ["Tablet", "Mobil"]                                # a YAML-pult nem változik
    assert p["lovelace"].cfg["views"][0]["cards"][0]["stations"][0]["url"] == "http://k"
    mobil = p["mobil"].cfg["views"]
    assert mobil[0]["sections"][0]["cards"][0]["adok"][0]["url"] == "http://k"          # magyar kulcsokkal
    assert mobil[1]["cards"][0]["stations"][0]["url"] == "https://a/petofi.mp3"         # más hangszórók: más csoport
    assert p["yaml-pult"].mentve == [] and p[V.TV_PULT].mentve == []
    # nincs kártya: nincs írás
    assert asyncio.run(V.kartyak_frissit(_hass({"x": Pult({"views": []})}), lambda k: k)) == []


def test_gyujtemeny_a_websocket_kezelo_mogul():
    """A dashboards gyűjtemény a lovelace/dashboards/create kezelője mögül – ugyanazokkal a díszítőkkel, mint a HA-ban."""
    from homeassistant.components import websocket_api

    class Ws:
        storage_collection = object()

        async def ws_create_item(self, hass, connection, msg):
            pass

    ws = Ws()
    kezelo = websocket_api.require_admin(websocket_api.async_response(ws.ws_create_item))
    hass = SimpleNamespace(data={"websocket_api": {"lovelace/dashboards/create": (kezelo, {})}})
    assert V._gyujtemeny(hass) is Ws.storage_collection
    assert V._gyujtemeny(SimpleNamespace(data={})) is None


def test_pult_letrehoz_es_szabad_url():
    letrehozott = []
    p = _pultok()

    class Gyujtemeny:
        async def async_create_item(self, adat):
            letrehozott.append(adat)
            p[adat["url_path"]] = Pult(None, title=adat["title"])     # a HA figyelője veszi fel a vezérlőpultok közé

    class Ws:
        storage_collection = Gyujtemeny()

        async def ws_create_item(self, hass, connection, msg):
            pass

    from homeassistant.components import websocket_api
    from homeassistant.components.frontend import DATA_PANELS

    hass = _hass(p)
    hass.data["websocket_api"] = {"lovelace/dashboards/create": (websocket_api.require_admin(websocket_api.async_response(Ws().ws_create_item)), {})}
    hass.data[DATA_PANELS] = {"cantabile-zene": object()}
    url = V.szabad_url(hass, "cantabile-zene")
    assert url == "cantabile-zene-2"
    pult = asyncio.run(V.pult_letrehoz(hass, "Zene", "mdi:radio", url))
    assert letrehozott == [{"url_path": "cantabile-zene-2", "title": "Zene", "show_in_sidebar": True, "require_admin": False,
                            "mode": "storage", "icon": "mdi:radio"}]
    assert pult is p["cantabile-zene-2"]


def test_tv_kartyara_a_lejatszok_megjelenese_utan(monkeypatch):
    """Az új Cantabile TV-lejátszók („TV · …”) a beállítás után felkerülnek a csoport kártyáira."""
    p = {"lovelace": Pult({"views": [{"cards": [copy.deepcopy(ANGOL)]}]})}
    allapotok = {"media_player.nappali_tv": SimpleNamespace(attributes={"friendly_name": "Nappali TV"}),
                 "media_player.cantabile_tv_nappali_tv": SimpleNamespace(attributes={})}
    hass = _hass(p)
    hass.states = SimpleNamespace(get=allapotok.get)
    hass.config_entries = SimpleNamespace(async_loaded_entries=lambda d: [SimpleNamespace(entry_id="E1")])
    reg = SimpleNamespace(async_get_entity_id=lambda dom, plat, uid: "media_player.cantabile_tv_nappali_tv" if uid == "E1_tv_nappali_tv" else None)
    monkeypatch.setattr(V.er, "async_get", lambda _h: reg)

    async def nem_var(_s):
        return None

    monkeypatch.setattr(V.asyncio, "sleep", nem_var)
    asyncio.run(V.tv_kartyara(hass, ["media_player.nappali_tv"], V.lenyomat(ANGOL)))
    hsz = p["lovelace"].cfg["views"][0]["cards"][0]["speakers"]
    assert hsz[-1] == {"name": "Nappali TV", "entity": "media_player.cantabile_tv_nappali_tv", "mode": "url", "short": "TV"}
