"""Search API Router.

Endpoints for PostgreSQL Full-Text Search (tsvector/tsquery) and Vector Semantic Search (pgvector).
"""

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.food import FoodItemResponse
from app.services import search_service

router = APIRouter(prefix="/api/search", tags=["search"])


class SemanticSearchRequest(BaseModel):
    """Payload for natural language vector semantic search."""
    query: str = Field(..., min_length=1, description="Natural language query (e.g. 'spicy evening snack' or 'healthy protein breakfast')")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of items to return")


@router.post(
    "/semantic",
    response_model=List[FoodItemResponse],
    status_code=status.HTTP_200_OK,
    summary="Semantic vector search",
    description="Embeds query into 384-dimensional vector and executes pgvector cosine similarity search (<=>) on item embeddings."
)
async def semantic_search(
    search_in: SemanticSearchRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Execute AI semantic search using pgvector."""
    try:
        items = await search_service.semantic_search(
            db=db,
            query=search_in.query,
            limit=search_in.limit,
        )
        return items
    except Exception as e:
        # Fallback to fulltext search if vector extension or model is unavailable
        try:
            return await search_service.fulltext_search(db=db, query=search_in.query)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Semantic search failed: {str(e)}",
            )


@router.get(
    "/fulltext",
    response_model=List[FoodItemResponse],
    status_code=status.HTTP_200_OK,
    summary="PostgreSQL full-text search",
    description="Executes native PostgreSQL text index search using to_tsvector and plainto_tsquery on menu items."
)
async def fulltext_search(
    q: str = Query(..., min_length=1, description="Search keywords"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Execute SQL full-text search query."""
    return await search_service.fulltext_search(db=db, query=q)
