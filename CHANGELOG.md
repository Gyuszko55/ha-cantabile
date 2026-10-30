# Changelog

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
