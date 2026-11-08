"""Neo4j Graph Database Service.

Provides graph representations of students, food items, categories, ingredients,
and orders to support collaborative filtering recommendations and preference modeling.
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings

logger = logging.getLogger("campuseats.neo4j")

try:
    from neo4j import AsyncGraphDatabase, AsyncDriver
except ImportError:
    AsyncGraphDatabase = None
    AsyncDriver = None


class Neo4jService:
    """Async Neo4j driver wrapper and graph analytics engine."""

    def __init__(self):
        self._driver: Optional[Any] = None

    def get_driver(self) -> Optional[Any]:
        """Lazy-initialize and return the Neo4j async bolt driver."""
        if self._driver is None and AsyncGraphDatabase is not None:
            try:
                self._driver = AsyncGraphDatabase.driver(
                    settings.NEO4J_URI,
                    auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
                )
            except Exception as exc:
                logger.warning("Failed to establish Neo4j driver connection: %s", exc)
                self._driver = None
        return self._driver

    async def close(self) -> None:
        """Close graph driver connection pool."""
        if self._driver is not None:
            try:
                await self._driver.close()
            except Exception as exc:
                logger.warning("Error closing Neo4j driver: %s", exc)
            finally:
                self._driver = None

    async def sync_order_to_graph(self, order: Any, driver: Optional[Any] = None) -> None:
        """Project an order with items into Neo4j nodes and edges."""
        active_driver = driver or self.get_driver()
        if not active_driver:
            return

        order_id = str(order.id)
        user_id = str(order.user_id)
        status = str(order.status)
        total = float(order.total_amount)

        items_payload = []
        order_items = getattr(order, "order_items", None) or getattr(order, "items", [])
        for oi in order_items:
            food_name = oi.food_item.name if getattr(oi, "food_item", None) else f"Item {oi.food_item_id}"
            cat_id = oi.food_item.category_id if getattr(oi, "food_item", None) else None
            items_payload.append({
                "food_item_id": oi.food_item_id,
                "name": food_name,
                "quantity": int(oi.quantity),
                "unit_price": float(oi.unit_price),
                "category_id": cat_id,
            })

        cypher = """
        MERGE (s:Student {id: $user_id})
        MERGE (o:Order {id: $order_id})
        SET o.status = $status, o.total_amount = $total
        MERGE (s)-[:PLACED]->(o)
        WITH s, o
        UNWIND $items AS itm
        MERGE (f:FoodItem {id: itm.food_item_id})
        SET f.name = itm.name
        MERGE (o)-[:CONTAINS {quantity: itm.quantity, unit_price: itm.unit_price}]->(f)
        MERGE (s)-[r:ORDERED]->(f)
        ON CREATE SET r.times = itm.quantity
        ON MATCH SET r.times = r.times + itm.quantity
        WITH f, itm
        WHERE itm.category_id IS NOT NULL
        MERGE (c:Category {id: itm.category_id})
        MERGE (f)-[:BELONGS_TO]->(c)
        """

        try:
            async with active_driver.session() as session:
                await session.run(
                    cypher,
                    user_id=user_id,
                    order_id=order_id,
                    status=status,
                    total=total,
                    items=items_payload,
                )
        except Exception as exc:
            logger.warning("Neo4j order sync skipped: %s", exc)

    async def get_user_preferences(self, user_id: str, driver: Optional[Any] = None) -> Dict[str, Any]:
        """Aggregate user ordering behavior across menu categories and favorites."""
        active_driver = driver or self.get_driver()
        default_prefs = {
            "user_id": user_id,
            "favorite_items": [],
            "top_categories": [],
            "total_orders": 0,
        }
        if not active_driver:
            return default_prefs

        cypher = """
        MATCH (s:Student {id: $user_id})-[r:ORDERED]->(f:FoodItem)
        OPTIONAL MATCH (f)-[:BELONGS_TO]->(c:Category)
        RETURN f.id AS item_id, f.name AS item_name, r.times AS times_ordered, c.id AS category_id
        ORDER BY times_ordered DESC
        LIMIT 10
        """

        try:
            async with active_driver.session() as session:
                result = await session.run(cypher, user_id=user_id)
                records = await result.data()

                favorites = []
                category_counts = {}
                total_items = 0

                for rec in records:
                    times = rec.get("times_ordered", 1)
                    total_items += times
                    favorites.append({
                        "item_id": rec.get("item_id"),
                        "name": rec.get("item_name"),
                        "count": times,
                    })
                    cat = rec.get("category_id")
                    if cat:
                        category_counts[cat] = category_counts.get(cat, 0) + times

                top_categories = sorted(
                    [{"category_id": k, "frequency": v} for k, v in category_counts.items()],
                    key=lambda x: x["frequency"],
                    reverse=True,
                )

                return {
                    "user_id": user_id,
                    "favorite_items": favorites,
                    "top_categories": top_categories,
                    "total_items_ordered": total_items,
                }
        except Exception as exc:
            logger.warning("Neo4j preferences query error: %s", exc)
            return default_prefs

    async def get_recommendations(
        self,
        user_id: str,
        limit: int = 5,
        driver: Optional[Any] = None,
    ) -> List[int]:
        """Collaborative filtering: recommend items ordered by students with overlapping tastes."""
        active_driver = driver or self.get_driver()
        if not active_driver:
            return []

        cypher = """
        MATCH (s1:Student {id: $user_id})-[:ORDERED]->(f1:FoodItem)<-[:ORDERED]-(s2:Student)
        WHERE s1 <> s2
        MATCH (s2)-[r:ORDERED]->(rec:FoodItem)
        WHERE NOT (s1)-[:ORDERED]->(rec)
        RETURN rec.id AS item_id, sum(r.times) AS affinity_score
        ORDER BY affinity_score DESC
        LIMIT $limit
        """

        try:
            async with active_driver.session() as session:
                result = await session.run(cypher, user_id=user_id, limit=limit)
                records = await result.data()
                item_ids = [rec["item_id"] for rec in records if "item_id" in rec and rec["item_id"] is not None]
                return item_ids
        except Exception as exc:
            logger.warning("Neo4j collaborative filtering error: %s", exc)
            return []

    async def sync_postgres_to_neo4j(self, db: AsyncSession) -> int:
        """Batch synchronize all food items, categories, and past orders into Neo4j."""
        from app.models.food import FoodCategory, FoodItem
        from app.models.order import Order

        driver = self.get_driver()
        if not driver:
            raise ConnectionError("Neo4j database service is unavailable.")

        # 1. Sync Categories & Items
        cats = (await db.execute(select(FoodCategory))).scalars().all()
        items = (await db.execute(select(FoodItem))).scalars().all()

        category_payload = [{"id": c.id, "name": c.name} for c in cats]
        item_payload = [
            {"id": i.id, "name": i.name, "category_id": i.category_id, "price": float(i.price)}
            for i in items
        ]

        batch_menu_cypher = """
        UNWIND $categories AS cat
        MERGE (c:Category {id: cat.id})
        SET c.name = cat.name

        WITH 1 AS dummy
        UNWIND $items AS itm
        MERGE (f:FoodItem {id: itm.id})
        SET f.name = itm.name, f.price = itm.price
        WITH f, itm
        MATCH (c:Category {id: itm.category_id})
        MERGE (f)-[:BELONGS_TO]->(c)
        """

        async with driver.session() as session:
            await session.run(batch_menu_cypher, categories=category_payload, items=item_payload)

        # 2. Sync Past Confirmed/Completed Orders
        orders_stmt = (
            select(Order)
            .options(selectinload(Order.order_items))
            .where(Order.status.in_(["confirmed", "accepted", "preparing", "ready", "picked_up"]))
            .limit(500)
        )
        orders = (await db.execute(orders_stmt)).scalars().all()

        synced_count = 0
        for order in orders:
            await self.sync_order_to_graph(order, driver=driver)
            synced_count += 1

        return synced_count


# Global singleton service instance
neo4j_service = Neo4jService()

# Re-export standalone module helper functions for compatibility
sync_order_to_graph = neo4j_service.sync_order_to_graph
get_user_preferences = neo4j_service.get_user_preferences
get_recommendations = neo4j_service.get_recommendations
close = neo4j_service.close
