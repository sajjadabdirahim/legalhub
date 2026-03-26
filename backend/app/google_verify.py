from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import requests

from app.config import settings


def verify_google_credential(credential: str) -> dict:
    """
    Verify a Google Sign-In JWT (`credential` from GIS) and return token claims.
    Requires GOOGLE_CLIENT_ID to match the web client used in the SPA.
    """
    if not settings.google_client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID is not configured on the server.")
    # Some local environments set REQUESTS_CA_BUNDLE / SSL_CERT_FILE to invalid paths.
    # Use a dedicated requests session that ignores those env overrides.
    session = requests.Session()
    session.trust_env = False
    request = google_requests.Request(session=session)
    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            request,
            settings.google_client_id,
            # Allow small local clock drift (e.g. VM/Windows NTP lag).
            clock_skew_in_seconds=120,
        )
    except OSError as exc:
        raise RuntimeError(
            "Google verification failed due to local TLS certificate configuration. "
            "Unset REQUESTS_CA_BUNDLE/SSL_CERT_FILE (or fix their paths) and retry."
        ) from exc
    if idinfo.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("Wrong issuer.")
    return idinfo
