import asyncio
import logging
import smtplib
from email.message import EmailMessage
from html import escape

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html: str, text_body: str | None = None) -> bool:
    """Send transactional email with bounded retries and safe logging."""
    if not settings.email_configured:
        logger.info(
            "Email skipped because %s is not configured: %s", settings.email_provider, subject
        )
        return False

    if settings.email_provider == "gmail":
        return await _send_gmail(to, subject, html, text_body)

    return await _send_resend(to, subject, html, text_body)


async def _send_gmail(to: str, subject: str, html: str, text_body: str | None) -> bool:
    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(
        text_body or "Abra esta mensagem em um leitor de e-mail compatível com HTML."
    )
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


async def _send_resend(to: str, subject: str, html: str, text_body: str | None) -> bool:
    payload = {"from": settings.email_from, "to": [to], "subject": subject, "html": html}
    if text_body:
        payload["text"] = text_body
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


def _email_content(
    heading: str,
    name: str | None,
    introduction: str,
    detail: str,
    action_label: str,
    action_url: str,
    closing: str,
) -> tuple[str, str]:
    greeting = f"Olá, {name.strip()}!" if name and name.strip() else "Olá!"
    image_url = f"{settings.frontend_url.rstrip('/')}/email-vault-hero.png"
    html = f"""<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f3f2;color:#35404a;
font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
{escape(introduction)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
style="background:#f0f3f2;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="600"
style="width:100%;max-width:600px;background:#ffffff;">
<tr><td style="padding:24px 32px;background:#29343d;color:#f6f7f7;
font-size:25px;font-weight:700;letter-spacing:-0.02em;">Vault</td></tr>
<tr><td><img src="{escape(image_url, quote=True)}" width="600"
alt="Uma porta de cofre se abre para um novo caminho"
style="display:block;width:100%;height:auto;border:0;"></td></tr>
<tr><td style="padding:36px 40px 40px;">
<div style="width:88px;height:3px;background:#9adbc5;margin-bottom:24px;"></div>
<h1 style="margin:0 0 22px;color:#172241;font-size:30px;
line-height:1.15;font-weight:500;">{escape(heading)}</h1>
<p style="margin:0 0 14px;font-size:16px;line-height:1.6;">{escape(greeting)}</p>
<p style="margin:0 0 14px;font-size:16px;line-height:1.6;">{escape(introduction)}</p>
<p style="margin:0 0 28px;font-size:16px;line-height:1.6;">{escape(detail)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="background:#9adbc5;border-radius:10px;">
<a href="{escape(action_url, quote=True)}" style="display:inline-block;
padding:15px 22px;color:#183e36;font-size:15px;font-weight:700;
text-decoration:none;">{escape(action_label)}</a></td></tr></table>
<p style="margin:28px 0 0;color:#66717f;font-size:13px;
line-height:1.6;">{escape(closing)}</p>
</td></tr>
<tr><td style="padding:22px 40px;background:#f6f7f7;color:#66717f;
font-size:12px;line-height:1.5;">
Vault · Clareza para o seu dinheiro, todos os dias.</td></tr>
</table></td></tr></table></body></html>"""
    plain = (
        f"Vault\n\n{heading}\n\n{greeting}\n\n{introduction}\n\n{detail}\n\n"
        f"{action_label}: {action_url}\n\n{closing}\n"
    )
    return html, plain


async def send_goal_exceeded(
    to: str, category_name: str, spent: str, limit: str, name: str | None = None
) -> bool:
    html, plain = _email_content(
        "Um limite merece sua atenção.",
        name,
        f"Seus gastos em {category_name} ultrapassaram o limite definido para este mês.",
        f"Você gastou {spent}; seu limite mensal é {limit}. "
        "Vale conferir os lançamentos e ajustar o plano se precisar.",
        "Ver meus limites",
        f"{settings.frontend_url.rstrip('/')}/limits",
        "Este aviso ajuda você a acompanhar o mês sem surpresas.",
    )
    return await send_email(to, f"Limite de {category_name} ultrapassado", html, plain)


async def send_password_reset(to: str, reset_url: str, name: str | None = None) -> bool:
    html, plain = _email_content(
        "Seu próximo acesso começa aqui.",
        name,
        "Recebemos um pedido para criar uma nova senha da sua conta Vault.",
        "Use o botão abaixo para retomar o acesso. Este link é válido por 30 minutos.",
        "Criar nova senha",
        reset_url,
        "Não pediu essa mudança? Ignore este e-mail. Sua senha atual continua válida "
        "e você nunca precisa compartilhar este link.",
    )
    return await send_email(to, "Redefina sua senha do Vault", html, plain)


async def send_fixed_expense_due(
    to: str, description: str, due_day: int, name: str | None = None
) -> bool:
    html, plain = _email_content(
        "Um vencimento está chegando.",
        name,
        f"O gasto fixo {description} vence no dia {due_day}.",
        "Confira os detalhes e organize o pagamento com tranquilidade.",
        "Ver gastos fixos",
        f"{settings.frontend_url.rstrip('/')}/fixed-expenses",
        "Este lembrete segue as preferências de notificação da sua conta.",
    )
    return await send_email(to, f"{description} está próximo do vencimento", html, plain)
