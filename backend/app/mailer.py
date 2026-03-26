import smtplib
from email.message import EmailMessage

from app.config import settings


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """
    Send a password reset email via SMTP.
    Raises RuntimeError when SMTP is not configured or send fails.
    """
    if not settings.smtp_host or not settings.smtp_from_email:
        raise RuntimeError(
            "SMTP is not configured. Set SMTP_HOST and SMTP_FROM_EMAIL (and credentials if required)."
        )

    msg = EmailMessage()
    msg["Subject"] = "LegalHub password reset"
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email
    msg.set_content(
        "You requested a password reset for LegalHub.\n\n"
        f"Reset your password using this link:\n{reset_url}\n\n"
        "This link expires in 30 minutes. If you did not request this, you can ignore this email."
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("Failed to send password reset email via SMTP.") from exc
