from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import or_, select

from app.core.deps import CurrentUser, DbSession
from app.models import Category, Transaction, TransactionType
from app.schemas import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    user: CurrentUser, db: DbSession, type: TransactionType | None = None
) -> list[Category]:
    query = select(Category).where(or_(Category.is_system.is_(True), Category.user_id == user.id))
    if type:
        query = query.where(Category.type == type)
    return list((await db.scalars(query.order_by(Category.type, Category.name))).all())


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(payload: CategoryCreate, user: CurrentUser, db: DbSession) -> Category:
    category = Category(user_id=user.id, is_system=False, **payload.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def owned_category(category_id: UUID, user: CurrentUser, db: DbSession) -> Category:
    category = await db.scalar(select(Category).where(Category.id == category_id))
    if category is None or (not category.is_system and category.user_id != user.id):
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID, payload: CategoryUpdate, user: CurrentUser, db: DbSession
) -> Category:
    category = await owned_category(category_id, user, db)
    if category.is_system:
        raise HTTPException(status_code=403, detail="Categorias do sistema não podem ser editadas")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: UUID, user: CurrentUser, db: DbSession) -> Response:
    category = await owned_category(category_id, user, db)
    if category.is_system:
        raise HTTPException(status_code=403, detail="Categorias do sistema não podem ser excluídas")
    if await db.scalar(
        select(Transaction.id).where(Transaction.category_id == category.id).limit(1)
    ):
        raise HTTPException(
            status_code=409, detail="Reatribua as transações antes de excluir a categoria"
        )
    await db.delete(category)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
