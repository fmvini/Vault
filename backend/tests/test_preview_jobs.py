import asyncio
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select

from app.db.session import SessionLocal
from app.jobs import scheduler as jobs
from app.models import NotificationPreference, User
from app.services.recurrence_service import generate_monthly_transactions


def test_jobs_ignore_preview_and_cleanup_preserves_regular_accounts(client, monkeypatch):
    preview = client.post('/api/v1/preview/session').json()
    preview_headers = {'Authorization': f"Bearer {preview['access_token']}"}
    email = 'preview-jobs-regular@example.com'
    registered = client.post('/api/v1/auth/register', json={
        'name': 'Regular jobs', 'email': email, 'password': 'senha-segura-123',
    })
    assert registered.status_code == 201
    token = client.post('/api/v1/auth/login', json={
        'email': email, 'password': 'senha-segura-123',
    }).json()['access_token']
    regular_headers = {'Authorization': f'Bearer {token}'}
    today = date.today()
    for headers, description in (
        (regular_headers, 'Regular scheduled expense'),
        (preview_headers, 'Preview scheduled expense'),
    ):
        categories = client.get('/api/v1/categories', headers=headers).json()
        category = next(item for item in categories if item['type'] == 'expense')
        response = client.post('/api/v1/fixed-expenses', headers=headers, json={
            'category_id': category['id'], 'description': description,
            'amount': '20.00', 'currency': 'BRL', 'due_day': 20,
            'start_date': today.replace(day=1).isoformat(),
        })
        assert response.status_code == 201, response.text

    class ReferenceDate(date):
        @classmethod
        def today(cls):
            return today.replace(day=17)

    monkeypatch.setattr(jobs, 'date', ReferenceDate)
    sent = []

    async def capture(*args):
        sent.append(args)
        return True

    monkeypatch.setattr(jobs, 'send_fixed_expense_due', capture)

    async def run():
        async with SessionLocal() as db:
            visitor = await db.scalar(select(User).where(User.email == preview['user']['email']))
            preference = await db.scalar(select(NotificationPreference).where(
                NotificationPreference.user_id == visitor.id,
            ))
            # Guard the job itself even if a preference is corrupted outside the API.
            preference.notify_fixed_expense_due = True
            await db.commit()
            assert await generate_monthly_transactions(db, today) == 1
        await jobs.due_notification_job()
        assert [message[1] for message in sent] == ['Regular scheduled expense']
        async with SessionLocal() as db:
            visitor = await db.scalar(select(User).where(User.email == preview['user']['email']))
            visitor.preview_expires_at = datetime.now(UTC) - timedelta(minutes=1)
            await db.commit()
        await jobs.recurrence_job()
        async with SessionLocal() as db:
            assert await db.scalar(select(User.id).where(User.email == email)) is not None
            assert await db.scalar(select(User.id).where(User.email == preview['user']['email'])) is None

    asyncio.run(run())
    assert client.get('/api/v1/transactions', headers=preview_headers).status_code == 401
    regular = client.get('/api/v1/transactions', headers=regular_headers).json()
    assert regular['total'] == 1
