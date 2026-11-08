from datetime import date, datetime, time
from typing import TYPE_CHECKING, List

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Integer,
    Time,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.order import Order


class PickupSlot(Base):
    """Scheduled time window for order pickup with strict capacity throttling."""

    __tablename__ = "pickup_slots"
    __table_args__ = (
        UniqueConstraint(
            "slot_date",
            "start_time",
            "end_time",
            name="uq_pickup_slot_date_time",
        ),
        CheckConstraint(
            "max_capacity > 0",
            name="check_pickup_slot_max_capacity_positive",
        ),
        CheckConstraint(
            "current_count >= 0",
            name="check_pickup_slot_current_count_non_negative",
        ),
        CheckConstraint(
            "current_count <= max_capacity",
            name="check_pickup_slot_capacity_limit",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    slot_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )
    start_time: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )
    end_time: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )
    max_capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    current_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
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
    orders: Mapped[List["Order"]] = relationship(
        "Order",
        back_populates="pickup_slot",
    )

    @property
    def available_count(self) -> int:
        """Calculate remaining slots available."""
        return max(0, self.max_capacity - self.current_count)

    def __repr__(self) -> str:
        return (
            f"<PickupSlot id={self.id} date={self.slot_date} "
            f"window={self.start_time}-{self.end_time} "
            f"capacity={self.current_count}/{self.max_capacity}>"
        )
