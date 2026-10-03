import asyncio
import os
import tempfile
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

test_database = Path(tempfile.gettempdir()) / f'vault-tests-{uuid.uuid4().hex}.db'
os.environ['DATABASE_URL'] = f'sqlite+aiosqlite:///{test_database.as_posix()}'
os.environ['ENVIRONMENT'] = 'development'
os.environ['SCHEDULER_ENABLED'] = 'false'
os.environ['JWT_SECRET_KEY'] = 'vault-test-secret-key-with-safe-length'

from app.db.base import Base  # noqa: E402
from app.db.seed import seed_system_categories  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope='session')
def test_client():
    with TestClient(app) as test_client:
        yield test_client
    test_database.unlink(missing_ok=True)


async def reset_database():
    async with SessionLocal() as db:
        for table in reversed(Base.metadata.sorted_tables):
            await db.execute(table.delete())
        await db.commit()
        await seed_system_categories(db)


@pytest.fixture
def client(test_client):
    # Jobs inspect all accounts: each scenario needs its own clean database state.
    asyncio.run(reset_database())
    return test_client
