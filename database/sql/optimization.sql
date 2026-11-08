-- ============================================================================
-- CampusEats Query Optimization & Execution Plan Demonstrations
-- Practical DBMS demonstrations of cost-based planning, access path selection,
-- index usage, query refactoring, and maintenance
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: SEQUENTIAL SCAN VS INDEX SCAN COMPARISON
-- ----------------------------------------------------------------------------

-- 1.1 Sequential Scan demonstration
-- When querying a column with no index, or querying all rows, PostgreSQL is forced
-- to evaluate a Seq Scan on the relation, reading all heap pages.
EXPLAIN ANALYZE
SELECT id, email, full_name, role
FROM users
WHERE phone = '+919876543210';
-- EXPECTED PLAN BEHAVIOR:
-- "Seq Scan on users  (cost=0.00..X.XX rows=1 width=...)"
-- "Filter: ((phone)::text = '+919876543210'::text)"
-- Because `phone` does not have an index, PostgreSQL must check every row.

-- 1.2 Index Scan demonstration on UNIQUE column
-- Querying by email utilizes the unique B-Tree index created by the UNIQUE constraint.
EXPLAIN ANALYZE
SELECT id, email, full_name, role
FROM users
WHERE email = 'student@campus.edu';
-- EXPECTED PLAN BEHAVIOR:
-- "Index Scan using users_email_key on users  (cost=0.15..8.17 rows=1 width=...)"
-- "Index Cond: ((email)::text = 'student@campus.edu'::text)"
-- Direct B-Tree descent with O(log N) page lookups rather than full heap traversal.


-- ----------------------------------------------------------------------------
-- SECTION 2: COMPOSITE INDEX UTILIZATION & COLUMN ORDERING RULES
-- ----------------------------------------------------------------------------

-- Recall our composite index: idx_orders_user_status ON orders(user_id, status)

-- 2.1 Optimal usage: Both leading and secondary column present
EXPLAIN ANALYZE
SELECT id, status, total_amount, created_at
FROM orders
WHERE user_id = 'a0000000-0000-0000-0000-000000000001'
  AND status = 'confirmed';
-- EXPECTED PLAN BEHAVIOR:
-- "Index Scan using idx_orders_user_status on orders"
-- Matches both indexed attributes.

-- 2.2 Leading column only: Index IS still used (Left-prefix rule)
EXPLAIN ANALYZE
SELECT id, status, total_amount
FROM orders
WHERE user_id = 'a0000000-0000-0000-0000-000000000001';
-- EXPECTED PLAN BEHAVIOR:
-- Uses `idx_orders_user_status` as an index scan because `user_id` is the leading attribute.

-- 2.3 Non-leading column only: Index is skipped or scanned poorly
EXPLAIN ANALYZE
SELECT id, user_id, total_amount
FROM orders
WHERE status = 'confirmed';
-- EXPECTED PLAN BEHAVIOR:
-- Planner will prefer a Sequential Scan or a partial index if matching, because
-- standard B-Tree indexes cannot cleanly traverse non-leading columns without full index scan.


-- ----------------------------------------------------------------------------
-- SECTION 3: PARTIAL INDEX DEMONSTRATION
-- ----------------------------------------------------------------------------

-- Recall: idx_orders_active_queue ON orders(created_at ASC) WHERE status NOT IN ('picked_up', 'cancelled')

-- 3.1 Kitchen display query: Filters strictly inside the partial index predicate
EXPLAIN ANALYZE
SELECT id, user_id, status, total_amount, created_at
FROM orders
WHERE status = 'preparing'
ORDER BY created_at ASC;
-- EXPECTED PLAN BEHAVIOR:
-- Planner recognizes that status = 'preparing' guarantees status NOT IN ('picked_up', 'cancelled')
-- Utilizes the lightweight `idx_orders_active_queue` without scanning historical millions of completed orders!


-- ----------------------------------------------------------------------------
-- SECTION 4: QUERY REWRITING TECHNIQUES
-- ----------------------------------------------------------------------------

-- 4.1 Subquery with IN vs JOIN rewrite
-- Sub-optimal: Nested correlated subquery or un-flattened IN
-- Anti-Pattern:
EXPLAIN
SELECT name, price
FROM food_items
WHERE id IN (
    SELECT DISTINCT food_item_id
    FROM order_items
    WHERE unit_price > 50.00
);

-- Optimized: Inner join with distinct or EXISTS
-- Optimized Pattern:
EXPLAIN
SELECT fi.name, fi.price
FROM food_items fi
WHERE EXISTS (
    SELECT 1
    FROM order_items oi
    WHERE oi.food_item_id = fi.id
      AND oi.unit_price > 50.00
);
-- EXPLANATION:
-- `EXISTS` short-circuits as soon as a single match is found in `order_items`
-- avoiding duplicate de-duplication hash tables required by `IN (SELECT DISTINCT ...)`.

-- 4.2 Avoiding SELECT * and leveraging Index-Only Scans
-- When all requested columns reside directly inside the index leaf pages,
-- PostgreSQL performs an "Index Only Scan", completely bypassing heap table I/O!
EXPLAIN ANALYZE
SELECT order_id, food_item_id
FROM order_items
WHERE order_id = 'b0000000-0000-0000-0000-000000000001';
-- EXPECTED PLAN BEHAVIOR:
-- "Index Only Scan using idx_order_items_order_food on order_items"
-- Heap Fetches: 0 (if visibility map is clean).


-- ----------------------------------------------------------------------------
-- SECTION 5: DATABASE MAINTENANCE & CONNECTION POOLING NOTES
-- ----------------------------------------------------------------------------

-- 5.1 VACUUM & ANALYZE
-- PostgreSQL uses Multi-Version Concurrency Control (MVCC).
-- Updates and Deletes produce dead tuples that must be reclaimed.
-- ANALYZE collects column value distribution statistics for the Cost-Based Optimizer (CBO).

-- Run standard VACUUM ANALYZE to update statistics:
VACUUM (VERBOSE, ANALYZE) orders;
VACUUM (VERBOSE, ANALYZE) order_items;
VACUUM (VERBOSE, ANALYZE) food_items;
VACUUM (VERBOSE, ANALYZE) ingredients;

-- 5.2 CONNECTION POOLING ARCHITECTURE (PgBouncer / SQLAlchemy AsyncEngine)
/*
 * In high-concurrency college environments (e.g. lunch rush at 13:00):
 * - Direct PostgreSQL connections are heavy (forking processes, ~5-10MB RAM each).
 * - Connection pooling maintains a pre-warmed set of server connections.
 * - In CampusEats, SQLAlchemy async engine (asyncpg) maintains a pool:
 *     pool_size = 20, max_overflow = 10, pool_timeout = 30
 * - This prevents the database server from running out of file descriptors
 *   while maintaining sub-5ms transaction latency.
 */
