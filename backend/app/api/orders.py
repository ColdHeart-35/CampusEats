"""Orders API Router.

Endpoints for students to place orders, list history, view details, and cancel orders.
"""

from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_redis
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse, CartItem
from app.services import order_service, cart_service
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create order from cart",
    description="Places a new order from current cart items or provided items list, validating stock, reserving pickup slot, and initiating order tracking."
)
async def create_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
) -> Any:
    """Create a new order from cart with atomic inventory check."""
    # Determine cart items: either explicitly passed or retrieved from Redis
    cart_items: List[CartItem] = []
    if order_in.items and len(order_in.items) > 0:
        cart_items = [
            CartItem(food_item_id=item.food_item_id, quantity=item.quantity)
            for item in order_in.items
        ]
    else:
        user_cart = await cart_service.get_cart(redis, str(current_user.id))
        cart_items = user_cart.items

    if not cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot place order with an empty cart. Please add items first.",
        )

    try:
        order = await order_service.create_order(
            db=db,
            user_id=current_user.id,
            order_data=order_in,
            cart_items=cart_items,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to place order: {str(e)}",
        )

    # Clear user's cart in Redis after order placement
    try:
        await cart_service.clear_cart(redis, str(current_user.id))
    except Exception:
        pass

    # Broadcast real-time event to staff and student
    try:
        await manager.broadcast_order_update({
            "action": "order_created",
            "order_id": str(order.id),
            "user_id": str(current_user.id),
            "status": order.status,
            "total_amount": float(order.total_amount),
        })
    except Exception:
        pass

    return order


@router.get(
    "/",
    response_model=List[OrderResponse],
    status_code=status.HTTP_200_OK,
    summary="List user orders",
    description="Lists past and active orders for the currently authenticated user with pagination."
)
async def list_my_orders(
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Limit for pagination"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Fetch user order history."""
    return await order_service.get_user_orders(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Get order detail",
    description="Retrieves single order details including item breakdown, status, and QR code."
)
async def get_order_detail(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Retrieve order details by UUID."""
    order = await order_service.get_order(db=db, order_id=order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found.",
        )

    # Check permission
    if order.user_id != current_user.id and current_user.role not in ("staff", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this order.",
        )

    return order


@router.post(
    "/{order_id}/cancel",
    response_model=OrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancel order",
    description="Cancels an order before preparation begins, automatically restoring inventory ingredients and pickup slot capacity."
)
async def cancel_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Cancel order and restore resources."""
    try:
        user_id_check = current_user.id if current_user.role not in ("staff", "admin") else None
        order = await order_service.cancel_order(
            db=db,
            order_id=order_id,
            user_id=user_id_check,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cancelling order: {str(e)}",
        )

    # Broadcast cancellation update
    try:
        await manager.broadcast_order_update({
            "action": "order_cancelled",
            "order_id": str(order.id),
            "status": "cancelled",
        })
    except Exception:
        pass

    return order
