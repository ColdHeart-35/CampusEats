from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Ingredient Schemas
# ---------------------------------------------------------------------------
class IngredientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    unit: str = Field(..., min_length=1, max_length=20)
    current_stock: Decimal = Field(Decimal("0.00"), ge=0)
    min_stock_level: Decimal = Field(Decimal("0.00"), ge=0)
    cost_per_unit: Decimal = Field(Decimal("0.0000"), ge=0)


class IngredientCreate(IngredientBase):
    """Schema for adding a new ingredient into stock tracking."""
    pass


class IngredientUpdate(BaseModel):
    """Schema for updating ingredient stock and cost metadata."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    current_stock: Optional[Decimal] = Field(None, ge=0)
    min_stock_level: Optional[Decimal] = Field(None, ge=0)
    cost_per_unit: Optional[Decimal] = Field(None, ge=0)


class IngredientResponse(IngredientBase):
    """Schema for returning ingredient inventory details."""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Recipe Schemas
# ---------------------------------------------------------------------------
class RecipeBase(BaseModel):
    food_item_id: int
    ingredient_id: int
    quantity_required: Decimal = Field(..., gt=0)


class RecipeCreate(RecipeBase):
    """Schema for mapping an ingredient requirement to a food item."""
    pass


class RecipeResponse(RecipeBase):
    """Schema for returning recipe requirements."""
    id: int
    ingredient: Optional[IngredientResponse] = None

    model_config = ConfigDict(from_attributes=True)
