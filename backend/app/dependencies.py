import uuid
from typing import AsyncGenerator, Callable, List, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import TokenData

# OAuth2 scheme for extracting Bearer token from Authorization header
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False,
)


# ---------------------------------------------------------------------------
# Redis Client Dependency
# ---------------------------------------------------------------------------
async def get_redis(request: Request) -> AsyncGenerator[aioredis.Redis, None]:
    """
    Provide an async Redis client from the application state connection pool.
    Falls back to a temporary client if app.state.redis is not available.
    """
    client: Optional[aioredis.Redis] = getattr(request.app.state, "redis", None)
    if client is not None:
        yield client
    else:
        # Fallback standalone connection
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
        try:
            yield redis_client
        finally:
            await redis_client.close()


# ---------------------------------------------------------------------------
# Current User Dependency
# ---------------------------------------------------------------------------
async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate JWT access token and return the authenticated User model instance.
    Raises 401 Unauthorized if token is missing, invalid, or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id_str: Optional[str] = payload.get("sub")
        role: Optional[str] = payload.get("role")

        if user_id_str is None:
            raise credentials_exception

        token_data = TokenData(
            user_id=uuid.UUID(user_id_str),
            role=role,
        )
    except (JWTError, ValueError):
        raise credentials_exception

    stmt = select(User).where(User.id == token_data.user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    return user


# ---------------------------------------------------------------------------
# Role-based Access Control Dependency
# ---------------------------------------------------------------------------
def require_role(*allowed_roles: str) -> Callable[[User], User]:
    """
    Dependency factory ensuring the current user possesses one of the allowed roles.
    Example usage: Depends(require_role('admin', 'staff'))
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles {list(allowed_roles)}",
            )
        return current_user

    return role_checker
