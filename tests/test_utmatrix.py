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
    assert m["cellak"]["sonos_kedvenc"]["media_player.tv"] == {"utak": [], "elso": None, "allapot": "nem"}
    assert m["cellak"]["deezer"]["media_player.tv"]["allapot"] == "nem"
    assert m["cellak"]["wiim_preset"]["media_player.tv"]["allapot"] == "helyettesites"     # rádióként szól


def test_ismeretlen_sonos_szolgaltatas():
    m = U.epit(_be(sonos_szolg={"deezer": None, "spotify": None}))
    assert m["cellak"]["deezer"]["media_player.sonos"]["utak"][0]["allapot"] == "?"
