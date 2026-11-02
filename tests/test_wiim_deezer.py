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
                return "<Tracks></Tracks>"
            return "".join(f"<Track{n}><Id>{i}</Id></Track{n}>" for n, i in enumerate(self.szamok, 1))
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
