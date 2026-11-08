-- ============================================================================
-- CampusEats Stored Functions (PL/pgSQL & SQL)
-- Encapsulating computational business logic, calculations, and security wrappers
-- ============================================================================

-- Drop functions if existing
DROP FUNCTION IF EXISTS fn_calculate_order_total(UUID);
DROP FUNCTION IF EXISTS fn_check_ingredient_availability(INT, INT);
DROP FUNCTION IF EXISTS fn_get_food_item_cost(INT);
DROP FUNCTION IF EXISTS fn_get_revenue_by_period(DATE, DATE);
DROP FUNCTION IF EXISTS fn_get_popular_items(INT);
DROP FUNCTION IF EXISTS fn_search_food_items(TEXT);

-- ----------------------------------------------------------------------------
-- 1. fn_calculate_order_total
-- Computes the true sum of all line item subtotals for a given order
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calculate_order_total(p_order_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(subtotal), 0.00)
    INTO v_total
    FROM order_items
    WHERE order_id = p_order_id;

    RETURN v_total;
END;
$$;

COMMENT ON FUNCTION fn_calculate_order_total(UUID) IS 'Computes the grand total for an order by summing all order items';

-- ----------------------------------------------------------------------------
-- 2. fn_check_ingredient_availability
-- Verifies whether sufficient raw stock exists to prepare N portions of a dish
-- Returns TRUE if all required ingredients satisfy: current_stock >= (quantity_required * portions)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_ingredient_availability(
    p_food_item_id INT,
    p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_insufficient_count INT;
BEGIN
    -- Check if item has recipe entries
    IF NOT EXISTS (SELECT 1 FROM recipes WHERE food_item_id = p_food_item_id) THEN
        -- If no recipe is defined, default to available
        RETURN TRUE;
    END IF;

    -- Count any ingredient where required amount exceeds current stock
    SELECT COUNT(*)
    INTO v_insufficient_count
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.food_item_id = p_food_item_id
      AND i.current_stock < (r.quantity_required * p_quantity);

    RETURN (v_insufficient_count = 0);
END;
$$;

COMMENT ON FUNCTION fn_check_ingredient_availability(INT, INT) IS 'Validates ingredient inventory levels against recipe BOM requirements';

-- ----------------------------------------------------------------------------
-- 3. fn_get_food_item_cost
-- Calculates raw food production cost based on ingredient Bill of Materials
-- Cost = SUM(quantity_required * cost_per_unit)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_food_item_cost(p_food_item_id INT)
RETURNS DECIMAL(10,4)
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(SUM(r.quantity_required * i.cost_per_unit), 0.0000)
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.food_item_id = p_food_item_id;
$$;

COMMENT ON FUNCTION fn_get_food_item_cost(INT) IS 'Calculates marginal ingredient cost of a menu item from recipe quantities';

-- ----------------------------------------------------------------------------
-- 4. fn_get_revenue_by_period
-- Aggregates captured sales revenue between two dates (inclusive)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_revenue_by_period(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    period_start DATE,
    period_end DATE,
    total_orders BIGINT,
    total_revenue DECIMAL(10,2),
    avg_ticket_size DECIMAL(10,2)
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p_start_date,
        p_end_date,
        COUNT(DISTINCT o.id),
        COALESCE(SUM(o.total_amount), 0.00),
        ROUND(COALESCE(AVG(o.total_amount), 0.00), 2)
    FROM orders o
    WHERE DATE(o.created_at) BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'pending');
END;
$$;

COMMENT ON FUNCTION fn_get_revenue_by_period(DATE, DATE) IS 'Computes financial KPI metrics across a specified date interval';

-- ----------------------------------------------------------------------------
-- 5. fn_get_popular_items
-- Returns the top N most frequently ordered food items
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_popular_items(p_limit_count INT DEFAULT 5)
RETURNS TABLE (
    item_id INT,
    item_name VARCHAR(200),
    category_name VARCHAR(100),
    price DECIMAL(10,2),
    units_sold BIGINT,
    gross_revenue DECIMAL(10,2)
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        fi.id,
        fi.name,
        fc.name,
        fi.price,
        COALESCE(SUM(oi.quantity), 0) AS units_sold,
        COALESCE(SUM(oi.subtotal), 0.00) AS gross_revenue
    FROM food_items fi
    JOIN food_categories fc ON fi.category_id = fc.id
    LEFT JOIN order_items oi ON fi.id = oi.food_item_id
    LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
    GROUP BY fi.id, fi.name, fc.name, fi.price
    ORDER BY units_sold DESC, gross_revenue DESC
    LIMIT p_limit_count;
$$;

COMMENT ON FUNCTION fn_get_popular_items(INT) IS 'Fetches top N bestselling menu items';

-- ----------------------------------------------------------------------------
-- 6. fn_search_food_items
-- Performs ranked full-text search against food item names, descriptions, and categories
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_search_food_items(p_search_term TEXT)
RETURNS TABLE (
    item_id INT,
    item_name VARCHAR(200),
    description TEXT,
    category_name VARCHAR(100),
    price DECIMAL(10,2),
    is_available BOOLEAN,
    is_vegetarian BOOLEAN,
    rank_score REAL
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_query tsquery;
BEGIN
    -- Parse user plain text into prefix-aware tsquery
    v_query := plainto_tsquery('english', p_search_term);

    RETURN QUERY
    SELECT
        fi.id,
        fi.name,
        fi.description,
        fc.name,
        fi.price,
        fi.is_available,
        fi.is_vegetarian,
        ts_rank(
            setweight(to_tsvector('english', fi.name), 'A') ||
            setweight(to_tsvector('english', COALESCE(fi.description, '')), 'B') ||
            setweight(to_tsvector('english', fc.name), 'C'),
            v_query
        ) AS rank_score
    FROM food_items fi
    JOIN food_categories fc ON fi.category_id = fc.id
    WHERE (
        setweight(to_tsvector('english', fi.name), 'A') ||
        setweight(to_tsvector('english', COALESCE(fi.description, '')), 'B') ||
        setweight(to_tsvector('english', fc.name), 'C')
    ) @@ v_query
    ORDER BY rank_score DESC, fi.price ASC;
END;
$$;

COMMENT ON FUNCTION fn_search_food_items(TEXT) IS 'Full-text search engine across food menu items with relevance ranking';
