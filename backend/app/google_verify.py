from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.config import settings


def verify_google_credential(credential: str) -> dict:
    """
    Verify a Google Sign-In JWT (`credential` from GIS) and return token claims.
    Requires GOOGLE_CLIENT_ID to match the web client used in the SPA.
    """
    if not settings.google_client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID is not configured on the server.")
    request = google_requests.Request()
    idinfo = id_token.verify_oauth2_token(
        credential,
        request,
        settings.google_client_id,
    )
    if idinfo.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("Wrong issuer.")
    return idinfo
