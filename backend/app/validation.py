import re
from dataclasses import dataclass

MAX_QUERY_LENGTH = 500

# Alphanumeric (Unicode), spaces, common legal punctuation — no angle brackets or braces.
_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?", re.IGNORECASE),
    re.compile(r"disregard\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?", re.IGNORECASE),
    re.compile(r"system\s+prompt", re.IGNORECASE),
    re.compile(r"ignore\s+the\s+above", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(?:a\s+)?(?:helpful\s+)?assistant", re.IGNORECASE),
    re.compile(r"jailbreak", re.IGNORECASE),
    re.compile(r"developer\s+mode", re.IGNORECASE),
    re.compile(r"\bDAN\b", re.IGNORECASE),
    re.compile(r"reveal\s+(?:your\s+)?(?:hidden|system)\s+(?:instructions|prompt)", re.IGNORECASE),
    re.compile(r"override\s+(?:safety|system)", re.IGNORECASE),
]

_EMAIL_RE = re.compile(
    r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",
    re.IGNORECASE,
)

# Kenya: +254 / 254 / 0 + 7 or 1 + 8 digits; optional spaces/dashes.
_KE_PHONE_RE = re.compile(
    r"(?:\+?254|0)(?:[\s\-]*)(?:7|1)\d{8}\b",
    re.IGNORECASE,
)

# Labeled national / ID numbers (reduces false positives vs bare statute digits).
_ID_LABELED_RE = re.compile(
    r"\b(?:national\s+id|id\s*(?:no\.?|number)?|huduma|id)\s*[:\-#]?\s*\d[\d\s\-]{5,12}\b",
    re.IGNORECASE,
)


def _allowed_chars(s: str) -> bool:
    allowed_extra = ".,!?;:'\"()-/&%–—…•°"
    for ch in s:
        if ch.isalnum() or ch.isspace():
            continue
        if ch in allowed_extra:
            continue
        return False
    return True


def _scrub_pii(text: str) -> str:
    out = _EMAIL_RE.sub("[redacted]", text)
    out = _KE_PHONE_RE.sub("[redacted]", out)
    out = _ID_LABELED_RE.sub("[redacted]", out)
    return out


def _detect_prompt_injection(text: str) -> bool:
    if not text or not text.strip():
        return False
    for pat in _INJECTION_PATTERNS:
        if pat.search(text):
            return True
    return False


@dataclass
class ValidationResult:
    ok: bool
    sanitized: str | None = None
    error: str | None = None


def validate_and_sanitize_chat_input(raw_query: str) -> ValidationResult:
    """
    Step 1 pipeline: length → injection → PII scrub → charset → non-empty cleaned.
    """
    if raw_query is None or not str(raw_query).strip():
        return ValidationResult(ok=False, error="Query must not be empty.")

    q = str(raw_query)
    if len(q) > MAX_QUERY_LENGTH:
        return ValidationResult(
            ok=False,
            error=f"Query must be at most {MAX_QUERY_LENGTH} characters.",
        )

    if _detect_prompt_injection(q):
        return ValidationResult(
            ok=False,
            error="Query was rejected for security reasons (disallowed instruction pattern).",
        )

    cleaned = _scrub_pii(q)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if not cleaned:
        return ValidationResult(
            ok=False,
            error="Query became empty after removing sensitive information.",
        )

    if len(cleaned) > MAX_QUERY_LENGTH:
        return ValidationResult(
            ok=False,
            error=f"Query must be at most {MAX_QUERY_LENGTH} characters after sanitization.",
        )

    if not _allowed_chars(cleaned):
        return ValidationResult(
            ok=False,
            error="Query contains characters that are not allowed. Use letters, numbers, spaces, and standard punctuation.",
        )

    return ValidationResult(ok=True, sanitized=cleaned)
