import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RestockRequest(BaseModel):
    """Schema for requesting a stock replenishment."""
    ingredient_id: int
    quantity: Decimal = Field(..., gt=0)
    notes: Optional[str] = None


class InventoryTransactionResponse(BaseModel):
    """Schema for inventory audit ledger transaction records."""
    id: int
    ingredient_id: int
    transaction_type: str
    quantity: Decimal
    reference_id: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LowStockAlert(BaseModel):
    """Schema representing an alert for an ingredient nearing depletion."""
    ingredient_id: int
    name: str
    unit: str
    current_stock: Decimal
    min_stock_level: Decimal
    deficit: Decimal = Decimal("0.00")

    model_config = ConfigDict(from_attributes=True)
