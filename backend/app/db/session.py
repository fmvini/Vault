from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine_options = {"pool_pre_ping": True}
if settings.environment == "production" and settings.database_url.startswith(
    "postgresql+psycopg://"
):
    # Supabase transaction pooling works with one connection per warm Vercel instance.
    engine_options.update(
        pool_size=1,
        max_overflow=0,
        connect_args={"prepare_threshold": None, "sslmode": "require"},
    )

engine = create_async_engine(settings.database_url, **engine_options)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
