from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.v1.helpers import visible_category
from app.core.deps import CurrentUser, DbSession
from app.models import Transaction, TransactionType
from app.schemas import (
    SortBy,
    SortOrder,
    TransactionCreate,
    TransactionPage,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.goal_service import check_goal_after_expense

router = APIRouter(prefix="/transactions", tags=["transactions"])


def serialize(transaction: Transaction) -> TransactionResponse:
    return TransactionResponse(
        id=transaction.id,
        category_id=transaction.category_id,
        category_name=transaction.category.name,
        fixed_expense_id=transaction.fixed_expense_id,
        type=transaction.type,
        amount=transaction.amount,
        currency=transaction.currency,
        description=transaction.description,
        transaction_date=transaction.transaction_date,
        is_paid=transaction.is_paid,
    )


@router.get("", response_model=TransactionPage)
async def list_transactions(
    user: CurrentUser,
    db: DbSession,
    q: str | None = Query(None, min_length=1, max_length=200),
    start_date: date | None = None,
    end_date: date | None = None,
    type: TransactionType | None = None,
    category_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: SortBy = "transaction_date",
    sort_order: SortOrder = "desc",
) -> TransactionPage:
    filters = [Transaction.user_id == user.id]
    if q:
        filters.append(Transaction.description.ilike(f'%{q.strip()}%'))
    if start_date:
        filters.append(Transaction.transaction_date >= start_date)
    if end_date:
        filters.append(Transaction.transaction_date <= end_date)
    if type:
        filters.append(Transaction.type == type)
    if category_id:
        filters.append(Transaction.category_id == category_id)
    total = await db.scalar(select(func.count(Transaction.id)).where(*filters)) or 0
    order_column = Transaction.amount if sort_by == "amount" else Transaction.transaction_date
    order = order_column.asc() if sort_order == "asc" else order_column.desc()
    query = (
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(*filters)
        .order_by(order, Transaction.created_at.desc(), Transaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [serialize(item) for item in (await db.scalars(query)).all()]
    return TransactionPage(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: TransactionCreate, user: CurrentUser, db: DbSession
) -> TransactionResponse:
    await visible_category(db, user, payload.category_id, payload.type)
    transaction = Transaction(user_id=user.id, is_paid=True, **payload.model_dump())
    db.add(transaction)
    await db.commit()
    transaction = await db.scalar(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.id == transaction.id)
    )
    assert transaction is not None
    await check_goal_after_expense(db, user, transaction)
    return serialize(transaction)


async def owned_transaction(transaction_id: UUID, user: CurrentUser, db: DbSession) -> Transaction:
    transaction = await db.scalar(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.id == transaction_id, Transaction.user_id == user.id)
    )
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return transaction


@router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    payload: TransactionUpdate,
    user: CurrentUser,
    db: DbSession,
) -> TransactionResponse:
    transaction = await owned_transaction(transaction_id, user, db)
    previous_amount = Decimal(transaction.amount)
    previous_currency = transaction.currency
    previous_category_id = transaction.category_id
    previous_type = transaction.type
    previous_date = transaction.transaction_date
    values = payload.model_dump(exclude_unset=True)
    category_id = values.get("category_id", transaction.category_id)
    transaction_type = values.get("type", transaction.type)
    await visible_category(db, user, category_id, transaction_type)
    for field, value in values.items():
        setattr(transaction, field, value)
    await db.commit()
    transaction = await owned_transaction(transaction_id, user, db)
    same_goal_month = (
        previous_type == TransactionType.expense
        and previous_category_id == transaction.category_id
        and (previous_date.year, previous_date.month)
        == (transaction.transaction_date.year, transaction.transaction_date.month)
    )
    await check_goal_after_expense(
        db,
        user,
        transaction,
        previous_amount if same_goal_month else Decimal('0'),
        previous_currency,
    )
    return serialize(transaction)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(transaction_id: UUID, user: CurrentUser, db: DbSession) -> Response:
    transaction = await owned_transaction(transaction_id, user, db)
    await db.delete(transaction)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
