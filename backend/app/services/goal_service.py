from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, Goal, NotificationPreference, Transaction, TransactionType, User
from app.services.email_service import send_goal_exceeded
from app.services.exchange_rate_service import convert_amount


async def current_month_spent(
    db: AsyncSession,
    user_id: UUID,
    category_id: UUID,
    reference_date: date | None = None,
    target_currency: str | None = None,
) -> Decimal:
    reference = reference_date or date.today()
    if target_currency:
        rows = (
            await db.execute(
                select(Transaction.amount, Transaction.currency).where(
                    Transaction.user_id == user_id,
                    Transaction.category_id == category_id,
                    Transaction.type == TransactionType.expense,
                    extract('year', Transaction.transaction_date) == reference.year,
                    extract('month', Transaction.transaction_date) == reference.month,
                )
            )
        ).all()
        total = Decimal('0')
        for amount, currency in rows:
            total += await convert_amount(db, amount, currency, target_currency)
        return total
    value = await db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user_id,
            Transaction.category_id == category_id,
            Transaction.type == TransactionType.expense,
            extract("year", Transaction.transaction_date) == reference.year,
            extract("month", Transaction.transaction_date) == reference.month,
        )
    )
    return Decimal(value or 0)


async def check_goal_after_expense(
    db: AsyncSession,
    user: User,
    transaction: Transaction,
    previous_amount: Decimal = Decimal("0"),
    previous_currency: str | None = None,
) -> None:
    if transaction.type != TransactionType.expense:
        return
    goal = await db.scalar(
        select(Goal).where(
            Goal.user_id == user.id,
            Goal.category_id == transaction.category_id,
            Goal.is_active.is_(True),
        )
    )
    if not goal:
        return
    total = await current_month_spent(
        db, user.id, transaction.category_id, transaction.transaction_date, goal.currency
    )
    current_amount = await convert_amount(
        db, transaction.amount, transaction.currency, goal.currency
    )
    previous = await convert_amount(
        db, previous_amount, previous_currency or transaction.currency, goal.currency
    )
    before = total - current_amount + previous
    if before <= goal.monthly_limit < total:
        preferences = await db.scalar(
            select(NotificationPreference).where(NotificationPreference.user_id == user.id)
        )
        if preferences and preferences.notify_goal_exceeded:
            category_name = await db.scalar(
                select(Category.name).where(Category.id == goal.category_id)
            )
            await send_goal_exceeded(
                user.email,
                category_name or "categoria",
                f"{total:.2f} {goal.currency}",
                f"{goal.monthly_limit:.2f} {goal.currency}",
                user.name,
            )
