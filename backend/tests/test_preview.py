import asyncio
from datetime import UTC, date, datetime, timedelta
from uuid import UUID, uuid4

import jwt
import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_preview_token,
    decode_session_token,
)
from app.db.session import SessionLocal
from app.models import Category, User


def preview_session(client):
    response = client.post('/api/v1/preview/session')
    assert response.status_code == 201, response.text
    assert response.headers['cache-control'] == 'no-store'
    session = response.json()
    return session, {'Authorization': f"Bearer {session['access_token']}"}


def real_account(client):
    payload = {'name': 'Conta real de teste', 'email': f'real-{uuid4().hex}@example.com', 'password': 'senha-real-123'}
    response = client.post('/api/v1/auth/register', json=payload)
    assert response.status_code == 201, response.text
    user = response.json()
    return user, {'Authorization': f"Bearer {create_access_token(UUID(user['id']))}"}


async def persisted_user(user_id):
    async with SessionLocal() as db:
        return await db.get(User, UUID(user_id))


async def expire_user(user_id):
    async with SessionLocal() as db:
        user = await db.get(User, UUID(user_id))
        user.preview_expires_at = datetime.now(UTC) - timedelta(seconds=1)
        await db.commit()


def test_public_preview_contract_persisted_seed_and_private_identity(client):
    started_at = datetime.now(UTC)
    session, headers = preview_session(client)
    expires_at = datetime.fromisoformat(session['expires_at'].replace('Z', '+00:00'))
    assert timedelta(minutes=29) < expires_at - started_at <= timedelta(minutes=31)
    assert session['token_type'] == 'bearer' and session['is_preview'] is True
    assert session['user']['email'].endswith('@preview.vault.example')
    assert set(session['user']) == {'id', 'name', 'email', 'default_currency'}
    assert decode_session_token(session['access_token']) == (UUID(session['user']['id']), 'preview')
    claims = jwt.decode(session['access_token'], settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    assert claims['exp'] == int(expires_at.timestamp())
    user = asyncio.run(persisted_user(session['user']['id']))
    assert user.preview_expires_at.replace(tzinfo=UTC) == expires_at
    assert client.get('/api/v1/auth/me', headers=headers).json() == session['user']
    assert client.get('/api/v1/transactions', headers=headers).json()['total'] == 42
    for path in ('categories', 'fixed-expenses', 'goals', 'savings-goals'):
        response = client.get(f'/api/v1/{path}', headers=headers)
        assert response.status_code == 200 and response.json(), response.text
    today = date.today()
    response = client.get(f'/api/v1/dashboard/summary?start_date={today.replace(day=1)}&end_date={today.replace(day=28)}', headers=headers)
    assert response.status_code == 200 and float(response.json()['total_income']) > 0


def test_preview_crud_persists_and_other_sessions_cannot_read_or_modify(client):
    first, owner = preview_session(client)
    second, stranger = preview_session(client)
    real, real_headers = real_account(client)
    assert len({first['user']['id'], second['user']['id'], real['id']}) == 3
    categories = client.get('/api/v1/categories', headers=owner).json()
    private = next(item for item in categories if not item['is_system'] and item['type'] == 'expense')
    other_ids = {item['id'] for item in client.get('/api/v1/categories', headers=stranger).json()}
    assert private['id'] not in other_ids
    assert client.get('/api/v1/transactions', headers=real_headers).json()['total'] == 0
    transaction = client.post('/api/v1/transactions', headers=owner, json={
        'category_id': private['id'], 'type': 'expense', 'amount': '12.34', 'currency': 'BRL',
        'description': 'Alteracao exclusiva visitante A', 'transaction_date': date.today().isoformat(),
    })
    assert transaction.status_code == 201, transaction.text
    transaction_id = transaction.json()['id']
    assert client.patch(f'/api/v1/transactions/{transaction_id}', headers=owner, json={'amount': '23.45'}).status_code == 200
    persisted = client.get('/api/v1/transactions?q=exclusiva', headers=owner).json()
    assert persisted['total'] == 1 and persisted['items'][0]['amount'] == '23.45'
    for headers in (stranger, real_headers):
        assert client.get('/api/v1/transactions?q=exclusiva', headers=headers).json()['total'] == 0
        assert client.patch(f'/api/v1/transactions/{transaction_id}', headers=headers, json={'amount': '1'}).status_code == 404
        assert client.delete(f'/api/v1/transactions/{transaction_id}', headers=headers).status_code == 404
        assert client.patch(f"/api/v1/categories/{private['id']}", headers=headers, json={'name': 'Invasao'}).status_code == 404
        for resource, payload in (('fixed-expenses', {'amount': '1'}), ('goals', {'monthly_limit': '1'})):
            item = client.get(f'/api/v1/{resource}', headers=owner).json()[0]
            assert client.patch(f"/api/v1/{resource}/{item['id']}", headers=headers, json=payload).status_code == 404
            assert client.delete(f"/api/v1/{resource}/{item['id']}", headers=headers).status_code == 404
        savings = client.get('/api/v1/savings-goals', headers=owner).json()[0]
        assert client.post(f"/api/v1/savings-goals/{savings['id']}/deposits", headers=headers, json={'amount': '1'}).status_code == 404
    assert client.delete(f'/api/v1/transactions/{transaction_id}', headers=owner).status_code == 204
    assert client.get('/api/v1/transactions?q=exclusiva', headers=owner).json()['total'] == 0
    assert client.get('/api/v1/transactions', headers=stranger).json()['total'] == 42
    # A preview must also be unable to mutate a real account's private data.
    real_category = client.post('/api/v1/categories', headers=real_headers, json={'name': 'Privado real', 'type': 'expense'}).json()
    assert client.patch(f"/api/v1/categories/{real_category['id']}", headers=owner, json={'name': 'Invasao'}).status_code == 404


def test_preview_settings_are_read_only_and_email_is_never_sent(client, monkeypatch):
    session, headers = preview_session(client)
    sent = []

    async def fake_send(*args):
        sent.append(args)
        return True

    monkeypatch.setattr('app.api.v1.auth.send_password_reset', fake_send)
    monkeypatch.setattr('app.services.goal_service.send_goal_exceeded', fake_send)
    preferences = client.get('/api/v1/notification-preferences', headers=headers).json()
    assert preferences['notify_goal_exceeded'] is False
    assert preferences['notify_fixed_expense_due'] is False
    assert client.patch('/api/v1/auth/me', headers=headers, json={'name': 'Mudanca', 'default_currency': 'USD'}).status_code == 403
    assert client.patch('/api/v1/notification-preferences', headers=headers, json={'notify_goal_exceeded': True, 'notify_fixed_expense_due': True}).status_code == 403
    assert client.get('/api/v1/auth/me', headers=headers).json() == session['user']
    goal = client.get('/api/v1/goals', headers=headers).json()[0]
    response = client.post('/api/v1/transactions', headers=headers, json={
        'category_id': goal['category_id'], 'type': 'expense', 'amount': '10000',
        'transaction_date': date.today().isoformat(),
    })
    assert response.status_code == 201, response.text
    preview_reset = client.post('/api/v1/auth/forgot-password', json={'email': session['user']['email']})
    unknown_reset = client.post('/api/v1/auth/forgot-password', json={'email': 'unknown@example.com'})
    assert preview_reset.status_code == unknown_reset.status_code == 200
    assert preview_reset.json() == unknown_reset.json()
    assert sent == []


def test_preview_cannot_login_reset_or_register_reserved_domain(client, monkeypatch):
    session, _ = preview_session(client)

    def forbidden_verify(*args):
        pytest.fail('Preview login must be refused before verifying its password')

    monkeypatch.setattr('app.api.v1.auth.verify_password', forbidden_verify)
    response = client.post('/api/v1/auth/login', json={'email': session['user']['email'], 'password': 'qualquer-senha'})
    assert response.status_code == 401
    token = create_password_reset_token(UUID(session['user']['id']))
    response = client.post('/api/v1/auth/reset-password', json={'token': token, 'new_password': 'nova-senha-123'})
    assert response.status_code == 400
    for token in (session['access_token'], create_access_token(UUID(session['user']['id']))):
        assert client.post('/api/v1/auth/reset-password', json={'token': token, 'new_password': 'nova-senha-123'}).status_code == 400
    response = client.post('/api/v1/auth/register', json={'name': 'Conta reservada', 'email': 'novo@PREVIEW.VAULT.EXAMPLE', 'password': 'nova-senha-123'})
    assert response.status_code == 400


def test_token_types_cannot_cross_preview_and_real_accounts(client):
    session, _ = preview_session(client)
    real, real_headers = real_account(client)
    assert client.get('/api/v1/auth/me', headers=real_headers).status_code == 200
    tokens = (
        create_access_token(UUID(session['user']['id'])),
        create_preview_token(UUID(real['id']), datetime.now(UTC) + timedelta(minutes=30)),
        create_password_reset_token(UUID(session['user']['id'])),
        session['access_token'] + 'tampered',
        create_preview_token(UUID(session['user']['id']), datetime.now(UTC) - timedelta(seconds=1)),
        jwt.encode({'sub': session['user']['id'], 'type': 'preview'}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm),
    )
    for token in tokens:
        assert client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {token}'}).status_code == 401


@pytest.mark.parametrize('resource', ['auth/me', 'categories', 'transactions', 'fixed-expenses', 'goals', 'savings-goals', 'notification-preferences', 'dashboard/summary'])
def test_existing_routes_require_auth_and_reject_persisted_expiry(client, resource):
    path = f'/api/v1/{resource}'
    assert client.get(path).status_code == 401
    session, headers = preview_session(client)
    asyncio.run(expire_user(session['user']['id']))
    assert client.get(path, headers=headers).status_code == 401
    assert client.post('/api/v1/categories', headers=headers, json={'name': 'Expirado', 'type': 'expense'}).status_code == 401


def test_new_session_cleans_expired_and_preserves_live_and_real_users(client):
    expired, expired_headers = preview_session(client)
    live, live_headers = preview_session(client)
    real, real_headers = real_account(client)
    asyncio.run(expire_user(expired['user']['id']))
    fresh, _ = preview_session(client)
    assert fresh['user']['id'] not in (expired['user']['id'], live['user']['id'], real['id'])
    assert asyncio.run(persisted_user(expired['user']['id'])) is None
    assert client.get('/api/v1/auth/me', headers=expired_headers).status_code == 401
    assert client.get('/api/v1/auth/me', headers=live_headers).status_code == 200
    assert client.get('/api/v1/auth/me', headers=real_headers).status_code == 200


def test_preview_failure_rolls_back_seed_and_cleanup(client, monkeypatch):
    from app.api.v1 import preview

    expired, _ = preview_session(client)
    asyncio.run(expire_user(expired['user']['id']))

    async def counts():
        async with SessionLocal() as db:
            return (await db.scalar(select(func.count(User.id))), await db.scalar(select(func.count(Category.id))))

    before = asyncio.run(counts())
    create = preview.create_preview_session

    async def failed_create(db, **kwargs):
        await create(db, **kwargs)
        raise RuntimeError('Falha simulada apos seed e limpeza')

    monkeypatch.setattr(preview, 'create_preview_session', failed_create)
    with pytest.raises(RuntimeError, match='Falha simulada'):
        client.post('/api/v1/preview/session')
    assert asyncio.run(counts()) == before
    assert asyncio.run(persisted_user(expired['user']['id'])) is not None


def test_production_lifespan_does_not_create_tables_seed_or_start_scheduler(monkeypatch):
    from app import main

    monkeypatch.setattr(main.settings, 'environment', 'production')
    monkeypatch.setattr(main.settings, 'scheduler_enabled', False)

    def forbidden(*args, **kwargs):
        pytest.fail('Production must not migrate, seed, or start a scheduler on startup')

    disposed = []

    class FakeEngine:
        begin = forbidden

        async def dispose(self):
            disposed.append(True)

    monkeypatch.setattr(main, 'engine', FakeEngine())
    monkeypatch.setattr(main, 'seed_system_categories', forbidden)
    monkeypatch.setattr(main, 'SessionLocal', forbidden)
    monkeypatch.setattr(main, 'start_scheduler', forbidden)

    async def startup():
        async with main.lifespan(main.app):
            pass

    asyncio.run(startup())
    assert disposed == [True]
