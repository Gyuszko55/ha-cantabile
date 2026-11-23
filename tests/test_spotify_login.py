"""2.8.0: Cantabile's own Spotify login (OAuth2) – it never uses the Home Assistant Spotify integration's session."""

import asyncio
from types import SimpleNamespace

import pytest

from custom_components.cantabile import streaming as S
from custom_components.cantabile.const import CONF_SPOTIFY_ID, CONF_SPOTIFY_SECRET, DOMAIN


class _Bejegyzesek:
    def __init__(self, cantabile, spotify=None):
        self._c, self._s = cantabile, spotify

    def async_loaded_entries(self, domain):
        return [self._c] if domain == DOMAIN and self._c else ([self._s] if domain == "spotify" and self._s else [])


class _TiltottMunkamenet:
    """The HA Spotify integration's session: Cantabile must not touch it."""

    async def async_ensure_token_valid(self):
        raise AssertionError("Cantabile used the Spotify integration's session")

    @property
    def token(self):
        raise AssertionError("Cantabile read the Spotify integration's token")


def _hass(data=None, options=None):
    cant = SimpleNamespace(data=data or {}, options=options or {})
    spot = SimpleNamespace(runtime_data=SimpleNamespace(session=_TiltottMunkamenet()))
    return SimpleNamespace(config_entries=_Bejegyzesek(cant, spot))


def _hiba(coro):
    with pytest.raises(S.StreamHiba) as e:
        asyncio.run(coro)
    return e.value.kulcs


def test_login_nelkul_sajat_adat_nem_megy():
    h = _hass()
    assert _hiba(S._spotify_token(h, True)) == "spotify_login_needed"
    assert _hiba(S._spotify_token(h)) == "spotify_no_key"
    assert S.spotify_bejelentkezve(h) is False


def test_kulccsal_csak_a_katalogus(monkeypatch):
    async def ugyfel(hass, nev, cim, azon, titok):
        return f"cc-{azon}"
    monkeypatch.setattr(S, "_ugyfel_token", ugyfel)
    h = _hass(options={CONF_SPOTIFY_ID: "id", CONF_SPOTIFY_SECRET: "titok"})
    assert asyncio.run(S._spotify_token(h)) == "cc-id"
    assert _hiba(S._spotify_token(h, True)) == "spotify_login_needed"


def test_sajat_bejelentkezes(monkeypatch):
    hivas = {}

    async def impl(hass, entry):
        hivas["entry"] = entry
        return "impl"

    class Munkamenet:
        def __init__(self, hass, entry, implementation):
            self.token = entry.data["token"]

        async def async_ensure_token_valid(self):
            hivas["frissit"] = True

    monkeypatch.setattr(S.config_entry_oauth2_flow, "async_get_config_entry_implementation", impl)
    monkeypatch.setattr(S.config_entry_oauth2_flow, "OAuth2Session", Munkamenet)
    h = _hass(data={"auth_implementation": "cantabile", "token": {"access_token": "sajat"}})
    assert S.spotify_bejelentkezve(h) is True
    assert asyncio.run(S._spotify_token(h, True)) == "sajat"
    assert asyncio.run(S._spotify_token(h)) == "sajat"          # catalogue without a key: Cantabile's own login
    assert hivas["frissit"] and hivas["entry"].data["token"]["access_token"] == "sajat"


def test_lejart_bejelentkezes(monkeypatch):
    async def impl(hass, entry):
        raise ValueError("credentials removed")
    monkeypatch.setattr(S.config_entry_oauth2_flow, "async_get_config_entry_implementation", impl)
    h = _hass(data={"auth_implementation": "cantabile", "token": {"access_token": "x"}})
    assert _hiba(S._spotify_token(h, True)) == "spotify_login_down"


def test_token_frissites_nem_tolt_ujra(monkeypatch):
    import custom_components.cantabile as I
    ujra = []

    async def reload(eid):
        ujra.append(eid)

    entry = SimpleNamespace(entry_id="e1", options={"a": 1}, data={"token": {"access_token": "uj"}})
    hass = SimpleNamespace(data={DOMAIN: {"opciok": {"a": 1}}}, config_entries=SimpleNamespace(async_reload=reload))
    asyncio.run(I._ujratolt(hass, entry))          # only entry.data (token) changed
    assert ujra == []
    entry.options = {"a": 2}
    asyncio.run(I._ujratolt(hass, entry))
    assert ujra == ["e1"]
