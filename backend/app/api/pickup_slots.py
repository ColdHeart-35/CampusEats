"""Pickup Slots API Router.

Endpoints for managing pickup slot capacity, scheduling times, and querying availability.
"""

from datetime import date as dt_date
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.models.pickup_slot import PickupSlot
from app.models.user import User
from app.schemas.pickup_slot import (
    PickupSlotCreate,
    PickupSlotResponse,
    PickupSlotUpdate,
)

router = APIRouter(prefix="/api/pickup-slots", tags=["pickup-slots"])


@router.get(
    "/",
    response_model=List[PickupSlotResponse],
    status_code=status.HTTP_200_OK,
    summary="List available pickup slots",
    description="Retrieves scheduled pickup time slots for a given date with available capacity counts."
)
async def list_pickup_slots(
    date_filter: Optional[dt_date] = Query(None, alias="date", description="Target date (defaults to today)"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """List active pickup slots for specified or current date."""
    target_date = date_filter or dt_date.today()
    stmt = (
        select(PickupSlot)
        .where(PickupSlot.slot_date == target_date, PickupSlot.is_active == True)
        .order_by(PickupSlot.start_time.asc())
    )
    result = await db.execute(stmt)
    slots = result.scalars().all()

    # Populate computed available_count
    return [
        PickupSlotResponse(
            id=slot.id,
            slot_date=slot.slot_date,
            start_time=slot.start_time,
            end_time=slot.end_time,
            max_capacity=slot.max_capacity,
            current_count=slot.current_count,
            available_count=max(0, slot.max_capacity - slot.current_count),
            is_active=slot.is_active,
            created_at=slot.created_at,
        )
        for slot in slots
    ]


@router.post(
    "/",
    response_model=PickupSlotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create pickup slot (staff/admin)",
    description="Configures a new pickup time window and max concurrency limit."
)
async def create_pickup_slot(
    slot_in: PickupSlotCreate,
    current_user: User = Depends(require_role(["staff", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Create a new pickup slot."""
    if slot_in.start_time >= slot_in.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be strictly before end time.",
        )

    # Check for duplicate window on the same date
    stmt = select(PickupSlot).where(
        PickupSlot.slot_date == slot_in.slot_date,
        PickupSlot.start_time == slot_in.start_time,
        PickupSlot.end_time == slot_in.end_time,
    )
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pickup slot for {slot_in.slot_date} ({slot_in.start_time}-{slot_in.end_time}) already exists.",
        )

    new_slot = PickupSlot(
        slot_date=slot_in.slot_date,
        start_time=slot_in.start_time,
        end_time=slot_in.end_time,
        max_capacity=slot_in.max_capacity,
        current_count=0,
        is_active=True,
    )
    db.add(new_slot)
    await db.commit()
    await db.refresh(new_slot)

    return PickupSlotResponse(
        id=new_slot.id,
        slot_date=new_slot.slot_date,
        start_time=new_slot.start_time,
        end_time=new_slot.end_time,
        max_capacity=new_slot.max_capacity,
        current_count=new_slot.current_count,
        available_count=new_slot.max_capacity,
        is_active=new_slot.is_active,
        created_at=new_slot.created_at,
    )


@router.put(
    "/{slot_id}",
    response_model=PickupSlotResponse,
    status_code=status.HTTP_200_OK,
    summary="Update pickup slot (staff/admin)",
    description="Updates maximum capacity or activation state of a slot."
)
async def update_pickup_slot(
    slot_id: int,
    slot_update: PickupSlotUpdate,
    current_user: User = Depends(require_role(["staff", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Update pickup slot configuration."""
    stmt = select(PickupSlot).where(PickupSlot.id == slot_id)
    slot = (await db.execute(stmt)).scalars().first()
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pickup slot with ID {slot_id} not found.",
        )

    if slot_update.max_capacity is not None:
        if slot_update.max_capacity < slot.current_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reduce capacity below currently booked orders ({slot.current_count}).",
            )
        slot.max_capacity = slot_update.max_capacity

    if slot_update.is_active is not None:
        slot.is_active = slot_update.is_active

    db.add(slot)
    await db.commit()
    await db.refresh(slot)

    return PickupSlotResponse(
        id=slot.id,
        slot_date=slot.slot_date,
        start_time=slot.start_time,
        end_time=slot.end_time,
        max_capacity=slot.max_capacity,
        current_count=slot.current_count,
        available_count=max(0, slot.max_capacity - slot.current_count),
        is_active=slot.is_active,
        created_at=slot.created_at,
    )
