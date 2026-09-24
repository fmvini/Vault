import logging
from datetime import date

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import FixedExpense, NotificationPreference, User
from app.services.email_service import send_fixed_expense_due
from app.services.exchange_rate_service import refresh_exchange_rates
from app.services.recurrence_service import generate_monthly_transactions, monthly_due_date

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")


async def recurrence_job() -> None:
    async with SessionLocal() as db:
        created = await generate_monthly_transactions(db)
        logger.info("Recurring transaction job created %s records", created)


async def due_notification_job() -> None:
    today = date.today()
    async with SessionLocal() as db:
        rows = (
            await db.execute(
                select(FixedExpense, User, NotificationPreference)
                .join(User, User.id == FixedExpense.user_id)
                .join(NotificationPreference, NotificationPreference.user_id == User.id)
                .where(
                    FixedExpense.is_active.is_(True),
                    NotificationPreference.notify_fixed_expense_due.is_(True),
                )
            )
        ).all()
        for expense, user, preference in rows:
            due_date = monthly_due_date(today.year, today.month, expense.due_day)
            if due_date < today:
                next_month = today.month % 12 + 1
                next_year = today.year + (today.month == 12)
                due_date = monthly_due_date(next_year, next_month, expense.due_day)
            if due_date < expense.start_date or (expense.end_date and due_date > expense.end_date):
                continue
            if (due_date - today).days == preference.fixed_expense_due_days_before:
                await send_fixed_expense_due(
                    user.email, expense.description, expense.due_day, user.name
                )


async def exchange_rate_job() -> None:
    async with SessionLocal() as db:
        refreshed = await refresh_exchange_rates(db)
        logger.info('Exchange-rate job refreshed %s currency pairs', refreshed)


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        recurrence_job, "cron", hour=3, minute=0, id="recurrence", replace_existing=True
    )
    scheduler.add_job(
        due_notification_job,
        "cron",
        hour=9,
        minute=0,
        id="due-notifications",
        replace_existing=True,
    )
    scheduler.add_job(
        exchange_rate_job,
        'interval',
        hours=24,
        id='exchange-rates',
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
