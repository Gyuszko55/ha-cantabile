# Changelog

## 2.7.0b8 – 2026-11-02

- **Everything everywhere, further:**
  - **Sonos favourites on every speaker:** off a Sonos the favourite's content plays – a Deezer album / playlist or your Deezer favourites (the Deezer routes), a Spotify item (Spotify Connect / the Deezer fallback), a radio station (its stream). New websocket `cantabile/sonos_favorite`.
  - **BT (the browser) plays Deezer, Spotify and Music Assistant tracks** from the music folder (substitution), where it has them.
- **The TV picture in the route matrix:** each speaker shows its area and the TVs there that can mirror it (picture, lyrics – as before, the TV in the same area shows what plays); every route says where its picture appears (the TV page itself, the room's TV, or no picture – e.g. Music Assistant on a TV is sound only). A DLNA TV can't mirror (it plays itself), and the matrix warns about card TVs without an area.

## 2.7.0b7 – 2026-11-02

- **Route matrix, step 4: the matrix on the card.** ⓘ (signal path) → **ROUTE MATRIX**: every source × the card's speakers (ALL DEVICES adds the others), each cell coloured – green direct, orange substitution, amber can't be checked, grey doesn't play – with the first live route's short name; the current speaker is highlighted, unreachable ones dimmed. Tap a cell for its routes in order, each with its output and conditions (✓ / ✗ / ?). REFRESH rebuilds the matrix, CLEAR MARKS forgets the “didn't play” marks. Fits the card (the table scrolls; also in the panel view and on a phone).
- Route matrix: a TV with a Cantabile TV page counts as able to play a URL even while the TV is off (a switched-off DLNA TV doesn't report what it can do).

## 2.7.0b6 – 2026-11-02

- **Fix: FLAC on a TV page that can't open it.** Some Cast receivers (e.g. an Android TV's built-in Chromecast) can't open FLAC in the TV page (`DEMUXER_ERROR_COULD_NOT_OPEN`) – the track stopped after a second. Now, when a TV page reports that it can't open a FLAC, Cantabile remembers it for that TV and plays the same track from the same point again, converted to MP3 on the fly (ffmpeg, 320 kbit/s); from then on FLAC goes to that TV converted right away. (Seeking within a converted track isn't possible.)

## 2.7.0b5 – 2026-11-02

- **Route matrix, step 3: every source asks the matrix.** Where a source can play (the “plays on: …” list in messages, the switch buttons, the KERESÉS tab's source chips) now comes from the matrix for all sources – it used to say Deezer plays only on Sonos, though since 2.6 the WiiM and the TVs play it too. The Music Assistant library starts on the cell's first live route (the MA's own queue, or for a single track the Sonos' Deezer / the music folder), and goes on to the next one if a route doesn't play.
- The matrix only lists routes the card really takes: the Music Assistant fallback for the music folder and the radio is gone from it (the card doesn't use it).

## 2.7.0b4 – 2026-11-02

- Route matrix: only a real playback failure marks a route as not playing – when the content itself can't be found on a route (e.g. a Deezer album that is no longer available), the next route is tried without marking, and if none has it, one clear message says so. New websocket `cantabile/matrix/reset` clears the marks. The stored matrix drops the previous run's marks at start-up.

## 2.7.0b3 – 2026-11-02

- **Route matrix, step 2: Deezer and Spotify play from the matrix.** On a non-Sonos speaker a Deezer album, playlist or track list starts on the cell's first live route (or the route you chose on that speaker) – no question any more; **OTHER ROUTE** offers the cell's other live routes. If a route doesn't play, the card tells the integration (`cantabile/matrix/fail`): for an hour that route counts as not playing, and the next route of the cell starts right away. On a TV the music folder on the TV page comes first and Music Assistant (sound only) after it. Spotify goes straight to the Deezer fallback where the matrix knows Spotify Connect can't play.

## 2.7.0b2 – 2026-11-02

- Route matrix, after comparing it with the real behaviour:
  - **TV page as a route:** on a TV with a Cantabile TV player the output is the TV page (picture, cover, lyrics); for Deezer, the Music Assistant library and the Spotify fallback the music folder substitution on the TV page comes first, Music Assistant (sound only) after it.
  - **Multiroom** (the Sonos group) and **BT** (the browser) columns; **PARTY** and **Own list** rows.
  - A WiiM preset is direct where the content behind it (Deezer album / radio) is direct, e.g. on a Sonos.
  - Each cell says whether the device is reachable right now.
  - Speakers carry the card's names and come in the card's order, the devices not on the card after them.

## 2.7.0b1 – 2026-11-02

- **Route matrix (step 1 – observing only).** Cantabile now builds a matrix of every source × every speaker: each cell lists the routes in order, each route with its inputs (what it needs: e.g. a Deezer account in the WiiM, a Music Assistant player, the music folder, a known Spotify Connect device – each true / false / unknown), its output (the device's own player or its Music Assistant player; direct or substitution) and its state. It is built from the setup and Home Assistant, kept in storage (`cantabile.matrix`, available right at start-up) and refreshed after start-up, when media players or dashboards change, hourly and on request. Websocket: `cantabile/matrix` (`refresh: true` rebuilds it). The card doesn't use it yet – it still decides as before; this step is for comparing.

## 2.6.3 – 2026-11-02

- **Fix: Deezer albums and playlists didn't start on a WiiM from the library** (e.g. MY LIBRARY → the Technics): the card sent the album / playlist id in a field called `id`, which Home Assistant's websocket reserves for the message number – the WiiM got a queue that doesn't exist, stayed silent, and the card showed no message. The field is now `item`, and `cantabile/wiim_deezer/play` only reports success once the WiiM is really playing (otherwise `not_playing`).
- **Choose the route.** When a Deezer album, playlist or track list can reach a non-Sonos speaker more than one way (the WiiM's own Deezer, Music Assistant's Deezer, the music folder), the card asks once which one to use and remembers it for that speaker. Every “plays from” message has an **OTHER ROUTE** button to switch; if the chosen route doesn't play, the card says so and offers the others.
- **No blocking file I/O in the event loop** (`tv.py`): removing a cancelled temporary file and the file-exists checks in the DLNA video and embedded-cover coroutines now run in the executor (the removal shielded, so it still runs when the task is cancelled); the font view checks the file in the executor too.

## 2.6.2 – 2026-11-02

- **Fix:** after switching a paused queue to a speaker that was itself paused, PLAY resumed that speaker's own old content instead of the queue brought over. The pending transfer now comes first. Tested live: a Sonos Spotify queue (paused) → the WiiM: PLAY continues it there with Spotify Connect.

## 2.6.1 – 2026-11-02

- **Spotify playing on a Sonos moves to other speakers.** A Sonos playing Spotify through its own Spotify service (`x-sonos-spotify`) can now be switched to another speaker: on a Spotify Connect device (e.g. a WiiM) Spotify continues the same queue from the same track and position (Spotify API, the Home Assistant Spotify account); elsewhere the same tracks come from Deezer (by artist and title) through the Deezer routes. Works from a paused Sonos too (PLAY on the new speaker). It used to be refused.
- **The message names the real source.** When something really can't move (a Sonos radio or favourite), the card says what is playing and where it can't go – it used to say “Deezer and Sonos favourites only play on Sonos” even for Spotify.
- **Spotify devices are recognised when idle.** Spotify often lists an idle device only by its id (the WiiM showed up as “AVR”); Cantabile remembers each device's name once it has seen it and recognises it later. New websocket commands `cantabile/spotify_connect` and `cantabile/titles_to_deezer`.

## 2.6.0 – 2026-11-02

Cantabile 2.6 – every source on every speaker. A setup wizard; one device, one speaker, with its own integration as
the main route and fallbacks behind it; the WiiM's own Deezer; your Deezer and Spotify libraries in the library;
WiiM presets and Spotify on any speaker; the sidebar dashboard looks like the card. The details of each step are in the
2.6.0b1–b6 entries below.

- **Setup wizard** (b1): speakers, music library, the country's most popular radio stations, TV, voice and the dashboard
  – a ready-filled card on a new sidebar dashboard; it can be run again, also step by step.
- **One device, one speaker** (b2): the wizard, the card and its ⚙ list show one row per physical device. Its own
  integration is the main route; other ways to it (usually its Music Assistant player) are fallbacks used automatically
  for what the main route can't play. Browsers, kiosk tablets and Music Assistant-only players aren't speakers; old card
  entries move to the device's main player.
- **Sidebar dashboard** (b3): in a panel view the card is drawn at card size and scaled to fit, centred.
- **WiiM's own Deezer** (b3, b5): Deezer albums and playlists play on a WiiM from the Deezer account linked in the WiiM
  Home app, lossless. Switching from a Sonos playing a Deezer list (e.g. your Deezer favourites) to a WiiM continues the
  same list there from the same track and position; Music Assistant and the music folder are the fallbacks.
- **WiiM presets on any speaker** (b4): a Deezer preset plays as a Deezer album, a TuneIn preset as a radio station.
- **MY LIBRARY** (b5, b6): the DEEZER tab shows your Deezer playlists, albums and artists (the account is found in the Sonos
  favourites), the SPOTIFY tab your Spotify playlists, saved albums and followed artists (the Home Assistant Spotify account).
- **Spotify on every speaker** (b6): Sonos through its own Spotify service, Spotify Connect devices through Spotify;
  elsewhere albums and tracks come from Deezer. Spotify playlists play on Sonos and Spotify Connect speakers (Spotify
  doesn't release playlist tracks to apps).
- Fixes: long Deezer lists continue at the right track on the WiiM; connections to the WiiM and Sonos are closed after
  each request and retried once; Music Assistant's Deezer instance comes from its provider list.

## 2.6.0b6 – 2026-11-02

- **MY LIBRARY on the SPOTIFY tab.** With an empty search the SPOTIFY tab now shows your own Spotify library – your playlists, saved albums and followed artists – read with the Home Assistant Spotify integration's signed-in account from the Spotify API (`/me/playlists`, `/me/albums`, `/me/following`; read-only). It works even when nothing is playing (the HA Spotify media browser, used so far, only answered while Spotify was playing; it stays as a fallback).
- **Spotify on every speaker.** Where the speaker is a Spotify Connect device, Spotify plays it as before; where it isn't (not among the account's Spotify devices, DLNA TV…), the same content comes from Deezer and plays through the Deezer routes (Sonos / WiiM own Deezer, Music Assistant, music folder): a Spotify album → the same Deezer album (by artist and title; on the WiiM its own Deezer), a track → by ISRC or artist and title, a playlist → track by track if Spotify releases its tracks. Spotify often doesn't release playlist tracks to apps any more (403) – then the card says the playlist only plays on a Spotify Connect speaker. New websocket command `cantabile/spotify_to_deezer`. The SPOTIFY tab no longer asks to switch speaker, except on BT.

## 2.6.0b5 – 2026-11-02

- **MY LIBRARY on the DEEZER tab.** With an empty search the DEEZER tab now starts with your own Deezer library – your playlists (Deezer favourites first), albums and artists, the same as the WiiM's “My Library” – above the Deezer chart. Everything plays on any speaker through the usual routes (Sonos: its own Deezer; WiiM: its own Deezer; others: Music Assistant or the music folder). The Deezer account is found in the Sonos favourites (your Deezer favourites, `user-tracks-<id>`), or set `deezer_user` on the card. New websocket command `cantabile/deezer_user`.
- **Fix:** talking to the WiiM and the Sonos (play queue, favourites, HTTP API) uses a fresh, closed connection per request and retries once if the device drops it (“Server disconnected”) – a Sonos → WiiM switch fell back to the music folder because of this.
- **Fix:** jumping to a track deep in a long list (e.g. the 315th of 315 Deezer favourites) on the WiiM: the WiiM reports the list length at once but loads the tracks about 40 per second; the jump now waits until the requested position is loaded (it used to be lost, and the list played from the start).
- **Fix:** Music Assistant's Deezer instance is taken from Music Assistant's provider list (it used to be guessed from a search, which only returns the library id for tracks already in the library) – so the Music Assistant fallback finds Deezer tracks again.
- **Fix:** the Deezer proxy now allows the user library (`/user/<id>/playlists|albums|artists|tracks`). Without it MY LIBRARY stayed empty, and switching a Sonos playing your Deezer favourites to a WiiM fell back to Music Assistant instead of the WiiM's own Deezer.
- **The DEEZER tab no longer needs a Sonos:** it shows when there is a Sonos, a WiiM or a speaker with a Music Assistant fallback; the “Deezer only plays on Sonos” warning is gone – only where Deezer can come solely from the music folder (TV, BT) a short note says so.

## 2.6.0b4 – 2026-11-02

- **WiiM presets play on any speaker.** The library's WIIM tab and SEARCH now read what is behind each preset (the WiiM's play queue): a Deezer album or playlist preset becomes a Deezer cassette – it plays on every speaker through the usual routes (Sonos: its own Deezer; WiiM: its own Deezer; others: Music Assistant or the music folder); a TuneIn radio preset becomes a radio station (its stream address from TuneIn) and plays on any speaker, BT included. Presets from other services (Tidal, Qobuz…) still play only on the WiiM. New websocket command `cantabile/wiim_presets`; without it the card falls back to the HA WiiM integration's preset list.

## 2.6.0b3 – 2026-11-02

- **WiiM plays Deezer from its own Deezer (lossless).** If a Deezer account is linked in the WiiM Home app, Deezer albums and playlists now play on WiiM / LinkPlay speakers through the speaker itself (its own integration – the main route), in lossless quality; Music Assistant stays the fallback. Used when you start a Deezer album or playlist on a WiiM, and when you switch from a Sonos playing a Deezer list (e.g. your Deezer favourites) to a WiiM: the list is found among the Sonos favourites (album, playlist or the Deezer favourites), and the WiiM continues from the same track and position – muted while it jumps there, so the start of the list isn't heard. If the list isn't found or the track isn't in it, the Music Assistant route takes over (from the same track). The WiiM's local PlayQueue (UPnP) and HTTP API are used; new `cantabile/wiim_deezer/*` websocket commands.
- **Sidebar dashboard looks like the card.** In a panel view (the wizard's own sidebar dashboard) the card no longer stretches to the whole screen: it is laid out exactly as a card (1024 px wide, its own height) and scaled up or down to fit, centred – the same picture as on a normal dashboard, in both radio and tape mode. Below 600 px the phone layout stays.
- **A Sonos Deezer list continues on any speaker.** Switching from a Sonos playing a Deezer list (e.g. your Deezer favourites) to another speaker now finds the same tracks where that speaker can play them – through its Music Assistant fallback (Music Assistant's Deezer), else the music folder – from the same track and position. Long lists work too (from the current track, up to 300 tracks; a 315-track favourites list used to be rejected), and the lookup is fast (one Deezer request instead of one per track). It also works when the Sonos is paused: PLAY on the new speaker continues there.

## 2.6.0b2 – 2026-11-02

One device, one speaker – its own integration first, other ways in as fallback.

- **Speakers are physical devices.** The wizard, the card and its ⚙ list now show one row per device: a speaker is a device that has a media player from its **own integration** (Sonos, WiiM, LinkPlay, Google Cast, DLNA, Squeezebox, ESPHome…). Browsers (browser_mod), kiosk tablets (Fully Kiosk), Cantabile's own players, players without a device and devices reachable only through Music Assistant are not offered.
- **Several ways to the same device are merged.** Players of one device are recognised by the HA device, the MAC address, the Music Assistant pairing or the same device name (only across different integrations – two same-named Cast speakers stay two). The main route is the device's own player that can play media, in speaker-integration order (e.g. a SmartBox plays via Google Cast, not Android TV Remote); the others – usually Music Assistant – are listed as **fallback** on the wizard row.
- **Fallback in the background.** What the device's own integration can't play (Music Assistant library, Music Assistant's Deezer) goes through its fallback route automatically; everything else plays via the own integration. The card gets the device map from `cantabile/info` (`devices`), so pairing now also works where Music Assistant's player id differs from the integration's (name / MAC match).
- **Existing cards are tidied up automatically:** a speaker entry pointing at a device's secondary player (e.g. the Music Assistant "Living room" next to the Sonos one, or a SmartBox added twice) moves to the device's main player; the same device appears only once, keeping its first entry's name. The wizard does the same when it writes the cards.
- **TV step:** a device's secondary Cast or DLNA player can still be picked as a Cantabile TV.
- **No waiting for the merged buttons:** the card remembers the device map in the browser, so on the next open the buttons are merged right away (on a big dashboard `cantabile/info` can take 10–20 s while the rest of the UI loads); the map is rebuilt as soon as it arrives, without waiting for Music Assistant. A device's own speaker integration (Cast, DLNA…) stays the main route even while it is unavailable (e.g. a switched-off TV's DLNA player), not the TV's own remote-control player.

## 2.6.0b1 – 2026-11-01

Cantabile 2.6 (beta): a setup wizard – adding the integration now walks through speakers, music library, radio stations, TV, voice and the dashboard, and puts a ready-filled card on a new sidebar dashboard; the wizard can be run again later, also step by step.

- **Setup wizard** when adding the integration (English and Hungarian), every step after the welcome skippable:
  - **Speakers:** the media players grouped by integration (Sonos, WiiM, LinkPlay, Google Cast, DLNA DMR, Music Assistant, Squeezebox, others) with their names; speakers are ticked, TVs, Cast groups, media servers, players that can't play media and the DLNA twin of a speaker that already has its own integration are not. The *default speaker* comes first on the card. Names longer than 8 characters get a short card name (a word shared by all names, like “Sonos” or “Speaker”, is left out). Without any media player the step says which integration to add first.
  - **Music library:** the media-source folders that hold audio files (network storage added under *Settings → System → Storage* included), counted in the background with a time limit so a slow NAS doesn't hold it up; the most likely music folder, a 48 kHz copies folder (“48”, “Hi-Res”) and the uploads folder are suggested; a how-to for adding network storage.
  - **Radio stations:** the 30 most popular stations of Home Assistant's country from Radio Browser (through the same client as the card engine), the top six ticked, at most 12; a frequency in the name (“Klubrádió 95,3”) places the station on the dial; long names get a short button label. Without internet the step explains how to fill the buttons later.
  - **TV:** Cast devices with a screen and DLNA TVs (only clear TVs are ticked), with a plain check of the requirements – https address / Home Assistant Cloud for the Cast TV page, internal URL for DLNA, ffmpeg. For a Cast TV the hidden `cantabile-tv` dashboard is created; once the integration is loaded, the new “TV · …” players are added to the card's speakers.
  - **Voice:** the conversation agents found, the *Assist tool* option, and numbered steps for turning Cantabile on in the agent's options.
  - **Dashboard:** a new storage-mode dashboard in the sidebar (default *Music* / *Zene*, `mdi:radio`, created through Home Assistant's dashboards collection) with the card in a panel view, or the card appended to a view of an existing dashboard (a new section in a sections view), or nothing. YAML dashboards get the card snippet to paste. The card is written in the README's English keys, filled with the choices above.
  - **Summary:** what was set up, skipped or needs attention, and where to change things later.
- **Configure** now opens a menu: *Settings* (the previous options form, unchanged) and **Setup wizard** – the whole wizard from the start or any single step; *Save and finish* writes the speakers, stations and music folder into the existing Cantabile cards like the card's ⚙ *Save* (every card set up like the first one, in its own Hungarian or English keys; per-speaker settings such as names, short names, `spotify_device` and station frequencies are kept), and a new card placed by the wizard is a copy of the first card.
- Upgrading doesn't start the wizard and changes no card or option; existing config entries keep working as they are.
- The Radio Browser client is a module-level function (`music.rb_kerdez`) shared by the card engine and the wizard.
- Fix: reloading the integration (e.g. after saving the options) after Home Assistant had started logged “Unable to remove unknown job listener” from the Sonos queue restorer.
- Tests: `tests/` (pytest, without a running Home Assistant) for the wizard's discovery, the card writing and the flow steps.

## 2.5.0 – 2026-11-01

Cantabile 2.5: the TV window goes full screen on tablets and notebooks, with a video-player-style volume slider on the left edge.

- **TV window in full screen:** a ⛶ FULL SCREEN button in the TV window's bottom bar shows the TV page across the whole screen – on a notebook the browser goes full screen (like F11), on a tablet too, turned to landscape on Android; where the browser doesn't allow it (some embedded views, a kiosk browser), the picture covers the whole Home Assistant page instead. A tap, Esc or closing the window goes back; the screen doesn't sleep meanwhile; switching speakers keeps it full screen, and it closes 5 seconds after the music stops, like the window.
- **Volume slider in full screen:** in the TV window's full screen a linear volume slider slides out on the left edge, like in video players – tap the left edge (or move the mouse there) to show it; drag up / down on the left edge to change the volume relatively, or set it directly on the slider; the mouse wheel and ↑ / ↓ change it by 2%. It hides after 2.5 seconds; tapping the left edge doesn't leave full screen.

## 2.4.0 – 2026-11-01

Cantabile 2.4: lyrics of streamed tracks are kept on the server and upgraded to timed lyrics when they appear, the lyrics collector copes with LRCLIB's outages and rate limit, and the TV window on the card follows track changes again.

- **Lyrics store for streaming:** lyrics of tracks that don't come from the music folder (Deezer, Spotify, Music Assistant, Sonos favourites, AirPlay, radio with artist and title) are saved on the Home Assistant server in `.cache/cantabile_dalszoveg/Artist/Title.lrc` (bracketed suffixes like “(Remastered 2011)” dropped from the name) and read from there next time – without internet and after a restart. When the same track is in the music folder too, the lyrics are saved beside that file as well (looked up in the already-read folder list while playing, so it never waits for a folder scan). The background collector also goes through the store: plain lyrics are checked for a timed version every 30 days and replaced when one appears (status: `tarolo`, `tarolo_kesz`, `tarolo_csere` in `cantabile/lyrics/collect_status`).
- **Fix: the TV window on the card didn't follow track changes.** Its listeners ran outside Home Assistant's event loop, so a new track's details (title, cover, length, lyrics) never arrived – the window kept showing what played when it was opened, also after switching speakers, until it was closed and opened again. The same fix applies to the TV mirror's and the VU meter's reaction to the WiiM's precise (UPnP) track changes.
- Lyrics: a passing LRCLIB error (503, timeout) no longer stops the music-folder lyrics collector for half an hour – it waits 10 / 30 / 60 seconds and asks for the same track again, and pauses only after 5 failures in a row. Lyrics shown while playing are asked again after a timeout too, not only after a 503.
- Lyrics: LRCLIB's rate limit (429 “too many requests”) is respected. Cantabile waits as long as LRCLIB asks (`Retry-After`, at least a minute) and doesn't ask LRCLIB at all meanwhile – lyrics shown while playing come from lyrics.ovh then. Requests are at least 1 second apart; the collector takes 5 seconds between tracks, slows down after each 429 (up to 30 seconds) and speeds up again gradually; its current pace is `szunet` in `cantabile/lyrics/collect_status`.

## 2.3.0 – 2026-10-31

Cantabile 2.3: lyrics kept next to the music as `.lrc` files, a background job collecting timed lyrics for the whole music folder, a KARAOKE tag on the TV, and a logarithmic volume curve for browser playback.

- The REPEAT button shows the number of rounds to the right of its icon, not on top of it.
- **Lyrics are kept next to the music:** found lyrics are saved as an `.lrc` file beside the track (the standard lyrics file other players read too), and read from there first – without internet, even when the lyrics services are down. Timed lyrics replace plain ones, never the other way round.
- **Timed lyrics for the whole music folder:** whenever LRCLIB is reachable, a background job goes through the music folder at a gentle pace (one track every 2 seconds) and saves the timed lyrics it finds; tracks without lyrics are asked again after 30 days (`.cache/cantabile_dalszoveg.json`; status: `cantabile/lyrics/collect_status`).
- Cantabile TV: when the lyrics are timed (the line playing is highlighted karaoke-style), a 🎤 KARAOKE tag shows among the track details.
- BT (playback in the browser): the volume knob follows a logarithmic curve over 50 dB, like a hi-fi volume control – the browser's own volume is linear, so it used to jump at the bottom and hardly change at the top. Sonos and WiiM keep using their own curve.

## 2.2.0 – 2026-10-31

Cantabile 2.2: one button per speaker, switching speakers without a gap from the exact position, the same track from
another source when a speaker can't play the original, a new TV page with the cover (or a spinning vinyl) and running
lyrics – also in a small window on the card – and the music folder in track-number order.

### Speakers and playback
- **One button per speaker.** A speaker and its Music Assistant player (e.g. *Sonos 1* and *Sonos MA*, the same device) are one position on the speaker selector. Music Assistant content plays on the Music Assistant player behind the button, everything else (music folder, radio, Deezer) on the speaker's own player, so a music-folder track no longer ends up in a Music Assistant queue. Existing configurations are merged automatically; a Music Assistant player without a paired speaker keeps its own button.
- **Switching speakers keeps the exact position.** The new speaker starts first, the card waits until it really plays the same track, seeks to where the old one is *now* (the seconds spent switching are added), checks the position and retries if needed – and only then stops the old one. If the new speaker doesn't start, the old one keeps playing and the card says so.
- **EJECT with nothing playing inserts an empty tape:** the loaded tape is taken out and the old queues are cleared – on the selected speaker even when paused, on the others only when they neither play nor pause (and aren't someone else's): the Sonos queue, Cantabile's track list, the Music Assistant queue. Then the library opens as before.
- **Source substitution: the same track from another source** when the chosen speaker can't play the original (new `helyettesit.py`, websocket `cantabile/substitute`):
  - Deezer on a speaker that isn't a Sonos: through the Deezer linked in Music Assistant on the Music Assistant player behind the button, otherwise from the music folder;
  - a Deezer queue playing on Sonos can now be moved to such a speaker too, from the same track and position;
  - a Music Assistant track on a button without a Music Assistant player: on Sonos from Sonos' own Deezer (when it is a Deezer track in Music Assistant), otherwise from the music folder – also when switching speakers mid-track.
  - The music folder is searched by artist (any folder level) and title (without track number, artist and album prefixes); a studio version is preferred to a live one. The card says where it plays from and how many tracks were not found.
- **Moving a PARTY to another speaker continues the same track from the same position** (instead of starting a new random track); the guest requests, the history and the guest link (QR code) move along. `cantabile/party/start` takes `folytat` (the old speaker) and `poz`.
- **Seamless speaker switching:** the new speaker starts muted, seeks to the position and only then gets its volume back, while the old one is still playing – no more moment of the track's beginning. Cantabile TV starts right at the position instead of seeking: the Cast TV page plays from there (media fragment), and a DLNA TV gets a still video that starts at the position (DLNA TVs often can't seek); the TV's progress is shown with the offset. Also for a PARTY. `cantabile.play_tracks` takes `position`.
- **Precise WiiM state from UPnP:** the gapless player already asks the WiiM (DLNA renderer) every second which file plays and where; this is now shared, so the TV mirror, the VU meter and switching speakers use the exact track, position and length – the WiiM's Home Assistant entity can keep the previous track's length and position after a gapless change. The TV mirror and the VU follow a gapless track change immediately. `cantabile/tracks` also returns `position` and `duration`.
- **AirPlay as a source:** when a phone sends AirPlay to a Sonos or WiiM, the tape shows AIRPLAY with the title and artist from the phone, STOP pauses (the phone stops too), the signal path says AirPlay, and the TV mirror shows e.g. “▶ SONOS 1 · AIRPLAY”. Switching speakers doesn't try to move it – the card says to pick the other speaker in the phone's AirPlay menu; starting other music takes over without switching inputs.

### Cantabile TV
- **Cantabile TV: the current weather before the clock** – a line icon (sun, clouds, rain, snow, fog, storm…) and the temperature, top right of the TV page, refreshed with the clock. Set `weather: weather.xxx` on the `custom:cantabile-tv` card; without it `weather.home` or the first weather entity is used, `weather: false` hides it.
- **Cantabile TV reloads itself after an update.** The TV page tells the server which card version it runs; when it is older than the dashboard's current one, the server sends the page again – right away if the TV is idle, otherwise at the next start (a playing track is never cut). When the page is sent again while something plays (e.g. with the new admin command `cantabile/tv/reload`), it continues from the same position, and the sequence player doesn't skip to the next track meanwhile.
- DLNA TVs: switching to a DLNA TV mid-track now starts a live still-video stream right at the position (it starts in about two seconds, no waiting for encoding); a DLNA TV that can't seek no longer shows an error – the seek is skipped quietly, and the card's background calls (like the seek after switching) never pop up Home Assistant's error toast.
- Cantabile TV on DLNA TVs: the track position, the full track length and so the VU meter are right also when the TV doesn't report its position or plays a video that starts mid-track; the card recognises a music-folder track reported as a media-source id (track counter and tape name instead of “–/–” and the album name), and an album tag like “Artist - Album” is shown without the artist.
- Cantabile TV mirror of a music-folder track: the file's own tags are used (a WiiM reports the file name as the title, e.g. “Cher - Dark Lady.Mp3”); when the speaker reports a stale length or position (gapless playback on a WiiM keeps the previous track's), the file's length and the time since the track change are shown, pauses excluded; the speaker's card name is looked up on every Cantabile card, not only the first one (“TECHNICS · NAS” instead of the device name).
- Cantabile TV mirror survives a Home Assistant restart: which TV mirrors which speaker is stored; when the TV page signs in again, the mirror continues (waiting up to 3 minutes for the speaker to play again). A dropped connection keeps the mirror; it is forgotten only when it really ends (the TV plays, you switch to the TV, 10 minutes of silence, another area).
- Cantabile TV mirror of a radio station shows the station's name instead of the stream address: looked up in the stations of every Cantabile card (whatever the address scheme, e.g. Sonos' x-rincon-mp3radio://), otherwise in Radio Browser by the stream address; a stream address reported as the title is dropped.
- **Cantabile TV: spinning vinyl with a circular spectrum and running lyrics.** The look `visual: vinyl` shows a turning record on the left – the cover is its label, a circular spectrum pulses around it (the bass makes the record breathe), and the tonearm moves in as the track plays; the record spins up and slows down with play and pause. Under the track details the lyrics run along (LRCLIB): the previous, the current (large, filling up karaoke-style) and the next line; without timed lyrics the lines follow the track's progress. `lyrics: false` hides them; `visual: bars` / `wave` / `both` brings back the equaliser.
- The card's ⚙ settings have a **TV look** section: the look of the Cantabile TV page (spinning vinyl, equaliser bars, waveform, or both) and the running lyrics, written into every `custom:cantabile-tv` card on save; the TV page picks it up by itself.
- TV look **cover** (`visual: cover`) – see below.
- New entities for the TV look: `select.cantabile_tv_look` / *TV look* (cover, spinning vinyl, equaliser bars, waveform, bars and waveform) and `switch.cantabile_tv_lyrics` / *TV lyrics* – usable in automations, scripts and by voice. They write the same `custom:cantabile-tv` card settings as the ⚙ panel and follow every change made there.
- **TV window on the card:** a TV button before ⓘ opens, over the deck, a small copy of the Cantabile TV page for the selected speaker – cover, track details, background pictures, progress and running lyrics, the same data as the TV mirror (new subscription `cantabile/tv/preview`, which doesn't sign in as a TV). It follows a speaker change; a tap closes it.
- The **cover look is the new default** of the TV page (`visual: cover`) and got a new layout: a smaller cover with the details beside it, and the lyrics across the full width at the bottom, centred, so long lines wrap onto two lines.
- TV window: it sits above the button row (never covers the buttons), shows the weather like the TVs (the `weather:` of the TV card), and closes by itself 5 seconds after the music stops (end of album, STOP).
- Cantabile TV: with YAML-mode resources the TV page is no longer resent on every play, and the mirror starts; one resend at a time (a play waits for it, and a newer play is never overwritten by the resumed track); a failed resend leaves the player OFF instead of PLAYING; switching to the mirror no longer restarts the old track; the automatic reload only runs in the daytime (starting the Cast app can wake a TV over HDMI-CEC).
- TV weather: `weather: true` no longer hides it, and a missing temperature no longer shows as 0°.
- Cantabile TV on DLNA TVs: when the still video of a long file (e.g. a one-hour album with a CUE sheet) isn't ready within 15 s, the music starts right away with the cover, and the video is finished in the background for the next time.
- Cantabile TV on DLNA TVs: no still video is made from files longer than 20 minutes (e.g. a whole album with a CUE sheet) – they play with the cover right away instead of encoding for minutes in the background.
- Cantabile TV mirror: a TV only shows a speaker that is in the same area (when both have one), so the living-room TV doesn't show what plays in the bedroom.
- **Lyrics fallback:** when LRCLIB is down or doesn't have the track, the lyrics come from lyrics.ovh (plain, untimed text) automatically. A service outage is now reported as such (it used to look like “no lyrics” and was cached).
- When there are no lyrics, the TV page shows the reason in a scrolling line: the services are unavailable (retried after two minutes), no lyrics found, instrumental track, or unknown artist / title.

### Music folder and Music Assistant
- **Track order from the tags:** within an album the tracks play (and are listed) by their disc and track number tags, so a music folder whose file names carry only the title (e.g. organised by beets) plays in the right order; without track numbers the file name decides, as before. The tags are read once per file and kept (`.cache/cantabile_sorszam.json`); new websocket command `cantabile/album_order`.
- The 48 kHz Sonos copies are also found for multi-disc albums (`<hires>/<artist>/<album> [48kHz]/CD<n>/<file>`).
- The music folder skips sub-folders marked with a `.nomedia` file (Kodi's convention, e.g. an archive of the original files): they don't appear in the library, the party, the search or the NAS tab.
- Music Assistant players: a music-folder track now plays as the same track of the Music Assistant library (its real title and cover, not the file name as an encoded link); an album in one file (with a CUE sheet) plays as the whole library album. When nothing matches, the file is played as before.
- Switching from a Music Assistant player that plays a music-folder file to a speaker that isn't a Music Assistant player (e.g. Sonos 1 from Sonos MA) lets Cantabile take over from the same track and position, instead of handing the queue back to the same Music Assistant player.

### Radio
- Radio: the Gyro tuning wheel also turns with an up / down drag (on a phone the wheel is narrow and upright, so a sideways drag was the only way and it seemed dead); a failed pointer capture no longer blocks it.

### Fixes
- Fixes from a full review:
  - PARTY: a failed start (busy speaker, missing music folder) no longer ends someone else's running party; on WiiM / Cast a party is no longer ended by a status check right after start or skip; skipping on a gapless player no longer drops a guest request; reloading the integration while a party runs works; on Sonos the party ends when anything it didn't queue starts playing (e.g. an album from the same music folder); the queue top-up stops with the party.
  - Guest page: odd tokens give 404 instead of a server error; the search uses a prepared index and a light rate limit (the page retries by itself); besides 3 requests per guest, one address can hold at most 6; only the party's owner (or an admin) can switch guests on / off.
  - Playlists: cover addresses must be https or Home Assistant's own; removing tracks quickly removes the right ones; Escape cancels renaming and Enter saves once; switching speakers starts a playlist (or a party) on the new speaker first and stops the old one only if that worked – otherwise the music stays where it was – and a playlist continues from the track that was playing.
  - ARTISTS: the Music Assistant library is paged by the server's real count (no silently cut lists); a source that didn't answer isn't cached for 5 minutes; an MA album without an artist no longer hides the MA section.
  - GENRES: “Hip-Hop”, “R'n'B” and drum & bass styles find their family; a genre page loads its Deezer data once.
  - Radio wheel: a broken saved list or a list replaced meanwhile no longer leaves the wheel stuck or plays the wrong station; a pending wheel step is cancelled when the card goes away.
  - The result message after a save goes only to the card that was rebuilt with the same speakers and stations.
- Moving a PARTY or a playlist between a Sonos and the Multiroom group that contains it no longer stops it right after it started there.
- GENRES: a failed Deezer load on a genre page is retried; *drum* alone (Steel Drum…) no longer counts as Electro, only drum & bass / drumstep.
- PARTY on Sonos with the hi-res folder: tracks with the same file name in another album (01.flac) no longer end the party.

## 2.1.0 – 2026-10-30

Cantabile 2.1: the library. EJECT now opens one window organised by what you want to hear – artists, genres, an endless party with guest requests, playlists – across the music folder, Music Assistant (and the services linked in it) and Deezer.

- **Library, step 1: new layout and ARTISTS.** The tape shelf is now the smoked-glass window (like the messages and ⓘ signal path) headed CANTABILE · LIBRARY, organised by what you want to hear: SEARCH · ARTISTS · GENRES · SOURCES ▾ · QUEUE. The per-source tabs (Streaming, Deezer, Spotify, Tidal, WiiM, MA, NAS, Phone) moved under SOURCES as a second row, which reopens the last one used.
  - **ARTISTS**: one A–Z list from the music folder (artist/album/track) and the Music Assistant library, each with coloured source dots; the search field filters it, and with 2+ letters also lists matching Deezer artists.
  - **Artist page**: portrait, source chips, **▶ SHUFFLE** (all the artist's tracks from the music folder, shuffled, as a cassette that plays anywhere; otherwise the artist on Music Assistant or the Deezer top tracks) and **◉ RADIO** (Deezer artist radio: the artist plus similar ones). Below it, by source: the music folder's albums, Music Assistant albums not already in the folder, the Deezer top tracks and albums, and **SIMILAR ARTISTS** (each opens its own page).
  - The library opens on ARTISTS for a new user (it used to open the music folder).
- **Library, step 2: GENRES.** Big picture tiles for the genre families, Deezer-style (Pop, Rock, Metal, Jazz, Electro…, with Deezer's genre images and names). The music files' often very fine tags go into their family (Art Rock, Glam-Rock, Progressive Rock → Rock; Symphonic Gothic Metal → Metal; Neo Soul → Soul & Funk…); what fits none is listed under MORE GENRES. Families with the most own albums come first; the tab also works without a music folder (Deezer only).
  - **Genre page**: image, **▶ SHUFFLE** (the tracks of the genre's own albums, shuffled, as a cassette that plays anywhere) and **◉ RADIO** (Deezer genre radio); sub-tag chips (All · Rock 156 · Art Rock 33 …) filter the own albums; then the Deezer CHART (top tracks as one cassette, top albums), PLAYLISTS, DEEZER RADIOS and ARTISTS (an artist opens its page; ‹ Back returns to the genre).
  - Server: the Deezer proxy also allows the artist related / radio, genre, genre chart and radio endpoints (for this and the next steps).
- **Library, step 3: PARTY.** An endless mix from the music folder that runs on the server, so it keeps playing when the card is closed. Pick the whole library or one or more genre families, then ▶ START PARTY on the selected speaker (or the Sonos multiroom group). The same track won't come back for a long time (up to 300 tracks), the same artist never twice in a row. On Sonos the next track always waits in the speaker's own queue (no gap); other players use the built-in sequence player. The tape shows a PARTY cassette: FF skips, STOP ends the party, PLAY restarts it, and switching speakers moves the party.
  - **Guest requests:** the tab shows a QR code with a secret link to a phone page (no Home Assistant account): now playing, search the music folder, “Request” with an optional name, and the requests coming up. Each guest can have 3 pending requests (30 in all); requested tracks play next, in order, marked “♥ … requested it”. GUESTS: OFF pauses requests and makes the old link and QR code invalid. The link uses Home Assistant's internal URL, so it works on the home Wi-Fi.
  - New: `party.py`, websocket commands `cantabile/party/start`, `…/stop`, `…/state`, `…/skip`, `…/guests`; guest page `/api/cantabile/party/<token>`; requirement `segno` (QR code). The sequence player also accepts an endless track source.
- **Library, step 4: PLAYLISTS.** One place for every playlist:
  - **My playlists** (Cantabile): stored on the server, so every card and user sees the same ones; tracks can come from the music folder, Deezer and Music Assistant mixed. **＋ THE TRACK PLAYING** / **＋ THE WHOLE QUEUE** (Sonos queue or the sequence player's tracks) add to an existing playlist or a new one. A playlist's page shows its tracks with source dots, plays from the top or from any track, and its owner (or an admin) can rename it, delete it or remove tracks.
  - Playing a mixed playlist plays what the speaker can: on Sonos the music folder (48 kHz copies where they exist) and Deezer in the Sonos queue, on a Music Assistant player the MA tracks, elsewhere the music folder; the card says how many were skipped and why. The tape shows the playlist as a cassette, and switching speakers starts it on the new one.
  - **Music Assistant · Deezer**: the MA library's playlists (with your Deezer favourites, now that Deezer is linked in MA) as cassettes; **Sonos favourites** playlists.
  - New: `listak.py`, websocket commands `cantabile/lists`, `cantabile/list/get`, `…/create`, `…/rename`, `…/delete`, `…/add`, `…/remove`, `…/now`, `…/play`.
- **Radio: browse with the tuning wheel, save with a long press.** The Gyro tuning wheel now steps through a Radio Browser list instead of tuning between the preset frequencies – the list a NET station came from (country, world, genre or search), otherwise your country's list, starting from the station that plays (a NET or a preset station). The list is also kept in the browser for a day, so the wheel starts at once and still works while Radio Browser is down. The display shows the station, its format and place (“5/40”), and it starts when you stop turning. A long press on a preset button saves the playing NET station there, overwriting the old one in place (it keeps the button's frequency) with an **Undo** in the message; a long press on an empty slot adds it. Admins only, saved to the same dashboards as ⚙. The result message now also shows after Home Assistant rebuilds the card on save (⚙ too).
- **Switching speakers with a Music Assistant queue now finds a way to keep playing on any output:**
  - target is a Music Assistant player, or the same device has one (Sonos 1 ↔ its MA player, Technics ↔ WiiM MA, Nest Hub…): Music Assistant moves the queue there, and the selector moves to that MA player if it's on the card;
  - no MA counterpart (a Cantabile TV, BT on this device…) but the track comes from the music folder: Cantabile takes over – the album from the music folder, from the same track and position – and Music Assistant stops;
  - otherwise (a Music Assistant streaming provider) it stays where it plays and the card says why.
  The pairing comes from Home Assistant's registries (same Sonos / Cast / WiiM id, or the one device with the same name). New websocket command `cantabile/ma/now`; `cantabile/ma/info` also returns `pairs`.
- SEARCH: tapping an artist now opens the shared artist page (music folder + Music Assistant + Deezer, with SHUFFLE and RADIO) instead of jumping to one source tab; ‹ Back returns to the results.
- ARTISTS: the whole Music Assistant artist library is read (in pages of 200, it used to stop at 150), and the “01”, “02_Sweet”-style artists Music Assistant makes from untagged files are left out. PARTY: the QR code scales to its box instead of being cropped.
- README (English and Hungarian) rewritten around the library, with new pictures of the library (genres, a genre page, an artist page, the party, playlists) and a new demo; every picture now shows the black front panel. The card picker's description mentions the library.

## 2.0.1 – 2026-10-30

- MA tab: the library list is fetched in the background when the shelf opens and kept for 5 minutes, so the tab shows up at once (the first request can take several seconds while Home Assistant / Music Assistant warm up).
- MA tab: albums and tracks without a name (Music Assistant adds them from untagged files) are no longer shown as empty tiles.

## 2.0.0 – 2026-10-30

Cantabile 2: Music Assistant joins as an optional source, alongside its own sources and engine.


- **Music Assistant as an optional source** – if the Music Assistant integration is set up in Home Assistant, the tape shelf gets an **MA** tab: search, and the library as ALBUMS · ARTISTS · PLAYLISTS · TRACKS · RADIO with covers (an artist opens its albums). A tap plays it on a Music Assistant player with Music Assistant's own queue (on any other speaker the card offers the card's MA players with ▶ buttons). The QUEUE tab shows the MA queue's current and next track with covers (MA manages that queue; reordering stays in MA – Home Assistant has no service for it). Switching speakers moves an MA queue to another MA player with Music Assistant's transfer (it carries on where it was); to a non-MA speaker it doesn't move. The tape display shows “MA” as the source, the ⓘ signal path an MA branch. Covers come through Cantabile (signed links), so they show on https and remotely too. Cantabile is unchanged without Music Assistant; it only uses Home Assistant's official Music Assistant services (no own MA client). New websocket commands `cantabile/ma/info`, `…/library`, `…/search`, `…/play`, `…/queue`, `…/transfer`; image endpoint `/api/cantabile/ma_kep/…`.
- **ⓘ Signal path** – a new button before ⚙ on both front panels opens a live window (the smoked-glass message window, larger): **SOURCE → PROCESSING → OUTPUT**, drawn in the source's colour with flowing arrows while it plays. Source: the station / track / input (e.g. “BT IN · Bluetooth · Redmi Note 13 Pro 5G”) with artist and format; processing: how the sound gets to the player (signed media link, Sonos queue, sequence player, direct stream, relay, catalogue link, direct input) plus the EQ profile or Sonos tone; output: the speaker, its group, volume and a TV mirroring it; and whether the VU meter shows the real signal or a simulation. It follows the playback while open, closes with CLOSE or after 60 s without a touch.
- Fixes from a full review:
  - PAIR guide: Bluetooth device and speaker names are now escaped (a device name could inject HTML).
  - BASS / TREBLE and EQ sliders: a refresh during a pending change no longer throws or drops the change; dragging no longer gets stuck when the panel re-renders; turning a knob or a slider keeps the panel open (it used to close after 20 s while you were using it); the profile-name field keeps its focus; the “Pairing mode …” status now shows up; LOUDNESS no longer turns the profile display into CUSTOM; picking a profile cancels a pending slider change.
  - Inputs: switching away from a speaker on BT IN pauses it only for Bluetooth – TV / line inputs keep playing; switching back resumes even if the other speaker is also on an input; STOP on an input releases the speaker lock; PAIR stops on a speaker that is in use; music started from the card waits a moment after switching the speaker back to the network.
  - Server: the input switch claims the speaker only after it succeeded; WiiM sources recognised for optical / TV / phono (new AUTO rows); a WiiM that doesn't answer no longer stalls the panel for 15–20 s (shorter timeout, parallel queries, no queries while unavailable); an automatic profile that failed is retried; a stale one from a quickly skipped album isn't applied; unknown built-in sounds, band names and profile names are rejected; saving with the EQ off stores the flat setting you hear; a player whose input list also lists apps (e.g. a Samsung TV) only shows its real inputs; WiiM inputs are switched on the device when the player can't; storage and the genre store load once and tolerate old data; albums in the music folder's root now match their genre.
  - **Shared profiles and AUTO rules are admin-only to change** (deleting / overwriting a profile, AUTO assignments); anyone can still save a new profile and use PAIR.
  - Old Chrome (Cast receivers): the knob caps no longer depend on `inset`.

## 1.12.22 – 2026-10-30

- **PAIR** key next to the inputs (speakers with a Bluetooth input, e.g. WiiM): one tap switches the speaker to BT IN and opens a step-by-step guide to connect a phone or tablet – with the speaker's exact Bluetooth name, an “Open” button for the Bluetooth settings on Android, the known (paired) devices, and a live status that shows “✓ Connected: <device>” as soon as it connects (checked every 3 s while the guide is open). It also lists the no-pairing ways over Wi-Fi (Spotify Connect, TIDAL Connect, AirPlay, the card's PHONE tab). On BT IN the INPUT line shows the connected device. Pairing itself always starts on the phone – a web page has no access to Bluetooth.
- PAIR now also puts the speaker into **pairing mode** (WiiM `btavkenterpair` – the light flashes slowly green), so a new phone / tablet finds it: an already paired speaker only calls back its last device and isn't discoverable otherwise. The guide has a PAIRING MODE key to turn it on again if it timed out. New websocket command `cantabile/bt/pair`.
- The PAIR guide warns when another device is already connected: a WiiM takes one Bluetooth source at a time and stays invisible to other devices until that one turns Bluetooth off or disconnects – the speaker can't drop it itself (its HTTP API has no source-side disconnect, and leaving the BT input keeps the link).
- `cantabile/controls` returns `bt` (the speaker's Bluetooth name and its known source devices) for WiiM / LinkPlay speakers.

## 1.12.21 – 2026-10-30

- **EQ tab** on the INPUT · TONE panel (WiiM / LinkPlay), like an old graphic equalizer: a profile display with ◀ ▶, EQ ON, STORE, DEL, AUTO and ten lit sliders (31 Hz – 16 kHz; drag, scroll, double-tap = 0). BASS / TREBLE and the sliders move together: the knobs show the average of their bands, and turning a knob moves its sliders. The EQ is per input, as the WiiM keeps it.
- **Music profiles**: the WiiM's built-in sounds (Flat, Rock, Jazz, Classical, Vocal Booster, Loudness …) and your own profiles – STORE saves the current sliders under a name (kept in Home Assistant, shared by every card), DEL removes it.
- **Automatic profile (AUTO)** by source (radio, music folder, Deezer, TIDAL, Qobuz, Spotify, BT IN, LINE IN, other) and, for the music folder, by the album's genre (the GENRE tab's tags); the genre wins over the source, and a profile can also be “EQ OFF”. It changes only when the source or the album changes, so a manual setting stays until then.
- **LOUDNESS** key on Sonos (the speaker's own loudness switch).
- New websocket commands `cantabile/eq/set`, `cantabile/eq/profiles`, `cantabile/eq/profile/save`, `cantabile/eq/profile/delete`, `cantabile/eq/auto/set`; `cantabile/controls` also returns `eq` and `loudness`.

## 1.12.20 – 2026-10-30

- **INPUT · TONE**: a flip-down lower panel on both front panels (tab at the bottom), like the hinged flap of an old hi-fi, with the speaker's own inputs and BASS / TREBLE knobs (−10…+10). It closes with CLOSE or by itself after 20 s without a touch, and appears only when the speaker has something to set.
  - Inputs come from the player's `source_list` (on Sonos only the line / TV inputs, the rest are favourites); on a WiiM / LinkPlay device whose integration lists none (the WiiM Mini since the 2026.10 WiiM integration), from the device's own report (`plm_support`). Switching keeps the volume (a WiiM stores one per input), and starting music from the card on a speaker that is on BT / LINE IN switches it back to the network first. The radio display shows the input (“BT IN”) with the title the phone sends.
  - Tone: Sonos bass / treble entities; on a WiiM the 10-band EQ over its local HTTP API (BASS lifts or cuts 31–125 Hz and half of 250 Hz, TREBLE 4–16 kHz and half of 2 kHz; both at 0 turns the EQ off and restores “Flat”).
  - Bluetooth pairing is not done by Cantabile: pair and connect the phone / tablet with the speaker in the phone's Bluetooth settings (or the speaker's app, e.g. WiiM Home). BT IN only switches the speaker to its Bluetooth input; which device plays into it is chosen on that device.
  - New websocket commands `cantabile/controls`, `cantabile/input/select`, `cantabile/tone/set` (the input switch claims the speaker, both respect the speaker lock).
  - While a speaker plays from its own input, the tape deck no longer shows the loaded cassette as playing: the display cassette carries the input as its source tag (“BT IN”, “LINE IN”), the title / artist the phone sends (or the input's name), “Bluetooth | A2DP” as format, and the VU label reads “BT IN · SIMULATED” – the sound goes straight from the phone to the speaker and never passes the server, so there is nothing to measure (the server-side analysis is not started for it).
  - STOP on the tape deck while a speaker plays from its own input pauses it instead: a WiiM doesn't pass a stop on to the phone over Bluetooth, which then started again a few seconds later (a pause it does pass on); PLAY resumes.
  - Switching to another speaker while one plays from its own input (BT IN, LINE IN) no longer “carries over” the cassette loaded on the card: the input can't be moved, so that speaker is paused (on BT the phone pauses too), nothing starts on the new one, and switching back resumes it – unless music is carried back onto it.

## 1.12.19 – 2026-10-30

- TV mirror started and stopped at once when the TV was playing a music-folder tape: the sequence player took the TV going quiet for the end of the track and sent the next one to the TV, which ended the mirror. The card now starts the mirror only after moving the music, and the sequence player stops when its TV switches to mirroring.
- TV mirror of a Sonos playing from the music folder showed no details: Sonos reports no title / artist for these files, and the mirror waited for them. It now reads the file's own tags whenever the track changes.
- Cantabile's own address was not recognised when the Home Assistant internal URL setting ended in a space.
- Cantabile TV clock: after midnight the TV showed “24:04” instead of “0:04” (the Cast receiver's older Chrome turns `hour12: false` into a 24-hour cycle). The clock and the SLEEP time now use the 0–23 hour cycle, without a leading zero.
- An older TV page is now also cast again when playback starts on the TV (not only before mirroring), so a fix like this one reaches the TV by itself.

## 1.12.18 – 2026-10-30

- GENRE tab on the tape shelf (next to NAS): the music folder's albums by genre, from the music files' own genre tags. The genre of an album is read from its first file (ffprobe) in the background, a few at a time; the first time the tab shows the progress, after that the genres are kept in Home Assistant's storage and only new or changed album folders are read again. Several genres in one tag (“Rock; Blues”, “Pop/Rock”) put the album under each (up to three); ID3v1 numbers become names, spelling variants (“Hip Hop” / “Hip-Hop”, “RnB” / “R&B”) are merged. Albums without a genre tag are under “No genre”. “↻ Read again” rescans every album. New websocket command `cantabile/genres`.

## 1.12.17 – 2026-10-29

- A TV page that predates this tag is cast again once before mirroring (the page now also reports `source`).
- Cantabile TV mirror shows where the music plays and where it comes from, as a tag under the track details: “▶ SONOS 2 · DEEZER”, “▶ SONOS 1 · NAS”, “▶ SONOS 1 · RADIO” (the speaker's name from the card; the service from the music folder, the Sonos service id – Deezer, Spotify, TIDAL, Apple Music, YouTube Music, SoundCloud – or the link).

## 1.12.16 – 2026-10-29

- Cantabile TV mirror after an update: a Cast receiver only reconnects after a Home Assistant restart and keeps running the old card code, which doesn't know the mirror. The TV page now tells the server what it can do (`features` in `cantabile/tv/subscribe`); if an older page is running when a mirror should start, Cantabile casts the page again (with the fresh card) and then starts the mirror.

## 1.12.15 – 2026-10-29

- Cantabile TV mirror: when you switch the card from a playing Cast TV to another speaker (selector, moving the music, or the new ▶ buttons), the TV page stays on without sound and shows what plays there – title, artist, album, cover, rotating artist pictures and progress – and follows every new track, wherever it comes from. The equaliser follows the real signal level where it can be analysed, otherwise it is simulated. It follows further speaker changes and ends when the TV plays again, is turned off, or after 10 minutes of silence. New websocket command `cantabile/tv/follow`; the TV player shows `mirror_of` while mirroring.
- "Doesn't play here" messages offer the way out: when a search result or a tape plays only on other speakers (e.g. a Deezer album while a TV is selected), the message has a ▶ button for each speaker it plays on. A tap switches to that speaker – what was playing on the old one stops – and starts it straight away, so there is no need to leave the shelf and search again.

## 1.12.14 – 2026-10-29

- Voice search: every search box on the tape shelf (SEARCH, NAS, Deezer, Spotify, Tidal), in NET and in the ⚙ station search has a microphone button. Speak, and the recognised text goes into the box and is searched straight away. Recognition uses the speech-to-text of the default Assist voice assistant (streamed over the websocket, `assist_pipeline/run`, STT stage only); if there is none, the browser's own recogniser (Web Speech). Recording stops when you stop talking, on a second tap or after 10 s; missing https, a denied microphone or no recogniser give a clear message.

## 1.12.13 – 2026-10-29

- Speaker lock between users: a speaker belongs to the user who started music on it from a Cantabile card (or by voice as a logged-in user). Other users' cards show it dimmed with a slowly blinking lamp, can't select it or send it commands, and say who is using it ("… is in use: Kata · phone is using it."). The same user can continue from another device. Released on STOP / POWER / switching speaker, or after 5 minutes of silence; an administrator can take it over from the message (the previous user is told). Voice requests don't take a speaker someone else is using. New websocket commands `cantabile/lock/subscribe`, `cantabile/lock/claim`, `cantabile/lock/release`.

## 1.12.12 – 2026-10-29

Fixes from a full review:

- Unavailable speaker: a tape or station gives one message, no second "didn't start playing" warning, and no tape is saved as if loaded.
- The start watchdog stops when you press STOP / PAUSE / POWER or change speaker, accepts a paused player, waits 35 s for Spotify Connect.
- Expected failures stay quiet (group split, the seek after moving playback, background queue fill, stopping the sequencer); seeking is skipped on players that can't seek.
- SEARCH: each source gets at most 6 s, so a slow Radio Browser doesn't hold up the rest; a music-folder error is reported; the source choice follows a speaker change; "‹ Back" from an artist page returns to the results; years in folder names are only taken from “(1979)” or a leading “1979 - ” (so “2050 Before the Massacre” stays intact), titles starting with numbers (“50 Cent”) match correctly.
- WiiM queue: reloads only when a new preset / album starts, not on every track.
- Cantabile TV page: a late background image can't overwrite the new track's; the new background fades in over the old one (no dimming); when every background fails the record artwork is shown; the screen wake lock is requested once and released if playback paused meanwhile.
- DLNA TVs: the track-card cache key no longer contains signed (time-stamped) addresses, so pre-encoded videos and cards are reused instead of encoded again.
- After a tape is stopped (e.g. switching to radio), "next" on a TV no longer restarts the old tape.
- TV playback starts faster: the artist picture, album cover and TheAudioDB lookups run in parallel, and TheAudioDB is skipped for DLNA TVs; a failed TheAudioDB lookup is retried after 10 min instead of a day.
- Interrupted cover extraction / video encoding stops ffmpeg and removes its temporary file; local fanart is only looked up inside the media folders.

## 1.12.11 – 2026-10-29

- WIIM tab on the tape shelf (when a WiiM is among the speakers): the WiiM's presets as tapes – anything saved as a preset in the WiiM Home app, from any of its music services (Tidal, Qobuz, Amazon Music, Deezer, radio…), plays from Cantabile on the WiiM. On another speaker the card says where they play.
- QUEUE tab on a WiiM: when the WiiM plays its own queue (a preset or an album started in the WiiM app), the queue is listed and a tap jumps to a track.
- SEARCH tab (first on the shelf): one search box over every source at once – the music folder, Deezer, Spotify, the WiiM presets, the Sonos favourites, the card's stations and Radio Browser. The same album or track from several sources is one row (NAS folder names like “(1978) Dire Straits - Dire Straits [16Bit-44.1kHz]” are matched as “Dire Straits”), with source tags – bright where it plays on the chosen speaker, dim elsewhere. A tap plays it from the best source for that speaker (the music folder first, as it plays everywhere); a tag plays that source; if no source plays on that speaker, the card says which speakers each source plays on. Artists open in the music folder, or on Deezer / Spotify.

## 1.12.10 – 2026-10-29

- No silent failures any more:
  - every failed command shows a message (“Sonos 2: the command failed – …”);
  - a feature the player lacks (volume, shuffle, repeat, grouping) says so;
  - a tape or stream that can't play on the chosen speaker names the speakers it plays on (“This can't be played on Technics – it plays on: Sonos 1, Sonos 2”);
  - if the speaker accepts a tape, station or NET station but doesn't start playing within 12 s (45 s on Cantabile TV), the card says so and suggests other speakers.

## 1.12.9 – 2026-10-28

- When the chosen player is unavailable (e.g. a TV stick that went to sleep or dropped off the network), volume, next / previous and the other controls no longer do nothing silently: the card says “… is not available right now – turn it on or pick another speaker” (at most every 4 s while turning the knob), and the SPEAKERS selector shows unavailable positions dimmed, with a red lamp when one is selected.
- Cantabile TV page (Cast): while music plays it asks the TV to keep the screen on (Screen Wake Lock), so Android TV sticks shouldn't drop into the screensaver and then sleep after ~15 minutes (the page only plays audio, which the TV doesn't count as watched video); the result is reported once in a `cantabile_tv_diag` event.
- Cantabile TV: if closing the old page fails on a waking TV stick (“Failed to execute quit app”), the TV page is still sent instead of the playback failing.
- Cantabile TV page (Cast): the background now changes every 30 s with a slow crossfade (the slow zoom stays) – the artist's fanart from TheAudioDB (free public key) and Kodi-style images from the album / artist folder (`fanart`, `backdrop`, `background`, `artist`, `extrafanart/`), then the artist picture and the cover; images that fail to load are skipped.

## 1.12.8 – 2026-10-28

- Manifest: `network` listed under `after_dependencies` (the stream relay reads Home Assistant's own networks); 1.12.7 failed the hassfest check because of it. No functional change.

## 1.12.7 – 2026-10-28

Fixes from a full review of the integration:

- Stream relay, for users who are not administrators: requests now go through a resolver that only connects to public addresses outside Home Assistant's own networks (a home network with global IPv6 addresses is covered too), so redirects and DNS tricks can't reach the local network, and names that can't be resolved are refused. Addresses given as IPs are checked at every redirect. A station that drops mid-stream ends the stream cleanly; malformed addresses give 400 instead of 500.
- Track-by-track playback on players that show their own track IDs (Music Assistant, Squeezebox): the new track is recognised by an ID that differs from what played before (waiting up to 10 s), so skipping or a slow start no longer stops the tape; players that show the file name still notice when something else starts.
- ⚙: the frequency hint shows the band (it showed program text); after Save or a change in the card editor the card keeps the chosen speaker and mode right away; the DEEZER tab can be switched back on; a failed save on the default dashboard names it.
- Card editor: `fm_band: japan` / `auto` handled, the display key is only written when needed, the form isn't rebuilt on every state change.
- Japanese band: tuning starts mid-band. SPEAKERS label sizing is right on the first pass on text-zoomed phones.
- Cantabile TV page: restarting after the page was left can't start a second drawing loop or a second subscription.
- Reloading the integration stops the Sonos queue fill and the station watchers of the old instance.
- Embedded covers are extracted to a temporary file (no half-written covers), a slow ffmpeg check isn't remembered as "no libx264", interrupted uploads leave no partial files, symlinked NAS shares are recognised as mounts, and the Radio Browser mirror list is refreshed daily (and not re-fetched on every request after a failure).

## 1.12.6 – 2026-10-28

- Phone radio laid out like the phone tape deck: NET · SLEEP · BT right under the station buttons, then the volume knob with the SPEAKERS selector beside it, and at the bottom POWER in the left corner with the horizontal RADIO / TAPE switch in the middle.
- Very narrow phones (card under 390 px): the two-sided speaker selector is drawn a little smaller on the radio and the tape deck, so the names don't touch the volume knob.
- Wide radio (tablet, laptop): the volume knob moved to the left, POWER sits in the top right corner with the RADIO / TAPE switch below it.

## 1.12.5 – 2026-10-28

- Visual card editor: in the dashboard's card editor the speakers (picked from the media players), brand, front panel, display, music folder and FM band can be set without YAML; it keeps the card's key language (English or Hungarian) and the existing speakers' names. Stations and names stay on the card's ⚙.
- Japanese FM band (76–95 MHz): `fm_band: jp`, or automatically when Home Assistant's country is Japan – dial, tuning, station positions, ⚙ check and the frequency read from station names follow it.

## 1.12.4 – 2026-10-28

- The card uses its own fonts everywhere: a bundled Arial-compatible sans (Arimo, OFL) for all labels next to Michroma, Exo 2 and Great Vibes, so a phone with a replaced system font no longer changes the look; the phone's enlarged text size no longer pushes the layout apart (`text-size-adjust: none`).
- Speaker selector: names 30 % larger (with room for them, and accents no longer clipped); the SPEAKERS label is the same size and colour as VOLUME.
- Phones that enlarge text in the Home Assistant app (Android WebView text zoom, which `text-size-adjust` does not stop): the card measures the enlargement and scales its font sizes back by the same factor, so the layout stays as designed.
- Fixed two SVG labels on the cassette (side “A”, label brand) whose font attribute was broken by the font switch.
- Wide tape deck: the RADIO / TAPE switch moved next to the volume knob and the selector runs full width below it, so the larger selector no longer pushes the switch off the card's right edge; on narrower wide cards the volume knob moves up so the top speaker name can't touch the VOLUME label.

## 1.12.3 – 2026-10-28

- Speaker selector: at most 4 names per side; a 9th name sits centred above the knob, with a 10th the two top names sit side by side above it. Each line now leaves the knob radially (from its evenly spaced position on the ~270° arc) and turns horizontal at the height of its name.
- ⚙ Save works on the default Overview dashboard on Home Assistant versions before 2026.2 too (it failed with “Unknown config specified: lovelace”).
- ⚙ Save only updates the cards that had the same speakers and stations as this one (e.g. the same radio on a tablet and a phone dashboard); cards set up differently – say, one per room – are left alone instead of being overwritten.
- Voice and `cantabile.play` find artists, albums, tracks, stations and speakers written in non-Latin scripts (Cyrillic, Greek, CJK…); before, these names were ignored.
- Music folders reached through a symbolic link inside the media folder (e.g. `/media/Music` → a mounted NAS share) work for the tape search, the real VU signal and Cantabile TV; before they were refused as “outside the media folder”. Linked subfolders are followed, loops are skipped.
- Starting music on a second Sonos speaker no longer stops the first one's queue from filling up in the background (it used to stop after the first few tracks).
- Without ffmpeg (some Core / venv installs) DLNA TVs fall back to the music and the cover instead of failing, and a single warning in the log says why; the VU meters are simulated as before. If ffmpeg lacks libx264, live radio on DLNA TVs uses the mpeg4 encoder.
- Error messages from the server (music folder, lyrics, Spotify / Tidal, Sonos, Cantabile TV, uploads) follow Home Assistant's language – English unless it is Hungarian – instead of always being Hungarian.
- Stream relay (`/api/cantabile/stream`, used by the BT output and Cantabile TV): users who are not administrators can only relay public addresses, or local-network stations that are set up on a Cantabile card; redirects are checked hop by hop. Administrators and Home Assistant's own system users (e.g. the TV page's signed links) are not limited.
- Uploads into the temporary music folder accept audio files only; a read-only media folder gives a clear message instead of a server error.
- Music-folder checks that touch the disk (folder exists, mount point, cover file) run off Home Assistant's main loop, so a stalled NAS share can no longer freeze Home Assistant.
- Covers extracted from music files for Cantabile TV are cleaned up (the newest 200 stay), like the track-card videos.
- Cantabile TV page on Cast: the fonts (Michroma, Exo 2, Great Vibes) now load on the Cast receiver too, through a CORS-enabled route; before, the TV fell back to a default font when no Cantabile card had loaded them.
- Cantabile TV page: a page instance that is replaced or left stops its clock, progress and drawing timers, and the equaliser stops redrawing once the bars have settled in silence – lighter on TV sticks left on for days. Coming back to the view starts them again.
- Radio Browser: the mirror list is fetched from `all.api.radio-browser.info` (mirrors get retired; `fi1` is gone), with the known mirrors as fallback, on the card and the server. The ⚙ station search uses the same fallback.
- NET tab, home country: without a country set in Home Assistant the region of the browser language is used (e.g. en-GB → GB) instead of Hungary.
- Sleep timer message shows the time in 12 or 24 hours like the TV clock (your profile, else the country).
- ⚙: clearing a station's frequency field no longer blocks saving with a range error.
- Sonos queue reload after a restart works with any media folder name, not only `local`.
- Volume, shuffle, repeat and grouping are only sent to players that support them (some DLNA / Cast receivers don't); shuffle says so.
- Voice control uses saved ⚙ settings right away (it kept the old ones for up to 5 minutes).
- Removing the integration also removes the card's dashboard resource; reloading it no longer injects the card twice in YAML resource mode.
- README: minimum browser versions; for Cast TVs with YAML-mode resources, add the card resource by hand.
- Track-by-track playback (players without a queue) also follows players that don't show the file name – e.g. Music Assistant or Squeezebox report their own track ID and the tagged title: the cassette moved on only when the file name appeared, so it stopped after the first track. Now the player's own track ID, taken a moment after the start, tells a new track from “something else is playing”.
- The card only redraws when something it shows changes (players, switches, Cantabile's own entities, language) – not on every sensor update in the house; smoother on wall tablets in large installs.

## 1.12.2 – 2026-10-28

- Cantabile TV: when the integration reloads (e.g. after adding a TV), a running TV page and its track details – CUE sheet included – carry over to the re-created player, so the card no longer falls back to the whole file's title and length. If a player still doesn't know what plays, the TV page sends the details again and signs in anew.
- Speaker selector: the knob positions (where the lines meet the knob, and where the pointer turns) are spread evenly over a ~270° arc, from bottom left clockwise to bottom right, like on a real selector; with the names on one side only, over the knob's right half.
- TV page clock: 12 or 24 hours by the country set in Home Assistant (your profile's 12/24 setting wins), instead of the Cast receiver's language.
- Speaker selector: up to 10 positions (5 per side, rows a little closer). On phones the radio puts a two-sided selector on its own full-width row, and the tape deck draws it a little smaller.

## 1.12.1 – 2026-10-28

- Cantabile TV, single-file albums with a CUE sheet (e.g. `Album.flac` + `Album.cue`): the TV page and the card show the track actually playing – title, artist, “TRACK 3 / 10”, and the track's own time and length instead of the whole file's; next / previous jump within the file (Cast). On DLNA TVs the current track follows the TV's playback position.
- Cantabile TV players report a web address for music-folder files (like WiiM does), so the cassette recognises the NAS tape and the track number, and the VU meters analyse the real signal instead of simulating.
- After a Home Assistant restart a still-playing TV page tells the player what it plays, so the cassette is not left empty.
- If the Home Assistant app still runs on a Cast TV but its page lost the connection (e.g. after a restart), the player closes it and casts the TV page anew instead of waiting in vain.

## 1.12.0 – 2026-10-28

- **Cantabile TV**: TVs as speakers, with the track on the screen. Add them in the integration options (*TV players*); each becomes a `media_player` (“Cantabile TV · …”) that the card, the track player and voice control use like any other speaker.
  - **Cast devices** (TV sticks, Android TV boxes, Nest Hub…): a full-screen TV page – the artist image (Deezer) slowly moving in the background, the cover, title, artist, album · year, format chips, an amber equalizer with peak caps and a waveform line, a progress bar and a clock; for radio ON AIR and LIVE. The page plays the sound itself (Web Audio analysis, so the equalizer follows the music) and is cast automatically (`cast.show_lovelace_view`, dashboard `cantabile-tv`, view `tv`, card `custom:cantabile-tv`).
  - **DLNA TVs** (DLNA Digital Media Renderer integration): a full-screen still track card (cover, artist image, details) – sent as a video (the card + the music, AAC 256 kbps), because TVs' own music players don't show the cover. About 7 s preparation per track; on albums the next track is prepared in the background. Radio plays as a live video. Seeking is not available on these videos.
  - Track details from the file tags (ffprobe), the cover from the album folder or the file, the artist image from Deezer; untagged files get a tidy name from the file name (capitalised, copy suffix removed).
  - Next / previous track on the TV players (card FF/REW, Home Assistant controls, voice).
- **Speaker selector redrawn** (hi-fi style): the names are listed beside the knob – on the left right-aligned, on the right left-aligned – each joined to the knob with a straight and then slanted line; the pointer turns along the line of the chosen speaker, its lamp sits on the line next to the knob. Up to 4 positions all on the right; up to 8 positions (4 per side).
- Settings: a TV's own Cast / DLNA player is hidden from the speaker list when it has a Cantabile TV player; if one is still chosen, a warning with a *Switch* button appears (and a message when switching to it), plus a tip for Cast / DLNA devices that could become TV players.

## 1.11.1 – 2026-10-28

- Wording: "old hi-fi" instead of "1970s" (card picker description, README); the card description now also mentions the black front, Spotify and Tidal.
- README: new chapter *What to install – and what Cantabile brings*: what comes with Cantabile, what you install yourself, the streaming services (what they need, what they can do, where they play, what to watch out for) and connecting a NAS music library step by step.
- README: new black cassette-deck picture, refreshed radio / tape / phone pictures (lamps at the selector ticks), new sections on the front panels, card names and messages, Spotify / Tidal voice examples and a voice troubleshooting row.

## 1.11.0 – 2026-10-28

- Messages appear on the player itself instead of Home Assistant's toast: a smoked-glass window with an amber edge, a blinking lamp and a CANTABILE header (Michroma), the text in Exo 2; it slides in over the visible part of the card, an amber line runs down while it stays (4–10 s depending on length), then it fades out – a tap closes it at once. It is a separate layer above the card, so the layout is untouched. When the card is not visible (e.g. another page of a pager), the Home Assistant toast is used as before.
- Bundled fonts: Michroma and Exo 2 (SIL OFL 1.1, Latin + Latin Extended, served locally).

## 1.10.2 – 2026-10-28

- Black front: horizontal brushing, much finer and denser (1–2 px hairlines) and much fainter, on a deeper black.

## 1.10.1 – 2026-10-28

- Black front: a clearly brushed surface (three layers of hairlines of different spacing instead of one faint one); the cassette door's side strips and the edge of the cassette window and the VFD are black instead of chrome and white.
- SPEAKERS selector: the lamps sit at the outer end of the dial's tick marks instead of beside the names.

## 1.10.0 – 2026-10-28

- Speaker card names: each speaker has a name shown on the card (`short`, ⚙ column "On card", max. 8 characters) – used on the dial, the radio speaker switch, the header, the cassette info line, the queue and the messages. The full `name` stays for voice control and the Spotify device lookup. ⚙ refuses a longer card name, and asks for one when the full name is longer than 8 characters; a longer YAML name is cut to 8 on the card. The built-in Multiroom position keeps its label.

## 1.9.9 – 2026-10-28

- New front panel option: `finish: black` gives both decks a nineties-style black brushed front – light lettering, black keys, black knurled knobs with dark anodised caps. The displays, the cassette and the lamps keep their colours. Also selectable in ⚙ (Front panel: Silver / Black); `silver` stays the default.

## 1.9.8 – 2026-10-28

- Phone layout of the tape deck: the SPEAKERS selector is back beside the volume knob (under the five function buttons), the RADIO / TAPE switch moves below them; the selector and the knob are a little smaller so the outermost names fit on a 360 px wide phone.
- Fixed: on phones the selected speaker in the leftmost dial position lost its place and lamp (its side class collided with the layout's own `.bal` class), so the first speaker looked missing from the dial.

## 1.9.7 – 2026-10-28

- Voice: the Cantabile instructions given to the assistant no longer name the tool by its short name. With more than one LLM API enabled, Home Assistant lists it as `cantabile__cantabile_play`; a model told to use "cantabile_play" sometimes invented its own prefix (`cantabile:cantabile_play`), which Home Assistant rejects as an unknown tool, and the request fell back to the built-in media search.
- Voice: the instructions now say when to pick the Spotify, Tidal, Deezer or local source, so "play … on Spotify" reaches Spotify instead of the music folder and Deezer.

## 1.9.6 – 2026-10-28

- Spotify on Sonos is recognised on the tape display: Sonos marks Spotify with service id 9 (only 12 was known), so the quality field and the format line now read "Spotify" / "Spotify | stream".
- The source box names the streaming service (SPOTIFY, DEEZER, TIDAL, APPLE, YOUTUBE…) instead of a plain STREAM – also for a Spotify cassette on a Spotify Connect speaker. Bitrate and codec stay hidden for these: Sonos plays the service directly and reports neither.

## 1.9.5 – 2026-10-28

- Spotify Connect: the device Spotify is currently playing on also counts when the card looks for the speaker (Spotify may leave a WiiM out of its device list while it plays, listing only an anonymous id); when playback is already on that device, the card starts the cassette there without switching devices first.

## 1.9.4 – 2026-10-28

- Spotify, adapted to the stricter limits of Spotify developer apps (first test with a live Premium account):
  - Search asks for 10 results per type (more is refused with error 400).
  - Artist page: the "popular tracks" cassette comes from a search filtered to the artist (the top-tracks call is no longer available, 403), albums load 10 at a time (up to 30); one failing part no longer blanks the whole page.
  - Voice: "play <artist> from Spotify" uses the same filtered search, topped up with the artist's first album.
  - With an empty search field and nothing playing on Spotify (the Spotify player can then not be browsed), the tab asks what to search for instead of showing an error.

## 1.9.3 – 2026-10-27

- When a station starts on the selected speaker while the card shows the cassette deck (by voice, from another card or the speaker's own app), the card switches to the radio by itself. Flipping back to TAPE by hand is respected while the same station plays; changing speakers never flips the view.

## 1.9.2 – 2026-10-27

- Phone layout of the cassette deck: the five function buttons get their own full-width row, the volume knob sits next to the RADIO / TAPE switch, and the speaker selector has a row of its own – the outer speaker names no longer run off the card, and the button labels no longer overlap on narrow phones (360 px).

## 1.9.1 – 2026-10-27

- Own icon and logo (cassette with two reels and an amber “on” lamp; light and dark logo), shipped in the integration's `brand/` folder – Home Assistant 2026.3+ shows them automatically in Settings → Devices & services.

## 1.9.0 – 2026-10-27

- **Spotify and Tidal (experimental)** – new SPOTIFY β and TIDAL β tabs on the tape shelf: search artists / albums / tracks / playlists, artist pages, and for Spotify your own library through the Home Assistant Spotify integration.
  - Catalogue access goes through the integration (`cantabile/spotify`, `cantabile/tidal`, whitelisted read-only paths; keys and tokens stay on the server): Spotify with a developer key in the Cantabile options or the Home Assistant Spotify integration's login; Tidal with a developer key (openapi.tidal.com v2).
  - Playback on Sonos with the service's share link (account linked in the Sonos app) – queue, gapless, movable between Sonos speakers; Spotify also on Spotify Connect speakers through the Spotify integration (Premium), where the speaker selector hands playback over with Spotify Connect. Not on BT.
  - Voice: `source: spotify | tidal` (“play … from Spotify”).
  - Not yet confirmed with a live account: tested with invalid keys (clear errors), a forbidden path, and mocked catalogue answers (tabs, results, artist page, Sonos share-link and Spotify Connect branches).

## 1.8.0 – unreleased

Portability, part 2.

- Gapless playback on every DLNA renderer (`dlna_dmr`), WiiM and LinkPlay (Arylic, Audio Pro…) player – the UPnP description comes from the DLNA integration or the device registry; players without next-track support fall back to track-by-track.
- Ducking for announcements now covers every speaker on any Cantabile card (Cast, DLNA, Music Assistant…), across all dashboards; previously only Sonos / WiiM / LinkPlay, and only the first card's speakers.
- Sonos queue reorder and position no longer depend only on the Sonos integration's internals: fallback via the device registry (the speaker's address) and SoCo network discovery.
- Music folder can be any media source (Jellyfin, DLNA media server…): tracks are recognised by media class / content type, not only by file extension; search uses Home Assistant's media search where available, otherwise the tab asks you to browse.
- Moving a tape whose source the card doesn't know (e.g. started from the player's own app) no longer stops the old speaker – it keeps playing with a message.
- Voice tool works on older Home Assistant (no `llm.ToolResult` before late 2025).
- Minimum Home Assistant lowered to 2025.1 (imports and APIs checked on 2025.1.4).
- README: compatibility table, adding your own speakers and sources, troubleshooting.

## 1.7.0 – unreleased

Portability – tested in a clean Home Assistant without Sonos, WiiM, Deezer, stations or music folder, in English.

- Speakers: only players that can play media (PLAY_MEDIA) are offered in ⚙; switching to one that can't is refused with a message and the music keeps playing (it used to go silent). The speaker type is detected from the platform (Sonos → `sonos`, everything else → `url`) – `mode` is optional in YAML and set automatically in ⚙. New optional short name (`short`) for the rotary selector; long names no longer slide under the knob (side positions are anchored outwards).
- Stations: the frequency is optional. Internet-only stations are spread evenly on the dial and show WEB instead of MHz.
- Deezer: the DEEZER tab can be hidden in ⚙; if the Sonos can't play Deezer, the message explains how to link the account in the Sonos app.
- Panel view / tall card: the front panel keeps its proportions and is centred instead of stretching apart.
- The shelf header no longer says “Sonos favourites” without Sonos; all UI texts are translated; the music-folder example is English.
- Security: the BT radio proxy only passes audio (audio/*, ogg, octet-stream) – no web pages or JSON from the local network; the temporary upload folder is capped at 2 GB (oldest files go first).

## 1.6.0 – unreleased

- Your own music (picked on the phone / computer in the PHONE tab) now plays on any speaker: on BT directly, elsewhere it is uploaded to Home Assistant temporarily (`/api/cantabile/upload`, hidden `.cantabile_atmeneti` folder in the local media directory, deleted automatically after 24 hours). The first track plays as soon as it is uploaded; the rest are appended in the background (Sonos queue, or the new `cantabile.add_tracks` for the integration's sequence). The tape shows TEMP (with upload progress, e.g. TEMP ↑3/12).
- Own music playing on BT can now be moved to other speakers like any tape (the selector used to snap back).
- The track-by-track sequence (Cast etc.) now runs on the same live order as the WiiM one: reorderable and extendable while playing.
- File-like titles (WiiM reports the raw file name) are cleaned on the display.
- Verified live: own music on the bedroom Sonos with TEMP, the bedroom Sonos → WiiM → BT, and BT → the bedroom Sonos.

## 1.5.0 – unreleased

- Fast winding within a track (like a deck's CUE / REVIEW): a short tap on REW / FF still skips tracks; held, the display moves 10 s every half second (30 s after 3 s), the player jumps there every 1.5 s so you hear where you are, and playback continues from the release point. The reels spin fast meanwhile.
- The cassette's time bar is a scrubber: tap or drag to jump within the track.
- Works on Sonos (music folder and Deezer), WiiM, Cast and BT; not shown for live streams.
- Verified live on the living-room Sonos (music folder and Deezer) and BT.

## 1.4.2 – unreleased

- Choosing music from the phone / computer (PHONE tab) switches to BT and now stops what was playing on the previous output first (Sonos paused, others stopped) – like inserting a new tape. Verified live on the bedroom Sonos.

## 1.4.1 – unreleased

- Tape transfer from the WiiM uses the track actually playing (from the title field); the WiiM sequence also reports it (`current` was the track already handed over in advance).
- The seek after a transfer waits until the new output plays the transferred track, plus 2.5 s on WiiM / Cast (they show the title before they can seek).
- Verified live: NAS tape the living-room Sonos → the bedroom Sonos → WiiM → Nest Hub → BT → the living-room Sonos → Multiroom → WiiM, same track throughout, position continuous (43 → 54 → 61 → 69 → 79 → 87 → 98 → 105 s); Deezer tape between the Sonos speakers with snap-back on WiiM / BT; paused transfer the bedroom Sonos → WiiM.

## 1.4.0 – unreleased

- Tape deck routing: the speaker selector only redirects. A playing music-folder tape moves to any output (Sonos ↔ Sonos by grouping, otherwise the old output stops and the new one continues from the same track and position), from any device: the track list comes from the player itself (Sonos queue, the integration's WiiM sequence via `cantabile/tracks`, the card's BT list), so order changes and shuffling are kept.
- Deezer / Sonos-favourite tapes stay on Sonos: they move between the Sonos speakers (also Multiroom); selecting WiiM, Cast or BT snaps the selector back with a message and the music keeps playing. Music picked from the phone stays on BT the same way.
- Paused tape: the selector only selects; the next PLAY on the new output continues from the same track and position.
- The seek after a transfer waits until the new output really plays (Cast / WiiM load slower); the Sonos position is read from the speaker (`cantabile/sonos_position`), because Home Assistant does not always report it for music-folder tracks.
- Sonos paused on a music-folder track is reported by Home Assistant as `idle`: the card now treats it as paused (PLAY resumes instead of restarting the tape, the display shows PAUSE).

## 1.3.2 – unreleased

- Transferring to a single Sonos now splits a leftover Multiroom group first (awaited), so only the selected speaker plays – previously, after Multiroom, switching from WiiM / BT to the living-room Sonos also woke the bedroom Sonos.
- Verified live: BT plays an http-only station through the integration with real VU (≈ −12 dB) and gives the sound back to WiiM / the living-room Sonos; group sequence Multiroom → WiiM → the living-room Sonos → Multiroom → Nest Hub → the bedroom Sonos → Multiroom → BT → the living-room Sonos → WiiM.

## 1.3.1 – unreleased

- Radio routing: the speaker selector only redirects what is playing – the old output goes quiet and the same station starts on the new one, between any outputs (Sonos, WiiM, Cast, BT; Sonos ↔ Sonos still by grouping). Switches run one after another and remember the station being transferred, so fast switching no longer loses the station or leaves two outputs playing; a buffering output counts as playing.
- Stations are also recognised from the URL in the title field (WiiM, Cast report it there), so the dial no longer says “TAPE DECK PLAYING” for a station on the WiiM.
- BT returns the sound to the output it took it from.
- BT plays web radio through the integration (`/api/cantabile/stream`, signed link only): http-only stations also play when Home Assistant is opened over https, and the VU meter shows the real signal on BT radio too. Falls back to the direct link if the integration does not answer.
- Verified live: WiiM → the living-room Sonos → the bedroom Sonos → WiiM → Nest Hub → the living-room Sonos → Nest Hub → WiiM, fast switching (0.7 s), and Multiroom in and out.

## 1.3.0 – unreleased

- Radio front panel redesigned. Station buttons are half as tall, with 12 places (6 × 2; 4 × 3 on phones): empty places show “+” and open the NET catalogue. Right column: POWER with the RADIO / TAPE switch below it top left, the volume knob, below it BT · NET · SLEEP as equal icon buttons (like the tape deck), and the SPEAKERS rotary selector instead of the slide switches. On phones: POWER and RADIO / TAPE left of the volume knob, NET · SLEEP · BT and the SPEAKERS selector to its right.
- The dial shows every other frequency label when it is narrow (wall-tablet pager), instead of overlapping numbers.

## 1.2.1 – unreleased

- Queue reorder on Sonos keeps the music going: the playing track and its position are noted before the move; if the speaker stops or jumps afterwards, the playing track is resumed at its new place from the same position (verified live in all five move directions – in these the Sonos kept playing anyway, so the guard is a safety net).

## 1.2.0 – unreleased

- **Automatic resume after a Home Assistant restart**: when a Sonos is playing a music-folder queue whose signed links were issued before the restart, the queue is rebuilt with fresh links at the end of the current track and playback continues with the next one (at the end of the tape with REPEAT 1 it is only rebuilt; a pause mid-track is left to the card's reload on the next button press).
- **Ducking for announcements**: while an announcer speaks (Assist satellite listening / thinking / answering, or a media player playing a TTS message), playing Sonos and WiiM speakers are turned down to a set percentage (default 25 %) and restored 1.5 s later – unless someone changed the volume meanwhile. New options: announcers, music volume during announcements.
- **Drag to reorder the queue** (QUEUE tab, mouse and touch): Sonos via the new `cantabile.move_queue_item` service (AVTransport ReorderTracksInQueue), WiiM via `cantabile.set_order` (the running sequence continues in the new order), BT in the card's own list. Not offered while a Sonos queue is shuffled.
- **Gapless playback on WiiM**: the track sequence now drives the WiiM as a DLNA renderer and hands it the next track in advance (SetNextAVTransportURI), so it changes tracks without a pause; falls back to track-by-track play_media if UPnP is not available.
- BT (the device's own output): the next track's link is resolved and preloaded 20 s before the end – near-gapless change.

## 1.1.1 – unreleased

- After a Home Assistant restart the signed links (authSig) of music-folder tracks already in the Sonos queue are invalid (401): the current track finishes, then the Sonos stops. PLAY (when paused), FF, REW and a jump in the QUEUE tab now detect this (link issued before the start time reported by `cantabile/info`) and reload the tape with fresh links at the requested track. The track list is rebuilt from the Sonos queue itself, so it works from any device and keeps the queue order.

## 1.1.0 – unreleased

- Lyrics: tap the song title on the cassette, or the radio's now-playing line when it shows a song. New websocket command `cantabile/lyrics` (LRCLIB, in-memory cache, retry on 5xx). On the tape the synced line is highlighted and kept centred; on radio (no position) the text is shown without highlight. A new song while the panel is open loads its lyrics automatically.

## 1.0.7 – unreleased

- Tape deck REPEAT button: the repeat count (2–5, ∞) is shown inside the loop symbol instead of after the label; one pass shows the bare symbol.

## 1.0.6 – unreleased

- Wide layout: both panels share one grid cell – they fill the height given by the dashboard (wall-tablet pager) or take exactly their content height (sections view), no empty band under the header.
- Tape deck: the volume knob sits on the axis of the display and the five buttons; the speaker selector and the RADIO / TAPE switch on the axis of the transport keys.
- Rotary speaker selector: larger, wider label arc; the two-Sonos position is labelled MULTIROOM.
- Front-panel labels are English in every UI language (RADIO / TAPE, ON / OFF, signal and status texts, shelf tabs and group titles), like a real hi-fi.

## 1.0.5 – unreleased

- The wide (tablet) layout keeps the panel's aspect ratio where the dashboard gives no height (e.g. a sections view spanning two columns on a laptop).

## 1.0.4 – unreleased

- VFD display: a standard digital peak meter (dBFS, after IEC 60268-18) – sample peaks on a −40…0 dBFS scale, peak hold, 20 dB / 1.7 s fall-back; PEAK above −3 dBFS, OVER only on real clipping. The server now also sends per-channel sample peaks (`pl`, `pr`).
- Needle VU meters: loudness-normalised (like streaming services / ReplayGain) – each track's average loudness sits at −1 VU, so loud modern masters and quiet old recordings both swing around 0 VU.

## 1.0.3 – unreleased

- Cassette display: long titles and the artist · album line scroll back and forth when they don't fit; the quality stays fixed on the right.
- Cassette display: if something else was started meanwhile (voice, Sonos app, another device), the top line shows the list / album actually playing instead of the last loaded tape.

## 1.0.2 – unreleased

- Tape deck: the status text next to the RADIO / TAPE switch may wrap, so it fits on narrow tablet panels.

## 1.0.1 – unreleased

- Tape deck: five equal icon buttons with labels below – REPEAT, SHUFFLE, FADE, SLEEP, BT (BT toggles playback on this device).
  Tablet: under the display; phone: next to the volume knob.
- Tape deck: rotary speaker selector (the radio keeps the slide switches).
- The card is registered as a Lovelace resource (sections views rendered before the injected module).

## 1.0.0 – unreleased

First public release, generalised from a home-made dashboard card.

- `cantabile` integration (UI setup) that serves and registers the `custom:cantabile-card` card.
- Server side: real VU signal (`cantabile/signal`), music-folder listing and search, Deezer proxy, Radio Browser.
- Entities: repeat rounds, sleep timer, voice-started station.
- Services: `cantabile.play`, `cantabile.play_tracks`, `cantabile.stop_tracks`, `cantabile.sleep_timer`.
- Built-in track-by-track player for players without a queue (e.g. WiiM) and a repeat-round counter for Sonos.
- “Cantabile” LLM API for Assist (any LLM conversation agent).
- Card: Hungarian and English labels (follows the Home Assistant language), English configuration keys,
  configurable 48 kHz and upload folders, works without preset stations.
