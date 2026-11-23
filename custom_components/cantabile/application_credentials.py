"""Application credentials platform: Cantabile's own Spotify login (OAuth2).

2.8.0: Cantabile no longer borrows the Home Assistant Spotify integration's session. The user authorizes Cantabile
directly (Settings → Devices & services → Cantabile → Reconfigure), with their own Spotify developer app's client ID
and secret entered once as application credentials.
"""

from homeassistant.components.application_credentials import AuthorizationServer
from homeassistant.core import HomeAssistant


async def async_get_authorization_server(hass: HomeAssistant) -> AuthorizationServer:
    """Return the Spotify authorization server."""
    return AuthorizationServer(
        authorize_url="https://accounts.spotify.com/authorize",
        token_url="https://accounts.spotify.com/api/token",
    )


async def async_get_description_placeholders(hass: HomeAssistant) -> dict[str, str]:
    """Placeholders for the application credentials dialog (links stay out of the translation strings)."""
    return {
        "developer_url": "https://developer.spotify.com/dashboard",
        "redirect_url": "https://my.home-assistant.io/redirect/oauth",
    }
