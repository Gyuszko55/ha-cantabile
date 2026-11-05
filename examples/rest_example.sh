#!/bin/sh
# Cantabile – calling it through the Home Assistant REST API / hívás a REST API-n át
#
# You need a long-lived access token: Profile → Security → Long-lived access tokens.
# Treat it like a password. Outside your home network use your Nabu Casa or own https address.
# Deezer / Spotify searches can take a few seconds: allow 30–60 s.

HA="http://homeassistant.local:8123"
TOKEN="<TOKEN>"

# Play, with the answer (?return_response)
curl -X POST "$HA/api/services/cantabile/play?return_response" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query": "Jazz FM", "kind": "radio", "speaker": "Living room"}'
# → {"changed_states": [...], "service_response": {"success": true, "kind": "radio",
#     "playing": "Jazz FM", "speaker": "Living room", "source": "preset"}}

# Sleep timer: stop in 30 minutes
curl -X POST "$HA/api/services/cantabile/sleep_timer" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"entity_id": "media_player.living_room", "minutes": 30}'

# The script from script_play_music.yaml
curl -X POST "$HA/api/services/script/play_music?return_response" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"what": "Queen", "where": "Kitchen", "player": "media_player.kitchen", "volume": 25}'
