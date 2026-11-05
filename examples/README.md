# Cantabile from automations – examples

*Magyarul: [README.hu.md](README.hu.md)*

Every music action of Cantabile is also a Home Assistant action. It does the same as the card or voice control:
it searches by name and starts the music on the best path of the route matrix (the speaker's own service, Music
Assistant or the music folder). The files here are ready to paste; replace the speaker names and entity ids with
your own.

| File | What's in it |
|---|---|
| [automations.yaml](automations.yaml) | Morning radio, wake-up getting louder, evening album with sleep timer, welcome-home music, error handling with a phone message, radio on/off from a button |
| [script_play_music.yaml](script_play_music.yaml) | A reusable script with fields (what, where, volume, sleep timer) that returns what plays |
| [blueprint_example.yaml](blueprint_example.yaml) | An automation made from the blueprint *Cantabile: zene időpontra* |
| [webhook_mqtt.yaml](webhook_mqtt.yaml) | Start music from a webhook (phone shortcut, NFC tag) or an MQTT message; Node-RED and websocket notes |
| [rest_example.sh](rest_example.sh), [rest_example.py](rest_example.py) | Calling it from outside through the REST API, with the answer |

## The actions

| Action | Purpose | Fields |
|---|---|---|
| `cantabile.play` | Play an artist, album, track, station or playlist by name. The most used one. | `query` (required), `kind`, `artist`, `speaker`, `shuffle`, `source` |
| `cantabile.sleep_timer` | Stop after N minutes, fading out. 0 turns the timer off. | `entity_id`, `minutes` (0–720) |
| `cantabile.play_tracks` | Given music folder files, one after the other | `entity_id`, `tracks`, `start`, `position` |
| `cantabile.stop_tracks` | Stop Cantabile's track-by-track player on a non-Sonos speaker (otherwise the next track starts after a stop) | `entity_id` |
| `cantabile.add_tracks` | Tracks to the end of the queue | `entity_id`, `tracks` |
| `cantabile.set_order` | The order of the running series | `entity_id`, `tracks` |
| `cantabile.move_queue_item` | Move a track in a Sonos queue | `entity_id`, `from`, `to` |

`cantabile.play` fields:

- **query** – what to look for: the name of an artist, album, track, station or playlist.
- **kind** – `auto` (default) · `artist` · `album` · `track` · `radio` · `playlist`. Give it when a name is both
  an artist and an album (e.g. "Queen").
- **artist** – narrows an album or track search.
- **speaker** – the name in the card settings, or (from 2.7.1) the short name on the card's speaker selector. Empty:
  where something is playing, otherwise the first speaker.
- **shuffle** – `true` / `false`.
- **source** – `auto` (music folder and stations first, then streaming) · `local` (music folder only: fast, works
  without internet) · `deezer` · `spotify` · `tidal`.

Volume, pause and stop are the usual `media_player.*` actions on the speaker's entity. Set the volume *before*
starting the music, so it doesn't start loud.

## The answer

`cantabile.play` returns what plays and where. On an error it doesn't stop the automation: it returns
`success: false` and a readable `error`, so you can branch on it (example 5 in automations.yaml). Use
`response_variable` to get it. The other Cantabile actions return nothing.

```yaml
success: true
kind: album            # artist | album | track | radio | playlist
playing: A Kind of Magic
speaker: Bedroom
source: music folder   # music folder | Deezer | Spotify | Radio Browser | preset | Sonos favorites
shuffle: false
tracks: 9              # number of tracks from the music folder
```

## Blueprint: music at a set time

[![Open your Home Assistant instance and show the blueprint import dialog with a specific blueprint pre-filled.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2FGyuszko55%2Fha-cantabile%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fcantabile%2Fzene_idopontra.yaml)

*Cantabile: zene időpontra* ([file](../blueprints/automation/cantabile/zene_idopontra.yaml)) starts music or radio
at a set time on chosen days: fill in the form and make as many automations from it as you like, without YAML.
Import it with the button above, or copy the file into `config/blueprints/automation/cantabile/`.

Settings: time, days, only if someone is home · what to play, kind, artist, source, shuffle · speaker name and
entity, volume (set before the music starts), gradually louder (from 3 % in 10 steps, 1–30 minutes) · sleep
timer · a notify action that says why, if the music didn't start. If it fails, the volume goes back to what it was.

## Voice (Assist)

Cantabile gives the Assist agent its own tool (`cantabile_play`), so plain sentences work: "Play Queen in the
kitchen", "Put on Jazz FM". Turn on the Cantabile API in the agent's options. From an automation use
`conversation.process` with your agent's id and the sentence as `text`.

## Tips

- If the speaker name isn't found, the answer's `error` lists the names you can use – also visible in the
  automation's trace.
- What's playing: `{{ state_attr('media_player.living_room', 'media_title') }}`.
- Cantabile logs its decisions (last 300 entries); warnings also go to the HA log under
  `custom_components.cantabile`. In a bug report give the version shown in the card's bottom right corner.
