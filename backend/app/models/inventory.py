import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.ingredient import Ingredient
    from app.models.user import User


class InventoryTransaction(Base):
    """Audit ledger tracking every stock change (restock, deduction, adjustment, restoration)."""

    __tablename__ = "inventory_transactions"
    __table_args__ = (
        CheckConstraint(
            "transaction_type IN ('restock', 'deduction', 'adjustment', 'restoration')",
            name="check_transaction_type",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    ingredient_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("ingredients.id"),
        nullable=False,
        index=True,
    )
    transaction_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    reference_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=text("NOW()"),
    )

    # Relationships
    ingredient: Mapped["Ingredient"] = relationship(
        "Ingredient",
        back_populates="transactions",
    )
    creator: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="inventory_transactions",
    )

    def __repr__(self) -> str:
        return (
            f"<InventoryTransaction id={self.id} ingredient_id={self.ingredient_id} "
            f"type={self.transaction_type} qty={self.quantity}>"
        )
