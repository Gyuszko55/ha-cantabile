# Cantabile

**A 1970s silver radio and cassette deck for your Home Assistant dashboard** – preset buttons on an FM dial,
internet radio, a cassette deck with turning reels and real VU meters, your own music folder, Deezer, and voice control.

*Magyar leírás: [README.hu.md](README.hu.md)*

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
  - **PHONE** – play music from the phone/tablet on its own Bluetooth output, or upload it to the music folder;
  - **QUEUE** – the current queue: jump, remove, play next, add to end (Sonos).

**Speakers**
- Sonos (full feature set, including grouping as “Both”), and any other media player that can play a URL
  (e.g. WiiM – albums are played track by track by the integration).
- **BT**: play on the device the card is open on (headphones, Bluetooth speaker).
- Switching speakers carries the music over, like a real speaker selector.

**Voice**
- An Assist tool for any LLM conversation agent (Google Gemini, OpenAI, Anthropic, Ollama…):
  *“Play Queen in the living room”*, *“Put on the Kind of Magic album”*, *“Turn on Jazz FM in the bedroom”*,
  *“Play Adele from Deezer”*. Anything not in your music folder is looked up on Deezer.

The card's labels follow your Home Assistant language: **Hungarian** or **English**.

## Requirements

- Home Assistant **2026.10** or newer.
- At least one media player. **Sonos** gives the full experience (queue, Deezer, favourites, crossfade, grouping);
  other players (WiiM, Chromecast…) play radio and the music folder.
- Optional: a music folder in Home Assistant's media sources (e.g. a NAS share mounted under `/media`).
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

## Card configuration (YAML)

```yaml
type: custom:cantabile-card
brand: Cantabile                 # optional
bt: true                         # BT output on this device; false = hidden
speakers:
  - name: Living room
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
- Radio Browser and Deezer are public directories; Cantabile sends them only your search terms.

## Licence

MIT – see [LICENSE](LICENSE). The bundled *Great Vibes* font is under the SIL Open Font License 1.1.
