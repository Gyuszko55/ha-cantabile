# Changelog

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
