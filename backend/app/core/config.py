from functools import lru_cache

from pydantic import Field, model_validator
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
    cron_secret: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_production(self) -> "Settings":
        if self.environment != "production":
            return self
        if not self.database_url.startswith("postgresql+psycopg://"):
            raise ValueError("Production DATABASE_URL must use PostgreSQL with Psycopg")
        if self.jwt_secret_key == "development-only-change-me" or len(self.jwt_secret_key) < 32:
            raise ValueError("Production JWT_SECRET_KEY must be a unique secret of 32+ characters")
        if not self.frontend_url.startswith("https://"):
            raise ValueError("Production FRONTEND_URL must use HTTPS")
        if not self.cron_secret or len(self.cron_secret) < 16:
            raise ValueError("Production CRON_SECRET must have at least 16 characters")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
