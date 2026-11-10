"""A TV-oldal kinézete (tv_kinezet.py): saját tárolóban van, a vezérlőpultokat soha nem írja; az első induláskor a
2.7.1-ig a TV-kártyában tárolt értéket csak olvasva veszi át – futó HA nélkül, kitalált vezérlőpultokkal."""

import asyncio
from types import SimpleNamespace

import pytest

from custom_components.cantabile import tv_kinezet as K

from .test_varazslo import Pult


class Tar:
    """A homeassistant.helpers.storage.Store helyett: memóriában, a mentéseket számolja."""

    adat: dict = {}

    def __init__(self, hass, verzio, kulcs):
        self.kulcs = kulcs
        self.mentesek = []

    async def async_load(self):
        return Tar.adat.get(self.kulcs)

    async def async_save(self, d):
        Tar.adat[self.kulcs] = dict(d)
        self.mentesek.append(dict(d))


@pytest.fixture(autouse=True)
def _tar(monkeypatch):
    Tar.adat = {}
    monkeypatch.setattr(K, "Store", Tar)


def _hass(pultok):
    return SimpleNamespace(data={"lovelace": SimpleNamespace(dashboards=pultok)})


def _tv(**kw):
    return {"views": [{"cards": [{"type": "custom:cantabile-tv", **kw}]}]}


def _futtat(coro):
    return asyncio.run(coro)


def test_atvetel_a_tv_kartyarol_csak_olvasva():
    p = Pult(_tv(visual="bars", lyrics=True))
    t = K.TvKinezet(_hass({"tv": p}))
    _futtat(t.betolt())
    assert (t.visual, t.lyrics) == ("bars", True)
    assert Tar.adat[K.TAR_KULCS] == {"visual": "bars", "lyrics": True}
    assert p.mentve == []                       # a vezérlőpult nem íródott


def test_atvetel_alapertelmezesek():
    # borítónál / bakelitnél a dalszöveg alapból be, csak lyrics: false kapcsolja ki
    assert K.kartya_ertek({"type": "custom:cantabile-tv"}) == ("cover", True)
    assert K.kartya_ertek({"visual": "vinyl", "lyrics": False}) == ("vinyl", False)
    assert K.kartya_ertek({"visual": "wave"}) == ("wave", False)
    assert K.kartya_ertek({"visual": "ismeretlen"}) == ("cover", True)


def test_tv_oldal_nelkul_alap():
    t = K.TvKinezet(_hass({"x": Pult({"views": []}), "hibas": Pult(None)}))
    _futtat(t.betolt())
    assert (t.visual, t.lyrics) == ("cover", True)
    assert Tar.adat[K.TAR_KULCS] == {"visual": "cover", "lyrics": True}


def test_tarolt_ertek_elsobb_a_kartyanal():
    Tar.adat[K.TAR_KULCS] = {"visual": "wave", "lyrics": False}
    p = Pult(_tv(visual="vinyl"))
    t = K.TvKinezet(_hass({"tv": p}))
    _futtat(t.betolt())
    assert (t.visual, t.lyrics) == ("wave", False)


def test_beallitas_nem_ir_vezerlopultot_es_ertesit():
    p = Pult(_tv(visual="cover"))
    y = Pult(_tv(visual="cover"), mode="yaml")   # YAML-módú vezérlőpult: régen a mentés hibát dobott
    t = K.TvKinezet(_hass({"tv": p, "yaml": y}))
    _futtat(t.betolt())
    hivas = []
    le = t.figyel(lambda: hivas.append((t.visual, t.lyrics)))
    _futtat(t.beallit(visual="both"))
    _futtat(t.beallit(lyrics=False))
    assert hivas == [("both", True), ("both", False)]
    assert Tar.adat[K.TAR_KULCS] == {"visual": "both", "lyrics": False}
    assert p.mentve == [] and y.mentve == []
    le()
    _futtat(t.beallit(lyrics=True))
    assert len(hivas) == 2


def test_ismeretlen_kinezet_hiba():
    t = K.TvKinezet(_hass({}))
    _futtat(t.betolt())
    with pytest.raises(ValueError):
        _futtat(t.beallit(visual="disco"))
    assert t.visual == "cover"
