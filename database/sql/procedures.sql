-- ============================================================================
-- CampusEats Stored Procedures (PL/pgSQL)
-- Transaction Management, ACID compliance, Savepoints, and Inventory Operations
-- ============================================================================

-- Drop procedures if existing
DROP PROCEDURE IF EXISTS sp_process_order(UUID, INT, JSONB, TEXT);
DROP PROCEDURE IF EXISTS sp_cancel_order(UUID);
DROP PROCEDURE IF EXISTS sp_restock_ingredient(INT, DECIMAL, UUID, TEXT);
DROP PROCEDURE IF EXISTS sp_daily_inventory_report();
DROP PROCEDURE IF EXISTS sp_cleanup_expired_carts();

-- ----------------------------------------------------------------------------
-- 1. sp_process_order
-- Complete atomic order creation:
-- - Validates pickup slot capacity
-- - Verifies ingredient stock levels using SELECT FOR UPDATE
-- - Inserts order header & line items
-- - Deducts raw ingredient stock & logs inventory transactions
-- - Increments pickup slot capacity
-- - Utilizes SAVEPOINT for partial rollback protection
--
-- items JSONB format example:
-- '[{"food_item_id": 1, "quantity": 2}, {"food_item_id": 15, "quantity": 1}]'
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_process_order(
    p_user_id UUID,
    p_pickup_slot_id INT,
    p_items JSONB,
    p_special_instructions TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id UUID := gen_random_uuid();
    v_total_amount DECIMAL(10,2) := 0.00;
    v_item RECORD;
    v_item_price DECIMAL(10,2);
    v_subtotal DECIMAL(10,2);
    v_recipe RECORD;
    v_req_qty DECIMAL(10,2);
    v_curr_stock DECIMAL(10,2);
BEGIN
    -- 1. Validate User
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active = TRUE) THEN
        RAISE EXCEPTION 'Invalid or inactive user ID: %', p_user_id;
    END IF;

    -- 2. Validate and Lock Pickup Slot if specified
    IF p_pickup_slot_id IS NOT NULL THEN
        PERFORM 1 FROM pickup_slots
        WHERE id = p_pickup_slot_id AND is_active = TRUE
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Pickup slot % is inactive or does not exist', p_pickup_slot_id;
        END IF;

        IF EXISTS (
            SELECT 1 FROM pickup_slots
            WHERE id = p_pickup_slot_id AND current_count >= max_capacity
        ) THEN
            RAISE EXCEPTION 'Pickup slot % is fully booked. Please choose another slot.', p_pickup_slot_id;
        END IF;
    END IF;

    -- Define Savepoint before modifying data
    SAVEPOINT order_init_savepoint;

    -- 3. Calculate order total and validate items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(food_item_id INT, quantity INT)
    LOOP
        SELECT price INTO v_item_price
        FROM food_items
        WHERE id = v_item.food_item_id AND is_available = TRUE;

        IF NOT FOUND THEN
            ROLLBACK TO SAVEPOINT order_init_savepoint;
            RAISE EXCEPTION 'Food item % is unavailable or invalid', v_item.food_item_id;
        END IF;

        v_subtotal := v_item_price * v_item.quantity;
        v_total_amount := v_total_amount + v_subtotal;
    END LOOP;

    -- 4. Insert Order Header
    INSERT INTO orders (id, user_id, pickup_slot_id, status, total_amount, qr_code, special_instructions)
    VALUES (
        v_order_id,
        p_user_id,
        p_pickup_slot_id,
        'confirmed',
        v_total_amount,
        'QR-' || UPPER(SUBSTRING(v_order_id::TEXT, 1, 8)),
        p_special_instructions
    );

    -- 5. Insert Order Items & Deduct Inventory
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(food_item_id INT, quantity INT)
    LOOP
        SELECT price INTO v_item_price
        FROM food_items WHERE id = v_item.food_item_id;

        v_subtotal := v_item_price * v_item.quantity;

        INSERT INTO order_items (order_id, food_item_id, quantity, unit_price, subtotal)
        VALUES (v_order_id, v_item.food_item_id, v_item.quantity, v_item_price, v_subtotal);

        -- Check recipe and deduct ingredients with pessimistic locking
        FOR v_recipe IN
            SELECT ingredient_id, quantity_required
            FROM recipes
            WHERE food_item_id = v_item.food_item_id
        LOOP
            v_req_qty := v_recipe.quantity_required * v_item.quantity;

            -- Lock the ingredient record
            SELECT current_stock INTO v_curr_stock
            FROM ingredients
            WHERE id = v_recipe.ingredient_id
            FOR UPDATE;

            IF v_curr_stock < v_req_qty THEN
                ROLLBACK TO SAVEPOINT order_init_savepoint;
                RAISE EXCEPTION 'Insufficient stock for ingredient %: required %, available %',
                    v_recipe.ingredient_id, v_req_qty, v_curr_stock;
            END IF;

            -- Deduct stock
            UPDATE ingredients
            SET current_stock = current_stock - v_req_qty,
                updated_at = NOW()
            WHERE id = v_recipe.ingredient_id;

            -- Audit transaction
            INSERT INTO inventory_transactions (ingredient_id, transaction_type, quantity, reference_id, notes, created_by)
            VALUES (
                v_recipe.ingredient_id,
                'deduction',
                -v_req_qty,
                v_order_id::TEXT,
                'Portion deduction for order: ' || v_order_id::TEXT,
                p_user_id
            );
        END LOOP;
    END LOOP;

    -- 6. Update Slot Count
    IF p_pickup_slot_id IS NOT NULL THEN
        UPDATE pickup_slots
        SET current_count = current_count + 1
        WHERE id = p_pickup_slot_id;
    END IF;

    -- 7. Create Customer Notification
    INSERT INTO notifications (user_id, title, message, notification_type, reference_id)
    VALUES (
        p_user_id,
        'Order Confirmed!',
        'Your order total is ₹' || v_total_amount || '. Track status in real time.',
        'order_created',
        v_order_id::TEXT
    );

    RAISE NOTICE 'Order % successfully created and processed.', v_order_id;
END;
$$;

COMMENT ON PROCEDURE sp_process_order IS 'ACID compliant stored procedure to create order, decrement stock, and book slot';

-- ----------------------------------------------------------------------------
-- 2. sp_cancel_order
-- Safely cancels an order, restores ingredient stock, and decrements slot count
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_cancel_order(p_order_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_recipe RECORD;
    v_restore_qty DECIMAL(10,2);
BEGIN
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % does not exist', p_order_id;
    END IF;

    IF v_order.status IN ('picked_up', 'cancelled') THEN
        RAISE EXCEPTION 'Order % cannot be cancelled (current status: %)', p_order_id, v_order.status;
    END IF;

    -- 1. Mark Order as Cancelled
    UPDATE orders
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = p_order_id;

    -- 2. Restore Ingredients
    FOR v_item IN SELECT food_item_id, quantity FROM order_items WHERE order_id = p_order_id
    LOOP
        FOR v_recipe IN
            SELECT ingredient_id, quantity_required
            FROM recipes
            WHERE food_item_id = v_item.food_item_id
        LOOP
            v_restore_qty := v_recipe.quantity_required * v_item.quantity;

            UPDATE ingredients
            SET current_stock = current_stock + v_restore_qty,
                updated_at = NOW()
            WHERE id = v_recipe.ingredient_id;

            INSERT INTO inventory_transactions (ingredient_id, transaction_type, quantity, reference_id, notes, created_by)
            VALUES (
                v_recipe.ingredient_id,
                'restoration',
                v_restore_qty,
                p_order_id::TEXT,
                'Stock restored due to order cancellation',
                v_order.user_id
            );
        END LOOP;
    END LOOP;

    -- 3. Release Pickup Slot Capacity
    IF v_order.pickup_slot_id IS NOT NULL THEN
        UPDATE pickup_slots
        SET current_count = GREATEST(0, current_count - 1)
        WHERE id = v_order.pickup_slot_id;
    END IF;

    -- 4. Notify User
    INSERT INTO notifications (user_id, title, message, notification_type, reference_id)
    VALUES (
        v_order.user_id,
        'Order Cancelled',
        'Your order #' || SUBSTRING(p_order_id::TEXT, 1, 8) || ' has been cancelled.',
        'order_cancelled',
        p_order_id::TEXT
    );

    RAISE NOTICE 'Order % successfully cancelled and inventory restored.', p_order_id;
END;
$$;

COMMENT ON PROCEDURE sp_cancel_order IS 'Cancels active order, reverses inventory consumption, and decrements slot count';

-- ----------------------------------------------------------------------------
-- 3. sp_restock_ingredient
-- Admin / Staff procedure to record batch supply arrivals
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_restock_ingredient(
    p_ingredient_id INT,
    p_qty DECIMAL(10,2),
    p_user_id UUID,
    p_notes TEXT DEFAULT 'Routine Stock Restocking'
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_qty <= 0 THEN
        RAISE EXCEPTION 'Restock quantity must be positive: %', p_qty;
    END IF;

    -- Update inventory stock
    UPDATE ingredients
    SET current_stock = current_stock + p_qty,
        updated_at = NOW()
    WHERE id = p_ingredient_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ingredient % does not exist', p_ingredient_id;
    END IF;

    -- Log transaction
    INSERT INTO inventory_transactions (ingredient_id, transaction_type, quantity, reference_id, notes, created_by)
    VALUES (
        p_ingredient_id,
        'restock',
        p_qty,
        'RESTOCK-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
        p_notes,
        p_user_id
    );

    RAISE NOTICE 'Ingredient % restocked by % units.', p_ingredient_id, p_qty;
END;
$$;

COMMENT ON PROCEDURE sp_restock_ingredient IS 'Restocks ingredient quantity with full ledger audit';

-- ----------------------------------------------------------------------------
-- 4. sp_daily_inventory_report
-- Generates automated operational notifications for staff summarizing stock status
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_daily_inventory_report()
LANGUAGE plpgsql
AS $$
DECLARE
    v_critical_count INT;
    v_admin_id UUID;
    v_report_summary TEXT;
BEGIN
    SELECT COUNT(*) INTO v_critical_count
    FROM ingredients
    WHERE current_stock <= min_stock_level;

    -- Find an administrator user
    SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;

    IF v_admin_id IS NOT NULL THEN
        v_report_summary := 'Daily Inventory Check: ' || v_critical_count ||
                            ' ingredient(s) are currently at or below their safety stock levels.';

        INSERT INTO notifications (user_id, title, message, notification_type, reference_id)
        VALUES (
            v_admin_id,
            'Daily Inventory Summary',
            v_report_summary,
            'inventory_report',
            'REPORT-' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
        );
    END IF;
END;
$$;

COMMENT ON PROCEDURE sp_daily_inventory_report IS 'Daily automated inventory status scan and alert dispatcher';

-- ----------------------------------------------------------------------------
-- 5. sp_cleanup_expired_carts
-- Purges pending unfulfilled orders older than 2 hours to avoid stale locks
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_cleanup_expired_carts()
LANGUAGE plpgsql
AS $$
DECLARE
    v_cancelled_count INT;
BEGIN
    WITH ExpiredOrders AS (
        UPDATE orders
        SET status = 'cancelled', updated_at = NOW()
        WHERE status = 'pending'
          AND created_at < NOW() - INTERVAL '2 hours'
        RETURNING id, pickup_slot_id
    )
    SELECT COUNT(*) INTO v_cancelled_count FROM ExpiredOrders;

    RAISE NOTICE 'Expired carts cleaned up: % orders set to cancelled.', v_cancelled_count;
END;
$$;

COMMENT ON PROCEDURE sp_cleanup_expired_carts IS 'Housekeeping routine purging stale unpaid cart reservations';
