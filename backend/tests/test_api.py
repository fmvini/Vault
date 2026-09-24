import asyncio
from datetime import date, timedelta
from decimal import Decimal
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

from app.db.session import SessionLocal
from app.models import ExchangeRate
from app.services.exchange_rate_service import convert_amount
from app.services.recurrence_service import generate_monthly_transactions


def account(client, prefix='user', currency='BRL'):
    email = f'{prefix}-{uuid4().hex[:8]}@example.com'
    payload = {'name': 'Pessoa Teste', 'email': email, 'password': 'senha-segura-123', 'default_currency': currency}
    response = client.post('/api/v1/auth/register', json=payload)
    assert response.status_code == 201, response.text
    login = client.post('/api/v1/auth/login', json={'email': email, 'password': payload['password']})
    assert login.status_code == 200, login.text
    return payload, {'Authorization': f"Bearer {login.json()['access_token']}"}


def category(client, headers, kind='expense'):
    response = client.get('/api/v1/categories', headers=headers)
    assert response.status_code == 200
    return next(item for item in response.json() if item['type'] == kind)


def transaction_payload(category_id, **overrides):
    payload = {'category_id': category_id, 'type': 'expense', 'amount': '25.50', 'currency': 'BRL', 'description': 'Café mensal', 'transaction_date': date.today().isoformat()}
    payload.update(overrides)
    return payload


def test_savings_goals_deposits_completion_and_cancellation_restore_balance(client):
    _, owner = account(client, 'savings')
    _, stranger = account(client, 'savings-stranger')
    income = category(client, owner, 'income')
    today = date.today().isoformat()
    assert client.post('/api/v1/transactions', headers=owner, json=transaction_payload(
        income['id'], type='income', amount='500.00', transaction_date=today,
    )).status_code == 201
    summary_path = f'/api/v1/dashboard/summary?start_date={today}&end_date={today}'
    assert Decimal(client.get(summary_path, headers=owner).json()['balance']) == 500

    blank = client.post('/api/v1/savings-goals', headers=owner, json={
        'name': '  ', 'target_amount': '200.00', 'currency': 'BRL',
    })
    assert blank.status_code == 422
    created = client.post('/api/v1/savings-goals', headers=owner, json={
        'name': ' Carro ', 'target_amount': '200.00', 'currency': 'BRL',
    })
    assert created.status_code == 201, created.text
    goal_id = created.json()['id']
    assert created.json()['name'] == 'Carro'
    assert Decimal(created.json()['saved_amount']) == 0
    assert client.get('/api/v1/savings-goals', headers=stranger).json() == []
    assert client.post(f'/api/v1/savings-goals/{goal_id}/deposits', headers=stranger, json={'amount': '1'}).status_code == 404
    assert client.post(f'/api/v1/savings-goals/{goal_id}/cancel', headers=stranger).status_code == 404

    first = client.post(f'/api/v1/savings-goals/{goal_id}/deposits', headers=owner, json={'amount': '100.00'})
    assert first.status_code == 200 and Decimal(first.json()['saved_amount']) == 100
    assert Decimal(client.get(summary_path, headers=owner).json()['balance']) == 400
    assert client.post(f'/api/v1/savings-goals/{goal_id}/deposits', headers=owner, json={'amount': '100.01'}).status_code == 409
    second = client.post(f'/api/v1/savings-goals/{goal_id}/deposits', headers=owner, json={'amount': '100.00'})
    assert second.status_code == 200 and second.json()['status'] == 'completed'
    assert Decimal(client.get(summary_path, headers=owner).json()['balance']) == 300
    assert client.post(f'/api/v1/savings-goals/{goal_id}/deposits', headers=owner, json={'amount': '1'}).status_code == 409

    cancelled = client.post(f'/api/v1/savings-goals/{goal_id}/cancel', headers=owner)
    assert cancelled.status_code == 200 and cancelled.json()['status'] == 'cancelled'
    assert Decimal(cancelled.json()['saved_amount']) == 0
    summary = client.get(summary_path, headers=owner).json()
    assert Decimal(summary['balance']) == 500
    assert Decimal(summary['savings_movement']) == 0
    assert client.post(f'/api/v1/savings-goals/{goal_id}/cancel', headers=owner).status_code == 409


def test_cron_routes_require_secret_and_run_job(client, monkeypatch):
    from app.api.v1 import jobs

    monkeypatch.setattr(jobs.settings, 'cron_secret', 'test-cron-secret-long-enough')
    called = []

    async def fake_job():
        called.append(True)

    monkeypatch.setattr(jobs, 'recurrence_job', fake_job)
    path = '/api/v1/jobs/recurrence'
    assert client.get(path).status_code == 401
    assert client.get(path, headers={'Authorization': 'Bearer wrong'}).status_code == 401
    assert called == []
    response = client.get(path, headers={'Authorization': 'Bearer test-cron-secret-long-enough'})
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}
    assert called == [True]


def test_password_recovery_reports_unavailable_email_in_production(client, monkeypatch):
    from app.api.v1 import auth

    monkeypatch.setattr(auth.settings, 'environment', 'production')
    monkeypatch.setattr(auth.settings, 'email_provider_api_key', None)
    response = client.post('/api/v1/auth/forgot-password', json={'email': 'person@example.com'})
    assert response.status_code == 503
    assert response.json()['detail'] == 'Recuperação por e-mail temporariamente indisponível.'


def test_auth_validation_duplicate_and_password_reset(client, monkeypatch):
    user, headers = account(client, 'auth')
    assert client.post('/api/v1/auth/register', json=user).status_code == 400
    weak = client.post('/api/v1/auth/register', json={**user, 'email': 'weak@example.com', 'password': '123'})
    assert weak.status_code == 422
    assert client.post('/api/v1/auth/register', json={}).status_code == 422
    wrong = client.post('/api/v1/auth/login', json={'email': user['email'], 'password': 'senha-errada'})
    assert wrong.status_code == 401 and wrong.json()['detail'] == 'Credenciais inválidas'
    assert client.get('/api/v1/auth/me').status_code == 401
    assert client.get('/api/v1/auth/me', headers=headers).json()['email'] == user['email']
    delivered = []

    async def fake_send(to, url):
        delivered.append((to, url))
        return True

    monkeypatch.setattr('app.api.v1.auth.send_password_reset', fake_send)
    known = client.post('/api/v1/auth/forgot-password', json={'email': user['email']})
    unknown = client.post('/api/v1/auth/forgot-password', json={'email': 'unknown@example.com'})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    assert len(delivered) == 1
    token = parse_qs(urlparse(delivered[0][1]).query)['token'][0]
    assert client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {token}'}).status_code == 401
    assert client.post('/api/v1/auth/reset-password', json={'token': token, 'new_password': 'senha-nova-456'}).status_code == 200
    assert client.post('/api/v1/auth/login', json={'email': user['email'], 'password': user['password']}).status_code == 401
    assert client.post('/api/v1/auth/login', json={'email': user['email'], 'password': 'senha-nova-456'}).status_code == 200


def test_categories_rules_and_account_isolation(client):
    _, owner = account(client, 'owner')
    _, stranger = account(client, 'stranger')
    system = category(client, owner)
    assert client.patch(f"/api/v1/categories/{system['id']}", headers=owner, json={'name': 'Alterada'}).status_code == 403
    assert client.delete(f"/api/v1/categories/{system['id']}", headers=owner).status_code == 403
    custom = client.post('/api/v1/categories', headers=owner, json={'name': 'Café', 'type': 'expense', 'icon': 'food', 'color': '#123456'})
    assert custom.status_code == 201
    custom_id = custom.json()['id']
    assert 'Café' not in [item['name'] for item in client.get('/api/v1/categories', headers=stranger).json()]
    assert client.patch(f'/api/v1/categories/{custom_id}', headers=owner, json={'name': 'Cafeteria'}).status_code == 200
    created = client.post('/api/v1/transactions', headers=owner, json=transaction_payload(custom_id))
    assert created.status_code == 201
    assert client.get('/api/v1/transactions', headers=stranger).json()['total'] == 0
    assert client.delete(f'/api/v1/categories/{custom_id}', headers=owner).status_code == 409
    transaction_id = created.json()['id']
    assert client.patch(f'/api/v1/transactions/{transaction_id}', headers=stranger, json={'amount': 1}).status_code == 404
    assert client.delete(f'/api/v1/transactions/{transaction_id}', headers=stranger).status_code == 404


def test_category_dependencies_and_cross_account_resources(client):
    _, owner = account(client, 'resource-owner')
    _, stranger = account(client, 'resource-stranger')
    system = category(client, owner)
    created = client.post('/api/v1/categories', headers=owner, json={
        'name': 'Categoria vinculada', 'type': 'expense', 'icon': 'food', 'color': '#123456',
    })
    assert created.status_code == 201
    custom_id = created.json()['id']
    assert client.delete(f'/api/v1/categories/{custom_id}', headers=stranger).status_code == 404
    goal = client.post('/api/v1/goals', headers=owner, json={
        'category_id': custom_id, 'monthly_limit': '100.00', 'currency': 'BRL',
    })
    assert goal.status_code == 201
    goal_id = goal.json()['id']
    fixed = client.post('/api/v1/fixed-expenses', headers=owner, json={
        'category_id': custom_id, 'description': 'Assinatura', 'amount': '20.00',
        'currency': 'BRL', 'due_day': 10, 'start_date': date.today().isoformat(),
    })
    assert fixed.status_code == 201
    fixed_id = fixed.json()['id']
    assert client.delete(f'/api/v1/categories/{custom_id}', headers=owner).status_code == 409
    assert client.patch(f'/api/v1/goals/{goal_id}', headers=stranger, json={'monthly_limit': '1.00'}).status_code == 404
    assert client.delete(f'/api/v1/goals/{goal_id}', headers=stranger).status_code == 404
    assert client.patch(f'/api/v1/fixed-expenses/{fixed_id}', headers=stranger, json={'amount': '1.00'}).status_code == 404
    assert client.delete(f'/api/v1/fixed-expenses/{fixed_id}', headers=stranger).status_code == 404
    assert client.patch(f'/api/v1/fixed-expenses/{fixed_id}', headers=owner, json={
        'category_id': system['id'],
    }).status_code == 200
    assert client.delete(f'/api/v1/goals/{goal_id}', headers=owner).status_code == 204
    assert client.delete(f'/api/v1/categories/{custom_id}', headers=owner).status_code == 204


def test_transactions_crud_filters_sort_and_pagination(client):
    _, headers = account(client, 'history')
    expense = category(client, headers, 'expense')
    income = category(client, headers, 'income')
    created_ids = []
    for index in range(12):
        payload = transaction_payload(expense['id'] if index % 2 == 0 else income['id'], type='expense' if index % 2 == 0 else 'income', amount=str(index + 1), description=f"{'Café' if index < 3 else 'Item'} {index:02d}")
        response = client.post('/api/v1/transactions', headers=headers, json=payload)
        assert response.status_code == 201, response.text
        created_ids.append(response.json()['id'])
    first = client.get('/api/v1/transactions?page=1&page_size=5&sort_by=amount&sort_order=asc', headers=headers)
    assert first.status_code == 200 and first.json()['total'] == 12 and len(first.json()['items']) == 5
    assert Decimal(first.json()['items'][0]['amount']) == Decimal('1')
    assert len(client.get('/api/v1/transactions?page=2&page_size=5', headers=headers).json()['items']) == 5
    assert client.get('/api/v1/transactions?q=Café', headers=headers).json()['total'] == 3
    assert client.get('/api/v1/transactions?type=income', headers=headers).json()['total'] == 6
    updated = client.patch(f'/api/v1/transactions/{created_ids[0]}', headers=headers, json={'amount': '99.90', 'currency': 'USD'})
    assert updated.status_code == 200 and updated.json()['currency'] == 'USD'
    assert client.delete(f'/api/v1/transactions/{created_ids[-1]}', headers=headers).status_code == 204
    assert client.get('/api/v1/transactions', headers=headers).json()['total'] == 11


def test_fixed_expense_recurrence_history_and_payment_status(client):
    _, headers = account(client, 'fixed')
    expense_category = category(client, headers, 'expense')
    today = date.today()
    fixed = client.post('/api/v1/fixed-expenses', headers=headers, json={'category_id': expense_category['id'], 'description': 'Aluguel QA', 'amount': '1200.00', 'currency': 'BRL', 'due_day': 5, 'start_date': today.replace(day=1).isoformat()})
    assert fixed.status_code == 201, fixed.text
    fixed_id = fixed.json()['id']
    assert asyncio.run(_generate(today)) == 1
    assert asyncio.run(_generate(today)) == 0
    recurring = client.get('/api/v1/transactions?q=Aluguel', headers=headers).json()['items'][0]
    assert recurring['is_paid'] is False
    paid = client.patch(f"/api/v1/fixed-expenses/{fixed_id}/transactions/{recurring['id']}/mark-paid", headers=headers, json={'is_paid': True})
    assert paid.status_code == 200 and paid.json()['is_paid'] is True
    pending = client.patch(f"/api/v1/fixed-expenses/{fixed_id}/transactions/{recurring['id']}/mark-paid", headers=headers, json={'is_paid': False})
    assert pending.status_code == 200 and pending.json()['is_paid'] is False
    assert client.patch(f'/api/v1/fixed-expenses/{fixed_id}', headers=headers, json={'amount': '1350.00'}).status_code == 200
    same = client.get('/api/v1/transactions?q=Aluguel', headers=headers).json()['items'][0]
    assert Decimal(same['amount']) == Decimal('1200.00')
    assert client.delete(f'/api/v1/fixed-expenses/{fixed_id}', headers=headers).status_code == 204
    listed = client.get('/api/v1/fixed-expenses', headers=headers).json()
    assert next(item for item in listed if item['id'] == fixed_id)['is_active'] is False


def test_recurrence_respects_due_date_boundaries_and_future_edits(client):
    _, headers = account(client, 'recurrence-boundary')
    expense_category = category(client, headers, 'expense')
    base = {
        'category_id': expense_category['id'], 'amount': '100.00',
        'currency': 'BRL', 'start_date': '2026-02-01',
    }

    def fixed(description, due_day, **overrides):
        response = client.post('/api/v1/fixed-expenses', headers=headers, json={
            **base, 'description': description, 'due_day': due_day, **overrides,
        })
        assert response.status_code == 201, response.text
        return response.json()['id']

    fixed('Antes do início', 5, start_date='2026-02-10')
    fixed('Depois do fim', 20, end_date='2026-02-10')
    active_id = fixed('Dentro do intervalo', 20, start_date='2026-02-10')
    fixed('Último dia de fevereiro', 31, end_date='2026-02-28')

    assert asyncio.run(_generate(date(2026, 2, 17))) == 2
    assert asyncio.run(_generate(date(2026, 2, 17))) == 0
    rows = client.get('/api/v1/transactions?start_date=2026-02-01&end_date=2026-02-28', headers=headers).json()['items']
    assert {row['description']: row['transaction_date'] for row in rows} == {
        'Dentro do intervalo': '2026-02-20',
        'Último dia de fevereiro': '2026-02-28',
    }
    assert client.patch(f'/api/v1/fixed-expenses/{active_id}', headers=headers, json={'amount': '135.00'}).status_code == 200
    assert asyncio.run(_generate(date(2026, 3, 1))) == 2
    march = client.get('/api/v1/transactions?start_date=2026-03-01&end_date=2026-03-31', headers=headers).json()['items']
    assert next(row for row in march if row['description'] == 'Dentro do intervalo')['amount'] == '135.00'
    assert next(row for row in rows if row['description'] == 'Dentro do intervalo')['amount'] == '100.00'
    assert client.delete(f'/api/v1/fixed-expenses/{active_id}', headers=headers).status_code == 204
    assert asyncio.run(_generate(date(2026, 4, 1))) == 1
    april = client.get('/api/v1/transactions?start_date=2026-04-01&end_date=2026-04-30', headers=headers).json()['items']
    assert all(row['description'] != 'Dentro do intervalo' for row in april)
    march_after_deactivation = client.get(
        '/api/v1/transactions?start_date=2026-03-01&end_date=2026-03-31', headers=headers
    ).json()['items']
    assert any(row['description'] == 'Dentro do intervalo' for row in march_after_deactivation)


def test_due_notification_respects_dates_and_preferences(client, monkeypatch):
    from app.jobs import scheduler as jobs

    class FixedDate(date):
        @classmethod
        def today(cls):
            return cls(2026, 2, 17)

    monkeypatch.setattr(jobs, 'date', FixedDate)
    sent = []

    async def fake_send(*args):
        sent.append(args)
        return True

    monkeypatch.setattr(jobs, 'send_fixed_expense_due', fake_send)
    _, headers = account(client, 'due-notification')
    expense_category = category(client, headers, 'expense')
    base = {
        'category_id': expense_category['id'], 'amount': '100.00',
        'currency': 'BRL', 'due_day': 20, 'start_date': '2026-02-01',
    }
    for description, overrides in (
        ('Aviso válido', {}),
        ('Ainda não começou', {'start_date': '2026-02-21'}),
        ('Já terminou', {'end_date': '2026-02-19'}),
    ):
        response = client.post('/api/v1/fixed-expenses', headers=headers, json={
            **base, 'description': description, **overrides,
        })
        assert response.status_code == 201, response.text
    asyncio.run(jobs.due_notification_job())
    assert [message[1] for message in sent] == ['Aviso válido']
    assert client.patch('/api/v1/notification-preferences', headers=headers, json={
        'notify_fixed_expense_due': False,
    }).status_code == 200
    asyncio.run(jobs.due_notification_job())
    assert len(sent) == 1


def test_due_notification_reaches_next_month(client, monkeypatch):
    from app.jobs import scheduler as jobs

    class FixedDate(date):
        @classmethod
        def today(cls):
            return cls(2026, 12, 29)

    monkeypatch.setattr(jobs, 'date', FixedDate)
    sent = []

    async def fake_send(*args):
        sent.append(args)
        return True

    monkeypatch.setattr(jobs, 'send_fixed_expense_due', fake_send)
    _, headers = account(client, 'next-month-notification')
    expense_category = category(client, headers, 'expense')
    response = client.post('/api/v1/fixed-expenses', headers=headers, json={
        'category_id': expense_category['id'], 'description': 'Vence em janeiro',
        'amount': '100.00', 'currency': 'BRL', 'due_day': 1,
        'start_date': '2027-01-01',
    })
    assert response.status_code == 201, response.text
    asyncio.run(jobs.due_notification_job())
    assert [message[1] for message in sent] == ['Vence em janeiro']


async def _generate(reference):
    async with SessionLocal() as db:
        return await generate_monthly_transactions(db, reference)


def test_goals_notifications_profile_and_multicurrency_dashboard(client, monkeypatch):
    _, headers = account(client, 'goals', 'BRL')
    expense = category(client, headers, 'expense')
    sent = []

    async def fake_goal_email(*args):
        sent.append(args)
        return True

    monkeypatch.setattr('app.services.goal_service.send_goal_exceeded', fake_goal_email)
    goal = client.post('/api/v1/goals', headers=headers, json={'category_id': expense['id'], 'monthly_limit': '100.00', 'currency': 'BRL'})
    assert goal.status_code == 201
    assert client.post('/api/v1/goals', headers=headers, json={'category_id': expense['id'], 'monthly_limit': '200.00', 'currency': 'BRL'}).status_code == 409
    asyncio.run(_add_rate('USD', 'BRL', '5'))
    transaction = client.post('/api/v1/transactions', headers=headers, json=transaction_payload(expense['id'], amount='25', currency='USD', description='Compra internacional'))
    assert transaction.status_code == 201, transaction.text
    goals = client.get('/api/v1/goals', headers=headers).json()
    assert Decimal(goals[0]['current_month_spent']) == Decimal('125.00') and goals[0]['is_exceeded'] is True
    assert len(sent) == 1
    edited = client.patch(f"/api/v1/goals/{goal.json()['id']}", headers=headers, json={'monthly_limit': '200.00'})
    assert edited.status_code == 200 and edited.json()['is_exceeded'] is False
    period = date.today()
    dashboard = client.get(f'/api/v1/dashboard/summary?start_date={period.replace(day=1).isoformat()}&end_date={period.isoformat()}', headers=headers)
    assert dashboard.status_code == 200 and Decimal(dashboard.json()['total_expense']) == Decimal('125.00')
    profile = client.patch('/api/v1/auth/me', headers=headers, json={'name': 'Nome Persistido', 'default_currency': 'USD'})
    assert profile.status_code == 200
    assert client.get('/api/v1/auth/me', headers=headers).json()['name'] == 'Nome Persistido'
    dashboard_usd = client.get(
        f'/api/v1/dashboard/summary?start_date={period.replace(day=1).isoformat()}'
        f'&end_date={period.isoformat()}', headers=headers,
    )
    assert dashboard_usd.status_code == 200
    assert dashboard_usd.json()['currency'] == 'USD'
    assert Decimal(dashboard_usd.json()['total_expense']) == Decimal('25.00')
    preferences = client.patch('/api/v1/notification-preferences', headers=headers, json={'notify_goal_exceeded': False, 'notify_fixed_expense_due': False, 'fixed_expense_due_days_before': 7})
    assert preferences.status_code == 200
    assert client.get('/api/v1/notification-preferences', headers=headers).json()['fixed_expense_due_days_before'] == 7
    extra = client.post('/api/v1/transactions', headers=headers, json=transaction_payload(
        expense['id'], amount='100.00', description='Sem aviso de meta',
    ))
    assert extra.status_code == 201
    assert len(sent) == 1


def test_dashboard_totals_timeline_and_combined_history_filters(client):
    _, headers = account(client, 'dashboard-math')
    expense = category(client, headers, 'expense')
    income = category(client, headers, 'income')
    custom = client.post('/api/v1/categories', headers=headers, json={
        'name': 'Viagem', 'type': 'expense', 'icon': 'travel', 'color': '#123456',
    }).json()
    today = date.today()
    yesterday = today - timedelta(days=1)
    asyncio.run(_add_rate('USD', 'BRL', '5'))
    entries = (
        transaction_payload(income['id'], type='income', amount='200.00', description='Salário'),
        transaction_payload(expense['id'], amount='30.00', description='Mercado'),
        transaction_payload(custom['id'], amount='10.00', currency='USD',
                            description='Viagem', transaction_date=yesterday.isoformat()),
    )
    for payload in entries:
        response = client.post('/api/v1/transactions', headers=headers, json=payload)
        assert response.status_code == 201, response.text
    summary = client.get(
        f'/api/v1/dashboard/summary?start_date={yesterday}&end_date={today}', headers=headers
    )
    assert summary.status_code == 200
    data = summary.json()
    assert (data['total_income'], data['total_expense'], data['balance']) == (
        '200.00', '80.00', '120.00'
    )
    assert {row['category_name']: row['total'] for row in data['expenses_by_category']} == {
        expense['name']: '30.00', 'Viagem': '50.00',
    }
    assert {row['category_name']: row['percentage'] for row in data['expenses_by_category']} == {
        expense['name']: 37.5, 'Viagem': 62.5,
    }
    assert [row['date'] for row in data['timeline']] == [yesterday.isoformat(), today.isoformat()]
    combined = client.get(
        f'/api/v1/transactions?type=expense&category_id={custom["id"]}'
        f'&start_date={yesterday}&end_date={yesterday}&sort_by=amount&sort_order=desc',
        headers=headers,
    )
    assert combined.status_code == 200
    assert combined.json()['total'] == 1
    assert combined.json()['items'][0]['description'] == 'Viagem'
    assert client.delete(
        f"/api/v1/transactions/{combined.json()['items'][0]['id']}", headers=headers
    ).status_code == 204
    after_delete = client.get(
        f'/api/v1/dashboard/summary?start_date={yesterday}&end_date={today}', headers=headers
    )
    assert after_delete.status_code == 200
    assert (after_delete.json()['total_expense'], after_delete.json()['balance']) == (
        '30.00', '170.00'
    )


def test_goal_alert_when_transaction_changes_category_or_currency(client, monkeypatch):
    _, headers = account(client, 'goal-edits')
    first_category = category(client, headers, 'expense')
    second_category = client.post('/api/v1/categories', headers=headers, json={
        'name': 'Segunda meta', 'type': 'expense', 'icon': 'food', 'color': '#123456',
    }).json()
    assert client.post('/api/v1/goals', headers=headers, json={
        'category_id': second_category['id'], 'monthly_limit': '100.00', 'currency': 'BRL',
    }).status_code == 201
    sent = []

    async def fake_goal_email(*args):
        sent.append(args)
        return True

    monkeypatch.setattr('app.services.goal_service.send_goal_exceeded', fake_goal_email)
    moved = client.post('/api/v1/transactions', headers=headers, json=transaction_payload(
        first_category['id'], amount='120.00', currency='USD', description='Mudar categoria',
    ))
    assert moved.status_code == 201
    moved_id = moved.json()['id']
    assert client.patch(f'/api/v1/transactions/{moved_id}', headers=headers, json={
        'category_id': second_category['id'], 'currency': 'BRL',
    }).status_code == 200
    assert len(sent) == 1

    assert client.delete(f'/api/v1/transactions/{moved_id}', headers=headers).status_code == 204
    asyncio.run(_add_rate('USD', 'BRL', '5'))
    currency = client.post('/api/v1/transactions', headers=headers, json=transaction_payload(
        second_category['id'], amount='50.00', currency='USD', description='Mudar moeda',
    ))
    assert currency.status_code == 201
    currency_id = currency.json()['id']
    assert len(sent) == 2
    assert client.patch(f'/api/v1/transactions/{currency_id}', headers=headers, json={
        'amount': '90.00', 'currency': 'BRL',
    }).status_code == 200
    assert client.patch(f'/api/v1/transactions/{currency_id}', headers=headers, json={
        'amount': '25.00', 'currency': 'USD',
    }).status_code == 200
    assert len(sent) == 3


async def _add_rate(base, target, rate):
    async with SessionLocal() as db:
        db.add(ExchangeRate(base_currency=base, target_currency=target, rate=Decimal(rate)))
        await db.commit()


def test_missing_exchange_rate_is_fetched_on_demand(monkeypatch):
    async def fake_fetch(_db, base, target):
        assert (base, target) == ('EUR', 'USD')
        return Decimal('1.25')

    monkeypatch.setattr('app.services.exchange_rate_service.fetch_exchange_rate', fake_fetch)
    assert asyncio.run(_convert_without_cached_rate()) == Decimal('12.50')


async def _convert_without_cached_rate():
    async with SessionLocal() as db:
        return await convert_amount(db, Decimal('10'), 'EUR', 'USD')
