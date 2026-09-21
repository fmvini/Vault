from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FinTrack API"
    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./fintrack.db"
    jwt_secret_key: str = Field(default="development-only-change-me", min_length=16)
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60
    email_provider_api_key: str | None = None
    email_from: str = "FinTrack <notificacoes@example.com>"
    exchange_rate_api_key: str | None = None
    frontend_url: str = "http://localhost:5173"
    scheduler_enabled: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
