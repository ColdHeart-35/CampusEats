"""Order Lifecycle Management Service.

Handles order creation, inventory reservation, status state machine transitions, and cancellations.
"""

import uuid
from decimal import Decimal
from typing import Any, List, Optional, Union
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.food import FoodItem
from app.models.order import Order, OrderItem
from app.models.pickup_slot import PickupSlot
from app.schemas.order import CartItem, OrderCreate
from app.services import inventory_service, qr_service

# Valid state machine transitions for order statuses
VALID_TRANSITIONS = {
    "pending": {"confirmed", "accepted", "cancelled"},
    "confirmed": {"accepted", "preparing", "cancelled"},
    "accepted": {"preparing", "cancelled"},
    "preparing": {"ready", "cancelled"},
    "ready": {"picked_up", "cancelled"},
    "picked_up": set(),
    "cancelled": set(),
}


async def create_order(
    db: AsyncSession,
    user_id: Union[UUID, str],
    order_data: OrderCreate,
    cart_items: List[CartItem],
) -> Order:
    """Create a new order in a single transaction.

    Validates stock availability, reserves pickup slot, locks inventory rows,
    persists Order and OrderItems, generates dynamic QR code, and commits.
    """
    if isinstance(user_id, str):
        user_id = UUID(user_id)

    if not cart_items:
        raise ValueError("Cannot create an order with empty item list.")

    # 1. Check ingredient stock sufficiency
    is_stock_available = await inventory_service.check_stock_availability(db, cart_items)
    if not is_stock_available:
        raise ValueError("Insufficient ingredient stock to fulfill this order.")

    # 2. Validate and reserve pickup slot if requested
    pickup_slot_id: Optional[int] = order_data.pickup_slot_id
    if pickup_slot_id is not None:
        slot_stmt = (
            select(PickupSlot)
            .where(PickupSlot.id == pickup_slot_id)
            .with_for_update()
        )
        slot_res = await db.execute(slot_stmt)
        slot = slot_res.scalar_one_or_none()
        if not slot:
            raise ValueError(f"Pickup slot {pickup_slot_id} does not exist.")
        if not slot.is_active:
            raise ValueError("The selected pickup slot is no longer active.")
        if slot.current_count >= slot.max_capacity:
            raise ValueError("The selected pickup slot is already at maximum capacity.")
        slot.current_count += 1
        db.add(slot)

    # 3. Retrieve food items and compute financials
    food_ids = [item.food_item_id for item in cart_items]
    items_stmt = select(FoodItem).where(FoodItem.id.in_(food_ids))
    items_res = await db.execute(items_stmt)
    food_items_map = {item.id: item for item in items_res.scalars().all()}

    missing_ids = set(food_ids) - set(food_items_map.keys())
    if missing_ids:
        raise ValueError(f"Food items not found: {missing_ids}")

    total_amount = Decimal("0.00")
    order_items_to_create: List[OrderItem] = []
    order_id = uuid.uuid4()

    for item in cart_items:
        food = food_items_map[item.food_item_id]
        if not food.is_available:
            raise ValueError(f"Food item '{food.name}' is currently unavailable.")
        unit_price = Decimal(str(food.price))
        subtotal = unit_price * item.quantity
        total_amount += subtotal

        order_item = OrderItem(
            order_id=order_id,
            food_item_id=food.id,
            quantity=item.quantity,
            unit_price=unit_price,
            subtotal=subtotal,
        )
        order_items_to_create.append(order_item)

    # 4. Generate QR code token for counter pickup
    qr_code_str = qr_service.generate_qr_code(str(order_id))

    # 5. Persist order
    new_order = Order(
        id=order_id,
        user_id=user_id,
        pickup_slot_id=pickup_slot_id,
        status="pending",
        total_amount=total_amount,
        qr_code=qr_code_str,
        qr_verified=False,
        special_instructions=order_data.special_instructions,
    )
    db.add(new_order)
    for oi in order_items_to_create:
        db.add(oi)

    # Flush to satisfy foreign key relationships before deducting inventory
    await db.flush()

    # 6. Deduct inventory based on recipes
    await inventory_service.deduct_stock(db, order_id, order_items_to_create)

    await db.commit()

    # Re-fetch with eager loaded relationships
    return await get_order(db, order_id)  # type: ignore[return-value]


async def get_user_orders(
    db: AsyncSession,
    user_id: Union[UUID, str],
    skip: int = 0,
    limit: int = 50,
) -> List[Order]:
    """Retrieve orders placed by a specific user with related items."""
    if isinstance(user_id, str):
        user_id = UUID(user_id)

    stmt = (
        select(Order)
        .where(Order.user_id == user_id)
        .options(
            selectinload(Order.order_items).selectinload(OrderItem.food_item),
            selectinload(Order.pickup_slot),
            selectinload(Order.payment),
        )
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_order(
    db: AsyncSession,
    order_id: Union[UUID, str],
) -> Optional[Order]:
    """Fetch a single order by UUID with its items, food details, slot, and payment."""
    if isinstance(order_id, str):
        order_id = UUID(order_id)

    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.order_items).selectinload(OrderItem.food_item),
            selectinload(Order.pickup_slot),
            selectinload(Order.payment),
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_all_orders(
    db: AsyncSession,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Order]:
    """Retrieve all orders across the system for kitchen staff view."""
    stmt = (
        select(Order)
        .options(
            selectinload(Order.order_items).selectinload(OrderItem.food_item),
            selectinload(Order.pickup_slot),
            selectinload(Order.payment),
            selectinload(Order.user),
        )
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if status:
        stmt = stmt.where(Order.status == status)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_order_status(
    db: AsyncSession,
    order_id: Union[UUID, str],
    status: str,
    notes: Optional[str] = None,
) -> Order:
    """Validate status transition and advance order workflow state."""
    order = await get_order(db, order_id)
    if not order:
        raise ValueError(f"Order {order_id} does not exist.")

    current_status = order.status
    allowed_next = VALID_TRANSITIONS.get(current_status, set())

    # Allow idempotent assignment
    if status != current_status and status not in allowed_next:
        raise ValueError(
            f"Invalid status transition from '{current_status}' to '{status}'. "
            f"Allowed transitions: {sorted(allowed_next)}"
        )

    # If cancelling, restore inventory and slot
    if status == "cancelled" and current_status != "cancelled":
        await cancel_order(db, order.id)
        return await get_order(db, order.id)  # type: ignore[return-value]

    order.status = status
    if status == "picked_up":
        order.qr_verified = True

    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def cancel_order(
    db: AsyncSession,
    order_id: Union[UUID, str],
    user_id: Optional[Union[UUID, str]] = None,
) -> Order:
    """Cancel order, restore ingredient inventory deductions, and release slot count."""
    if isinstance(order_id, str):
        order_id = UUID(order_id)
    if isinstance(user_id, str):
        user_id = UUID(user_id)

    stmt = select(Order).where(Order.id == order_id).with_for_update()
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise ValueError(f"Order {order_id} does not exist.")

    if user_id and order.user_id != user_id:
        raise ValueError("You are not authorized to cancel this order.")

    if order.status in ("ready", "picked_up"):
        raise ValueError(f"Cannot cancel order in '{order.status}' status. Food is already prepared.")
    if order.status == "cancelled":
        return order

    # Restore inventory
    await inventory_service.restore_stock(db, order.id)

    # Release pickup slot
    if order.pickup_slot_id:
        slot_stmt = (
            select(PickupSlot)
            .where(PickupSlot.id == order.pickup_slot_id)
            .with_for_update()
        )
        slot_res = await db.execute(slot_stmt)
        slot = slot_res.scalar_one_or_none()
        if slot and slot.current_count > 0:
            slot.current_count -= 1
            db.add(slot)

    order.status = "cancelled"
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return await get_order(db, order_id)  # type: ignore[return-value]
