"""Inventory Management API Router.

Endpoints for staff and admins to track ingredients, monitor stock levels, record restock events, and audit transactions.
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.models.ingredient import Ingredient
from app.models.inventory import InventoryTransaction
from app.models.user import User
from app.schemas.ingredient import (
    IngredientCreate,
    IngredientResponse,
    IngredientUpdate,
)
from app.schemas.inventory import (
    InventoryTransactionResponse,
    LowStockAlert,
    RestockRequest,
)
from app.services import inventory_service
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get(
    "/ingredients",
    response_model=List[IngredientResponse],
    status_code=status.HTTP_200_OK,
    summary="List all ingredients (staff/admin)",
    description="Retrieves all registered ingredients with current stock levels and unit costs."
)
async def list_ingredients(
    current_user: User = Depends(require_role(["staff", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """List ingredients in stock."""
    stmt = select(Ingredient).order_by(Ingredient.name.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/ingredients",
    response_model=IngredientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new ingredient (staff/admin)",
    description="Adds a new raw material or ingredient to inventory tracking."
)
async def create_ingredient(
    ingredient_in: IngredientCreate,
    current_user: User = Depends(require_role(["staff", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Create ingredient."""
    stmt = select(Ingredient).where(Ingredient.name == ingredient_in.name.strip())
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ingredient '{ingredient_in.name}' already exists.",
        )

    ingredient = Ingredient(
        name=ingredient_in.name.strip(),
        unit=ingredient_in.unit.strip(),
        current_stock=ingredient_in.current_stock if ingredient_in.current_stock is not None else 0.0,
        min_stock_level=ingredient_in.min_stock_level if ingredient_in.min_stock_level is not None else 0.0,
        cost_per_unit=ingredient_in.cost_per_unit if ingredient_in.cost_per_unit is not None else 0.0,
    )
    db.add(ingredient)
    await db.commit()
    await db.refresh(ingredient)
    return ingredient


@router.put(
    "/ingredients/{ingredient_id}",
    response_model=IngredientResponse,
    status_code=status.HTTP_200_OK,
    summary="Update ingredient (staff/admin)",
    description="Updates existing ingredient metadata, unit, threshold, or cost."
)
async def update_ingredient(
    ingredient_id: int,
    ingredient_in: IngredientUpdate,
    current_user: User = Depends(require_role(["staff", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Update ingredient details."""
    stmt = select(Ingredient).where(Ingredient.id == ingredient_id)
    ingredient = (await db.execute(stmt)).scalars().first()
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingredient with ID {ingredient_id} not found.",
        )

    if ingredient_in.name is not None and ingredient_in.name.strip():
        ingredient.name = ingredient_in.name.strip()
    if ingredient_in.unit is not None and ingredient_in.unit.strip():
        ingredient.unit = ingredient_in.unit.strip()
    if ingredient_in.current_stock is not None:
        if ingredient_in.current_stock < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stock level cannot be negative.",
            )
        ingredient.current_stock = ingredient_in.current_stock
    if ingredient_in.min_stock_level is not None:
        ingredient.min_stock_level = ingredient_in.min_stock_level
    if ingredient_in.cost_per_unit is not None:
        ingredient.cost_per_unit = ingredient_in.cost_per_unit

    db.add(ingredient)
    await db.commit()
    await db.refresh(ingredient)
    return ingredient


@router.post(
    "/restock",
    response_model=InventoryTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Restock ingredient (staff/admin)",
    description="Adds incoming stock quantity to an ingredient and writes an audit transaction record."
)
async def restock_ingredient(
    restock_in: RestockRequest,
    current_user: User = Depends(require_role(["staff", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Record restock and update inventory atomically."""
    if restock_in.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restock quantity must be greater than zero.",
        )

    try:
        tx = await inventory_service.restock_ingredient(
            db=db,
            ingredient_id=restock_in.ingredient_id,
            quantity=restock_in.quantity,
            user_id=current_user.id,
            notes=restock_in.notes if hasattr(restock_in, "notes") else None,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record restock: {str(e)}",
        )

    # Broadcast inventory update
    try:
        await manager.broadcast_inventory_update({
            "action": "restock",
            "ingredient_id": restock_in.ingredient_id,
            "quantity_added": restock_in.quantity,
        })
    except Exception:
        pass

    return tx


@router.get(
    "/transactions",
    response_model=List[InventoryTransactionResponse],
    status_code=status.HTTP_200_OK,
    summary="List inventory audit transactions (staff/admin)",
    description="Fetches audit trail of all inventory deductions, restocks, restorations, and adjustments."
)
async def list_transactions(
    ingredient_id: Optional[int] = Query(None, description="Filter by ingredient ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role(["staff", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Fetch paginated inventory transactions."""
    query = (
        select(InventoryTransaction)
        .options(selectinload(InventoryTransaction.ingredient))
        .order_by(InventoryTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if ingredient_id is not None:
        query = query.where(InventoryTransaction.ingredient_id == ingredient_id)

    result = await db.execute(query)
    txs = result.scalars().all()

    # Populate convenience fields
    return [
        InventoryTransactionResponse(
            id=tx.id,
            ingredient_id=tx.ingredient_id,
            transaction_type=tx.transaction_type,
            quantity=float(tx.quantity),
            reference_id=tx.reference_id,
            notes=tx.notes,
            created_by=tx.created_by,
            created_at=tx.created_at,
            ingredient_name=tx.ingredient.name if tx.ingredient else None,
        )
        for tx in txs
    ]


@router.get(
    "/low-stock",
    response_model=List[LowStockAlert],
    status_code=status.HTTP_200_OK,
    summary="Get low stock alerts (staff/admin)",
    description="Identifies all ingredients currently at or below their configured minimum threshold."
)
async def get_low_stock_alerts(
    current_user: User = Depends(require_role(["staff", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Retrieve low-stock ingredients for immediate replenishment."""
    return await inventory_service.get_low_stock_ingredients(db)
