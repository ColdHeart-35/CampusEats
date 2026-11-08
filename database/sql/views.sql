-- ============================================================================
-- CampusEats Database Views and Materialized Views
-- Encapsulating complex joins, business logic, analytics, and security projections
-- ============================================================================

-- Drop views if they already exist
DROP VIEW IF EXISTS v_popular_items CASCADE;
DROP VIEW IF EXISTS v_daily_sales_summary CASCADE;
DROP VIEW IF EXISTS v_ingredient_stock_status CASCADE;
DROP VIEW IF EXISTS v_order_details CASCADE;
DROP VIEW IF EXISTS v_menu_with_categories CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_revenue_by_category CASCADE;

-- ----------------------------------------------------------------------------
-- 1. v_menu_with_categories
-- Enriched food catalog projection combining food items with category metadata
-- ----------------------------------------------------------------------------
CREATE VIEW v_menu_with_categories AS
SELECT
    fi.id AS item_id,
    fi.name AS item_name,
    fi.description AS item_description,
    fi.price,
    fi.is_available,
    fi.is_vegetarian,
    fi.preparation_time,
    fc.id AS category_id,
    fc.name AS category_name,
    fc.image_url AS category_image_url
FROM food_items fi
JOIN food_categories fc ON fi.category_id = fc.id
WHERE fc.is_active = TRUE;

COMMENT ON VIEW v_menu_with_categories IS 'Complete active menu joined with category information';

-- ----------------------------------------------------------------------------
-- 2. v_order_details
-- Denormalized order summary for dashboard monitoring and dispatch
-- ----------------------------------------------------------------------------
CREATE VIEW v_order_details AS
SELECT
    o.id AS order_id,
    o.status AS order_status,
    o.total_amount,
    o.created_at AS ordered_at,
    o.qr_code,
    o.qr_verified,
    u.id AS user_id,
    u.full_name AS customer_name,
    u.email AS customer_email,
    u.phone AS customer_phone,
    ps.id AS slot_id,
    ps.slot_date,
    ps.start_time AS slot_start,
    ps.end_time AS slot_end,
    p.id AS payment_id,
    COALESCE(p.status, 'unpaid') AS payment_status,
    p.razorpay_payment_id,
    COALESCE(
        json_agg(
            json_build_object(
                'item_id', fi.id,
                'item_name', fi.name,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'subtotal', oi.subtotal
            )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
    ) AS items_breakdown
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN pickup_slots ps ON o.pickup_slot_id = ps.id
LEFT JOIN payments p ON o.id = p.order_id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN food_items fi ON oi.food_item_id = fi.id
GROUP BY o.id, u.id, ps.id, p.id;

COMMENT ON VIEW v_order_details IS 'Comprehensive multi-entity view of orders with JSON item aggregates and payment state';

-- ----------------------------------------------------------------------------
-- 3. v_ingredient_stock_status
-- Classified raw ingredient inventory based on dynamic safety thresholds
-- ----------------------------------------------------------------------------
CREATE VIEW v_ingredient_stock_status AS
SELECT
    i.id AS ingredient_id,
    i.name AS ingredient_name,
    i.unit,
    i.current_stock,
    i.min_stock_level,
    i.cost_per_unit,
    ROUND(i.current_stock * i.cost_per_unit, 2) AS total_holding_value,
    CASE
        WHEN i.current_stock <= (i.min_stock_level * 0.5) THEN 'CRITICAL'
        WHEN i.current_stock <= i.min_stock_level THEN 'LOW'
        WHEN i.current_stock <= (i.min_stock_level * 3.0) THEN 'ADEQUATE'
        ELSE 'SURPLUS'
    END AS stock_status,
    ROUND(GREATEST(0, (i.min_stock_level * 1.5) - i.current_stock), 2) AS suggested_reorder_qty
FROM ingredients i;

COMMENT ON VIEW v_ingredient_stock_status IS 'Inventory stock safety classification and automated reorder calculations';

-- ----------------------------------------------------------------------------
-- 4. v_daily_sales_summary
-- Daily financial and operational aggregate KPIs
-- ----------------------------------------------------------------------------
CREATE VIEW v_daily_sales_summary AS
SELECT
    DATE(o.created_at) AS sale_date,
    COUNT(DISTINCT o.id) AS total_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'picked_up' THEN o.id END) AS fulfilled_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) AS cancelled_orders,
    COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled', 'pending') THEN o.total_amount ELSE 0 END), 0.00) AS gross_revenue,
    COALESCE(SUM(oi.quantity), 0) AS total_items_sold,
    ROUND(AVG(CASE WHEN o.status NOT IN ('cancelled', 'pending') THEN o.total_amount END), 2) AS average_order_value
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY DATE(o.created_at);

COMMENT ON VIEW v_daily_sales_summary IS 'Daily executive KPIs: fulfillment rates, gross revenue, and order velocity';

-- ----------------------------------------------------------------------------
-- 5. v_popular_items
-- Food items ranked by order frequency and customer demand
-- ----------------------------------------------------------------------------
CREATE VIEW v_popular_items AS
SELECT
    fi.id AS food_item_id,
    fi.name AS item_name,
    fc.name AS category_name,
    fi.price,
    COALESCE(COUNT(oi.id), 0) AS times_ordered,
    COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
    COALESCE(SUM(oi.subtotal), 0.00) AS total_revenue,
    DENSE_RANK() OVER (ORDER BY COALESCE(SUM(oi.quantity), 0) DESC) AS popularity_rank
FROM food_items fi
JOIN food_categories fc ON fi.category_id = fc.id
LEFT JOIN order_items oi ON fi.id = oi.food_item_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
GROUP BY fi.id, fi.name, fc.name, fi.price;

COMMENT ON VIEW v_popular_items IS 'Food item popularity rank based on non-cancelled units sold';

-- ----------------------------------------------------------------------------
-- 6. mv_revenue_by_category (MATERIALIZED VIEW)
-- Precomputed analytics snapshot for high-speed dashboard reporting
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_revenue_by_category AS
SELECT
    fc.id AS category_id,
    fc.name AS category_name,
    COUNT(DISTINCT fi.id) AS total_menu_items,
    COUNT(DISTINCT oi.order_id) AS total_orders_containing_category,
    COALESCE(SUM(oi.quantity), 0) AS units_sold,
    COALESCE(SUM(oi.subtotal), 0.00) AS total_revenue,
    NOW() AS last_refreshed_at
FROM food_categories fc
LEFT JOIN food_items fi ON fc.id = fi.category_id
LEFT JOIN order_items oi ON fi.id = oi.food_item_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled', 'pending')
GROUP BY fc.id, fc.name
WITH DATA;

-- Create unique index on materialized view to allow REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_revenue_cat_id ON mv_revenue_by_category(category_id);

COMMENT ON MATERIALIZED VIEW mv_revenue_by_category IS 'Materialized revenue rollup per category. Refresh concurrently during off-peak periods or via cron.';

-- REFRESH INSTRUCTIONS:
-- To refresh materialized view synchronously:
--   REFRESH MATERIALIZED VIEW mv_revenue_by_category;
-- To refresh without locking read access (requires UNIQUE index):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_by_category;
