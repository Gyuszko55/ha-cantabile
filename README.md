# Cantabile

**A 1970s silver radio and cassette deck for your Home Assistant dashboard** – preset buttons on an FM dial,
internet radio, a cassette deck with turning reels and real VU meters, your own music folder, Deezer, and voice control.

*Magyar leírás: [README.hu.md](README.hu.md)*

![Cantabile demo: loading a tape from the shelf, scanning, repeat and shuffle, moving the tape to another speaker, voice control and the radio](docs/images/demo.gif)

![Cantabile radio: FM dial with preset buttons, signal meter, volume and speaker selector](docs/images/radio.png)

![Cantabile cassette deck: turning reels, VU meters, piano-key transport](docs/images/tape.png)

<p align="center"><img src="docs/images/phone.png" alt="Cantabile radio on a phone" width="320"></p>

## What you get

**Radio**
- FM-style glass dial with a moving pointer, preset buttons, a volume knob and a tuning wheel.
- **NET**: thousands of internet stations from the [Radio Browser](https://www.radio-browser.info) directory
  (your country, worldwide, by genre, by name). Any station can be put on a preset button.
- SIGNAL meter that follows the real stream bitrate.

**Cassette deck**
- Cassette window with turning reels, two moving-coil VU meters *or* a fluorescent (VFD) display.
- The VU meters show the **real audio level**: the integration analyses the same stream or file on the server.
- REW / PLAY / FF / STOP / PAUSE / EJECT, SHUFFLE, REPEAT (1–5 rounds or endless), FADE (Sonos crossfade), SLEEP.
- The tape shelf (EJECT):
  - **STREAMING** – your Sonos favourites (playlists and albums);
  - **DEEZER** – the whole Deezer catalogue: charts, search, artist pages (Sonos only);
  - **NAS** – your music folder (artist → album), with instant search;
  - **PHONE** – music from the phone / computer: on BT directly, on any other speaker via a temporary upload (TEMP on the tape, deleted after 24 h); or upload it to the music folder for good;
  - **QUEUE** – the current queue: jump, remove, play next, add to end (Sonos).
- **QUEUE reorder**: drag a track by its handle (⋮⋮) – Sonos, WiiM and BT.
- **Gapless**: Sonos (its own queue) and WiiM (the next track is handed over in advance via DLNA); near-gapless on BT.
- **Announcements**: music is turned down while Assist (e.g. Voice PE) or a TTS message speaks (Cantabile options).
- **After a Home Assistant restart** a playing music-folder queue on Sonos continues by itself after the current track.
- **LYRICS**: tap the song title on the cassette (or the radio's now-playing line when it shows a song) – the lyrics
  come from [LRCLIB](https://lrclib.net); on the tape the current line is highlighted and follows the music.

**Speakers**
- Sonos (full feature set, including grouping as “Both”), and any other media player that can play a URL
  (e.g. WiiM – albums are played track by track by the integration).
- **BT**: play on the device the card is open on (headphones, Bluetooth speaker).
- Switching speakers carries the music over, like a real speaker selector.

**Voice**
- An Assist tool for any LLM conversation agent (Google Gemini, OpenAI, Anthropic, Ollama…):
  *“Play Queen in the living room”*, *“Put on the Kind of Magic album”*, *“Turn on Jazz FM in the bedroom”*,
  *“Play Adele from Deezer”*. Anything not in your music folder is looked up on Deezer.

Front-panel labels are always English, like on a real 1970s hi-fi; settings, messages and tooltips follow your Home Assistant language: **Hungarian** or **English**.

## Requirements and compatibility

- Home Assistant **2025.1** or newer (developed and fully tested on 2026.10; imports and APIs checked on 2025.1).
  Searching non-local music libraries needs a newer HA (the media search API is in 2026.10, not yet in 2025.1);
  browsing them and everything else works on older versions.
- At least one `media_player` that can play media. What you get depends on the player:

| Player (HA integration) | Radio | Music folder | Gapless | Queue tab / drag | Multiroom | Deezer / Sonos favourites |
|---|---|---|---|---|---|---|
| **Sonos** | ✔ | ✔ | ✔ (Sonos queue) | ✔ | ✔ (Sonos only) | ✔ |
| **WiiM**, **LinkPlay** (Arylic, Audio Pro…), **DLNA renderers** | ✔ | ✔ | ✔ (DLNA next-track) | ✔ | – | – |
| **Chromecast / Google Cast**, **Music Assistant**, **Squeezebox**, others with *play media* | ✔ | ✔ (track by track) | – | ✔ | – | – |
| **BT** (the device the card is open on) | ✔ | ✔ | near-gapless | ✔ | – | – |

- Players without a *play media* function (e.g. remote-only TVs, Spotify Connect entities) can't be used and aren't offered.
- Optional: a music folder (a NAS share or local folder in Home Assistant's media, or another media source such as
  Jellyfin or a DLNA media server – browsable, and searchable where Home Assistant has the media search API). Plex is not a media source in Home
  Assistant and can't be used as the music folder.
- Optional: `ffmpeg` on the host for the real VU signal (included in Home Assistant OS and the container image;
  without it the meters show a realistic simulation).
- Deezer playback needs the Deezer service added to your Sonos app. Searching Deezer needs no account.

## Installation

### HACS (custom repository)
1. HACS → ⋮ → **Custom repositories** → add `https://github.com/Gyuszko55/ha-cantabile`, category **Integration**.
2. Install **Cantabile**, then restart Home Assistant.

### Manual
Copy `custom_components/cantabile` into your `config/custom_components` folder and restart Home Assistant.

## Setup

1. **Settings → Devices & services → Add integration → Cantabile.** Leave “Assist tool” on if you want voice control.
2. Add the card to a dashboard: **Edit dashboard → Add card → Cantabile.** The integration serves and registers the card
   itself – no separate resource is needed.
3. Open **⚙** on the card to set the speakers, stations and the music folder. *Save* writes the settings into every
   Cantabile card on all your dashboards, so the tablet and the phone stay identical.

### Voice control
After setting up the integration, open your conversation agent's options (e.g. **Google Gemini → Configure**) and turn on
**Cantabile** next to *Assist* under *Control Home Assistant*.

## Adding your own speakers and sources

- **Speakers**: card ⚙ → *Speakers* → **+ New speaker** → pick the player. Only players that can play media are listed;
  the type (Sonos / other) is set automatically. Give a *short* name if the full name is long – it goes on the rotary
  selector. With two or more Sonos speakers a *Multiroom* position appears (Sonos grouping).
- **Radio stations**: ⚙ → search the Radio Browser by name, or add a name and stream URL by hand. The frequency is
  optional (it only places the station on the dial). On the radio, tap an empty **+** slot or **NET** to browse thousands
  of stations and put one on a button.
- **Your music folder**: add the folder to Home Assistant's media first (Settings → System → Storage → *Add network
  storage* for a NAS, type *Media*), then ⚙ → *Music folder*: the media-source path, e.g.
  `media-source://media_source/local/Music` (open **Media** in the sidebar to see the path). Expected layout:
  artist / album / tracks. A Jellyfin or DLNA-server library works too: use its media-source path.
- **Streaming**: on Sonos, your Sonos favourites (playlists, albums) and the whole Deezer catalogue (with the Deezer
  account linked in the Sonos app). Hide the DEEZER tab in ⚙ if you don't use it.
- **Spotify (experimental)**: set up the Home Assistant **Spotify** integration (your own playlists and library, plus
  playback on Spotify Connect speakers – Premium), and/or enter a Spotify developer key (client ID / secret from
  developer.spotify.com) in the Cantabile integration options for catalogue search. On Sonos it plays with Spotify linked
  in the Sonos app. If a speaker isn't found among the Spotify Connect devices, set `spotify_device: <name>` on it.
- **Tidal (experimental)**: enter a Tidal developer key (developer.tidal.com) in the Cantabile options; playback on Sonos
  with Tidal linked in the Sonos app.
- **Music on your phone / computer**: PHONE tab → *Choose music*. On BT it plays directly; on any other speaker it is
  uploaded temporarily (TEMP on the tape, deleted after 24 hours).
- **Voice**: an LLM conversation agent with the *Cantabile* tool turned on (see Voice control).
- **Announcements**: integration options → announcers (Assist satellites, TTS media players) and the music volume during
  announcements; the music on the Cantabile speakers is turned down while they speak.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| “Custom element doesn't exist” | Resources in YAML mode: add `/cantabile_static/cantabile-card.js` as a *module* resource. |
| ⚙ *Save* fails | Needs an administrator and a UI-managed dashboard; with YAML dashboards edit the YAML. |
| A player isn't in the list / can't be selected | It has no *play media* function. |
| Deezer doesn't start | Link Deezer in the Sonos app, or hide the DEEZER tab. |
| A station plays on Sonos but not on BT | Try the http variant of the stream URL; BT radio goes through the integration (`/api/cantabile/stream`). |
| VU meters only “simulate” | No `ffmpeg` on the host, or an encrypted stream (Deezer). |
| Music folder is empty | Check the media-source path in ⚙ and that the folder is visible under **Media**. |

## Card configuration (YAML)

```yaml
type: custom:cantabile-card
brand: Cantabile                 # optional
finish: silver                   # silver (brushed aluminium) | black (nineties black brushed front)
bt: true                         # BT output on this device; false = hidden
speakers:
  - name: Living room            # full name – voice control uses this
    short: Sonos 1               # name shown on the card, max. 8 characters (needed when the name is longer)
    entity: media_player.living_room
    mode: sonos                  # sonos | url (players without a queue, e.g. WiiM)
  - name: WiiM
    entity: media_player.wiim_mini
    mode: url
stations:                        # optional – NET finds more
  - name: Radio Paradise
    short: Paradise              # text on the button
    frequency: 94.8              # position on the dial (87.5–108)
    url: http://stream.radioparadise.com/mp3-192
tape:
  media_folder: media-source://media_source/local/Music   # artist/album/track
  hires_folder: Hi-Res 48kHz     # optional: 48 kHz copies for Sonos (<folder>/<artist>/<album [48kHz]>)
  upload_folder: Cantabile       # PHONE uploads go here (inside the music folder)
  display: vu                    # vu (moving-coil meters) | vfd (fluorescent display)
  vu_delay: 0                    # seconds; delays the real VU signal to match the speaker's buffer
deezer: true                     # false hides the DEEZER tab
multiroom: true                  # with two or more Sonos speakers: a “Both” position
```

The earlier Hungarian keys (`hangszorok`, `adok`, `magno`, `nas` …) are accepted as well; ⚙ Save writes back in the same form.

## Entities and services

| Entity | Purpose |
|---|---|
| `number.cantabile_repeat_rounds` | REPEAT: 1–5 rounds, 6 = endless |
| `sensor.cantabile_sleep_timer` | Running sleep timers (`timers` attribute: player → stop time) |
| `sensor.cantabile_voice_started_station` | The internet station started by voice, so the card recognises it |

| Service | Purpose |
|---|---|
| `cantabile.play` | Play by name (artist, album, track, station, playlist); returns what plays and where |
| `cantabile.play_tracks` / `cantabile.stop_tracks` | Track-by-track playback on players without a queue |
| `cantabile.sleep_timer` | Stop a player after N minutes (fade-out in the last 30 s; Sonos uses its own timer) |

## Notes

- **Real VU signal** uses `ffmpeg` on the Home Assistant host (included in Home Assistant OS). Encrypted streams
  (e.g. Deezer) can't be analysed – the meters switch to a realistic simulation.
- Sonos decodes at most 48 kHz: with `hires_folder` set, Cantabile plays the 48 kHz copy of a hi-res album on Sonos
  automatically, and the original on other players.
- File names containing `..` can't be played by Home Assistant's media source; Cantabile skips them.
- **Speakers**: any `media_player` that can play media (Sonos, WiiM, Cast, DLNA, Music Assistant, Squeezebox…). `mode` is optional – Sonos is detected automatically; players without a play-media function can't be selected. A `short` name keeps the rotary selector tidy.
- **Stations**: `frequency` is optional; internet-only stations are spread on the dial and show WEB.
- **Deezer** needs the Deezer account linked in the Sonos app; without it, hide the tab (`deezer: false` or ⚙).
- **Saving in ⚙** needs an administrator and a UI-managed dashboard; with YAML dashboards edit the YAML (and add `/cantabile_static/cantabile-card.js` as a module resource if your resources are in YAML mode). Uploading to / clearing the music folder also needs an administrator; the temporary upload works for every user.
- **Security**: the BT radio proxy (`/api/cantabile/stream`) and the temporary upload (`/api/cantabile/upload`) need a logged-in user; the proxy only passes audio, the upload folder is capped at 2 GB and cleared after 24 hours.
- Radio Browser, Deezer and LRCLIB are public directories; Cantabile sends them only your search terms (for lyrics:
  artist, title, album and length of the song). Lyrics are cached in memory only.

## Licence

MIT – see [LICENSE](LICENSE). The bundled *Great Vibes*, *Michroma* and *Exo 2* fonts are under the SIL Open Font License 1.1 (see the OFL-*.txt files next to the card).
