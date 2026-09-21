import asyncio
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send transactional email with bounded retries and safe logging."""
    if not settings.email_provider_api_key:
        logger.info("Email skipped because the provider key is not configured: %s", subject)
        return False

    payload = {"from": settings.email_from, "to": [to], "subject": subject, "html": html}
    headers = {"Authorization": f"Bearer {settings.email_provider_api_key}"}
    for attempt in range(1, 4):
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    "https://api.resend.com/emails", json=payload, headers=headers
                )
                response.raise_for_status()
                return True
        except httpx.HTTPError:
            logger.warning("Email delivery attempt %s failed for subject %s", attempt, subject)
            if attempt < 3:
                await asyncio.sleep(2 ** (attempt - 1))
    logger.error("Email delivery exhausted retries for subject %s", subject)
    return False


async def send_goal_exceeded(to: str, category_name: str, spent: str, limit: str) -> bool:
    return await send_email(
        to,
        f"Meta de {category_name} ultrapassada",
        f"<p>Você gastou <strong>{spent}</strong> em {category_name}. "
        f"O limite mensal configurado é <strong>{limit}</strong>.</p>",
    )


async def send_fixed_expense_due(to: str, description: str, due_day: int) -> bool:
    return await send_email(
        to,
        f"{description} está próximo do vencimento",
        f"<p>O gasto fixo <strong>{description}</strong> vence no dia {due_day}.</p>",
    )
