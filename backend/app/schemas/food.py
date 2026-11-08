from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Food Category Schemas
# ---------------------------------------------------------------------------
class FoodCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)
    is_active: bool = True


class FoodCategoryCreate(FoodCategoryBase):
    """Schema for creating a food category."""
    pass


class FoodCategoryUpdate(BaseModel):
    """Schema for updating a food category."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class FoodCategoryResponse(FoodCategoryBase):
    """Schema for food category responses."""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Food Item Schemas
# ---------------------------------------------------------------------------
class FoodItemBase(BaseModel):
    category_id: int
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0)
    image_url: Optional[str] = Field(None, max_length=500)
    is_available: bool = True
    is_vegetarian: bool = False
    preparation_time: int = Field(15, ge=1)


class FoodItemCreate(FoodItemBase):
    """Schema for creating a new menu food item."""
    pass


class FoodItemUpdate(BaseModel):
    """Schema for updating an existing menu food item."""
    category_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0)
    image_url: Optional[str] = Field(None, max_length=500)
    is_available: Optional[bool] = None
    is_vegetarian: Optional[bool] = None
    preparation_time: Optional[int] = Field(None, ge=1)


class FoodItemResponse(FoodItemBase):
    """Schema for food item responses including category details."""
    id: int
    created_at: datetime
    updated_at: datetime
    category: Optional[FoodCategoryResponse] = None

    model_config = ConfigDict(from_attributes=True)
