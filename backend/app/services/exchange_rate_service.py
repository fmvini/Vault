import logging
from decimal import Decimal, InvalidOperation

import httpx
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ExchangeRate

logger = logging.getLogger(__name__)
SUPPORTED_CURRENCIES = ('BRL', 'USD', 'EUR')
PROVIDER_URL = 'https://api.frankfurter.dev/v2/rate'


async def fetch_exchange_rate(
    db: AsyncSession, base_currency: str, target_currency: str
) -> Decimal:
    base = base_currency.upper()
    target = target_currency.upper()
    if base not in SUPPORTED_CURRENCIES or target not in SUPPORTED_CURRENCIES:
        raise ValueError(f'Moeda não suportada: {base}/{target}')
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f'{PROVIDER_URL}/{base.lower()}/{target.lower()}')
            response.raise_for_status()
            rate = Decimal(str(response.json()['rate']))
    except (httpx.HTTPError, KeyError, InvalidOperation, TypeError) as exc:
        logger.warning('Exchange-rate refresh failed for %s/%s', base, target)
        raise ValueError(f'Taxa de câmbio indisponível para {base}/{target}') from exc
    if rate <= 0:
        raise ValueError(f'Taxa de câmbio inválida para {base}/{target}')
    db.add(ExchangeRate(base_currency=base, target_currency=target, rate=rate))
    await db.commit()
    return rate


async def refresh_exchange_rates(db: AsyncSession) -> int:
    refreshed = 0
    for base in SUPPORTED_CURRENCIES:
        for target in SUPPORTED_CURRENCIES:
            if base == target:
                continue
            try:
                await fetch_exchange_rate(db, base, target)
                refreshed += 1
            except ValueError:
                continue
    return refreshed


async def convert_amount(
    db: AsyncSession, amount: Decimal, base_currency: str, target_currency: str
) -> Decimal:
    if amount == 0:
        return Decimal('0')
    base = base_currency.upper()
    target = target_currency.upper()
    if base == target:
        return amount
    direct = await db.scalar(
        select(ExchangeRate)
        .where(
            ExchangeRate.base_currency == base,
            ExchangeRate.target_currency == target,
        )
        .order_by(desc(ExchangeRate.fetched_at))
        .limit(1)
    )
    if direct:
        return (amount * direct.rate).quantize(Decimal('0.01'))
    inverse = await db.scalar(
        select(ExchangeRate)
        .where(
            ExchangeRate.base_currency == target,
            ExchangeRate.target_currency == base,
        )
        .order_by(desc(ExchangeRate.fetched_at))
        .limit(1)
    )
    if inverse and inverse.rate:
        return (amount / inverse.rate).quantize(Decimal('0.01'))
    rate = await fetch_exchange_rate(db, base, target)
    return (amount * rate).quantize(Decimal('0.01'))
