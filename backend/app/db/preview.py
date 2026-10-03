"""Private, short-lived visitor data; callers own the transaction/commit.

The API must check the persisted deadline on every authenticated request and
exclude preview users from login, password reset, email and recurring jobs.
Expired data is removed in bounded batches when new previews are created,
which also works in serverless processes without an always-running scheduler.
"""

import secrets
from calendar import monthrange
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.seed import SYSTEM_CATEGORIES
from app.models import (
    Category,
    FixedExpense,
    Goal,
    NotificationPreference,
    SavingsGoal,
    SavingsMovement,
    Transaction,
    TransactionType,
    User,
)

PREVIEW_TTL_MINUTES = 30
PREVIEW_CLEANUP_BATCH_SIZE = 25


def _utc_now(now: datetime | None) -> datetime:
    value = now if now is not None else datetime.now(UTC)
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("Preview deadlines require a timezone-aware datetime")
    return value.astimezone(UTC)


async def cleanup_expired_preview_sessions(
    db: AsyncSession, *, now: datetime | None = None, limit: int = PREVIEW_CLEANUP_BATCH_SIZE
) -> int:
    """Delete at most `limit` expired visitors, never regular or live accounts.

    Explicit child deletion also works with SQLite foreign keys disabled.
    PostgreSQL row locks skip visitors being cleaned by another request.
    Physical removal needs traffic; expiration enforcement never depends on it.
    """
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 100:
        raise ValueError("Preview cleanup limit must be between 1 and 100")
    cutoff = _utc_now(now)
    ids = list(await db.scalars(
        select(User.id)
        .where(User.preview_expires_at <= cutoff)
        .order_by(User.preview_expires_at, User.id)
        .limit(limit)
        .with_for_update(skip_locked=True)
    ))
    if not ids:
        return 0
    savings_ids = select(SavingsGoal.id).where(SavingsGoal.user_id.in_(ids))
    await db.execute(delete(SavingsMovement).where(SavingsMovement.goal_id.in_(savings_ids)))
    for model in (Transaction, Goal, FixedExpense, SavingsGoal, NotificationPreference, Category):
        await db.execute(delete(model).where(model.user_id.in_(ids)))
    await db.execute(delete(User).where(User.id.in_(ids)))
    await db.flush()
    return len(ids)


def _month_date(today: date, months_ago: int, day: int) -> date:
    month_number = today.year * 12 + today.month - 1 - months_ago
    year, month_zero = divmod(month_number, 12)
    month = month_zero + 1
    return date(year, month, min(day, monthrange(year, month)[1]))


async def create_preview_session(
    db: AsyncSession, *, ttl_minutes: int = PREVIEW_TTL_MINUTES, now: datetime | None = None
) -> User:
    """Flush a fresh visitor and private BRL demo data; never commit internally.

    The random password is immediately discarded, and the reserved .example
    email cannot receive mail. No existing user's data or shared FX is copied.
    TTL is bounded to thirty minutes; the client must not choose or extend it.
    """
    if (
        isinstance(ttl_minutes, bool)
        or not isinstance(ttl_minutes, int)
        or not 1 <= ttl_minutes <= PREVIEW_TTL_MINUTES
    ):
        raise ValueError("Preview lifetime must be between 1 and 30 minutes")
    started_at = _utc_now(now)
    await cleanup_expired_preview_sessions(db, now=started_at)
    user_id = uuid4()
    user = User(
        id=user_id,
        name="Visitante Vault",
        email=f"preview-{user_id.hex}@preview.vault.example",
        password_hash=hash_password(secrets.token_urlsafe(48)),
        default_currency="BRL",
        preview_expires_at=started_at + timedelta(minutes=ttl_minutes),
    )
    db.add(user)
    await db.flush()
    categories = {
        name: Category(
            id=uuid4(), user_id=user.id, name=name, type=kind,
            icon=icon, color=color, is_system=False,
        )
        for name, kind, icon, color in SYSTEM_CATEGORIES
    }
    categories["Café & encontros"] = Category(
        id=uuid4(), user_id=user.id, name="Café & encontros", type=TransactionType.expense,
        icon="coffee", color="#C88962", is_system=False,
    )
    db.add_all(categories.values())
    db.add(NotificationPreference(
        user_id=user.id, notify_goal_exceeded=False, notify_fixed_expense_due=False,
    ))
    await db.flush()
    today = started_at.date()
    fixed_expenses = []
    for description, category, amount, due_day in (
        ("Aluguel fictício", "Moradia", "1800.00", 5),
        ("Internet residencial", "Moradia", "120.00", 10),
        ("Assinatura de filmes", "Lazer", "45.00", 15),
    ):
        fixed_expenses.append(FixedExpense(
            id=uuid4(), user_id=user.id, category_id=categories[category].id,
            description=description, amount=Decimal(amount), currency="BRL",
            due_day=due_day, start_date=_month_date(today, 2, 1), is_active=True,
        ))
    db.add_all(fixed_expenses)
    await db.flush()
    # Current and two previous months fill summaries, timelines and pagination.
    entries = (
        ("Salário", "6800.00", "Salário ilustrativo", 1),
        ("Renda Extra", "850.00", "Projeto freelance fictício", 12),
        ("Alimentação", "420.00", "Mercado da semana", 3),
        ("Alimentação", "180.00", "Compras para casa", 9),
        ("Alimentação", "260.00", "Feira e supermercado", 20),
        ("Transporte", "160.00", "Mobilidade urbana", 4),
        ("Transporte", "85.00", "Transporte por aplicativo", 14),
        ("Saúde", "140.00", "Farmácia", 7),
        ("Educação", "180.00", "Curso de idiomas", 8),
        ("Lazer", "110.00", "Cinema com amigos", 18),
        ("Café & encontros", "60.00", "Café no fim de semana", 11),
    )
    for months_ago in range(3):
        for category, amount, description, day in entries:
            db.add(Transaction(
                user_id=user.id, category_id=categories[category].id,
                type=categories[category].type, amount=Decimal(amount), currency="BRL",
                description=description, transaction_date=_month_date(today, months_ago, day),
                is_paid=True,
            ))
        for fixed in fixed_expenses:
            db.add(Transaction(
                user_id=user.id, category_id=fixed.category_id, fixed_expense_id=fixed.id,
                type=TransactionType.expense, amount=fixed.amount, currency="BRL",
                description=fixed.description,
                transaction_date=_month_date(today, months_ago, fixed.due_day),
                is_paid=months_ago > 0 or fixed.due_day <= today.day,
            ))
    limits = (("Alimentação", "800.00"), ("Transporte", "400.00"), ("Lazer", "350.00"))
    for category, limit in limits:
        db.add(Goal(
            user_id=user.id, category_id=categories[category].id,
            monthly_limit=Decimal(limit), currency="BRL", is_active=True,
        ))
    for name, target, previous, current, status in (
        ("Reserva de emergência", "6000.00", "1800.00", "600.00", "active"),
        ("Viagem de férias", "8000.00", "1000.00", "350.00", "active"),
        ("Notebook novo", "3500.00", "3500.00", "0.00", "completed"),
    ):
        goal = SavingsGoal(
            id=uuid4(), user_id=user.id, name=name, target_amount=Decimal(target),
            saved_amount=Decimal(previous) + Decimal(current), currency="BRL", status=status,
        )
        db.add(goal)
        await db.flush()
        db.add(SavingsMovement(
            goal_id=goal.id, amount=Decimal(previous),
            created_at=datetime.combine(_month_date(today, 1, 15), datetime.min.time(), UTC),
        ))
        if Decimal(current):
            db.add(SavingsMovement(goal_id=goal.id, amount=Decimal(current), created_at=started_at))
    await db.flush()
    return user
