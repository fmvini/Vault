import asyncio
from uuid import UUID, uuid4

import pytest

from app.core.legal import LEGAL_VERSION
from app.db.session import SessionLocal
from app.models import User

ACCEPTANCE = {
    "terms_accepted": True,
    "privacy_accepted": True,
    "legal_version": LEGAL_VERSION,
}


async def stored_acceptance(user_id):
    async with SessionLocal() as db:
        user = await db.get(User, UUID(user_id))
        return user.legal_version, user.legal_accepted_at


@pytest.mark.parametrize("endpoint", ["register", "login"])
@pytest.mark.parametrize("field,value", [
    ("terms_accepted", None),
    ("privacy_accepted", None),
    ("legal_version", None),
    ("terms_accepted", False),
    ("privacy_accepted", False),
    ("terms_accepted", "true"),
    ("privacy_accepted", 1),
    ("legal_version", "2020-01-01"),
])
def test_auth_requires_explicit_current_acceptance(client, endpoint, field, value):
    payload = {**ACCEPTANCE, "name": "Pessoa Teste", "email": f"legal-{uuid4().hex}@example.com", "password": "senha-segura-123"}
    if endpoint == "login":
        assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    if value is None:
        payload.pop(field)
    else:
        payload[field] = value
    response = client.post(f"/api/v1/auth/{endpoint}", json=payload)
    assert response.status_code == 422
    assert "access_token" not in response.json()
    # A rejected registration must not reserve the address or create an account.
    if endpoint == "register":
        assert client.post("/api/v1/auth/register", json={**payload, **ACCEPTANCE}).status_code == 201


def test_acceptance_is_recorded_only_after_successful_authentication(client):
    payload = {**ACCEPTANCE, "name": "Pessoa Teste", "email": f"legal-{uuid4().hex}@example.com", "password": "senha-segura-123"}
    registration = client.post("/api/v1/auth/register", json=payload)
    assert registration.status_code == 201
    user_id = registration.json()["id"]
    version, accepted_at = asyncio.run(stored_acceptance(user_id))
    assert version == LEGAL_VERSION and accepted_at is not None
    assert client.post("/api/v1/auth/login", json={**payload, "password": "senha-incorreta"}).status_code == 401
    assert asyncio.run(stored_acceptance(user_id)) == (version, accepted_at)
    login = client.post("/api/v1/auth/login", json=payload)
    assert login.status_code == 200 and login.json()["access_token"]
    new_version, new_date = asyncio.run(stored_acceptance(user_id))
    assert new_version == LEGAL_VERSION and new_date >= accepted_at
