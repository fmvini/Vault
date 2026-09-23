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

from app.main import app  # noqa: E402


@pytest.fixture(scope='session')
def client():
    with TestClient(app) as test_client:
        yield test_client
    test_database.unlink(missing_ok=True)
