from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, password_digest: str) -> bool:
    return password_hash.verify(password, password_digest)


def _create_token(user_id: UUID, token_type: str, expires_at: datetime) -> str:
    payload = {
        'sub': str(user_id),
        'type': token_type,
        'exp': expires_at,
        'iat': datetime.now(UTC),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _decode_token(token: str, expected_type: str) -> UUID:
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    if payload.get('type') != expected_type:
        raise ValueError('Tipo de token inválido')
    return UUID(payload['sub'])


def create_access_token(user_id: UUID) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_expiration_minutes)
    return _create_token(user_id, 'access', expires_at)


def decode_access_token(token: str) -> UUID:
    return _decode_token(token, 'access')


def create_password_reset_token(user_id: UUID) -> str:
    return _create_token(user_id, 'password_reset', datetime.now(UTC) + timedelta(minutes=30))


def decode_password_reset_token(token: str) -> UUID:
    return _decode_token(token, 'password_reset')
