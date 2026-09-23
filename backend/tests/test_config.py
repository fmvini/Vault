import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_requires_database_and_secrets():
    with pytest.raises(ValidationError, match="DATABASE_URL"):
        Settings(environment="production", _env_file=None)

    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        Settings(
            environment="production",
            database_url="postgresql+psycopg://user:pass@localhost/db",
            jwt_secret_key="development-only-change-me",
            _env_file=None,
        )

    production = Settings(
        environment="production",
        database_url="postgresql+psycopg://user:pass@localhost/db",
        jwt_secret_key="a" * 32,
        frontend_url="https://vault-web.example.com",
        cron_secret="b" * 16,
        _env_file=None,
    )
    assert production.environment == "production"
