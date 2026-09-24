from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    auth,
    categories,
    dashboard,
    fixed_expenses,
    goals,
    jobs,
    notification_preferences,
    savings_goals,
    transactions,
)
from app.core.config import settings
from app.db.base import Base
from app.db.seed import seed_system_categories
from app.db.session import SessionLocal, engine
from app.jobs.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.environment == "development":
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with SessionLocal() as db:
            await seed_system_categories(db)
    if settings.scheduler_enabled:
        start_scheduler()
    yield
    if settings.scheduler_enabled:
        stop_scheduler()
    await engine.dispose()


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prefix = "/api/v1"
for router in (
    auth.router,
    categories.router,
    transactions.router,
    fixed_expenses.router,
    goals.router,
    savings_goals.router,
    dashboard.router,
    notification_preferences.router,
    jobs.router,
):
    app.include_router(router, prefix=prefix)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
