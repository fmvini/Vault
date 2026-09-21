from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.core.security import create_access_token, hash_password, verify_password
from app.models import NotificationPreference, User
from app.schemas import (
    ForgotPasswordRequest,
    MessageResponse,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: DbSession) -> User:
    email = payload.email.lower()
    if await db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        default_currency=payload.default_currency,
    )
    db.add(user)
    await db.flush()
    db.add(NotificationPreference(user_id=user.id))
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: DbSession) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(_: ForgotPasswordRequest) -> MessageResponse:
    return MessageResponse(message="Se o e-mail existir, um link de recuperação será enviado.")


@router.get("/me", response_model=UserResponse)
async def get_me(user: CurrentUser) -> User:
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user
