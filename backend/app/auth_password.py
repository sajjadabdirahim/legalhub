"""Password hashing with bcrypt (no passlib — bcrypt 4.1+ broke passlib's version probe)."""

import bcrypt

_BCRYPT_MAX_BYTES = 72


def _password_bytes(plain: str) -> bytes:
    b = plain.encode("utf-8")
    if len(b) > _BCRYPT_MAX_BYTES:
        return b[:_BCRYPT_MAX_BYTES]
    return b


def hash_password(plain: str) -> str:
    pw = _password_bytes(plain)
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    pw = _password_bytes(plain)
    try:
        return bcrypt.checkpw(pw, hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False
