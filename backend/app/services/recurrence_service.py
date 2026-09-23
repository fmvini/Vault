import calendar
from datetime import date

from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import FixedExpense, Transaction, TransactionType


def monthly_due_date(year: int, month: int, due_day: int) -> date:
    return date(year, month, min(due_day, calendar.monthrange(year, month)[1]))


async def generate_monthly_transactions(
    db: AsyncSession, reference_date: date | None = None
) -> int:
    """Create at most one transaction per active fixed expense in the target month."""
    reference = reference_date or date.today()
    expenses = (
        await db.scalars(
            select(FixedExpense).where(
                FixedExpense.is_active.is_(True),
                FixedExpense.start_date <= reference,
                (FixedExpense.end_date.is_(None)) | (FixedExpense.end_date >= reference),
            )
        )
    ).all()
    created = 0
    for expense in expenses:
        due_date = monthly_due_date(reference.year, reference.month, expense.due_day)
        if due_date < expense.start_date or (expense.end_date and due_date > expense.end_date):
            continue
        exists = await db.scalar(
            select(Transaction.id).where(
                Transaction.fixed_expense_id == expense.id,
                extract("year", Transaction.transaction_date) == reference.year,
                extract("month", Transaction.transaction_date) == reference.month,
            )
        )
        if exists:
            continue
        db.add(
            Transaction(
                user_id=expense.user_id,
                category_id=expense.category_id,
                fixed_expense_id=expense.id,
                type=TransactionType.expense,
                amount=expense.amount,
                currency=expense.currency,
                description=expense.description,
                transaction_date=due_date,
                is_paid=False,
            )
        )
        created += 1
    await db.commit()
    return created
