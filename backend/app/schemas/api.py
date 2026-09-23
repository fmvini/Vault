from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import TransactionType

Currency = Annotated[str, Field(min_length=3, max_length=3)]
PositiveMoney = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CurrencyMixin(BaseModel):
    currency: Currency = "BRL"

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str) -> str:
        return value.upper()


class UserRegister(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=255)]
    email: EmailStr
    password: Annotated[str, Field(min_length=8, max_length=128)]
    default_currency: Currency = "BRL"

    @field_validator("default_currency")
    @classmethod
    def uppercase_default_currency(cls, value: str) -> str:
        return value.upper()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Annotated[str | None, Field(min_length=2, max_length=255)] = None
    default_currency: Currency | None = None

    @field_validator("default_currency")
    @classmethod
    def uppercase_optional_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class UserResponse(ApiModel):
    id: UUID
    name: str
    email: EmailStr
    default_currency: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: Annotated[str, Field(min_length=8, max_length=128)]


class MessageResponse(BaseModel):
    message: str


class CategoryBase(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=100)]
    type: TransactionType
    icon: Annotated[str | None, Field(max_length=50)] = None
    color: Annotated[str | None, Field(pattern=r"^#[0-9A-Fa-f]{6}$")] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Annotated[str | None, Field(min_length=1, max_length=100)] = None
    icon: Annotated[str | None, Field(max_length=50)] = None
    color: Annotated[str | None, Field(pattern=r"^#[0-9A-Fa-f]{6}$")] = None


class CategoryResponse(CategoryBase, ApiModel):
    id: UUID
    is_system: bool


class TransactionCreate(CurrencyMixin):
    category_id: UUID
    type: TransactionType
    amount: PositiveMoney
    description: Annotated[str | None, Field(max_length=500)] = None
    transaction_date: date


class TransactionUpdate(BaseModel):
    category_id: UUID | None = None
    type: TransactionType | None = None
    amount: PositiveMoney | None = None
    currency: Currency | None = None
    description: Annotated[str | None, Field(max_length=500)] = None
    transaction_date: date | None = None
    is_paid: bool | None = None


class TransactionResponse(ApiModel):
    id: UUID
    category_id: UUID
    category_name: str
    fixed_expense_id: UUID | None
    type: TransactionType
    amount: Decimal
    currency: str
    description: str | None
    transaction_date: date
    is_paid: bool


class TransactionPage(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    page_size: int


class FixedExpenseCreate(CurrencyMixin):
    category_id: UUID
    description: Annotated[str, Field(min_length=1, max_length=255)]
    amount: PositiveMoney
    due_day: Annotated[int, Field(ge=1, le=31)]
    start_date: date
    end_date: date | None = None


class FixedExpenseUpdate(BaseModel):
    category_id: UUID | None = None
    description: Annotated[str | None, Field(min_length=1, max_length=255)] = None
    amount: PositiveMoney | None = None
    currency: Currency | None = None
    due_day: Annotated[int | None, Field(ge=1, le=31)] = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class FixedExpenseResponse(ApiModel):
    id: UUID
    category_id: UUID
    description: str
    amount: Decimal
    currency: str
    due_day: int
    start_date: date
    end_date: date | None
    is_active: bool


class MarkPaidRequest(BaseModel):
    is_paid: bool


class GoalCreate(CurrencyMixin):
    category_id: UUID
    monthly_limit: PositiveMoney


class GoalUpdate(BaseModel):
    monthly_limit: PositiveMoney | None = None
    currency: Currency | None = None
    is_active: bool | None = None


class GoalResponse(ApiModel):
    id: UUID
    category_id: UUID
    category_name: str
    monthly_limit: Decimal
    currency: str
    current_month_spent: Decimal
    is_exceeded: bool
    is_active: bool


class ExpenseByCategory(BaseModel):
    category_id: UUID
    category_name: str
    total: Decimal
    percentage: float


class TimelinePoint(BaseModel):
    date: date
    total_income: Decimal
    total_expense: Decimal


class DashboardSummary(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    currency: str
    expenses_by_category: list[ExpenseByCategory]
    timeline: list[TimelinePoint]


class NotificationPreferenceUpdate(BaseModel):
    notify_goal_exceeded: bool | None = None
    notify_fixed_expense_due: bool | None = None
    fixed_expense_due_days_before: Annotated[int | None, Field(ge=0, le=30)] = None


class NotificationPreferenceResponse(ApiModel):
    notify_goal_exceeded: bool
    notify_fixed_expense_due: bool
    fixed_expense_due_days_before: int


SortBy = Literal["transaction_date", "amount"]
SortOrder = Literal["asc", "desc"]
