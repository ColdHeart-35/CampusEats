"""Food Catalog API Router.

Endpoints for managing food categories, menu items, recipes, and caching.
"""

import json
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_redis, require_role
from app.models.food import FoodCategory, FoodItem
from app.models.ingredient import Recipe, Ingredient
from app.models.user import User
from app.schemas.food import (
    FoodCategoryCreate,
    FoodCategoryResponse,
    FoodItemCreate,
    FoodItemResponse,
    FoodItemUpdate,
)
from app.services import cache_service
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/food", tags=["food"])

CACHE_CATEGORIES_KEY = "food_categories:active"
CACHE_EXPIRATION_SECONDS = 300  # 5 minutes


# ---------------------------------------------------------
# Category Endpoints
# ---------------------------------------------------------

@router.get(
    "/categories",
    response_model=List[FoodCategoryResponse],
    status_code=status.HTTP_200_OK,
    summary="List active categories",
    description="Retrieves active food categories using Redis caching for ultra-fast response times."
)
async def list_categories(
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
) -> Any:
    """List active food categories with Redis caching."""
    # Check cache first
    try:
        cached_data = await cache_service.get(redis, CACHE_CATEGORIES_KEY)
        if cached_data:
            categories_list = json.loads(cached_data)
            return categories_list
    except Exception:
        # Fallback to database on cache error
        pass

    # Database query
    stmt = (
        select(FoodCategory)
        .where(FoodCategory.is_active == True)
        .order_by(FoodCategory.name.asc())
    )
    result = await db.execute(stmt)
    categories = result.scalars().all()

    # Prepare response data and populate cache
    response_data = [
        FoodCategoryResponse.model_validate(cat).model_dump(mode="json")
        for cat in categories
    ]
    try:
        await cache_service.set(
            redis,
            CACHE_CATEGORIES_KEY,
            json.dumps(response_data),
            expire=CACHE_EXPIRATION_SECONDS,
        )
    except Exception:
        pass

    return categories


@router.post(
    "/categories",
    response_model=FoodCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create category (staff/admin)",
    description="Creates a new food category and invalidates category caches."
)
async def create_category(
    category_in: FoodCategoryCreate,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(require_role(["staff", "admin"])),
) -> Any:
    """Create a new food category."""
    # Check unique name
    stmt = select(FoodCategory).where(FoodCategory.name == category_in.name.strip())
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{category_in.name}' already exists.",
        )

    category = FoodCategory(
        name=category_in.name.strip(),
        description=category_in.description.strip() if category_in.description else None,
        image_url=category_in.image_url.strip() if category_in.image_url else None,
        is_active=category_in.is_active if category_in.is_active is not None else True,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    # Invalidate cache
    try:
        await cache_service.invalidate_pattern(redis, "food_categories*")
    except Exception:
        pass

    return category


# ---------------------------------------------------------
# Food Items Endpoints
# ---------------------------------------------------------

@router.get(
    "/items",
    response_model=List[FoodItemResponse],
    status_code=status.HTTP_200_OK,
    summary="List food items",
    description="Lists food items with optional filters for category, search keyword, and vegetarian preference."
)
async def list_food_items(
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    search: Optional[str] = Query(None, description="Search term for item name or description"),
    is_vegetarian: Optional[bool] = Query(None, description="Filter vegetarian items only"),
    available_only: bool = Query(True, description="Only show currently available items"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """List food items with search and category filters."""
    query = (
        select(FoodItem)
        .options(
            selectinload(FoodItem.category),
            selectinload(FoodItem.recipes).selectinload(Recipe.ingredient),
        )
        .order_by(FoodItem.name.asc())
    )

    if available_only:
        query = query.where(FoodItem.is_available == True)

    if category_id is not None:
        query = query.where(FoodItem.category_id == category_id)

    if is_vegetarian is not None:
        query = query.where(FoodItem.is_vegetarian == is_vegetarian)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                FoodItem.name.ilike(search_pattern),
                FoodItem.description.ilike(search_pattern),
            )
        )

    result = await db.execute(query)
    items = result.scalars().all()
    return items


@router.get(
    "/items/{item_id}",
    response_model=FoodItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Get food item detail",
    description="Fetches a single food item with full recipe and ingredient requirements."
)
async def get_food_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Retrieve detailed item information by ID."""
    stmt = (
        select(FoodItem)
        .where(FoodItem.id == item_id)
        .options(
            selectinload(FoodItem.category),
            selectinload(FoodItem.recipes).selectinload(Recipe.ingredient),
        )
    )
    result = await db.execute(stmt)
    item = result.scalars().first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food item with ID {item_id} not found.",
        )
    return item


@router.post(
    "/items",
    response_model=FoodItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create food item (staff/admin)",
    description="Creates a new food item and optional recipe relations."
)
async def create_food_item(
    item_in: FoodItemCreate,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(require_role(["staff", "admin"])),
) -> Any:
    """Create a new food item with recipes."""
    # Verify category exists
    cat_stmt = select(FoodCategory).where(FoodCategory.id == item_in.category_id)
    cat = (await db.execute(cat_stmt)).scalars().first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category ID {item_in.category_id} does not exist.",
        )

    new_item = FoodItem(
        category_id=item_in.category_id,
        name=item_in.name.strip(),
        description=item_in.description.strip() if item_in.description else None,
        price=item_in.price,
        image_url=item_in.image_url.strip() if item_in.image_url else None,
        is_available=item_in.is_available if item_in.is_available is not None else True,
        is_vegetarian=item_in.is_vegetarian if item_in.is_vegetarian is not None else False,
        preparation_time=item_in.preparation_time or 15,
    )
    db.add(new_item)
    await db.flush()

    # If recipes are provided, add them
    if hasattr(item_in, "recipes") and item_in.recipes:
        for r in item_in.recipes:
            recipe_entry = Recipe(
                food_item_id=new_item.id,
                ingredient_id=r.ingredient_id,
                quantity_required=r.quantity_required,
            )
            db.add(recipe_entry)

    await db.commit()

    # Re-query with eager loads
    stmt = (
        select(FoodItem)
        .where(FoodItem.id == new_item.id)
        .options(
            selectinload(FoodItem.category),
            selectinload(FoodItem.recipes).selectinload(Recipe.ingredient),
        )
    )
    item = (await db.execute(stmt)).scalars().first()

    # Invalidate cache & broadcast
    try:
        await cache_service.invalidate_pattern(redis, "food_*")
        await manager.broadcast_menu_update({
            "action": "item_created",
            "item_id": item.id,
            "name": item.name,
            "price": float(item.price),
        })
    except Exception:
        pass

    return item


@router.put(
    "/items/{item_id}",
    response_model=FoodItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Update food item (staff/admin)",
    description="Updates existing food item properties."
)
async def update_food_item(
    item_id: int,
    item_update: FoodItemUpdate,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(require_role(["staff", "admin"])),
) -> Any:
    """Update details of a food item."""
    stmt = (
        select(FoodItem)
        .where(FoodItem.id == item_id)
        .options(
            selectinload(FoodItem.category),
            selectinload(FoodItem.recipes).selectinload(Recipe.ingredient),
        )
    )
    item = (await db.execute(stmt)).scalars().first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food item with ID {item_id} not found.",
        )

    if item_update.category_id is not None:
        cat_stmt = select(FoodCategory).where(FoodCategory.id == item_update.category_id)
        if not (await db.execute(cat_stmt)).scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category ID {item_update.category_id} does not exist.",
            )
        item.category_id = item_update.category_id

    if item_update.name is not None and item_update.name.strip():
        item.name = item_update.name.strip()
    if item_update.description is not None:
        item.description = item_update.description.strip() if item_update.description else None
    if item_update.price is not None:
        if item_update.price <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Price must be greater than zero.",
            )
        item.price = item_update.price
    if item_update.image_url is not None:
        item.image_url = item_update.image_url.strip() if item_update.image_url else None
    if item_update.is_available is not None:
        item.is_available = item_update.is_available
    if item_update.is_vegetarian is not None:
        item.is_vegetarian = item_update.is_vegetarian
    if item_update.preparation_time is not None:
        item.preparation_time = item_update.preparation_time

    db.add(item)
    await db.commit()
    await db.refresh(item)

    # Invalidate cache & broadcast
    try:
        await cache_service.invalidate_pattern(redis, "food_*")
        await manager.broadcast_menu_update({
            "action": "item_updated",
            "item_id": item.id,
            "name": item.name,
            "is_available": item.is_available,
        })
    except Exception:
        pass

    return item


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_200_OK,
    summary="Soft-delete food item (staff/admin)",
    description="Marks a food item as unavailable (soft-delete) to preserve historical order integrity."
)
async def delete_food_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(require_role(["staff", "admin"])),
) -> Any:
    """Soft delete item by marking unavailable."""
    stmt = select(FoodItem).where(FoodItem.id == item_id)
    item = (await db.execute(stmt)).scalars().first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food item with ID {item_id} not found.",
        )

    item.is_available = False
    db.add(item)
    await db.commit()

    # Invalidate cache & broadcast
    try:
        await cache_service.invalidate_pattern(redis, "food_*")
        await manager.broadcast_menu_update({
            "action": "item_deleted",
            "item_id": item.id,
            "is_available": False,
        })
    except Exception:
        pass

    return {"message": f"Food item '{item.name}' has been deactivated successfully.", "id": item_id}
