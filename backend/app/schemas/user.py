import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    """Base user attributes."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)


class UserCreate(UserBase):
    """Schema for registering a new user."""
    password: str = Field(..., min_length=6, max_length=128)
    role: Optional[str] = Field("student", pattern="^(student|staff|admin)$")


class UserLogin(BaseModel):
    """Schema for user authentication request."""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile fields."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    role: Optional[str] = Field(None, pattern="^(student|staff|admin)$")
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for returning user data (excluding sensitive password hash)."""
    id: uuid.UUID
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Schema for JWT authentication tokens response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema representing decoded JWT payload."""
    user_id: Optional[uuid.UUID] = None
    role: Optional[str] = None
