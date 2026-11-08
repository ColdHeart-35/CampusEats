"""Shopping Cart Service backed by Redis.

Maintains ephemeral shopping carts for student users with a 24-hour expiration window.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from app.schemas.order import CartItem, CartResponse

logger = logging.getLogger("campuseats.cart")

CART_TTL_SECONDS = 86400  # 24 hours


def _get_cart_key(user_id: str) -> str:
    return f"cart:{user_id}"


def _build_cart_response(items: List[Dict[str, Any]]) -> CartResponse:
    cart_items = [
        CartItem(
            food_item_id=item["food_item_id"],
            quantity=item["quantity"],
            name=item.get("name", ""),
            price=float(item.get("price", 0.0)),
        )
        for item in items
    ]
    total = sum(ci.quantity * (ci.price or 0.0) for ci in cart_items)
    return CartResponse(items=cart_items, total=round(total, 2))


async def get_cart(redis, user_id: str) -> CartResponse:
    """Retrieve user's shopping cart from Redis cache."""
    if redis is None:
        return CartResponse(items=[], total=0.0)

    try:
        raw = await redis.get(_get_cart_key(user_id))
        if not raw:
            return CartResponse(items=[], total=0.0)
        items_data = json.loads(raw)
        return _build_cart_response(items_data)
    except Exception as exc:
        logger.error("Error reading cart from Redis for user %s: %s", user_id, exc)
        return CartResponse(items=[], total=0.0)


async def add_to_cart(redis, user_id: str, item: CartItem) -> CartResponse:
    """Add a food item to user's cart, merging quantity if already present."""
    if redis is None:
        return CartResponse(items=[item], total=round(item.quantity * (item.price or 0.0), 2))

    key = _get_cart_key(user_id)
    try:
        raw = await redis.get(key)
        items: List[Dict[str, Any]] = json.loads(raw) if raw else []

        # Find existing item
        found = False
        for it in items:
            if it["food_item_id"] == item.food_item_id:
                it["quantity"] += item.quantity
                if item.name:
                    it["name"] = item.name
                if item.price is not None:
                    it["price"] = float(item.price)
                found = True
                break

        if not found:
            items.append({
                "food_item_id": item.food_item_id,
                "quantity": item.quantity,
                "name": item.name or "",
                "price": float(item.price or 0.0),
            })

        await redis.set(key, json.dumps(items), ex=CART_TTL_SECONDS)
        return _build_cart_response(items)
    except Exception as exc:
        logger.error("Error adding to cart in Redis for user %s: %s", user_id, exc)
        return CartResponse(items=[item], total=round(item.quantity * (item.price or 0.0), 2))


async def update_cart_item(
    redis,
    user_id: str,
    item_id: int,
    quantity: int,
) -> CartResponse:
    """Update item quantity in cart. If quantity <= 0, item is removed."""
    if redis is None:
        return CartResponse(items=[], total=0.0)

    if quantity <= 0:
        return await remove_from_cart(redis, user_id, item_id)

    key = _get_cart_key(user_id)
    try:
        raw = await redis.get(key)
        items: List[Dict[str, Any]] = json.loads(raw) if raw else []

        for it in items:
            if it["food_item_id"] == item_id:
                it["quantity"] = quantity
                break

        await redis.set(key, json.dumps(items), ex=CART_TTL_SECONDS)
        return _build_cart_response(items)
    except Exception as exc:
        logger.error("Error updating cart in Redis for user %s: %s", user_id, exc)
        return CartResponse(items=[], total=0.0)


async def remove_from_cart(redis, user_id: str, item_id: int) -> CartResponse:
    """Remove a specific food item line from the cart."""
    if redis is None:
        return CartResponse(items=[], total=0.0)

    key = _get_cart_key(user_id)
    try:
        raw = await redis.get(key)
        if not raw:
            return CartResponse(items=[], total=0.0)

        items: List[Dict[str, Any]] = json.loads(raw)
        filtered = [it for it in items if it["food_item_id"] != item_id]

        if not filtered:
            await redis.delete(key)
            return CartResponse(items=[], total=0.0)

        await redis.set(key, json.dumps(filtered), ex=CART_TTL_SECONDS)
        return _build_cart_response(filtered)
    except Exception as exc:
        logger.error("Error removing item from cart in Redis for user %s: %s", user_id, exc)
        return CartResponse(items=[], total=0.0)


async def clear_cart(redis, user_id: str) -> None:
    """Purge all cart items for user from Redis."""
    if redis is None:
        return
    try:
        await redis.delete(_get_cart_key(user_id))
    except Exception as exc:
        logger.error("Error clearing cart in Redis for user %s: %s", user_id, exc)
