"""Inventory & Raw Material Stock Service.

Provides atomic stock verification, row-level locking (SELECT FOR UPDATE) deductions,
audit trail logging, and low-stock threshold alerting.
"""

from collections import defaultdict
from decimal import Decimal
from typing import Dict, List, Optional, Union
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ingredient import Ingredient, Recipe
from app.models.inventory import InventoryTransaction
from app.models.order import OrderItem
from app.schemas.inventory import LowStockAlert
from app.schemas.order import CartItem


async def check_stock_availability(
    db: AsyncSession,
    cart_items: List[Union[CartItem, OrderItem]],
) -> bool:
    """Verify that current ingredient inventory is sufficient to fulfill requested items.

    Aggregates ingredient requirements from recipes across all cart items.
    """
    if not cart_items:
        return True

    item_quantities: Dict[int, int] = defaultdict(int)
    for ci in cart_items:
        qty = ci.quantity if hasattr(ci, "quantity") else 1
        item_quantities[ci.food_item_id] += qty

    food_ids = list(item_quantities.keys())

    # Fetch recipe component requirements
    recipe_stmt = select(Recipe).where(Recipe.food_item_id.in_(food_ids))
    recipe_res = await db.execute(recipe_stmt)
    recipes = recipe_res.scalars().all()

    if not recipes:
        # Items without recipes (e.g. pre-packaged) are unconstrained by raw ingredients
        return True

    required_per_ingredient: Dict[int, Decimal] = defaultdict(lambda: Decimal("0.00"))
    for r in recipes:
        item_qty = Decimal(str(item_quantities[r.food_item_id]))
        required_per_ingredient[r.ingredient_id] += r.quantity_required * item_qty

    ing_ids = list(required_per_ingredient.keys())
    ing_stmt = select(Ingredient).where(Ingredient.id.in_(ing_ids))
    ing_res = await db.execute(ing_stmt)
    ingredients = {ing.id: ing for ing in ing_res.scalars().all()}

    for ing_id, needed_qty in required_per_ingredient.items():
        ingredient = ingredients.get(ing_id)
        if not ingredient:
            return False
        if ingredient.current_stock < needed_qty:
            return False

    return True


async def deduct_stock(
    db: AsyncSession,
    order_id: Union[UUID, str],
    order_items: List[OrderItem],
) -> None:
    """Atomically deduct ingredient stock for an order using SELECT FOR UPDATE row locking.

    Writes immutable InventoryTransaction deduction ledger records.
    """
    if not order_items:
        return

    item_quantities: Dict[int, int] = defaultdict(int)
    for oi in order_items:
        item_quantities[oi.food_item_id] += oi.quantity

    food_ids = list(item_quantities.keys())
    recipe_stmt = select(Recipe).where(Recipe.food_item_id.in_(food_ids))
    recipe_res = await db.execute(recipe_stmt)
    recipes = recipe_res.scalars().all()

    if not recipes:
        return

    required_per_ingredient: Dict[int, Decimal] = defaultdict(lambda: Decimal("0.00"))
    for r in recipes:
        item_qty = Decimal(str(item_quantities[r.food_item_id]))
        required_per_ingredient[r.ingredient_id] += r.quantity_required * item_qty

    ing_ids = list(required_per_ingredient.keys())

    # Row-level lock ingredients to prevent concurrent over-allocation race conditions
    ing_stmt = (
        select(Ingredient)
        .where(Ingredient.id.in_(ing_ids))
        .with_for_update()
    )
    ing_res = await db.execute(ing_stmt)
    locked_ingredients = {ing.id: ing for ing in ing_res.scalars().all()}

    for ing_id, deduct_qty in required_per_ingredient.items():
        ing = locked_ingredients.get(ing_id)
        if not ing:
            raise ValueError(f"Required ingredient ID {ing_id} is missing from inventory.")

        if ing.current_stock < deduct_qty:
            raise ValueError(
                f"Insufficient stock for ingredient '{ing.name}'. "
                f"Required: {deduct_qty} {ing.unit}, Available: {ing.current_stock} {ing.unit}."
            )

        ing.current_stock -= deduct_qty
        db.add(ing)

        # Record audit ledger transaction
        tx = InventoryTransaction(
            ingredient_id=ing.id,
            transaction_type="deduction",
            quantity=deduct_qty,
            reference_id=str(order_id),
            notes=f"Order deduction for #{str(order_id)[:8]}",
        )
        db.add(tx)


async def restore_stock(
    db: AsyncSession,
    order_id: Union[UUID, str],
) -> None:
    """Reverse stock deductions for a cancelled order.

    Looks up past deduction transactions for the order and replenishes ingredients.
    """
    ref_id = str(order_id)

    # Find past deductions for this order
    tx_stmt = select(InventoryTransaction).where(
        InventoryTransaction.reference_id == ref_id,
        InventoryTransaction.transaction_type == "deduction",
    )
    tx_res = await db.execute(tx_stmt)
    deduction_txs = tx_res.scalars().all()

    if not deduction_txs:
        return

    for tx in deduction_txs:
        # Lock ingredient row and restore balance
        ing_stmt = (
            select(Ingredient)
            .where(Ingredient.id == tx.ingredient_id)
            .with_for_update()
        )
        ing_res = await db.execute(ing_stmt)
        ingredient = ing_res.scalar_one_or_none()

        if ingredient:
            ingredient.current_stock += tx.quantity
            db.add(ingredient)

            # Record restoration ledger entry
            restoration_tx = InventoryTransaction(
                ingredient_id=ingredient.id,
                transaction_type="restoration",
                quantity=tx.quantity,
                reference_id=ref_id,
                notes=f"Restoration from cancelled order #{ref_id[:8]}",
            )
            db.add(restoration_tx)


async def restock_ingredient(
    db: AsyncSession,
    ingredient_id: int,
    quantity: Union[Decimal, float],
    user_id: Optional[Union[UUID, str]] = None,
    notes: Optional[str] = None,
) -> InventoryTransaction:
    """Add incoming raw materials to inventory and record restock transaction."""
    qty = Decimal(str(quantity))
    if qty <= 0:
        raise ValueError("Restock quantity must be positive.")

    if isinstance(user_id, str):
        user_id = UUID(user_id)

    stmt = (
        select(Ingredient)
        .where(Ingredient.id == ingredient_id)
        .with_for_update()
    )
    res = await db.execute(stmt)
    ingredient = res.scalar_one_or_none()

    if not ingredient:
        raise ValueError(f"Ingredient with ID {ingredient_id} not found.")

    ingredient.current_stock += qty
    db.add(ingredient)

    transaction = InventoryTransaction(
        ingredient_id=ingredient.id,
        transaction_type="restock",
        quantity=qty,
        reference_id=None,
        notes=notes or f"Restocked {qty} {ingredient.unit}",
        created_by=user_id,
    )
    db.add(transaction)

    await db.commit()
    await db.refresh(transaction)
    return transaction


async def get_low_stock_ingredients(
    db: AsyncSession,
) -> List[LowStockAlert]:
    """Retrieve all ingredients currently depleted to or below their threshold."""
    stmt = (
        select(Ingredient)
        .where(Ingredient.current_stock <= Ingredient.min_stock_level)
        .order_by((Ingredient.min_stock_level - Ingredient.current_stock).desc())
    )
    res = await db.execute(stmt)
    ingredients = res.scalars().all()

    alerts: List[LowStockAlert] = []
    for ing in ingredients:
        deficit = max(Decimal("0.00"), ing.min_stock_level - ing.current_stock)
        alerts.append(
            LowStockAlert(
                ingredient_id=ing.id,
                name=ing.name,
                unit=ing.unit,
                current_stock=ing.current_stock,
                min_stock_level=ing.min_stock_level,
                deficit=deficit,
            )
        )
    return alerts
