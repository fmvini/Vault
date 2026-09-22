from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select

from app.api.v1.helpers import visible_category
from app.core.deps import CurrentUser, DbSession
from app.models import FixedExpense, Transaction, TransactionType
from app.schemas import (
    FixedExpenseCreate,
    FixedExpenseResponse,
    FixedExpenseUpdate,
    MarkPaidRequest,
    TransactionResponse,
)

router = APIRouter(prefix="/fixed-expenses", tags=["fixed-expenses"])


@router.get("", response_model=list[FixedExpenseResponse])
async def list_fixed_expenses(
    user: CurrentUser, db: DbSession, is_active: bool | None = Query(None)
) -> list[FixedExpense]:
    query = select(FixedExpense).where(FixedExpense.user_id == user.id)
    if is_active is not None:
        query = query.where(FixedExpense.is_active == is_active)
    return list((await db.scalars(query.order_by(FixedExpense.due_day))).all())


@router.post("", response_model=FixedExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_fixed_expense(
    payload: FixedExpenseCreate, user: CurrentUser, db: DbSession
) -> FixedExpense:
    if payload.end_date and payload.end_date < payload.start_date:
        raise HTTPException(status_code=422, detail="A data final deve ser posterior à inicial")
    await visible_category(db, user, payload.category_id, TransactionType.expense)
    expense = FixedExpense(user_id=user.id, is_active=True, **payload.model_dump())
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


async def owned_fixed_expense(expense_id: UUID, user: CurrentUser, db: DbSession) -> FixedExpense:
    expense = await db.scalar(
        select(FixedExpense).where(FixedExpense.id == expense_id, FixedExpense.user_id == user.id)
    )
    if expense is None:
        raise HTTPException(status_code=404, detail="Gasto fixo não encontrado")
    return expense


@router.patch("/{fixed_expense_id}", response_model=FixedExpenseResponse)
async def update_fixed_expense(
    fixed_expense_id: UUID,
    payload: FixedExpenseUpdate,
    user: CurrentUser,
    db: DbSession,
) -> FixedExpense:
    expense = await owned_fixed_expense(fixed_expense_id, user, db)
    values = payload.model_dump(exclude_unset=True)
    if "category_id" in values:
        await visible_category(db, user, values["category_id"], TransactionType.expense)
    for field, value in values.items():
        setattr(expense, field, value)
    if expense.end_date and expense.end_date < expense.start_date:
        raise HTTPException(status_code=422, detail="A data final deve ser posterior à inicial")
    await db.commit()
    await db.refresh(expense)
    return expense


@router.delete("/{fixed_expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_fixed_expense(
    fixed_expense_id: UUID, user: CurrentUser, db: DbSession
) -> Response:
    expense = await owned_fixed_expense(fixed_expense_id, user, db)
    expense.is_active = False
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{fixed_expense_id}/transactions/{transaction_id}/mark-paid",
    response_model=TransactionResponse,
)
async def mark_transaction_paid(
    fixed_expense_id: UUID,
    transaction_id: UUID,
    payload: MarkPaidRequest,
    user: CurrentUser,
    db: DbSession,
) -> TransactionResponse:
    await owned_fixed_expense(fixed_expense_id, user, db)
    transaction = await db.scalar(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user.id,
            Transaction.fixed_expense_id == fixed_expense_id,
        )
    )
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transação recorrente não encontrada")
    transaction.is_paid = payload.is_paid
    await db.commit()
    await db.refresh(transaction, ["category"])
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
