from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class PopularItem(BaseModel):
    """Schema for top-selling food items."""
    name: str
    count: int = Field(..., description="Units sold")
    revenue: float = Field(..., description="Total revenue generated")
    food_item_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class DashboardStats(BaseModel):
    """Schema for high-level business intelligence dashboard metrics."""
    total_orders: int
    today_revenue: float
    pending_orders: int
    completed_orders: int
    popular_items: List[PopularItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class SalesData(BaseModel):
    """Schema for time-series sales aggregation."""
    labels: List[str] = Field(default_factory=list)
    values: List[float] = Field(default_factory=list)
    period: str = "daily"

    model_config = ConfigDict(from_attributes=True)


class ForecastData(BaseModel):
    """Schema for demand predictions and peak hour analytics."""
    predictions: List[Dict[str, Any]] = Field(default_factory=list)
    confidence: Optional[float] = None
    message: str = "Demand forecast generated successfully."

    model_config = ConfigDict(from_attributes=True)
