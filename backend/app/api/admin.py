"""Admin Management API Router.

Endpoints for platform administrators to manage user accounts, assign roles, and audit access.
"""

from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get(
    "/users",
    response_model=List[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="List all users (admin only)",
    description="Lists registered users with optional role filtering and pagination.",
)
async def list_users(
    role: Optional[str] = Query(None, description="Filter by role (student, staff, admin)"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Limit for pagination"),
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Fetch paginated list of platform users."""
    stmt = select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    if role:
        stmt = stmt.where(User.role == role)

    result = await db.execute(stmt)
    users = result.scalars().all()
    return users


@router.put(
    "/users/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user role and status (admin only)",
    description="Updates role, active status, or contact details of a specific user account.",
)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Update user role or active status."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    # Prevent admin from deactivating themselves
    if user.id == current_user.id and user_update.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    if user_update.full_name is not None and user_update.full_name.strip():
        user.full_name = user_update.full_name.strip()
    if user_update.phone is not None:
        user.phone = user_update.phone.strip() if user_update.phone else None
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.is_active is not None:
        user.is_active = user_update.is_active

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
