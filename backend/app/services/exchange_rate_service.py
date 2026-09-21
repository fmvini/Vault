from decimal import Decimal

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ExchangeRate


async def convert_amount(
    db: AsyncSession, amount: Decimal, base_currency: str, target_currency: str
) -> Decimal:
    if base_currency == target_currency:
        return amount
    direct = await db.scalar(
        select(ExchangeRate)
        .where(
            ExchangeRate.base_currency == base_currency,
            ExchangeRate.target_currency == target_currency,
        )
        .order_by(desc(ExchangeRate.fetched_at))
        .limit(1)
    )
    if direct:
        return (amount * direct.rate).quantize(Decimal("0.01"))
    inverse = await db.scalar(
        select(ExchangeRate)
        .where(
            ExchangeRate.base_currency == target_currency,
            ExchangeRate.target_currency == base_currency,
        )
        .order_by(desc(ExchangeRate.fetched_at))
        .limit(1)
    )
    if inverse and inverse.rate:
        return (amount / inverse.rate).quantize(Decimal("0.01"))
    raise ValueError(f"Taxa de câmbio indisponível para {base_currency}/{target_currency}")
