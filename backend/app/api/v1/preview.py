from datetime import UTC

from fastapi import APIRouter, Response, status

from app.core.deps import DbSession
from app.core.security import create_preview_token
from app.db.preview import create_preview_session
from app.schemas import PreviewSessionResponse, UserResponse

router = APIRouter(prefix='/preview', tags=['preview'])


@router.post(
    '/session', response_model=PreviewSessionResponse, status_code=status.HTTP_201_CREATED,
)
async def create_session(db: DbSession, response: Response) -> PreviewSessionResponse:
    user = await create_preview_session(db, ttl_minutes=30)
    expires_at = user.preview_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    # Validate the response before committing any visitor data.
    result = PreviewSessionResponse(
        access_token=create_preview_token(user.id, expires_at),
        expires_at=expires_at,
        user=UserResponse.model_validate(user),
    )
    await db.commit()
    response.headers['Cache-Control'] = 'no-store'
    return result
