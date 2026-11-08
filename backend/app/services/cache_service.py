"""Redis Cache Management Service.

Provides caching primitives and pattern-based key invalidation for menu catalogs and category data.
"""

import logging
from typing import Any, Optional, Union

logger = logging.getLogger("campuseats.cache")

# Standard application cache TTL constants in seconds
MENU_CACHE_TTL: int = 300        # 5 minutes for food menu items
CATEGORIES_CACHE_TTL: int = 600  # 10 minutes for food categories


async def get(redis, key: str) -> Optional[str]:
    """Retrieve cached string value by key from Redis."""
    if redis is None:
        return None
    try:
        val = await redis.get(key)
        return val
    except Exception as exc:
        logger.warning("Cache GET failed for key '%s': %s", key, exc)
        return None


async def set(
    redis,
    key: str,
    value: str,
    expire_seconds: int = MENU_CACHE_TTL,
) -> None:
    """Store string value in Redis with time-to-live expiration."""
    if redis is None:
        return
    try:
        await redis.set(key, value, ex=expire_seconds)
    except Exception as exc:
        logger.warning("Cache SET failed for key '%s': %s", key, exc)


async def delete(redis, key: str) -> None:
    """Delete a specific key from Redis cache."""
    if redis is None:
        return
    try:
        await redis.delete(key)
    except Exception as exc:
        logger.warning("Cache DELETE failed for key '%s': %s", key, exc)


async def invalidate_pattern(redis, pattern: str) -> None:
    """Scan and delete all keys matching a glob pattern (e.g. 'menu:*')."""
    if redis is None:
        return
    try:
        keys = []
        async for k in redis.scan_iter(match=pattern):
            keys.append(k)

        if keys:
            await redis.delete(*keys)
            logger.info("Invalidated %d cache keys matching pattern '%s'", len(keys), pattern)
    except Exception as exc:
        logger.warning("Cache invalidate_pattern failed for '%s': %s", pattern, exc)
