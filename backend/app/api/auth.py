"""Authentication API Router.

Endpoints for user registration, login, and JWT token refresh.
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RefreshTokenRequest(BaseModel):
    """Payload for refreshing an expired access token."""
    refresh_token: str = Field(..., description="Valid JWT refresh token")


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Registers a new user (student by default, or staff/admin if authorized) with a hashed password."
)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Register a new student or staff account."""
    # Check if user already exists
    stmt = select(User).where(User.email == user_in.email.lower().strip())
    result = await db.execute(stmt)
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Hash the password securely
    hashed_password = auth_service.hash_password(user_in.password)

    # Assign default role if none or invalid
    role = user_in.role if hasattr(user_in, "role") and user_in.role else "student"
    if role not in ("student", "staff", "admin"):
        role = "student"

    new_user = User(
        email=user_in.email.lower().strip(),
        password_hash=hashed_password,
        full_name=user_in.full_name.strip(),
        phone=user_in.phone.strip() if user_in.phone else None,
        role=role,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login",
    description="Authenticates credentials and returns a pair of JWT access and refresh tokens."
)
async def login(
    login_in: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Authenticate user with email and password."""
    stmt = select(User).where(User.email == login_in.email.lower().strip())
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not auth_service.verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support.",
        )

    # Issue access and refresh tokens
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
    }
    access_token = auth_service.create_access_token(data=token_payload)
    refresh_token = auth_service.create_refresh_token(data=token_payload)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token",
    description="Decodes a valid refresh token and issues a new access token."
)
async def refresh_token(
    refresh_in: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Generate a new access token using a valid refresh token."""
    try:
        payload = auth_service.decode_token(refresh_in.refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_type = payload.get("type")
    if token_type and token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token provided is not a refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify user exists and is active
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists or is inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    new_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
    }
    new_access_token = auth_service.create_access_token(data=new_payload)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=refresh_in.refresh_token,
        token_type="bearer",
    )
