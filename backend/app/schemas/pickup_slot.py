from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PickupSlotBase(BaseModel):
    """Base pickup slot schema attributes."""
    slot_date: date
    start_time: time
    end_time: time
    max_capacity: int = Field(..., gt=0, description="Maximum orders allowed in time slot")


class PickupSlotCreate(PickupSlotBase):
    """Schema for scheduling a new pickup slot."""
    pass


class PickupSlotUpdate(BaseModel):
    """Schema for updating an existing pickup slot."""
    max_capacity: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None


class PickupSlotResponse(PickupSlotBase):
    """Schema representing complete pickup slot response with computed availability."""
    id: int
    current_count: int = 0
    is_active: bool = True
    available_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
