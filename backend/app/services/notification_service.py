"""In-App Notification Service.

Persists user notifications in PostgreSQL and pushes immediate real-time alerts via WebSockets.
"""

import logging
from typing import List, Optional, Union
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.services.websocket_manager import manager

logger = logging.getLogger("campuseats.notifications")


async def create_notification(
    db: AsyncSession,
    user_id: Union[UUID, str],
    title: str,
    message: str,
    notification_type: str = "info",
    reference_id: Optional[str] = None,
) -> Notification:
    """Create a persistent user notification and dispatch an immediate WebSocket alert."""
    if isinstance(user_id, str):
        user_id = UUID(user_id)

    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        reference_id=reference_id,
        is_read=False,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    # Dispatch over WebSocket channel
    try:
        await manager.send_to_user(
            str(user_id),
            {
                "channel": "notifications",
                "event": "new_notification",
                "data": {
                    "id": notification.id,
                    "title": notification.title,
                    "message": notification.message,
                    "notification_type": notification.notification_type,
                    "reference_id": notification.reference_id,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat() if notification.created_at else None,
                },
            },
        )
    except Exception as exc:
        logger.debug("Failed to dispatch WebSocket notification to user %s: %s", user_id, exc)

    return notification


async def get_user_notifications(
    db: AsyncSession,
    user_id: Union[UUID, str],
    unread_only: bool = False,
    limit: int = 50,
) -> List[Notification]:
    """Retrieve in-app notifications for user, optionally filtering for unread only."""
    if isinstance(user_id, str):
        user_id = UUID(user_id)

    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)

    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def mark_as_read(
    db: AsyncSession,
    notification_id: int,
    user_id: Optional[Union[UUID, str]] = None,
) -> Optional[Notification]:
    """Mark a notification as read and acknowledge."""
    stmt = select(Notification).where(Notification.id == notification_id)
    if user_id:
        if isinstance(user_id, str):
            user_id = UUID(user_id)
        stmt = stmt.where(Notification.user_id == user_id)

    res = await db.execute(stmt)
    notification = res.scalar_one_or_none()

    if not notification:
        return None

    notification.is_read = True
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification
