"""Graph Database & Recommendation API Router.

Endpoints for querying user preferences and personalized food recommendations powered by Neo4j graph algorithms.
"""

from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.food import FoodItem
from app.models.user import User
from app.schemas.food import FoodItemResponse
from app.services.neo4j_service import Neo4jService, neo4j_service

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get(
    "/preferences/{user_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get user food preferences from Neo4j graph",
    description="Queries graph traversal to aggregate user's top categories, item ordering frequencies, and dietary tendencies.",
)
async def get_user_preferences(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve graph-based preference profile for user."""
    # Allow self or admin/staff
    if current_user.id != user_id and current_user.role not in ("admin", "staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view preferences for this user.",
        )

    preferences = await neo4j_service.get_user_preferences(str(user_id))
    return preferences


@router.get(
    "/recommendations/{user_id}",
    response_model=List[FoodItemResponse],
    status_code=status.HTTP_200_OK,
    summary="Get personalized food recommendations",
    description="Calculates collaborative filtering recommendations using Neo4j student co-order graph patterns.",
)
async def get_recommendations(
    user_id: UUID,
    limit: int = Query(5, ge=1, le=20, description="Number of recommendations to retrieve"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Compute and retrieve recommended food items for a student."""
    recommended_item_ids = await neo4j_service.get_recommendations(str(user_id), limit=limit)

    if not recommended_item_ids:
        # Fallback to top available items
        stmt = (
            select(FoodItem)
            .where(FoodItem.is_available == True)
            .order_by(FoodItem.id.asc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    # Query full FoodItem models from PostgreSQL preserving rank
    stmt = select(FoodItem).where(FoodItem.id.in_(recommended_item_ids), FoodItem.is_available == True)
    result = await db.execute(stmt)
    items_by_id = {item.id: item for item in result.scalars().all()}

    # Preserve order returned by graph algorithm
    ordered_items = [items_by_id[iid] for iid in recommended_item_ids if iid in items_by_id]
    return ordered_items


@router.post(
    "/sync",
    status_code=status.HTTP_200_OK,
    summary="Sync relational PostgreSQL data into Neo4j graph (admin only)",
    description="Performs batch projection of users, categories, menu items, ingredients, and past orders into Neo4j nodes and edges.",
)
async def sync_graph(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Trigger synchronous or asynchronous graph projection."""
    try:
        synced_count = await neo4j_service.sync_postgres_to_neo4j(db)
        return {
            "success": True,
            "message": "PostgreSQL data successfully synchronized with Neo4j graph database.",
            "synced_records": synced_count,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to synchronize graph: {str(e)}",
        )
