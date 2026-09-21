from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, TransactionType, User


async def visible_category(
    db: AsyncSession,
    user: User,
    category_id: UUID,
    expected_type: TransactionType | None = None,
) -> Category:
    category = await db.scalar(
        select(Category).where(
            Category.id == category_id,
            or_(Category.is_system.is_(True), Category.user_id == user.id),
        )
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    if expected_type and category.type != expected_type:
        raise HTTPException(status_code=422, detail="A categoria não corresponde ao tipo informado")
    return category
