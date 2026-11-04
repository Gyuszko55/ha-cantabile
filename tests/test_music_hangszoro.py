"""cantabile.play: a hangszóró a kártya hosszú vagy rövid nevével is megtalálható (2.7.1)."""
from types import SimpleNamespace

import pytest

from custom_components.cantabile import music as M

C = {"hangszorok": [
    {"nev": "Nappali", "rovid": "Sonos 1", "entity": "media_player.szonosz", "mod": "sonos"},
    {"nev": "Háló", "rovid": "Sonos 2", "entity": "media_player.haloszoba_tv", "mod": "sonos"},
    {"nev": "WiiM", "rovid": "Technics", "entity": "media_player.wiim_mini_a16a_4", "mod": "url"},
]}


def _z():
    z = object.__new__(M.Zene)
    z.hass = SimpleNamespace(states=SimpleNamespace(get=lambda e: None))
    return z


@pytest.mark.parametrize("hol,ent", [("Sonos 2", "media_player.haloszoba_tv"), ("Háló", "media_player.haloszoba_tv"),
                                     ("Technics", "media_player.wiim_mini_a16a_4"), ("sonos 1", "media_player.szonosz")])
def test_nev_es_rovid_nev(hol, ent):
    assert _z().hangszorok(C, hol)[1] == [ent]


def test_ismeretlen_nev_a_rovid_nevekkel_valaszol():
    with pytest.raises(M.HibaUzenet) as e:
        _z().hangszorok(C, "Konyha")
    assert "Sonos 2 (Háló)" in str(e.value.kw if hasattr(e.value, "kw") else e.value.__dict__)
