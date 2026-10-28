"""Cantabile – közös állandók és a kimondható üzenetek (magyar / angol, a Home Assistant nyelve szerint)."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

DOMAIN = "cantabile"
VERSION = "1.12.9"

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
CONF_TV_PLAYERS = "tv_players"           # Cast-eszközök, amelyekhez Cantabile TV-lejátszó jön létre (tv.py)
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
    # a kártya, a TV és a szolgáltatáshívások hibaüzenetei
    "folder_not_source": {"hu": "Csak media-source mappa adható meg.", "en": "Only a media-source folder can be used."},
    "folder_unknown_source": {"hu": "Ismeretlen média-forrás: {forras}", "en": "Unknown media source: {forras}"},
    "folder_outside": {"hu": "A mappa a média-mappán kívül van.", "en": "The folder is outside the media folder."},
    "folder_unavailable": {"hu": "A mappa nem érhető el.", "en": "The folder is not available."},
    "lyrics_down": {"hu": "A dalszöveg-szolgáltatás nem érhető el.", "en": "The lyrics service is not available."},
    "svc_bad_key": {"hu": "hibás fejlesztői kulcs (client ID / secret)", "en": "invalid developer key (client ID / secret)"},
    "spotify_login_down": {"hu": "a Spotify-integráció bejelentkezése nem érhető el", "en": "the Spotify integration's login is not available"},
    "spotify_no_key": {"hu": "nincs Spotify-kulcs és nincs Spotify-integráció", "en": "no Spotify key and no Spotify integration"},
    "svc_login_expired": {"hu": "a bejelentkezés lejárt – próbáld újra", "en": "the login expired – try again"},
    "svc_rate_limit": {"hu": "túl sok kérés – várj egy kicsit", "en": "too many requests – wait a little"},
    "svc_status": {"hu": "a szolgáltatás hibát adott ({status})", "en": "the service returned an error ({status})"},
    "svc_denied": {"hu": "ilyen {szolg}-kérés nem engedélyezett", "en": "this {szolg} request is not allowed"},
    "tidal_no_key": {"hu": "nincs Tidal-kulcs a Cantabile beállításaiban", "en": "no Tidal key in the Cantabile options"},
    "svc_down": {"hu": "a szolgáltatás nem érhető el ({hiba})", "en": "the service is not reachable ({hiba})"},
    "not_sonos": {"hu": "{entity} nem Sonos-lejátszó", "en": "{entity} is not a Sonos player"},
    "soco_missing": {"hu": "a SoCo könyvtár nem érhető el", "en": "the SoCo library is not available"},
    "sonos_unavailable": {"hu": "{entity}: a Sonos-hangszóró nem érhető el", "en": "{entity}: the Sonos speaker is not available"},
    "cast_unavailable": {"hu": "{nev}: a Cast-eszköz ({cast}) nem érhető el", "en": "{nev}: the Cast device ({cast}) is not available"},
    "tv_page_missing": {"hu": "{nev}: a TV-oldal nem jelentkezett be ({oldal})", "en": "{nev}: the TV page did not sign in ({oldal})"},
    "upload_no_folder": {"hu": "nincs médiamappa", "en": "no media folder"},
    "upload_bad_request": {"hu": "hibás kérés", "en": "bad request"},
    "upload_no_file": {"hu": "nincs fájl", "en": "no file"},
    "upload_not_audio": {"hu": "csak hangfájl tölthető fel", "en": "only audio files can be uploaded"},
    "upload_not_writable": {"hu": "a médiamappa nem írható", "en": "the media folder is not writable"},
    "upload_too_big": {"hu": "a fájl túl nagy (legfeljebb 300 MB)", "en": "the file is too large (300 MB at most)"},
    "no_tv": {"hu": "Nincs ehhez az oldalhoz rendelhető Cantabile TV-lejátszó", "en": "There is no Cantabile TV player for this page"},
}


def szoveg(hass: HomeAssistant, kulcs: str, **kw: object) -> str:
    """Üzenet a Home Assistant nyelvén (magyar, különben angol)."""
    nyelv = "hu" if str(hass.config.language or "").lower().startswith("hu") else "en"
    return _TEXT[kulcs][nyelv].format(**kw)
