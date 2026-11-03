"""A kártya naplója: körpuffer, szintek."""
from types import SimpleNamespace

from custom_components.cantabile import naplo


def test_korpuffer_es_adat():
    hass = SimpleNamespace(data={"cantabile": {}})
    for i in range(naplo.NAPLO_HOSSZ + 5):
        naplo.ir(hass, f"e{i}", "info", {"i": i}, "tablet")
    n = list(hass.data["cantabile"]["naplo"])
    assert len(n) == naplo.NAPLO_HOSSZ and n[0]["esemeny"] == "e5" and n[-1]["adat"] == {"i": naplo.NAPLO_HOSSZ + 4}
    assert n[-1]["eszkoz"] == "tablet" and n[-1]["szint"] == "info"
