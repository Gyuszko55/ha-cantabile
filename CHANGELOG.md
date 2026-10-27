# Changelog

## 1.4.0 – unreleased

- Tape deck routing: the speaker selector only redirects. A playing music-folder tape moves to any output (Sonos ↔ Sonos by grouping, otherwise the old output stops and the new one continues from the same track and position), from any device: the track list comes from the player itself (Sonos queue, the integration's WiiM sequence via `cantabile/tracks`, the card's BT list), so order changes and shuffling are kept.
- Deezer / Sonos-favourite tapes stay on Sonos: they move between the Sonos speakers (also Multiroom); selecting WiiM, Cast or BT snaps the selector back with a message and the music keeps playing. Music picked from the phone stays on BT the same way.
- Paused tape: the selector only selects; the next PLAY on the new output continues from the same track and position.
- The seek after a transfer waits until the new output really plays (Cast / WiiM load slower); the Sonos position is read from the speaker (`cantabile/sonos_position`), because Home Assistant does not always report it for music-folder tracks.
- Sonos paused on a music-folder track is reported by Home Assistant as `idle`: the card now treats it as paused (PLAY resumes instead of restarting the tape, the display shows PAUSE).

## 1.3.2 – unreleased

- Transferring to a single Sonos now splits a leftover Multiroom group first (awaited), so only the selected speaker plays – previously, after Multiroom, switching from WiiM / BT to Nappali also woke Háló.
- Verified live: BT plays an http-only station through the integration with real VU (≈ −12 dB) and gives the sound back to WiiM / Nappali; group sequence Multiroom → WiiM → Nappali → Multiroom → Nest Hub → Háló → Multiroom → BT → Nappali → WiiM.

## 1.3.1 – unreleased

- Radio routing: the speaker selector only redirects what is playing – the old output goes quiet and the same station starts on the new one, between any outputs (Sonos, WiiM, Cast, BT; Sonos ↔ Sonos still by grouping). Switches run one after another and remember the station being transferred, so fast switching no longer loses the station or leaves two outputs playing; a buffering output counts as playing.
- Stations are also recognised from the URL in the title field (WiiM, Cast report it there), so the dial no longer says “TAPE DECK PLAYING” for a station on the WiiM.
- BT returns the sound to the output it took it from.
- BT plays web radio through the integration (`/api/cantabile/stream`, signed link only): http-only stations also play when Home Assistant is opened over https, and the VU meter shows the real signal on BT radio too. Falls back to the direct link if the integration does not answer.
- Verified live: WiiM → Nappali → Háló → WiiM → Nest Hub → Nappali → Nest Hub → WiiM, fast switching (0.7 s), and Multiroom in and out.

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
