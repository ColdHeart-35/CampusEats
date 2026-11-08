from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any, List, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.ingredient import Recipe
    from app.models.order import OrderItem


class FoodCategory(Base):
    """Category classification for food menu items (e.g. South Indian, Beverages)."""

    __tablename__ = "food_categories"

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
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    image_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=text("NOW()"),
    )

    # Relationships
    items: Mapped[List["FoodItem"]] = relationship(
        "FoodItem",
        back_populates="category",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<FoodCategory id={self.id} name={self.name}>"


class FoodItem(Base):
    """Food item offered on the canteen menu with vector embedding for semantic search."""

    __tablename__ = "food_items"
    __table_args__ = (
        CheckConstraint(
            "price > 0",
            name="check_food_item_price_positive",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("food_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    image_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    is_available: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
    )
    is_vegetarian: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
    )
    preparation_time: Mapped[int] = mapped_column(
        Integer,
        default=15,
        server_default=text("15"),
    )
    embedding: Mapped[Optional[Any]] = mapped_column(
        Vector(384),
        nullable=True,
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
    category: Mapped["FoodCategory"] = relationship(
        "FoodCategory",
        back_populates="items",
    )
    order_items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="food_item",
    )
    recipes: Mapped[List["Recipe"]] = relationship(
        "Recipe",
        back_populates="food_item",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<FoodItem id={self.id} name={self.name} price={self.price}>"
