# CampusEats — Redis Caching & In-Memory Data Store Guide

This guide describes how **Redis 7** is integrated into **CampusEats** as an ultra-fast in-memory cache and session store to accelerate student shopping carts, cache read-heavy menu catalogs, and track real-time pickup slot counters.

---

## 1. Role of Redis in CampusEats

In a high-traffic college canteen environment, hundreds of students concurrently browse menus and assemble lunch orders during 10-minute break windows. Hitting PostgreSQL for ephemeral shopping carts and repeated static menu queries creates unnecessary connection contention and CPU load.

Redis solves this by providing:
1. **Ephemeral Shopping Carts**: Sub-millisecond reads/writes without polluting relational database tables with abandoned carts.
2. **Menu Catalog Caching**: Eliminating redundant category and dish queries.
3. **Slot Capacity Cache**: Fast lookups for available pickup slots during checkout.
4. **Cache Invalidation on Mutation**: Dual-write event triggers to ensure data consistency.

---

## 2. Key Patterns, Data Types & TTLs

| Key Pattern | Redis Data Type | TTL (Time-to-Live) | Purpose & Payload Description |
|:---|:---:|:---:|:---|
| `cart:{user_id}` | `HASH` or `STRING` (JSON) | 48 Hours (`172800s`) | Stores the current active shopping cart items, quantities, and pricing for a logged-in student. |
| `menu:categories` | `STRING` (JSON) | 1 Hour (`3600s`) | Serialized JSON array of all active categories. |
| `menu:category:{id}:items` | `STRING` (JSON) | 30 Minutes (`1800s`) | Serialized JSON list of food items within a specific category. |
| `slots:date:{YYYY-MM-DD}` | `STRING` (JSON) | 5 Minutes (`300s`) | Real-time cache of available pickup slots and remaining capacity. |
| `item:{id}:details` | `STRING` (JSON) | 15 Minutes (`900s`) | Cached food item details including recipe ingredients and allergens. |

---

## 3. Connecting to Redis via `redis-cli`

### 3.1 Via Docker Container
```bash
docker exec -it campuseats-redis redis-cli
```

### 3.2 Native Fedora Host Command
```bash
# If redis is installed locally (sudo dnf install redis)
redis-cli -h localhost -p 6379
```

---

## 4. Inspecting & Querying Data in Redis

Launch `redis-cli` and execute standard diagnostic commands:

```bash
# 1. Check Redis connectivity
ping
# Returns: PONG

# 2. View all active keys matching CampusEats patterns
KEYS "cart:*"
KEYS "menu:*"
KEYS "slots:*"

# 3. Inspect a specific user's cart
GET "cart:a0000000-0000-0000-0000-000000000001"

# Sample JSON Output:
# {"items": [{"food_item_id": 1, "name": "Masala Dosa", "price": 60.00, "quantity": 2, "subtotal": 120.00}], "total_amount": 120.00, "total_items": 2}

# 4. Check remaining TTL of a cart key (in seconds)
TTL "cart:a0000000-0000-0000-0000-000000000001"
# Returns: 172740 (approx 48 hours remaining)

# 5. Inspect memory usage of a specific key
MEMORY USAGE "cart:a0000000-0000-0000-0000-000000000001"

# 6. Delete a test cart manually
DEL "cart:a0000000-0000-0000-0000-000000000001"
```

---

## 5. Cache Invalidation Strategy

CampusEats adopts a **Cache-Aside (Lazy Loading)** with **Event-Driven Invalidation** pattern implemented in `backend/app/services/cache_service.py`:

```text
Student Request (GET /food/items)
         │
         ▼
  Key in Redis?
  ├── YES ──► Return cached JSON immediately (0.5 ms)
  └── NO  ──► Query PostgreSQL ──► Write to Redis with TTL ──► Return to Client
```

### Invalidation Triggers:
1. **Menu Item Updated/Deleted**:
   - Whenever kitchen staff changes a dish price or toggles `is_available`, backend triggers:
     ```python
     await cache_service.invalidate_pattern(redis, "menu:*")
     await cache_service.delete(redis, f"item:{item_id}:details")
     ```
2. **Order Placement**:
   - When an order is confirmed, the student's cart is immediately cleared:
     ```python
     await cache_service.delete(redis, f"cart:{user_id}")
     ```
   - Slot capacity cache is invalidated:
     ```python
     await cache_service.delete(redis, f"slots:date:{slot_date}")
     ```

---

## 6. Real-Time Redis Monitoring

Monitor operational metrics and live commands during load testing:

```bash
# 1. Live stream all commands received by Redis in real-time
docker exec -it campuseats-redis redis-cli MONITOR

# 2. Inspect server stats (connected clients, memory, hit rates)
docker exec -it campuseats-redis redis-cli INFO

# 3. View key hit/miss statistics
docker exec -it campuseats-redis redis-cli INFO stats
# Look for keyspace_hits and keyspace_misses
# Hit Ratio = keyspace_hits / (keyspace_hits + keyspace_misses)

# 4. Check memory consumption
docker exec -it campuseats-redis redis-cli INFO memory
# Look for used_memory_human, maxmemory_policy
```

---

## 7. Redis Cache Troubleshooting

| Issue | Cause | Resolution |
|:---|:---|:---|
| **`Connection refused [Errno 111]`** | Redis container not running | Run `docker compose up -d redis` and check `docker logs campuseats-redis`. |
| **Stale Menu Changes** | Cache invalidation failed | Flush menu keys manually: `redis-cli KEYS "menu:*" \| xargs redis-cli DEL`. |
| **OOM (Out of Memory) Errors** | Cache growth without TTL eviction | Verify default eviction policy in `redis.conf`: `maxmemory-policy allkeys-lru`. |
