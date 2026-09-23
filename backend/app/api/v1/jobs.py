"""Authenticated HTTP triggers for daily jobs in serverless production."""

from secrets import compare_digest

from fastapi import APIRouter, Header, HTTPException

from app.core.config import settings
from app.jobs.scheduler import due_notification_job, exchange_rate_job, recurrence_job

router = APIRouter(prefix="/jobs", tags=["jobs"])


def authorize_cron(authorization: str | None) -> None:
    secret = settings.cron_secret
    if not secret or not authorization or not compare_digest(authorization, f"Bearer {secret}"):
        raise HTTPException(status_code=401, detail="Não autorizado")


@router.get("/recurrence")
async def run_recurrence(authorization: str | None = Header(default=None)) -> dict[str, str]:
    authorize_cron(authorization)
    await recurrence_job()
    return {"status": "ok"}


@router.get("/due-notifications")
async def run_due_notifications(authorization: str | None = Header(default=None)) -> dict[str, str]:
    authorize_cron(authorization)
    await due_notification_job()
    return {"status": "ok"}


@router.get("/exchange-rates")
async def run_exchange_rates(authorization: str | None = Header(default=None)) -> dict[str, str]:
    authorize_cron(authorization)
    await exchange_rate_job()
    return {"status": "ok"}
