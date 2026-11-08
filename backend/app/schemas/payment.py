import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class PaymentOrderCreate(BaseModel):
    """Schema for requesting creation of a Razorpay payment order."""
    order_id: Union[str, uuid.UUID] = Field(..., description="Target CampusEats order UUID")


class PaymentOrderResponse(BaseModel):
    """Schema returned after creating a gateway payment order."""
    razorpay_order_id: str
    amount: float
    currency: str = "INR"
    order_id: Optional[Union[str, uuid.UUID]] = None
    key_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentVerify(BaseModel):
    """Schema for validating Razorpay webhook / checkout completion signatures."""
    razorpay_order_id: str = ""
    razorpay_payment_id: str = ""
    razorpay_signature: str = ""
    order_id: Optional[Union[str, uuid.UUID]] = None


class PaymentResponse(BaseModel):
    """Schema representing payment record."""
    id: uuid.UUID
    order_id: uuid.UUID
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    amount: Union[Decimal, float]
    currency: str = "INR"
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
