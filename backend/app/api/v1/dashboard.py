from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models import Transaction, TransactionType
from app.schemas import DashboardSummary, ExpenseByCategory, TimelinePoint
from app.services.exchange_rate_service import convert_amount

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(
    user: CurrentUser,
    db: DbSession,
    start_date: Annotated[date, Query()],
    end_date: Annotated[date, Query()],
) -> DashboardSummary:
    if end_date < start_date:
        raise HTTPException(status_code=422, detail="A data final deve ser posterior à inicial")
    transactions = (
        await db.scalars(
            select(Transaction)
            .options(selectinload(Transaction.category))
            .where(
                Transaction.user_id == user.id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date,
            )
            .order_by(Transaction.transaction_date)
        )
    ).all()
    income = Decimal("0")
    expense = Decimal("0")
    by_category: dict[tuple, Decimal] = defaultdict(lambda: Decimal("0"))
    by_day: dict[date, dict[str, Decimal]] = defaultdict(
        lambda: {"income": Decimal("0"), "expense": Decimal("0")}
    )
    for item in transactions:
        try:
            amount = await convert_amount(db, item.amount, item.currency, user.default_currency)
        except ValueError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        if item.type == TransactionType.income:
            income += amount
            by_day[item.transaction_date]["income"] += amount
        else:
            expense += amount
            by_category[(item.category_id, item.category.name)] += amount
            by_day[item.transaction_date]["expense"] += amount
    categories = [
        ExpenseByCategory(
            category_id=category_id,
            category_name=name,
            total=total,
            percentage=float((total / expense * 100) if expense else 0),
        )
        for (category_id, name), total in sorted(
            by_category.items(), key=lambda row: row[1], reverse=True
        )
    ]
    timeline = [
        TimelinePoint(
            date=day,
            total_income=values["income"],
            total_expense=values["expense"],
        )
        for day, values in sorted(by_day.items())
    ]
    return DashboardSummary(
        total_income=income,
        total_expense=expense,
        balance=income - expense,
        currency=user.default_currency,
        expenses_by_category=categories,
        timeline=timeline,
    )
