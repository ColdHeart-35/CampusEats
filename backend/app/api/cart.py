"""Shopping Cart API Router.

Redis-backed shopping cart management for student users.
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_redis
from app.models.food import FoodItem
from app.models.user import User
from app.schemas.order import CartItem, CartResponse
from app.services import cart_service

router = APIRouter(prefix="/api/cart", tags=["cart"])


class UpdateCartItemQuantity(BaseModel):
    """Payload for updating cart item quantity."""
    quantity: int = Field(..., ge=1, le=50, description="Updated item quantity (1-50)")


@router.get(
    "/",
    response_model=CartResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user cart",
    description="Fetches current user's shopping cart items and calculated subtotal from Redis."
)
async def get_cart(
    current_user: User = Depends(get_current_user),
    redis = Depends(get_redis),
) -> Any:
    """Retrieve current shopping cart from Redis cache."""
    return await cart_service.get_cart(redis, str(current_user.id))


@router.post(
    "/items",
    response_model=CartResponse,
    status_code=status.HTTP_200_OK,
    summary="Add item to cart",
    description="Adds a food item with quantity to the user's shopping cart in Redis."
)
async def add_item_to_cart(
    item_in: CartItem,
    current_user: User = Depends(get_current_user),
    redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Add item to cart with database verification."""
    # Verify food item exists and is active
    stmt = select(FoodItem).where(FoodItem.id == item_in.food_item_id)
    result = await db.execute(stmt)
    food_item = result.scalars().first()

    if not food_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food item with ID {item_in.food_item_id} not found.",
        )

    if not food_item.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{food_item.name}' is currently unavailable for order.",
        )

    # Populate details if missing from payload
    item_in.name = food_item.name
    item_in.price = float(food_item.price)

    return await cart_service.add_to_cart(redis, str(current_user.id), item_in)


@router.put(
    "/items/{item_id}",
    response_model=CartResponse,
    status_code=status.HTTP_200_OK,
    summary="Update cart item quantity",
    description="Updates the quantity of a specific item in the cart."
)
async def update_cart_item(
    item_id: int,
    payload: UpdateCartItemQuantity,
    current_user: User = Depends(get_current_user),
    redis = Depends(get_redis),
) -> Any:
    """Update item quantity in Redis cart."""
    return await cart_service.update_cart_item(
        redis, str(current_user.id), item_id, payload.quantity
    )


@router.delete(
    "/items/{item_id}",
    response_model=CartResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove item from cart",
    description="Deletes an item from the current user's shopping cart."
)
async def remove_cart_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    redis = Depends(get_redis),
) -> Any:
    """Remove item from cart in Redis."""
    return await cart_service.remove_from_cart(redis, str(current_user.id), item_id)


@router.delete(
    "/",
    status_code=status.HTTP_200_OK,
    summary="Clear entire cart",
    description="Empties the current user's shopping cart in Redis."
)
async def clear_cart(
    current_user: User = Depends(get_current_user),
    redis = Depends(get_redis),
) -> Any:
    """Clear entire user shopping cart."""
    await cart_service.clear_cart(redis, str(current_user.id))
    return {"message": "Shopping cart cleared successfully."}
