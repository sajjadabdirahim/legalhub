import uuid
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth_password import hash_password, verify_password
from app.config import settings
from app.db.models import User
from app.db.session import get_db
from app.google_verify import verify_google_credential
from app.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class GoogleLoginRequest(BaseModel):
    """GIS returns `credential` (JWT). Dev-only: `email` when GOOGLE_CLIENT_ID is unset."""

    credential: str | None = None
    email: EmailStr | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    user_id: str


def _issue_token(user: User) -> TokenResponse:
    token = create_access_token(subject=str(user.user_id))
    return TokenResponse(
        access_token=token,
        email=user.email,
        user_id=str(user.user_id),
    )


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.query(User).filter(User.email == str(body.email).lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(
        user_id=uuid.uuid4(),
        email=str(body.email).lower(),
        password_hash=hash_password(body.password),
        role="user",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists.") from None
    db.refresh(user)
    return _issue_token(user)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == str(body.email).lower()).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.password_hash:
        raise HTTPException(
            status_code=401,
            detail='This account uses Google sign-in. Use "Continue with Google" instead of a password.',
        )
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return _issue_token(user)


@router.post("/google", response_model=TokenResponse)
def login_google(
    body: GoogleLoginRequest | None = Body(default=None),
    db: Session = Depends(get_db),
) -> TokenResponse:
    email: str | None = None

    if body and body.credential and settings.google_client_id:
        try:
            claims: dict[str, Any] = verify_google_credential(body.credential)
        except (ValueError, RuntimeError) as e:
            raise HTTPException(status_code=401, detail="Invalid Google credential.") from e
        raw = claims.get("email")
        if not raw or not isinstance(raw, str):
            raise HTTPException(status_code=400, detail="Google token did not include an email.")
        email = raw.lower()
    elif body and body.email and not settings.google_client_id:
        # Local dev without Google OAuth client configured (email-only; not for production)
        email = str(body.email).lower()
    elif body and body.email and settings.google_client_id and not body.credential:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth is enabled on the server: use the Google button on the login page "
            "(set VITE_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID in the repo root .env and restart Vite). "
            "Password-style email login to /api/auth/google is disabled when GOOGLE_CLIENT_ID is set.",
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Send a Google credential JWT from the Sign-In button, or disable GOOGLE_CLIENT_ID for dev email login.",
        )

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            user_id=uuid.uuid4(),
            email=email,
            password_hash=None,
            role="user",
        )
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            user = db.query(User).filter(User.email == email).first()
            if user is None:
                raise HTTPException(status_code=500, detail="Could not create user.") from None
        else:
            db.refresh(user)

    return _issue_token(user)
