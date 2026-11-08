"""Users API Router.

Endpoints for managing user accounts and current authenticated user profile.
"""

from typing import Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Returns the profile information of the currently authenticated user."
)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> Any:
    """Fetch authenticated user profile details."""
    return current_user


@router.put(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update current user profile",
    description="Allows the authenticated user to update their personal details such as full name or phone number."
)
async def update_my_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Update editable fields of current user."""
    if user_update.full_name is not None and user_update.full_name.strip():
        current_user.full_name = user_update.full_name.strip()

    if user_update.phone is not None:
        current_user.phone = user_update.phone.strip() if user_update.phone else None

    # Note: role and is_active are restricted to admin routes and ignored here for security
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return current_user
