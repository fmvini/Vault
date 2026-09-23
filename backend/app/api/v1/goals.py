from datetime import date
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.v1.helpers import visible_category
from app.core.deps import CurrentUser, DbSession
from app.models import Goal, TransactionType
from app.schemas import GoalCreate, GoalResponse, GoalUpdate
from app.services.goal_service import current_month_spent

router = APIRouter(prefix="/goals", tags=["goals"])


async def serialize_goal(goal: Goal, db: DbSession) -> GoalResponse:
    spent = await current_month_spent(
        db, goal.user_id, goal.category_id, date.today(), goal.currency
    )
    return GoalResponse(
        id=goal.id,
        category_id=goal.category_id,
        category_name=goal.category.name,
        monthly_limit=goal.monthly_limit,
        currency=goal.currency,
        current_month_spent=spent,
        is_exceeded=spent > goal.monthly_limit,
        is_active=goal.is_active,
    )


@router.get("", response_model=list[GoalResponse])
async def list_goals(user: CurrentUser, db: DbSession) -> list[GoalResponse]:
    goals = (
        await db.scalars(
            select(Goal)
            .options(selectinload(Goal.category))
            .where(Goal.user_id == user.id)
            .order_by(Goal.is_active.desc(), Goal.created_at.desc())
        )
    ).all()
    return [await serialize_goal(goal, db) for goal in goals]


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(payload: GoalCreate, user: CurrentUser, db: DbSession) -> GoalResponse:
    await visible_category(db, user, payload.category_id, TransactionType.expense)
    existing = await db.scalar(
        select(Goal.id).where(
            Goal.user_id == user.id,
            Goal.category_id == payload.category_id,
            Goal.is_active.is_(True),
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Já existe uma meta ativa para esta categoria")
    goal = Goal(user_id=user.id, is_active=True, **payload.model_dump())
    db.add(goal)
    await db.commit()
    goal = await db.scalar(
        select(Goal).options(selectinload(Goal.category)).where(Goal.id == goal.id)
    )
    assert goal is not None
    return await serialize_goal(goal, db)


async def owned_goal(goal_id: UUID, user: CurrentUser, db: DbSession) -> Goal:
    goal = await db.scalar(
        select(Goal)
        .options(selectinload(Goal.category))
        .where(Goal.id == goal_id, Goal.user_id == user.id)
    )
    if goal is None:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    return goal


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: UUID, payload: GoalUpdate, user: CurrentUser, db: DbSession
) -> GoalResponse:
    goal = await owned_goal(goal_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    if goal.is_active:
        duplicate = await db.scalar(
            select(Goal.id).where(
                Goal.user_id == user.id,
                Goal.category_id == goal.category_id,
                Goal.is_active.is_(True),
                Goal.id != goal.id,
            )
        )
        if duplicate:
            raise HTTPException(
                status_code=409, detail="Já existe uma meta ativa para esta categoria"
            )
    await db.commit()
    goal = await owned_goal(goal_id, user, db)
    return await serialize_goal(goal, db)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: UUID, user: CurrentUser, db: DbSession) -> Response:
    goal = await owned_goal(goal_id, user, db)
    await db.delete(goal)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
