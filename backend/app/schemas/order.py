import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, List, Optional, Union

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class OrderItemCreate(BaseModel):
    """Schema for line items inside an order placement request."""
    food_item_id: int
    quantity: int = Field(..., gt=0, description="Quantity of food item to order")


class OrderItemResponse(BaseModel):
    """Schema representing line item in order response."""
    id: int
    order_id: uuid.UUID
    food_item_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    food_item_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    """Schema for placing a new canteen order."""
    pickup_slot_id: Optional[int] = None
    special_instructions: Optional[str] = None
    items: List[OrderItemCreate] = Field(default_factory=list)


class OrderStatusUpdate(BaseModel):
    """Schema for updating preparation status of an order."""
    new_status: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def synchronize_status_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            resolved = data.get("status") or data.get("new_status")
            if resolved:
                data.setdefault("status", resolved)
                data.setdefault("new_status", resolved)
        return data

    @field_validator("status", "new_status", mode="after")
    @classmethod
    def validate_status_value(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_statuses = {
                "pending",
                "confirmed",
                "accepted",
                "preparing",
                "ready",
                "picked_up",
                "cancelled",
            }
            if v not in valid_statuses:
                raise ValueError(f"Invalid status '{v}'. Allowed: {sorted(valid_statuses)}")
        return v


class OrderResponse(BaseModel):
    """Schema representing complete order details."""
    id: uuid.UUID
    user_id: uuid.UUID
    pickup_slot_id: Optional[int] = None
    status: str
    total_amount: Decimal
    qr_code: Optional[str] = None
    qr_verified: bool = False
    special_instructions: Optional[str] = None
    items: List[OrderItemResponse] = Field(
        default_factory=list,
        validation_alias=AliasChoices("items", "order_items"),
    )
    payment: Optional[Any] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CartItem(BaseModel):
    """Schema representing an individual food item in the shopping cart."""
    food_item_id: int
    quantity: int = Field(1, ge=1)
    name: Optional[str] = ""
    price: Optional[float] = 0.0

    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    """Schema representing shopping cart contents and total price."""
    items: List[CartItem] = Field(default_factory=list)
    total: float = 0.0

    model_config = ConfigDict(from_attributes=True)
