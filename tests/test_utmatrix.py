"""Útmátrix: a cellák a bemenetekből."""
from custom_components.cantabile import utmatrix as U


def _be(**kw):
    be = {
        "hangszorok": [
            {"entity_id": "media_player.sonos", "nev": "Sonos", "platform": "sonos", "lejatszik": True, "ma": "media_player.sonos_ma"},
            {"entity_id": "media_player.wiim", "nev": "Technics", "platform": "wiim", "lejatszik": True, "ma": "media_player.wiim_ma"},
            {"entity_id": "media_player.tv", "nev": "TV", "platform": "dlna_dmr", "lejatszik": True, "ma": None},
        ],
        "zenemappa": True, "ma_deezer": True, "wiim_deezer": {"media_player.wiim": True},
        "sonos_szolg": {"deezer": True, "spotify": True}, "spotify_ha": True,
        "spotify_eszkozok": {"media_player.wiim": "WiiM Mini"}, "tidal": False,
    }
    be.update(kw)
    return be


def _utak(m, forras, e):
    return [(u["ut"], u["allapot"]) for u in m["cellak"][forras][e]["utak"]]


def test_deezer_utak_sorrendben():
    m = U.epit(_be())
    assert _utak(m, "deezer", "media_player.sonos") == [("sonos_deezer", "ok"), ("ma_deezer", "ok"), ("nas_helyett", "ok")]
    assert _utak(m, "deezer", "media_player.wiim") == [("wiim_deezer", "ok"), ("ma_deezer", "ok"), ("nas_helyett", "ok")]
    tv = m["cellak"]["deezer"]["media_player.tv"]
    assert tv["allapot"] == "helyettesites" and tv["utak"][tv["elso"]]["ut"] == "nas_helyett"     # nincs MA: zenemappa
    assert tv["utak"][0]["allapot"] == "hianyzik"


def test_kimenet_a_ma_lejatszo():
    m = U.epit(_be())
    u = m["cellak"]["deezer"]["media_player.wiim"]["utak"][1]
    assert u["ut"] == "ma_deezer" and u["kimenet"] == "media_player.wiim_ma"


def test_wiim_deezer_fiok_nelkul_a_kovetkezo_ut():
    m = U.epit(_be(wiim_deezer={"media_player.wiim": False}))
    c = m["cellak"]["deezer"]["media_player.wiim"]
    assert c["utak"][0]["allapot"] == "hianyzik" and c["utak"][c["elso"]]["ut"] == "ma_deezer"


def test_spotify_ismeretlen_eszkoz_es_deezer_tartalek():
    m = U.epit(_be())
    tv = m["cellak"]["spotify"]["media_player.tv"]
    assert [u["allapot"] for u in tv["utak"]] == ["?", "ok"]          # Connect: a Spotify még nem látta; Deezer-tartalék
    assert tv["allapot"] == "helyettesites"
    assert m["cellak"]["spotify"]["media_player.wiim"]["allapot"] == "ok"


def test_csak_sonoson_es_semmi():
    m = U.epit(_be(zenemappa=False))
    assert m["cellak"]["sonos_kedvenc"]["media_player.tv"] == {"utak": [], "elso": None, "allapot": "nem", "elerheto": True}
    assert m["cellak"]["deezer"]["media_player.tv"]["allapot"] == "nem"
    assert m["cellak"]["wiim_preset"]["media_player.tv"]["allapot"] == "ok"     # a rádió-preset közvetlenül szól


def test_ismeretlen_sonos_szolgaltatas():
    m = U.epit(_be(sonos_szolg={"deezer": None, "spotify": None}))
    assert m["cellak"]["deezer"]["media_player.sonos"]["utak"][0]["allapot"] == "?"


def _be2():
    be = _be()
    be["hangszorok"] = [
        *be["hangszorok"][:2],
        {"entity_id": U.MULTIROOM, "nev": "Multiroom", "platform": "sonos_csoport", "lejatszik": True, "ma": None},
        {"entity_id": "media_player.cast_tv", "nev": "Háló TV", "platform": "cast", "lejatszik": True,
         "ma": "media_player.cast_tv_ma", "tv": "media_player.cantabile_tv_halo", "elerheto": False},
        {"entity_id": U.BT, "nev": "BT", "platform": "bongeszo", "lejatszik": True, "ma": None},
    ]
    return be


def test_tv_oldal_elol_az_ma_hangkent_utana():
    m = U.epit(_be2())
    c = m["cellak"]["deezer"]["media_player.cast_tv"]
    assert [u["ut"] for u in c["utak"]] == ["nas_helyett", "ma_deezer"]
    assert c["utak"][0]["kimenet"] == "media_player.cantabile_tv_halo" and c["allapot"] == "helyettesites"
    assert c["utak"][1]["kimenet"] == "media_player.cast_tv_ma"
    assert m["cellak"]["nas"]["media_player.cast_tv"]["utak"][0]["kimenet"] == "media_player.cantabile_tv_halo"
    assert m["cellak"]["ma_konyvtar"]["media_player.cast_tv"]["utak"][0]["ut"] == "nas_helyett"
    assert m["cellak"]["nas"]["media_player.cast_tv"]["elerheto"] is False          # most nem elérhető: jelezve


def test_multiroom_a_sonos_utjain():
    m = U.epit(_be2())
    assert m["cellak"]["deezer"][U.MULTIROOM]["utak"][0]["ut"] == "sonos_deezer"
    assert m["cellak"]["sonos_kedvenc"][U.MULTIROOM]["allapot"] == "ok"
    assert m["cellak"]["airplay"][U.MULTIROOM]["allapot"] == "nem"
    ma = m["cellak"]["ma_konyvtar"][U.MULTIROOM]
    assert ma["allapot"] == "helyettesites" and ma["utak"][ma["elso"]]["ut"] == "sonos_helyett"


def test_bt_csak_a_sajat_utakon():
    m = U.epit(_be2())
    assert m["cellak"]["deezer"][U.BT]["allapot"] == "nem" and m["cellak"]["spotify"][U.BT]["allapot"] == "nem"
    assert m["cellak"]["nas"][U.BT]["allapot"] == "ok" and m["cellak"]["telefon"][U.BT]["allapot"] == "ok"
    assert m["cellak"]["wiim_preset"][U.BT]["allapot"] == "ok"           # a rádió-preset a böngészőben közvetlen


def test_wiim_preset_modja_a_mogotte_levo_cellabol():
    m = U.epit(_be2())
    assert m["cellak"]["wiim_preset"]["media_player.sonos"]["allapot"] == "ok"               # Sonos saját Deezere
    assert m["cellak"]["wiim_preset"]["media_player.cast_tv"]["allapot"] == "helyettesites"  # TV: Deezer helyettesítve


def test_nem_szolo_ut_egy_oraig_kimarad():
    m = U.epit(_be())
    hibak = {("deezer", "media_player.wiim", "wiim_deezer"): 100.0}
    U.hibat_ralo(m, hibak, 200.0)
    c = m["cellak"]["deezer"]["media_player.wiim"]
    assert c["utak"][0]["allapot"] == "hianyzik" and c["utak"][c["elso"]]["ut"] == "ma_deezer"
    assert c["utak"][0]["feltetelek"][-1]["k"] == "lejatszas"
    m2 = U.epit(_be())
    U.hibat_ralo(m2, hibak, 100.0 + U.HIBA_IDO + 1)                       # egy óra után újra az első
    assert m2["cellak"]["deezer"]["media_player.wiim"]["elso"] == 0 and not hibak


def test_tarolt_jelolesek_indulaskor_le():
    m = U.epit(_be())
    U.hibat_ralo(m, {("deezer", "media_player.wiim", "wiim_deezer"): 1.0}, 2.0)
    U.jeloles_nelkul(m)
    c = m["cellak"]["deezer"]["media_player.wiim"]
    assert c["elso"] == 0 and c["utak"][0]["allapot"] == "ok" and all(x["k"] != "lejatszas" for x in c["utak"][0]["feltetelek"])


def test_tv_oldalas_tv_kikapcsolva_is_szol():
    be = _be2()
    be["hangszorok"][3]["lejatszik"] = False            # kikapcsolt DLNA-s TV: a saját lejátszója nem mondja meg, mit tud
    m = U.epit(be)
    assert m["cellak"]["nas"]["media_player.cast_tv"]["allapot"] == "ok"
    assert m["cellak"]["deezer"]["media_player.cast_tv"]["utak"][0]["allapot"] == "ok"
