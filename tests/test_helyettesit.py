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
