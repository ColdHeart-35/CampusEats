from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.food import FoodItem
    from app.models.inventory import InventoryTransaction


class Ingredient(Base):
    """Raw material / ingredient inventory managed by the canteen."""

    __tablename__ = "ingredients"
    __table_args__ = (
        CheckConstraint(
            "current_stock >= 0",
            name="check_ingredient_current_stock_non_negative",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )
    unit: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    current_stock: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default=text("0"),
    )
    min_stock_level: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default=text("0"),
    )
    cost_per_unit: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        nullable=False,
        default=Decimal("0.0000"),
        server_default=text("0"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=text("NOW()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=text("NOW()"),
    )

    # Relationships
    recipes: Mapped[List["Recipe"]] = relationship(
        "Recipe",
        back_populates="ingredient",
        cascade="all, delete-orphan",
    )
    transactions: Mapped[List["InventoryTransaction"]] = relationship(
        "InventoryTransaction",
        back_populates="ingredient",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Ingredient id={self.id} name={self.name} stock={self.current_stock} {self.unit}>"


class Recipe(Base):
    """Junction entity defining ingredient requirements per food item unit."""

    __tablename__ = "recipes"
    __table_args__ = (
        UniqueConstraint(
            "food_item_id",
            "ingredient_id",
            name="uq_food_item_ingredient",
        ),
        CheckConstraint(
            "quantity_required > 0",
            name="check_recipe_quantity_positive",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    food_item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("food_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ingredient_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("ingredients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity_required: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    # Relationships
    food_item: Mapped["FoodItem"] = relationship(
        "FoodItem",
        back_populates="recipes",
    )
    ingredient: Mapped["Ingredient"] = relationship(
        "Ingredient",
        back_populates="recipes",
    )

    def __repr__(self) -> str:
        return (
            f"<Recipe id={self.id} food_item_id={self.food_item_id} "
            f"ingredient_id={self.ingredient_id} qty={self.quantity_required}>"
        )
