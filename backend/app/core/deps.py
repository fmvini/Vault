from datetime import UTC, datetime
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_session_token
from app.db.session import get_db
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    request: Request,
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    try:
        user_id, token_type = decode_session_token(credentials.credentials)
    except (jwt.PyJWTError, ValueError, TypeError, KeyError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido"
        ) from None
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado"
        )
    is_preview = user.preview_expires_at is not None
    if is_preview != (token_type == 'preview'):
        raise HTTPException(status_code=401, detail='Token inválido')
    if is_preview:
        expires_at = user.preview_expires_at
        # SQLite returns naive timestamps; PostgreSQL preserves the UTC offset.
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at <= datetime.now(UTC):
            raise HTTPException(status_code=401, detail='Sessão de demonstração expirada')
        path = request.url.path.rstrip('/')
        if request.method != 'GET' and path in (
            '/api/v1/auth/me', '/api/v1/notification-preferences',
        ):
            raise HTTPException(
                status_code=403,
                detail='Perfil e notificações são somente leitura na demonstração',
            )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
