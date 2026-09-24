import asyncio
import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send transactional email with bounded retries and safe logging."""
    if not settings.email_configured:
        logger.info(
            "Email skipped because %s is not configured: %s", settings.email_provider, subject
        )
        return False

    if settings.email_provider == "gmail":
        return await _send_gmail(to, subject, html)

    return await _send_resend(to, subject, html)


async def _send_gmail(to: str, subject: str, html: str) -> bool:
    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content("Esta mensagem contém conteúdo HTML. Abra-a em um leitor compatível.")
    message.add_alternative(html, subtype="html")

    def deliver() -> None:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as smtp:
            smtp.login(settings.gmail_address, settings.gmail_app_password)
            smtp.send_message(message)

    try:
        await asyncio.to_thread(deliver)
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error("Gmail authentication failed for subject %s", subject)
        return False
    except (smtplib.SMTPException, OSError):
        logger.exception("Gmail delivery failed for subject %s", subject)
        return False


async def _send_resend(to: str, subject: str, html: str) -> bool:
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


async def send_password_reset(to: str, reset_url: str) -> bool:
    return await send_email(
        to,
        'Redefina sua senha do Vault',
        f'<p>Recebemos um pedido para redefinir sua senha.</p>'
        f'<p><a href="{reset_url}">Criar uma nova senha</a></p>'
        '<p>O link expira em 30 minutos. Se você não fez o pedido, ignore este e-mail.</p>',
    )


async def send_fixed_expense_due(to: str, description: str, due_day: int) -> bool:
    return await send_email(
        to,
        f"{description} está próximo do vencimento",
        f"<p>O gasto fixo <strong>{description}</strong> vence no dia {due_day}.</p>",
    )
