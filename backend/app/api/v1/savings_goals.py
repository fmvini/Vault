from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.models import SavingsGoal, SavingsMovement
from app.schemas import SavingsDeposit, SavingsGoalCreate, SavingsGoalResponse

router = APIRouter(prefix="/savings-goals", tags=["savings-goals"])


async def owned_goal(goal_id: UUID, user: CurrentUser, db: DbSession) -> SavingsGoal:
    goal = await db.scalar(
        select(SavingsGoal)
        .where(SavingsGoal.id == goal_id, SavingsGoal.user_id == user.id)
        .with_for_update()
    )
    if goal is None:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    return goal


@router.get("", response_model=list[SavingsGoalResponse])
async def list_savings_goals(user: CurrentUser, db: DbSession) -> list[SavingsGoal]:
    return list((await db.scalars(
        select(SavingsGoal).where(SavingsGoal.user_id == user.id)
        .order_by(SavingsGoal.created_at.desc())
    )).all())


@router.post("", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_savings_goal(
    payload: SavingsGoalCreate, user: CurrentUser, db: DbSession
) -> SavingsGoal:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Informe o nome da meta")
    goal = SavingsGoal(
        user_id=user.id, name=name, target_amount=payload.target_amount,
        saved_amount=Decimal("0"), currency=payload.currency, status="active",
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.post("/{goal_id}/deposits", response_model=SavingsGoalResponse)
async def deposit_to_goal(
    goal_id: UUID, payload: SavingsDeposit, user: CurrentUser, db: DbSession
) -> SavingsGoal:
    goal = await owned_goal(goal_id, user, db)
    if goal.status != "active":
        raise HTTPException(status_code=409, detail="Esta meta não aceita novos aportes")
    if goal.saved_amount + payload.amount > goal.target_amount:
        raise HTTPException(status_code=409, detail="O aporte ultrapassa o valor da meta")
    goal.saved_amount += payload.amount
    if goal.saved_amount == goal.target_amount:
        goal.status = "completed"
    db.add(SavingsMovement(goal_id=goal.id, amount=payload.amount))
    await db.commit()
    await db.refresh(goal)
    return goal


@router.post("/{goal_id}/cancel", response_model=SavingsGoalResponse)
async def cancel_savings_goal(goal_id: UUID, user: CurrentUser, db: DbSession) -> SavingsGoal:
    goal = await owned_goal(goal_id, user, db)
    if goal.status == "cancelled":
        raise HTTPException(status_code=409, detail="Esta meta já foi cancelada")
    if goal.saved_amount:
        db.add(SavingsMovement(goal_id=goal.id, amount=-goal.saved_amount))
    goal.saved_amount = Decimal("0")
    goal.status = "cancelled"
    await db.commit()
    await db.refresh(goal)
    return goal
