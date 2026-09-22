import logging
from datetime import date

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import FixedExpense, NotificationPreference, User
from app.services.email_service import send_fixed_expense_due
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
            if (due_date - today).days == preference.fixed_expense_due_days_before:
                await send_fixed_expense_due(user.email, expense.description, expense.due_day)


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
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
