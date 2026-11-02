"""A WiiM saját Deezere (wiim_deezer.py) – futó HA és WiiM nélkül, a valódi válaszok mintájára."""

import asyncio
import html

import pytest

from custom_components.cantabile import wiim_deezer as W
from homeassistant.exceptions import HomeAssistantError

KEDVENCEK = html.escape("""<DIDL-Lite>
<item id="FV:2/16"><dc:title>Kedvenc dalok</dc:title><res protocolInfo="x">x-rincon-cpcontainer:100e206cuser-tracks-561711861?sid=2&amp;flags=8300&amp;sn=2</res></item>
<item id="FV:2/3"><dc:title>Breaking Walls</dc:title><res protocolInfo="x">x-rincon-cpcontainer:1004206calbum-1050957312?sid=2&amp;flags=8300&amp;sn=2</res></item>
<item id="FV:2/23"><dc:title>Draugr Beatz gyűjtemény</dc:title><res protocolInfo="x">x-rincon-cpcontainer:1006286cplaylist_spotify%3Aplaylist-15417109741?sid=2&amp;flags=10348&amp;sn=2</res></item>
<item id="FV:2/7"><dc:title>AutóRádió</dc:title><res protocolInfo="x">x-rincon-cpcontainer:0006002cspotify%3aplaylist%3a37i9dQZF1DWYswQNicx0dy?sid=9&amp;flags=44&amp;sn=5</res></item>
</DIDL-Lite>""")


def test_sonos_kedvencek_es_deezer_azonositok():
    k = dict(W.sonos_kedvencek(f"<Result>{KEDVENCEK}</Result>"))
    assert W.kedvencbol(k["Kedvenc dalok"]) == ("kedvenc", "561711861")
    assert W.kedvencbol(k["Breaking Walls"]) == ("album", "1050957312")
    assert W.kedvencbol(k["Draugr Beatz gyűjtemény"]) == ("playlist", "15417109741")
    assert W.kedvencbol(k["AutóRádió"]) is None                      # Spotify (sid=9): nem Deezer


def test_sor_tartalom_es_szamai():
    x = W.sor_tartalom("Cantabile", "https://1.airable.io/deezer/playlist/989611251")
    assert "<SourceName>Deezer2</SourceName>" in x and "/deezer/playlist/989611251</SearchUrl>" in x and "LOSSLESS" in x
    v = "<Tracks><Track1>\n<Id>20559921</Id><URL>x</URL></Track1><Track2>\n<Id>20559931</Id><URL></URL></Track2></Tracks>"
    assert W.sor_szamai(v) == ["20559921", "20559931"]


class _WiiM:
    """Kitalált WiiM: a sort egy hívás után tölti be; feljegyzi a parancsokat."""

    def __init__(self, szamok):
        self.szamok, self.naplo, self.bongeszve = szamok, [], 0

    async def pq(self, hass, host, akcio, torzs):
        self.naplo.append((akcio, torzs[-40:]))
        if akcio == "BrowseQueue":
            self.bongeszve += 1
            if self.bongeszve < 2:
                return "<TrackNumber>0</TrackNumber><Tracks></Tracks>"
            if self.bongeszve < 3:                      # első oldal: még nincs a kért helyig
                return "<TrackNumber>1</TrackNumber><Tracks><Track1><Id>1</Id></Track1></Tracks>"
            return f"<TrackNumber>{len(self.szamok)}</TrackNumber>" + "".join(f"<Track{n}><Id>{i}</Id></Track{n}>" for n, i in enumerate(self.szamok, 1))
        return "ok"

    async def api(self, hass, host, parancs):
        self.naplo.append(("api", parancs))
        return '{"status":"play","mute":"0"}' if parancs == "getPlayerStatusEx" else "OK"


@pytest.fixture
def wiim(monkeypatch):
    w = _WiiM(["1", "2", "4140323881"])
    monkeypatch.setattr(W, "_pq", w.pq)
    monkeypatch.setattr(W, "_api", w.api)
    monkeypatch.setattr(W, "_wiim", lambda hass, e: "192.0.2.1")

    async def alap(hass, e):
        return "https://1.airable.io"

    monkeypatch.setattr(W, "deezer_alap", alap)

    async def sorrend(hass, fajta, did):
        return ["1", "2", "4140323881"]

    monkeypatch.setattr(W, "deezer_sorrend", sorrend)
    eredeti = asyncio.sleep
    monkeypatch.setattr(W.asyncio, "sleep", lambda *_: eredeti(0))
    return w


def test_lejatszik_a_kert_szamtol_nemitva_es_tekerve(wiim):
    r = asyncio.run(W.lejatszik(None, "media_player.wiim", "playlist", "989611251", "4140323881", 60))
    assert r == {"index": 3, "total": 3}
    akciok = [a for a, _ in wiim.naplo]
    parancsok = [t for a, t in wiim.naplo if a == "api"]
    assert parancsok[1] == "setPlayerCmd:mute:1" and parancsok[-1] == "setPlayerCmd:mute:0"     # némítva ugrik
    assert akciok.count("PlayQueueWithIndex") == 2 and wiim.naplo[akciok.index("PlayQueueWithIndex", akciok.index("BrowseQueue"))][1].endswith("<Index>3</Index>")
    assert akciok.count("BrowseQueue") == 3                                       # megvárta, míg a 3. helyig betöltött
    assert "setPlayerCmd:seek:60" in parancsok


def test_hianyzo_szamnal_meg_sem_szolal(wiim):
    with pytest.raises(HomeAssistantError, match="not_in_list"):
        asyncio.run(W.lejatszik(None, "media_player.wiim", "playlist", "1", "999"))
    assert wiim.naplo == []                                   # sem sor, sem némítás: a hívó a tartalék utat választja


def test_deezer_sorrend_lapozva(monkeypatch):
    async def deezer(hass, ut):
        i = int(ut.split("index=")[1])
        return {"data": [{"id": n} for n in range(i, min(i + 100, 315))], "next": "x" if i + 100 < 315 else None}

    monkeypatch.setattr(W, "deezer", deezer)
    s = asyncio.run(W.deezer_sorrend(None, "playlist", "989611251"))
    assert len(s) == 315 and s[314] == "314"


TOTAL = html.escape("""<?xml version="1.0"?><PlayQueue><TotalQueue>3</TotalQueue><PlayListInfo>
<List1><Name>A Joyful Noise_#~2026-02-19 13:28:34</Name><ListInfo><Source>Deezer2</Source><SearchUrl>https://1.airable.io/deezer/album/1950311</SearchUrl></ListInfo></List1>
<List2><Name>Rádió Dabas 93.4_#~2026-02-20 08:09:20</Name><ListInfo><Source>newTuneIn</Source><SearchUrl>https://api.radiotime.com/profiles/s107198/media?partnerId=x&amp;latlon=,</SearchUrl></ListInfo></List2>
<List3><Name>Valami Tidal_#~2026-03-01 10:00:00</Name><ListInfo><Source>Tidal</Source><SearchUrl>https://api.tidal.com/x</SearchUrl></ListInfo></List3>
</PlayListInfo></PlayQueue>""")


def test_preset_sorok_es_leforditas():
    s = W.preset_sorok(f"<QueueContext>{TOTAL}</QueueContext>")
    assert set(s) == {"A Joyful Noise", "Rádió Dabas 93.4", "Valami Tidal"}
    assert W.preset_leforditva(s["A Joyful Noise"]["forras"], s["A Joyful Noise"]["kereso"]) == {
        "deezer_kind": "album", "deezer_id": "1950311", "deezer": "https://www.deezer.com/album/1950311"}
    assert W.preset_leforditva(s["Rádió Dabas 93.4"]["forras"], s["Rádió Dabas 93.4"]["kereso"]) == {"tunein": "s107198"}
    assert W.preset_leforditva(s["Valami Tidal"]["forras"], s["Valami Tidal"]["kereso"]) is None


def test_presetek(monkeypatch):
    async def api(hass, host, parancs):
        assert parancs == "getPresetInfo"
        return ('{"preset_num": 3, "preset_list": [{"number": 1, "name": "A Joyful Noise", "source": "Deezer2", "picurl": "k1"},'
                '{"number": 2, "name": "Rádió Dabas 93.4", "source": "newTuneIn", "picurl": "k2"},'
                '{"number": 3, "name": "Valami Tidal", "source": "Tidal", "picurl": "k3"}]}')

    async def pq(hass, host, akcio, torzs):
        return f"<QueueContext>{TOTAL}</QueueContext>"

    async def tunein(hass, allomas):
        assert allomas == "s107198"
        return "http://192.0.2.5:7040/;stream"

    monkeypatch.setattr(W, "_api", api)
    monkeypatch.setattr(W, "_pq", pq)
    monkeypatch.setattr(W, "_tunein_cim", tunein)
    monkeypatch.setattr(W, "_wiim", lambda hass, e: "192.0.2.1")
    p = asyncio.run(W.presetek(None, "media_player.wiim"))
    assert p[0]["deezer"] == "https://www.deezer.com/album/1950311" and p[0]["image"] == "k1"
    assert p[1]["radio"] == "http://192.0.2.5:7040/;stream" and "deezer" not in p[1]
    assert "deezer" not in p[2] and "radio" not in p[2] and p[2]["number"] == 3     # Tidal: csak a WiiM-en


def test_deezer_felhasznalo_a_sonos_kedvencekbol(monkeypatch):
    from types import SimpleNamespace as N

    ent = [N(domain="media_player", platform="wiim", disabled_by=None, entity_id="media_player.wiim"),
           N(domain="media_player", platform="sonos", disabled_by=None, entity_id="media_player.nappali")]
    monkeypatch.setattr(W.er, "async_get", lambda hass: N(entities=N(values=lambda: ent)))

    async def kedvencek(hass, e):
        assert e == "media_player.nappali"
        return W.sonos_kedvencek(f"<Result>{KEDVENCEK}</Result>")

    monkeypatch.setattr(W, "_sonos_kedvencek", kedvencek)
    W._felh_tar.clear()
    assert asyncio.run(W.deezer_felhasznalo(None)) == "561711861"


def test_deezer_kozvetito_engedi_a_felhasznaloi_konyvtarat():
    from custom_components.cantabile.music import DEEZER_UT

    for ut in ("/user/561711861/playlists?limit=100", "/user/1/albums?limit=100", "/user/1/artists", "/user/1/tracks",
               "/playlist/989611251/tracks?limit=100&index=200"):
        assert DEEZER_UT.match(ut), ut
    assert not DEEZER_UT.match("/user/1/flow") and not DEEZER_UT.match("/user/me/playlists")


def test_sor_betoltve():
    assert W.sor_betoltve("<TotalNumber>315</TotalNumber><TrackNumber>40</TrackNumber>") == 40     # az összlétszám nem számít
    assert W.sor_betoltve("<Tracks></Tracks>") == 0


def test_ha_a_wiim_nem_szolal_meg_hibat_jelez(wiim, monkeypatch):
    # üres sor (pl. rossz lista-azonosító, lejárt Deezer-belépés): a WiiM elfogadja a sort, de nem szól – ez nem „siker”
    async def api(hass, host, parancs):
        wiim.naplo.append(("api", parancs))
        return '{"status":"stop","mute":"0"}' if parancs == "getPlayerStatusEx" else "OK"

    ora = iter(range(0, 10_000))
    monkeypatch.setattr(W, "_api", api)
    monkeypatch.setattr(W.time, "monotonic", lambda: next(ora))
    with pytest.raises(HomeAssistantError, match="not_playing"):
        asyncio.run(W.lejatszik(None, "media_player.wiim", "playlist", "989611251", "4140323881", 60))
    assert [t for a, t in wiim.naplo if a == "api"][-1] == "setPlayerCmd:mute:0"   # a némítás akkor is feloldódik
