"""Cantabile – calling cantabile.play from Python through the Home Assistant REST API.

Needs a long-lived access token (Profile → Security). Treat it like a password.
"""
import requests

HA, TOKEN = "http://homeassistant.local:8123", "<TOKEN>"

r = requests.post(
    f"{HA}/api/services/cantabile/play?return_response",
    headers={"Authorization": f"Bearer {TOKEN}"},
    json={"query": "A Kind of Magic", "kind": "album", "speaker": "Bedroom"},
    timeout=60,  # streaming searches can take a few seconds
)
answer = r.json()["service_response"]
print(answer if answer["success"] else f"Didn't start: {answer['error']}")
