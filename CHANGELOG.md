# Changelog

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
