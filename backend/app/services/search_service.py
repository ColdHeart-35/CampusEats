"""Menu Search Service.

Combines AI-powered vector semantic search using pgvector cosine distance (<=>)
with native PostgreSQL full-text search (tsvector / plainto_tsquery) and ILIKE fallback.
"""

import logging
from typing import List

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.food import FoodItem
from app.services import embedding_service

logger = logging.getLogger("campuseats.search")


async def semantic_search(
    db: AsyncSession,
    query: str,
    limit: int = 10,
) -> List[FoodItem]:
    """Perform semantic vector search using pgvector cosine distance (<=>).

    Generates query embedding vector and ranks food items by cosine similarity.
    """
    clean_query = (query or "").strip()
    if not clean_query:
        return []

    # Generate 384-dimensional query vector
    query_vector = embedding_service.generate_embedding(clean_query)

    try:
        # pgvector cosine distance operator (<=>)
        stmt = (
            select(FoodItem)
            .options(selectinload(FoodItem.category))
            .where(
                FoodItem.is_available == True,
                FoodItem.embedding.isnot(None),
            )
            .order_by(FoodItem.embedding.cosine_distance(query_vector))
            .limit(limit)
        )
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        if items:
            return items
    except Exception as exc:
        logger.warning("pgvector cosine distance query failed: %s. Falling back to full-text.", exc)

    # Fallback to full-text if vector similarity yields zero results or is unavailable
    return await fulltext_search(db=db, query=clean_query, limit=limit)


async def fulltext_search(
    db: AsyncSession,
    query: str,
    limit: int = 20,
) -> List[FoodItem]:
    """Perform PostgreSQL full-text search using tsvector and plainto_tsquery with ILIKE fallback."""
    clean_query = (query or "").strip()
    if not clean_query:
        return []

    # 1. Attempt PostgreSQL tsvector text index search
    try:
        search_vector = func.to_tsvector(
            "english",
            FoodItem.name + " " + func.coalesce(FoodItem.description, ""),
        )
        stmt = (
            select(FoodItem)
            .options(selectinload(FoodItem.category))
            .where(
                FoodItem.is_available == True,
                search_vector.op("@@")(func.plainto_tsquery("english", clean_query)),
            )
            .limit(limit)
        )
        result = await db.execute(stmt)
        items = list(result.scalars().all())
        if items:
            return items
    except Exception as exc:
        logger.debug("PostgreSQL tsvector search bypassed (%s), using keyword ILIKE match.", exc)

    # 2. Resilient ILIKE substring matching fallback
    words = clean_query.split()
    clauses = []
    for w in words:
        clauses.append(FoodItem.name.ilike(f"%{w}%"))
        clauses.append(FoodItem.description.ilike(f"%{w}%"))

    fallback_stmt = (
        select(FoodItem)
        .options(selectinload(FoodItem.category))
        .where(
            FoodItem.is_available == True,
            or_(*clauses) if clauses else True,
        )
        .limit(limit)
    )
    res = await db.execute(fallback_stmt)
    return list(res.scalars().all())
