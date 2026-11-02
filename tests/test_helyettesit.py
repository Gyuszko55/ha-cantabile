"""Forráshelyettesítés (helyettesit.py): a Sonoson szóló Deezer-sor másik hangszórón – futó HA nélkül."""

import asyncio

from custom_components.cantabile import helyettesit as H


def test_dz_azonositok():
    assert H._dz_azonositok(["x-sonos-http:tr%3a4140323881.mp3?sid=2", "https://www.deezer.com/track/12", "34"]) == ["4140323881", "12", "34"]
    assert H._dz_azonositok(["https://www.deezer.com/album/5"]) is None          # album: a számokat le kell kérni
    assert H._dz_azonositok(["media-source://media_source/local/a.mp3"]) is None


def test_hosszu_deezer_sor_ma_lejatszon_egy_lekeressel(monkeypatch):
    """315 kedvenc szám Sonosról a Technicsre (MA-lejátszója van): egyetlen Deezer-lekérés (az MA Deezer-példányának
    kereséséhez), a többi azonosító közvetlenül MA-URI lesz."""
    hivas = []

    async def deezer(hass, ut):
        hivas.append(ut)
        return {"title": "Puglia", "artist": {"name": "DIVA Divina"}, "album": {"title": "Puglia"}}

    async def peldany(hass, minta):
        assert minta["cim"] == "Puglia"
        return "deezer--GFiGB9Sm"

    monkeypatch.setattr(H, "deezer", deezer)
    monkeypatch.setattr(H, "_ma_deezer_peldany", peldany)
    monkeypatch.setattr(H, "_sonos", lambda hass, e: False)
    ids = [f"x-sonos-http:tr%3a{1000 + i}.mp3?sid=2" for i in range(300)]
    r = asyncio.run(H.helyettesit(None, "media_player.wiim", "media_player.wiim_ma", None, ids, []))
    assert r["mod"] == "ma" and r["talalt"] == r["osszes"] == 300
    assert r["elemek"][0] == "deezer--GFiGB9Sm://track/1000" and len(hivas) == 1


def test_deezer_sor_sonosra_lekeres_nelkul(monkeypatch):
    async def deezer(hass, ut):
        raise AssertionError("nem kell Deezer-adat")

    monkeypatch.setattr(H, "deezer", deezer)
    monkeypatch.setattr(H, "_sonos", lambda hass, e: True)
    r = asyncio.run(H.helyettesit(None, "media_player.sonos", None, None, ["x-sonos-http:tr%3a7.mp3"], []))
    assert r == {"mod": "sonos", "elemek": ["https://www.deezer.com/track/7"], "talalt": 1, "osszes": 1}


def test_ma_deezer_peldany_a_szolgaltatolistabol(monkeypatch):
    from types import SimpleNamespace as N

    prov = [N(domain="filesystem_local", instance_id="filesystem_local--x", available=True),
            N(domain="deezer", instance_id="deezer--GFiGB9Sm", available=True)]
    monkeypatch.setattr(H.ma, "bejegyzes", lambda hass: N(runtime_data=N(mass=N(providers=prov))))
    H._ma_dz.clear()
    assert asyncio.run(H._ma_deezer_peldany(None, {})) == "deezer--GFiGB9Sm"


def test_spotify_sajat_konyvtar_utvonalak():
    from custom_components.cantabile.streaming import SPOTIFY_SAJAT, SPOTIFY_UT

    for ut in ("/me/playlists?limit=50", "/me/albums?limit=50", "/me/following?type=artist&limit=50", "/me/tracks"):
        assert SPOTIFY_SAJAT.match(ut), ut
    assert not SPOTIFY_SAJAT.match("/me/player/play") and not SPOTIFY_SAJAT.match("/me")    # vezérlés / profil nem
    assert SPOTIFY_UT.match("/search?q=x&type=track") and not SPOTIFY_UT.match("/me/playlists")


def test_spotify_deezerre_isrc_alapjan(monkeypatch):
    from custom_components.cantabile import music, streaming as St

    kerdesek = []

    async def belso(hass, ut, sajat):
        kerdesek.append((ut, sajat))
        if ut.startswith("/playlists/"):
            return {"items": [{"track": {"external_ids": {"isrc": "GBAYE0601498"}}}, {"track": {"external_ids": {}}},
                              {"track": {"external_ids": {"isrc": "USUM70905526"}}}], "next": None}
        raise AssertionError(ut)

    async def deezer(hass, ut):
        return {"id": 3135556} if ut == "/track/isrc:GBAYE0601498" else {"error": {}}

    monkeypatch.setattr(St, "_spotify_belso", belso)
    monkeypatch.setattr(music, "deezer", deezer)
    r = asyncio.run(St.spotify_deezerre(None, "spotify:playlist:37i9dQZF1DWYswQNicx0dy"))
    assert r == {"deezer": ["https://www.deezer.com/track/3135556", None, None], "talalt": 1, "osszes": 3}
    assert kerdesek[0][1] is True                              # a lista a bejelentkezett fiókkal (privát listák is)
    assert St.SPOTIFY_LINK.search("https://open.spotify.com/intl-hu/album/4aawyAB9vmqN3uQ7FjRGTy").groups() == ("album", "4aawyAB9vmqN3uQ7FjRGTy")
    assert music.DEEZER_UT.match("/track/isrc:GBAYE0601498") and not music.DEEZER_UT.match("/track/isrc:bad")


def test_spotify_album_deezer_albumra(monkeypatch):
    from custom_components.cantabile import music, streaming as St

    async def belso(hass, ut, sajat):
        assert ut == "/albums/7lUxbRgHGomu4raRe59qTK"
        return {"name": "Imaginaerum (Remastered 2021)", "artists": [{"name": "Nightwish"}], "total_tracks": 13}

    async def deezer(hass, ut):
        assert ut.startswith("/search/album?q=")
        return {"data": [{"id": 1, "title": "Imaginaerum - The Score", "artist": {"name": "Nightwish"}},
                         {"id": 1530307, "title": "Imaginaerum", "artist": {"name": "Nightwish"}, "cover_medium": "k"}]}

    monkeypatch.setattr(St, "_spotify_belso", belso)
    monkeypatch.setattr(music, "deezer", deezer)
    r = asyncio.run(St.spotify_deezerre(None, "spotify:album:7lUxbRgHGomu4raRe59qTK"))
    assert r["album"] == "https://www.deezer.com/album/1530307" and r["eloado"] == "Nightwish"


def test_spotify_lista_zart(monkeypatch):
    import pytest
    from custom_components.cantabile import streaming as St

    async def belso(hass, ut, sajat):
        raise St.StreamHiba("svc_status", status=403)

    monkeypatch.setattr(St, "_spotify_belso", belso)
    with pytest.raises(St.StreamHiba):
        asyncio.run(St.spotify_deezerre(None, "spotify:playlist:4wBDB1Bhd9CeI0F5D6aVRZ"))
