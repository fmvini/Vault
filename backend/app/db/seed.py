from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, TransactionType

SYSTEM_CATEGORIES = [
    ("Alimentação", TransactionType.expense, "utensils", "#DFA8B8"),
    ("Transporte", TransactionType.expense, "car", "#8FC8D2"),
    ("Moradia", TransactionType.expense, "home", "#B4A6DF"),
    ("Lazer", TransactionType.expense, "film", "#9C8FD8"),
    ("Saúde", TransactionType.expense, "heart-pulse", "#D4C3EA"),
    ("Educação", TransactionType.expense, "book", "#9ADBC5"),
    ("Compras", TransactionType.expense, "shopping-bag", "#7EBCC8"),
    ("Outros (gasto)", TransactionType.expense, "more-horizontal", "#CFD5DA"),
    ("Salário", TransactionType.income, "wallet", "#6FC5AD"),
    ("Renda Extra", TransactionType.income, "trending-up", "#82CFAF"),
    ("Outros (receita)", TransactionType.income, "more-horizontal", "#A8D8C9"),
]


async def seed_system_categories(db: AsyncSession) -> None:
    existing = await db.scalar(select(Category.id).where(Category.is_system.is_(True)).limit(1))
    if existing:
        return
    db.add_all(
        [
            Category(name=name, type=kind, icon=icon, color=color, is_system=True)
            for name, kind, icon, color in SYSTEM_CATEGORIES
        ]
    )
    await db.commit()
