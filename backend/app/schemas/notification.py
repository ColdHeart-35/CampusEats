import uuid
from datetime import datetime
from typing import Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    """Schema for dispatching a new notification to a user."""
    user_id: Union[str, uuid.UUID]
    title: str = Field(..., max_length=200)
    message: str
    notification_type: str = "info"
    reference_id: Optional[str] = None


class NotificationResponse(BaseModel):
    """Schema representing an in-app user notification."""
    id: int
    user_id: uuid.UUID
    title: str
    message: str
    notification_type: str = "info"
    is_read: bool = False
    reference_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
