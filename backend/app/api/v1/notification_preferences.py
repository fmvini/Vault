from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.models import NotificationPreference
from app.schemas import NotificationPreferenceResponse, NotificationPreferenceUpdate

router = APIRouter(prefix="/notification-preferences", tags=["notification-preferences"])


async def get_or_create(user_id, db: DbSession) -> NotificationPreference:
    preference = await db.scalar(
        select(NotificationPreference).where(NotificationPreference.user_id == user_id)
    )
    if preference is None:
        preference = NotificationPreference(user_id=user_id)
        db.add(preference)
        await db.commit()
        await db.refresh(preference)
    return preference


@router.get("", response_model=NotificationPreferenceResponse)
async def get_preferences(user: CurrentUser, db: DbSession) -> NotificationPreference:
    return await get_or_create(user.id, db)


@router.patch("", response_model=NotificationPreferenceResponse)
async def update_preferences(
    payload: NotificationPreferenceUpdate, user: CurrentUser, db: DbSession
) -> NotificationPreference:
    preference = await get_or_create(user.id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(preference, field, value)
    await db.commit()
    await db.refresh(preference)
    return preference
