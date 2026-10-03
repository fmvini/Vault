"""Preview persistence checks use disposable databases only.

Optional PostgreSQL: PREVIEW_TEST_POSTGRES_URL must point to a dedicated local
vault_preview_test_* database without a password. Each test uses a fresh schema.
The normal application DATABASE_URL is never used to select a test database.
"""

import asyncio
import os
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import EmailStr, TypeAdapter
from sqlalchemy import event, func, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.security import verify_password
from app.db.base import Base
from app.db.preview import cleanup_expired_preview_sessions, create_preview_session
from app.db.seed import seed_system_categories
from app.models import (
    Category,
    ExchangeRate,
    FixedExpense,
    Goal,
    NotificationPreference,
    SavingsGoal,
    SavingsMovement,
    Transaction,
    TransactionType,
    User,
)

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)
OWNED_MODELS = (Category, Transaction, FixedExpense, Goal, SavingsGoal, NotificationPreference)
BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def event_loop_policy():
    if sys.platform == "win32":
        return asyncio.WindowsSelectorEventLoopPolicy()
    return asyncio.DefaultEventLoopPolicy()


@pytest.fixture(params=["sqlite_fk_on", "sqlite_fk_off", "postgresql"])
async def database(request, tmp_path):
    if request.param.startswith("sqlite"):
        yield f"sqlite+aiosqlite:///{(tmp_path / 'preview.db').as_posix()}", request.param
        return
    configured = os.environ.get("PREVIEW_TEST_POSTGRES_URL")
    if not configured:
        pytest.skip("No isolated local PostgreSQL URL supplied")
    url = make_url(configured)
    if (
        url.drivername != "postgresql+psycopg"
        or url.host not in {"127.0.0.1", "localhost"}
        or not (url.database or "").startswith("vault_preview_test_")
        or url.password is not None
    ):
        pytest.fail("PostgreSQL tests require a dedicated local password-free test database")
    schema = f"preview_test_{uuid4().hex}"
    admin_engine = create_async_engine(url, connect_args={"prepare_threshold": None})
    async with admin_engine.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    try:
        scoped_url = url.update_query_dict({"options": f"-csearch_path={schema}"})
        yield scoped_url.render_as_string(hide_password=False), request.param
    finally:
        async with admin_engine.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await admin_engine.dispose()


def make_test_engine(database):
    url, kind = database
    kwargs = {"connect_args": {"prepare_threshold": None}} if kind == "postgresql" else {}
    engine = create_async_engine(url, **kwargs)
    if kind == "sqlite_fk_on":
        @event.listens_for(engine.sync_engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
    return engine


@pytest.fixture
async def sessions(database):
    engine = make_test_engine(database)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    try:
        yield async_sessionmaker(engine, expire_on_commit=False)
    finally:
        await engine.dispose()


async def count_rows(db, model):
    return await db.scalar(select(func.count()).select_from(model))


@pytest.mark.asyncio
async def test_preview_persists_private_seed_and_consistent_savings(sessions):
    async with sessions() as db:
        user = await create_preview_session(db, now=NOW)
        assert user.preview_expires_at == NOW + timedelta(minutes=30)
        assert user.email == f"preview-{user.id.hex}@preview.vault.example"
        assert TypeAdapter(EmailStr).validate_python(user.email) == user.email
        assert not verify_password("preview", user.password_hash)
        assert not verify_password("", user.password_hash)
        await db.commit()
        user_id = user.id
    async with sessions() as db:
        assert await db.get(User, user_id) is not None
        assert await count_rows(db, Category) == 12
        assert await count_rows(db, Transaction) == 42
        assert await count_rows(db, FixedExpense) == 3
        assert await count_rows(db, Goal) == 3
        assert await count_rows(db, SavingsGoal) == 3
        assert await count_rows(db, SavingsMovement) == 5
        assert await count_rows(db, ExchangeRate) == 0
        for model in OWNED_MODELS:
            assert not await db.scalar(select(model).where(model.user_id != user_id).limit(1))
        assert not await db.scalar(select(Category).where(Category.is_system.is_(True)))
        preferences = await db.scalar(select(NotificationPreference))
        assert not preferences.notify_goal_exceeded
        assert not preferences.notify_fixed_expense_due
        transactions = (await db.scalars(select(Transaction))).all()
        assert {item.transaction_date.month for item in transactions} == {8, 9, 10}
        assert {item.is_paid for item in transactions} == {True, False}
        assert await db.scalar(select(func.sum(Transaction.amount)).where(
            Transaction.type == TransactionType.income,
            Transaction.transaction_date >= NOW.date().replace(day=1),
        )) == Decimal("7650.00")
        for goal in await db.scalars(select(SavingsGoal)):
            balance = await db.scalar(select(func.sum(SavingsMovement.amount)).where(
                SavingsMovement.goal_id == goal.id,
            ))
            assert balance == goal.saved_amount
        food_limit = await db.scalar(select(Goal).join(Category).where(Category.name == "Alimentação"))
        spent = await db.scalar(select(func.sum(Transaction.amount)).where(
            Transaction.category_id == food_limit.category_id,
            Transaction.transaction_date >= NOW.date().replace(day=1),
        ))
        assert spent > food_limit.monthly_limit


@pytest.mark.asyncio
async def test_visitors_do_not_share_records_or_mutations(sessions):
    async with sessions() as db:
        first = await create_preview_session(db, now=NOW)
        second = await create_preview_session(db, now=NOW)
        assert first.id != second.id and first.email != second.email
        assert first.password_hash != second.password_hash
        for model in OWNED_MODELS:
            first_ids = set(await db.scalars(select(model.id).where(model.user_id == first.id)))
            second_ids = set(await db.scalars(select(model.id).where(model.user_id == second.id)))
            assert first_ids and second_ids and first_ids.isdisjoint(second_ids)
        category = await db.scalar(select(Category).where(Category.user_id == first.id))
        category.name = "Alteração exclusiva do primeiro visitante"
        await db.commit()
        assert not await db.scalar(select(Category).where(
            Category.user_id == second.id, Category.name == category.name,
        ))
        owned_category_ids = select(Category.id).where(Category.user_id == second.id)
        assert not await db.scalar(select(Transaction.id).where(
            Transaction.user_id == first.id, Transaction.category_id.in_(owned_category_ids),
        ))


@pytest.mark.asyncio
async def test_creation_and_cleanup_rollback_are_atomic(sessions):
    async with sessions() as db:
        expired = await create_preview_session(db, now=NOW - timedelta(hours=2))
        expired_id = expired.id
        await db.commit()
    async with sessions() as db:
        await create_preview_session(db, now=NOW)
        await db.rollback()
    async with sessions() as db:
        assert await count_rows(db, User) == 1
        assert await db.get(User, expired_id) is not None
        assert await count_rows(db, Transaction) == 42
        assert await count_rows(db, SavingsMovement) == 5
        assert await cleanup_expired_preview_sessions(db, now=NOW) == 1
        await db.rollback()
    async with sessions() as db:
        assert await db.get(User, expired_id) is not None


@pytest.mark.asyncio
async def test_cleanup_preserves_real_accounts_and_shared_data_at_exact_deadline(sessions):
    async with sessions() as db:
        await seed_system_categories(db)
        expired = await create_preview_session(db, now=NOW - timedelta(minutes=30))
        alive = await create_preview_session(db, now=NOW - timedelta(minutes=29))
        # Mimic a normal account with the reserved address/hash: only the column
        # defines preview identity, never the name, email or password format.
        fake_regular = await create_preview_session(db, now=NOW - timedelta(minutes=29))
        fake_regular.preview_expires_at = None
        await db.commit()
        ids = expired.id, alive.id, fake_regular.id
    async with sessions() as db:
        assert await cleanup_expired_preview_sessions(db, now=NOW) == 1
        await db.commit()
    async with sessions() as db:
        assert await db.get(User, ids[0]) is None
        assert await db.get(User, ids[1]) is not None
        assert await db.get(User, ids[2]) is not None
        for model in OWNED_MODELS:
            assert not await db.scalar(select(model.id).where(model.user_id == ids[0]).limit(1))
            assert await db.scalar(select(model.id).where(model.user_id == ids[1]).limit(1))
            assert await db.scalar(select(model.id).where(model.user_id == ids[2]).limit(1))
        assert await count_rows(db, SavingsMovement) == 10
        assert await db.scalar(select(func.count(Category.id)).where(Category.is_system.is_(True))) == 11
        assert await cleanup_expired_preview_sessions(db, now=NOW) == 0


@pytest.mark.asyncio
async def test_cleanup_is_bounded_and_creation_cleans_expired_rows(sessions):
    async with sessions() as db:
        # Create visitors at the same instant so creation cannot clean others.
        for _ in range(4):
            await create_preview_session(db, now=NOW - timedelta(hours=1))
        await db.commit()
        assert await cleanup_expired_preview_sessions(db, now=NOW, limit=2) == 2
        await db.commit()
        assert await count_rows(db, User) == 2
        await create_preview_session(db, now=NOW)
        await db.commit()
        assert await count_rows(db, User) == 1
        assert await count_rows(db, SavingsMovement) == 5
        assert await count_rows(db, Transaction) == 42


@pytest.mark.asyncio
async def test_invalid_lifetime_limit_or_naive_time_has_no_side_effects(sessions):
    async with sessions() as db:
        for ttl in (0, -1, 31, 60, True, 1.5):
            with pytest.raises(ValueError):
                await create_preview_session(db, ttl_minutes=ttl, now=NOW)
        for limit in (0, -1, 101, True, 1.5):
            with pytest.raises(ValueError):
                await cleanup_expired_preview_sessions(db, limit=limit, now=NOW)
        with pytest.raises(ValueError):
            await create_preview_session(db, now=NOW.replace(tzinfo=None))
        with pytest.raises(ValueError):
            await cleanup_expired_preview_sessions(db, now=NOW.replace(tzinfo=None))
        assert await count_rows(db, User) == 0
        assert await count_rows(db, Category) == 0
        user = await create_preview_session(db, ttl_minutes=1, now=NOW)
        assert user.preview_expires_at == NOW + timedelta(minutes=1)


@pytest.mark.asyncio
async def test_concurrent_postgres_cleanup_skips_locked_visitors(database, sessions):
    if database[1] != "postgresql":
        pytest.skip("Row-lock concurrency is PostgreSQL-specific")
    async with sessions() as db:
        for _ in range(2):
            await create_preview_session(db, now=NOW - timedelta(hours=1))
        await db.commit()
    async with sessions() as first, sessions() as second:
        assert await cleanup_expired_preview_sessions(first, now=NOW, limit=1) == 1
        assert await cleanup_expired_preview_sessions(second, now=NOW, limit=1) == 1
        await second.commit()
        await first.commit()
    async with sessions() as db:
        assert await count_rows(db, User) == 0
        assert await count_rows(db, SavingsMovement) == 0


def run_alembic(database_url, *arguments):
    env = os.environ.copy()
    env.update(DATABASE_URL=database_url, ENVIRONMENT="development", SCHEDULER_ENABLED="false")
    result = subprocess.run(
        [sys.executable, "-m", "alembic", *arguments],
        cwd=BACKEND_DIR, env=env, capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, result.stdout + result.stderr


@pytest.mark.asyncio
async def test_migrations_fresh_and_existing_database_preserve_normal_user(database):
    url, _ = database
    run_alembic(url, "upgrade", "head")
    run_alembic(url, "check")
    engine = make_test_engine(database)
    try:
        async with engine.connect() as connection:
            indexes = await connection.run_sync(lambda sync: inspect(sync).get_indexes("users"))
            assert any(index["name"] == "ix_users_preview_expires_at" for index in indexes)
            assert await connection.scalar(text("SELECT version_num FROM alembic_version")) == "20261003_0003"
        run_alembic(url, "downgrade", "20260924_0002")
        async with engine.begin() as connection:
            columns = await connection.run_sync(lambda sync: inspect(sync).get_columns("users"))
            assert "preview_expires_at" not in {column["name"] for column in columns}
            await connection.execute(text(
                "INSERT INTO users (id, name, email, password_hash, default_currency) "
                "VALUES (:id, 'Fictício para teste de migração', 'migration@vault.example', 'unusable', 'BRL')"
            ), {"id": uuid4().hex})
        run_alembic(url, "upgrade", "head")
        run_alembic(url, "check")
        async with engine.connect() as connection:
            row = (await connection.execute(text(
                "SELECT name, preview_expires_at FROM users WHERE email='migration@vault.example'"
            ))).one()
            assert row.name == "Fictício para teste de migração"
            assert row.preview_expires_at is None
            assert await connection.scalar(text("SELECT COUNT(*) FROM categories WHERE is_system = true")) == 11
    finally:
        await engine.dispose()
