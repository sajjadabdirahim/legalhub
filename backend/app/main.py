from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, chat, feedback, retrieval


@asynccontextmanager
async def lifespan(_app: FastAPI):
    import app.db.models  # noqa: F401 — register tables on Base.metadata
    from app.db.models import Base
    from app.db.session import engine

    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="LegalHub API", version="0.1.0", lifespan=lifespan)

# Regex covers any port on localhost / loopback / common LAN IPs (dev + phone-on-LAN testing).
_DEV_ORIGIN_REGEX = (
    r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?"
    r"|https?://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?"
    r"|https?://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=_DEV_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(retrieval.router, prefix="/api")
