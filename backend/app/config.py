from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    jwt_secret: str = Field(
        default="dev-legalhub-jwt-secret-change-me",
        validation_alias="JWT_SECRET",
    )
    jwt_algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=60 * 24,
        validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES",
    )
    database_url: str | None = Field(default=None, validation_alias="DATABASE_URL")
    google_client_id: str | None = Field(default=None, validation_alias="GOOGLE_CLIENT_ID")
    frontend_base_url: str = Field(default="http://localhost:8080", validation_alias="FRONTEND_BASE_URL")
    smtp_host: str | None = Field(default=None, validation_alias="SMTP_HOST")
    smtp_port: int = Field(default=587, validation_alias="SMTP_PORT")
    smtp_user: str | None = Field(default=None, validation_alias="SMTP_USER")
    smtp_password: str | None = Field(default=None, validation_alias="SMTP_PASSWORD")
    smtp_from_email: str | None = Field(default=None, validation_alias="SMTP_FROM_EMAIL")
    smtp_use_tls: bool = Field(default=True, validation_alias="SMTP_USE_TLS")
    huggingface_api_key: str | None = Field(default=None, validation_alias="HUGGINGFACE_API_KEY")
    hf_embedding_model: str = Field(
        default="nlpaueb/legal-bert-base-uncased",
        validation_alias="HF_EMBEDDING_MODEL",
    )
    faiss_index_path: str = Field(
        default="backend/ml_assets/faiss_index.index",
        validation_alias="FAISS_INDEX_PATH",
    )
    faiss_mapping_path: str = Field(
        default="backend/ml_assets/faiss_uuid_mapping.pkl",
        validation_alias="FAISS_MAPPING_PATH",
    )
    faiss_top_k: int = Field(default=5, validation_alias="FAISS_TOP_K")


settings = Settings()
