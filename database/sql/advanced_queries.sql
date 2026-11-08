-- ============================================================================
-- CampusEats Advanced SQL Queries & DBMS Demonstrations
-- Demonstrates Relational Algebra in SQL: Joins, Aggregations, Subqueries,
-- Set Operations, CTEs, and Analytic Window Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: BASIC DML OPERATIONS (INSERT, UPDATE, DELETE)
-- ----------------------------------------------------------------------------

-- 1.1 INSERT with RETURNING clause (Retrieves auto-generated PK)
INSERT INTO food_items (category_id, name, description, price, is_available, is_vegetarian, preparation_time)
VALUES (5, 'Bun Maska', 'Fresh bakery bun slathered with salted butter', 30.00, TRUE, TRUE, 5)
RETURNING id, name, price, created_at;

-- 1.2 UPDATE with conditional expressions (CASE statement)
UPDATE food_items
SET price = CASE
    WHEN price < 50.00 THEN ROUND(price * 1.10, 2)  -- 10% inflation adjustment on lower priced items
    ELSE ROUND(price * 1.05, 2)                      -- 5% adjustment on higher tier items
END,
updated_at = NOW()
WHERE is_available = TRUE;

-- 1.3 DELETE with cascading verification (Soft delete vs Hard delete)
-- Example of removing temporary/cancelled test orders without payments
DELETE FROM orders
WHERE status = 'cancelled'
  AND created_at < NOW() - INTERVAL '30 days'
  AND NOT EXISTS (
      SELECT 1 FROM payments p WHERE p.order_id = orders.id AND p.status = 'captured'
  );


-- ----------------------------------------------------------------------------
-- SECTION 2: SET OPERATIONS (UNION, INTERSECT, EXCEPT)
-- Note: Set operations automatically eliminate duplicates unless ALL is specified
-- ----------------------------------------------------------------------------

-- 2.1 UNION: Combine vegetarian options from South Indian and North Indian cuisines
SELECT id, name, price, 'South Indian' AS cuisine
FROM food_items
WHERE category_id = 1 AND is_vegetarian = TRUE
UNION
SELECT id, name, price, 'North Indian' AS cuisine
FROM food_items
WHERE category_id = 2 AND is_vegetarian = TRUE
ORDER BY price ASC;

-- 2.2 INTERSECT: Find food items ordered by student Aarav Patel AND student Priya Sharma
-- (Relational Algebra: π_item(Orders_Aarav) ∩ π_item(Orders_Priya))
SELECT fi.id, fi.name, fi.price
FROM food_items fi
JOIN order_items oi ON fi.id = oi.food_item_id
JOIN orders o ON oi.order_id = o.id
WHERE o.user_id = 'a0000000-0000-0000-0000-000000000001' -- Aarav Patel
INTERSECT
SELECT fi.id, fi.name, fi.price
FROM food_items fi
JOIN order_items oi ON fi.id = oi.food_item_id
JOIN orders o ON oi.order_id = o.id
WHERE o.user_id = 'a0000000-0000-0000-0000-000000000004'; -- Priya Sharma

-- 2.3 EXCEPT (Set Difference): Find food items that have NEVER been ordered by any student
-- (Relational Algebra: π_id(FoodItems) − π_food_item_id(OrderItems))
SELECT id, name, price, category_id
FROM food_items
EXCEPT
SELECT DISTINCT fi.id, fi.name, fi.price, fi.category_id
FROM food_items fi
JOIN order_items oi ON fi.id = oi.food_item_id
ORDER BY id;


-- ----------------------------------------------------------------------------
-- SECTION 3: NULL HANDLING (Three-Valued Logic, COALESCE, NULLIF)
-- ----------------------------------------------------------------------------

-- 3.1 COALESCE: Fallback display for orders without instructions, and payments without gateway IDs
SELECT
    o.id AS order_id,
    u.full_name AS customer_name,
    COALESCE(o.special_instructions, 'Standard Preparation (No special notes)') AS instructions,
    COALESCE(p.razorpay_payment_id, 'CASH_OR_UNPAID') AS payment_ref,
    COALESCE(ps.start_time::TEXT || ' - ' || ps.end_time::TEXT, 'Walk-in / Immediate') AS pickup_window
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN payments p ON o.id = p.order_id
LEFT JOIN pickup_slots ps ON o.pickup_slot_id = ps.id;

-- 3.2 NULLIF & Division by Zero Prevention
-- Calculate average unit cost only when stock > 0
SELECT
    name AS ingredient,
    current_stock,
    cost_per_unit,
    ROUND(cost_per_unit / NULLIF(current_stock, 0), 4) AS ratio_metric
FROM ingredients;


-- ----------------------------------------------------------------------------
-- SECTION 4: AGGREGATE FUNCTIONS & GROUP BY / HAVING
-- ----------------------------------------------------------------------------

-- 4.1 Multi-metric category aggregation with HAVING filter
SELECT
    c.name AS category_name,
    COUNT(fi.id) AS total_items_offered,
    COUNT(CASE WHEN fi.is_vegetarian THEN 1 END) AS vegetarian_count,
    ROUND(AVG(fi.price), 2) AS avg_item_price,
    MIN(fi.price) AS min_price,
    MAX(fi.price) AS max_price,
    ROUND(SUM(oi.subtotal), 2) AS total_revenue_generated
FROM food_categories c
JOIN food_items fi ON c.id = fi.category_id
LEFT JOIN order_items oi ON fi.id = oi.food_item_id
GROUP BY c.id, c.name
HAVING COUNT(fi.id) >= 2 AND AVG(fi.price) > 20.00
ORDER BY total_revenue_generated DESC NULLS LAST;


-- ----------------------------------------------------------------------------
-- SECTION 5: SUBQUERIES (Nested and Correlated)
-- ----------------------------------------------------------------------------

-- 5.1 Nested Subquery in WHERE: Items priced strictly above the global menu average
SELECT
    id,
    name,
    price,
    ROUND((SELECT AVG(price) FROM food_items), 2) AS global_menu_average
FROM food_items
WHERE price > (SELECT AVG(price) FROM food_items)
ORDER BY price DESC;

-- 5.2 Nested Subquery with IN / ALL / ANY: Top ordering customers
SELECT id, full_name, email, role
FROM users
WHERE id IN (
    SELECT user_id
    FROM orders
    GROUP BY user_id
    HAVING COUNT(id) >= (
        SELECT AVG(order_count)
        FROM (SELECT COUNT(id) AS order_count FROM orders GROUP BY user_id) AS sub
    )
);

-- 5.3 Correlated Subquery: Find items ordered more times than the average order count in their OWN category
SELECT
    fi.category_id,
    fi.name,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.food_item_id = fi.id) AS times_ordered
FROM food_items fi
WHERE (SELECT COUNT(*) FROM order_items oi WHERE oi.food_item_id = fi.id) > (
    SELECT AVG(item_orders.cnt)
    FROM (
        SELECT oi2.food_item_id, COUNT(*) AS cnt
        FROM order_items oi2
        JOIN food_items fi2 ON oi2.food_item_id = fi2.id
        WHERE fi2.category_id = fi.category_id
        GROUP BY oi2.food_item_id
    ) AS item_orders
)
ORDER BY fi.category_id, times_ordered DESC;


-- ----------------------------------------------------------------------------
-- SECTION 6: COMPREHENSIVE JOIN TYPES
-- ----------------------------------------------------------------------------

-- 6.1 INNER JOIN: Matched orders with confirmed items and verified pickup slot
SELECT
    o.id AS order_id,
    u.full_name AS customer,
    fi.name AS item_name,
    oi.quantity,
    oi.subtotal,
    ps.slot_date,
    ps.start_time
FROM orders o
INNER JOIN users u ON o.user_id = u.id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN food_items fi ON oi.food_item_id = fi.id
INNER JOIN pickup_slots ps ON o.pickup_slot_id = ps.id;

-- 6.2 LEFT OUTER JOIN: All food items regardless of whether they have been ordered
SELECT
    fi.id,
    fi.name,
    fi.price,
    COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
    COALESCE(SUM(oi.subtotal), 0.00) AS total_earnings
FROM food_items fi
LEFT OUTER JOIN order_items oi ON fi.id = oi.food_item_id
GROUP BY fi.id, fi.name, fi.price
ORDER BY total_units_sold DESC;

-- 6.3 RIGHT OUTER JOIN: All pickup slots regardless of whether any orders are booked
SELECT
    ps.id AS slot_id,
    ps.slot_date,
    ps.start_time,
    ps.max_capacity,
    ps.current_count,
    COUNT(o.id) AS orders_linked
FROM orders o
RIGHT OUTER JOIN pickup_slots ps ON o.pickup_slot_id = ps.id
GROUP BY ps.id, ps.slot_date, ps.start_time, ps.max_capacity, ps.current_count
ORDER BY ps.slot_date, ps.start_time;

-- 6.4 FULL OUTER JOIN: Match orders and payments (find orphan orders or unlinked payments)
SELECT
    o.id AS order_id,
    o.status AS order_status,
    o.total_amount AS order_amount,
    p.id AS payment_id,
    p.status AS payment_status,
    p.amount AS payment_amount
FROM orders o
FULL OUTER JOIN payments p ON o.id = p.order_id;

-- 6.5 CROSS JOIN: Cartesian product of all categories with all available time slots
-- Useful for timetable matrix generation
SELECT
    c.name AS category_name,
    ps.slot_date,
    ps.start_time || ' - ' || ps.end_time AS time_interval
FROM food_categories c
CROSS JOIN (SELECT DISTINCT slot_date, start_time, end_time FROM pickup_slots WHERE is_active = TRUE) ps
ORDER BY c.name, ps.start_time;

-- 6.6 SELF JOIN: Pairwise comparison of food items in the same category having identical pricing
SELECT
    a.category_id,
    c.name AS category_name,
    a.name AS item_1,
    b.name AS item_2,
    a.price
FROM food_items a
JOIN food_items b ON a.category_id = b.category_id AND a.price = b.price AND a.id < b.id
JOIN food_categories c ON a.category_id = c.id
ORDER BY c.name, a.price;


-- ----------------------------------------------------------------------------
-- SECTION 7: COMMON TABLE EXPRESSIONS (CTEs & RECURSIVE CTEs)
-- ----------------------------------------------------------------------------

-- 7.1 Multi-level Common Table Expression (CTE) for Revenue Decomposition
WITH OrderAggregates AS (
    SELECT
        o.id AS order_id,
        o.user_id,
        o.status,
        SUM(oi.subtotal) AS computed_total,
        COUNT(oi.id) AS unique_item_count,
        SUM(oi.quantity) AS total_pieces
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id, o.user_id, o.status
),
UserSpendingTier AS (
    SELECT
        oa.user_id,
        SUM(oa.computed_total) AS lifetime_spend,
        CASE
            WHEN SUM(oa.computed_total) > 200 THEN 'Gold Patron'
            WHEN SUM(oa.computed_total) BETWEEN 100 AND 200 THEN 'Silver Patron'
            ELSE 'Standard Patron'
        END AS patron_tier
    FROM OrderAggregates oa
    WHERE oa.status != 'cancelled'
    GROUP BY oa.user_id
)
SELECT
    u.full_name,
    u.email,
    ust.lifetime_spend,
    ust.patron_tier
FROM UserSpendingTier ust
JOIN users u ON ust.user_id = u.id
ORDER BY ust.lifetime_spend DESC;

-- 7.2 Recursive CTE: Simulating hierarchical taxonomy/categories or multi-step prep chains
WITH RECURSIVE CategoryHierarchy AS (
    -- Anchor member: Base categories
    SELECT id, name, description, 1 AS level, ARRAY[name] AS path
    FROM food_categories
    WHERE id = 1  -- Root category (South Indian)

    UNION ALL

    -- Recursive member: Simulated sub-tiers (e.g. Dosa Types, Idli Types, Rice Types)
    SELECT
        fi.id + 100,
        fi.name,
        fi.description,
        ch.level + 1,
        ch.path || fi.name
    FROM food_items fi
    JOIN CategoryHierarchy ch ON fi.category_id = 1 AND ch.level = 1
    WHERE fi.id <= 3
)
SELECT level, name, array_to_string(path, ' -> ') AS hierarchy_tree
FROM CategoryHierarchy;


-- ----------------------------------------------------------------------------
-- SECTION 8: ANALYTICAL WINDOW FUNCTIONS
-- ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, and Rolling Accumulators
-- ----------------------------------------------------------------------------

-- 8.1 ROW_NUMBER, RANK, and DENSE_RANK: Rank dishes by price within cuisine category
SELECT
    c.name AS category,
    fi.name AS item_name,
    fi.price,
    ROW_NUMBER() OVER(PARTITION BY fi.category_id ORDER BY fi.price DESC) AS row_num,
    RANK() OVER(PARTITION BY fi.category_id ORDER BY fi.price DESC) AS price_rank,
    DENSE_RANK() OVER(PARTITION BY fi.category_id ORDER BY fi.price DESC) AS dense_price_rank
FROM food_items fi
JOIN food_categories c ON fi.category_id = c.id;

-- 8.2 LAG and LEAD: Time-series sequential order value gap analysis
SELECT
    o.id AS order_id,
    o.created_at,
    o.total_amount,
    LAG(o.total_amount, 1) OVER (ORDER BY o.created_at) AS previous_order_amount,
    LEAD(o.total_amount, 1) OVER (ORDER BY o.created_at) AS next_order_amount,
    ROUND(o.total_amount - LAG(o.total_amount, 1) OVER (ORDER BY o.created_at), 2) AS diff_from_previous
FROM orders o
WHERE o.status != 'cancelled'
ORDER BY o.created_at;

-- 8.3 Cumulative Running Total and Category Partition Moving Aggregate
SELECT
    o.id AS order_id,
    u.full_name,
    o.created_at,
    o.total_amount,
    SUM(o.total_amount) OVER (
        PARTITION BY o.user_id
        ORDER BY o.created_at
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS user_running_total,
    ROUND(AVG(o.total_amount) OVER (
        ORDER BY o.created_at
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_3_orders
FROM orders o
JOIN users u ON o.user_id = u.id
ORDER BY o.user_id, o.created_at;
