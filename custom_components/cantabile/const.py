"""Cantabile – közös állandók és a kimondható üzenetek (magyar / angol, a Home Assistant nyelve szerint)."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

DOMAIN = "cantabile"
VERSION = "1.9.0"

# a kártya és a betűkészlet a saját statikus útvonalon
STATIC_URL = "/cantabile_static"
CARD_URL = f"{STATIC_URL}/cantabile-card.js"

CONF_LLM_API = "llm_api"          # Assist-eszköz (LLM API) bekapcsolva
CONF_DUCK_SOURCES = "duck_sources"  # bemondó eszközök (halkítás bemondáskor)
CONF_DUCK_LEVEL = "duck_level"      # a zene hangereje bemondás alatt, az eredeti %-ában
DUCK_LEVEL_DEFAULT = 25
CONF_SPOTIFY_ID = "spotify_client_id"      # Spotify-fejlesztői kulcs (kísérleti SPOTIFY fül)
CONF_SPOTIFY_SECRET = "spotify_client_secret"
CONF_TIDAL_ID = "tidal_client_id"          # Tidal-fejlesztői kulcs (kísérleti TIDAL fül)
CONF_TIDAL_SECRET = "tidal_client_secret"
LLM_API_ID = "cantabile"

# entitások egyedi azonosítói (a kártya a cantabile/info parancsból tudja meg az entity_id-kat)
UID_ROUNDS = "rounds"
UID_SLEEP = "sleep_timer"
UID_NET = "net_station"

SIGNAL_SLEEP = f"{DOMAIN}_sleep_changed"
SIGNAL_NET = f"{DOMAIN}_net_changed"

PLAYING = ("playing", "buffering")
ROUNDS_INFINITE = 6               # az ismétlésszám 1–5 kör, 6 = végtelen

_TEXT: dict[str, dict[str, str]] = {
    "no_card": {
        "hu": "Nem találom a Cantabile kártya beállításait egyik vezérlőpulton sem.",
        "en": "No Cantabile card configuration was found on any dashboard.",
    },
    "no_speaker_cfg": {"hu": "A Cantabile kártyán nincs hangszóró beállítva.", "en": "The Cantabile card has no speakers configured."},
    "one_sonos": {"hu": "Csak egy Sonos hangszóró van, csoportot nem tudok kapcsolni.", "en": "There is only one Sonos speaker, so no group can be formed."},
    "no_such_speaker": {
        "hu": "Nincs „{hol}” nevű hangszóró. Választható: {nevek}, vagy mindkettő.",
        "en": "There is no speaker called “{hol}”. Available: {nevek}, or all of them.",
    },
    "nas_unavailable": {"hu": "A zenemappa most nem érhető el.", "en": "The music folder is not available right now."},
    "what": {"hu": "Nem értettem, mit játsszak.", "en": "I didn't catch what to play."},
    "no_station": {"hu": "Nem találok „{mit}” nevű rádióadót.", "en": "I can't find a radio station called “{mit}”."},
    "lists_sonos": {"hu": "A listák csak Sonos hangszórón szólnak.", "en": "Playlists only play on Sonos speakers."},
    "deezer_sonos": {
        "hu": "A Deezer csak Sonos hangszórón szól.",
        "en": "Deezer only plays on Sonos speakers.",
    },
    "not_found_local": {"hu": "Nem találok ilyen zenét a zenemappában: „{mit}”.", "en": "I can't find “{mit}” in the music folder."},
    "not_found_any": {"hu": "Sem a zenemappában, sem a Deezeren nem találom: „{mit}”.", "en": "I can't find “{mit}” in the music folder or on Deezer."},
    "no_player_script": {
        "hu": "Ez a lejátszó nem tud sorba állítani, és nincs megadva hozzá lejátszó.",
        "en": "This player has no queue and no fallback player is available.",
    },
    "start_failed": {"hu": "Nem sikerült elindítani: {hiba}", "en": "Could not start playback: {hiba}"},
    "rb_down": {"hu": "A Radio Browser most nem érhető el ({hiba}).", "en": "Radio Browser is not reachable right now ({hiba})."},
    "stream_sonos": {"hu": "A {szolg} csak Sonos hangszórón szól.", "en": "{szolg} only plays on Sonos speakers."},
    "stream_error": {"hu": "{szolg}: {hiba}", "en": "{szolg}: {hiba}"},
    "not_found_service": {"hu": "A {szolg} kínálatában nem találom: „{mit}”.", "en": "I can't find “{mit}” on {szolg}."},
    "deezer_down": {"hu": "A Deezer most nem érhető el ({hiba}).", "en": "Deezer is not reachable right now ({hiba})."},
    "deezer_denied": {"hu": "Ilyen Deezer-kérés nem engedélyezett.", "en": "This Deezer request is not allowed."},
    "deezer_error": {"hu": "Deezer-hiba: {hiba}", "en": "Deezer error: {hiba}"},
}


def szoveg(hass: HomeAssistant, kulcs: str, **kw: object) -> str:
    """Üzenet a Home Assistant nyelvén (magyar, különben angol)."""
    nyelv = "hu" if str(hass.config.language or "").lower().startswith("hu") else "en"
    return _TEXT[kulcs][nyelv].format(**kw)
