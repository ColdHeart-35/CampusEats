-- ============================================================================
-- CampusEats Database Triggers & Event Handlers
-- Automated Business Rule Enforcement, Audit Logging, and Integrity Protection
-- ============================================================================

-- Drop triggers if existing
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP TRIGGER IF EXISTS trg_food_items_updated_at ON food_items;
DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS trg_ingredients_updated_at ON ingredients;
DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;

DROP TRIGGER IF EXISTS trg_validate_order_status ON orders;
DROP TRIGGER IF EXISTS trg_check_slot_capacity ON orders;
DROP TRIGGER IF EXISTS trg_log_inventory_change ON ingredients;
DROP TRIGGER IF EXISTS trg_update_food_availability ON ingredients;
DROP TRIGGER IF EXISTS trg_notify_low_stock ON ingredients;

DROP FUNCTION IF EXISTS fn_trg_set_updated_at();
DROP FUNCTION IF EXISTS fn_trg_validate_order_status();
DROP FUNCTION IF EXISTS fn_trg_check_slot_capacity();
DROP FUNCTION IF EXISTS fn_trg_log_inventory_change();
DROP FUNCTION IF EXISTS fn_trg_update_food_availability();
DROP FUNCTION IF EXISTS fn_trg_notify_low_stock();

-- ----------------------------------------------------------------------------
-- 1. trg_update_timestamp
-- Auto-updates the updated_at timestamp column whenever a record is modified
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_trg_set_updated_at();

CREATE TRIGGER trg_food_items_updated_at
BEFORE UPDATE ON food_items
FOR EACH ROW EXECUTE FUNCTION fn_trg_set_updated_at();

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION fn_trg_set_updated_at();

CREATE TRIGGER trg_ingredients_updated_at
BEFORE UPDATE ON ingredients
FOR EACH ROW EXECUTE FUNCTION fn_trg_set_updated_at();

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION fn_trg_set_updated_at();


-- ----------------------------------------------------------------------------
-- 2. trg_validate_order_status
-- Enforces valid state machine transitions for order lifecycles:
-- pending -> confirmed -> accepted -> preparing -> ready -> picked_up
-- Any active state -> cancelled
-- Terminal states (picked_up, cancelled) cannot transition
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_validate_order_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- No change in status
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Cannot change terminal states
    IF OLD.status IN ('picked_up', 'cancelled') THEN
        RAISE EXCEPTION 'Illegal state transition: Order % is in terminal state %',
            OLD.id, OLD.status;
    END IF;

    -- Valid Transitions
    IF OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled') THEN
        RETURN NEW;
    ELSIF OLD.status = 'confirmed' AND NEW.status IN ('accepted', 'cancelled') THEN
        RETURN NEW;
    ELSIF OLD.status = 'accepted' AND NEW.status IN ('preparing', 'cancelled') THEN
        RETURN NEW;
    ELSIF OLD.status = 'preparing' AND NEW.status IN ('ready', 'cancelled') THEN
        RETURN NEW;
    ELSIF OLD.status = 'ready' AND NEW.status IN ('picked_up', 'cancelled') THEN
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Invalid order status transition from % to % for order %',
            OLD.status, NEW.status, OLD.id;
    END IF;
END;
$$;

CREATE TRIGGER trg_validate_order_status
BEFORE UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION fn_trg_validate_order_status();


-- ----------------------------------------------------------------------------
-- 3. trg_check_slot_capacity
-- Prevents overbooking pickup slots before an order reservation is placed
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_check_slot_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_cap INT;
    v_cnt INT;
    v_active BOOLEAN;
BEGIN
    -- Only check if slot is assigned or changed
    IF NEW.pickup_slot_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.pickup_slot_id IS DISTINCT FROM NEW.pickup_slot_id) THEN
        SELECT max_capacity, current_count, is_active
        INTO v_cap, v_cnt, v_active
        FROM pickup_slots
        WHERE id = NEW.pickup_slot_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Pickup slot % does not exist', NEW.pickup_slot_id;
        END IF;

        IF NOT v_active THEN
            RAISE EXCEPTION 'Pickup slot % is currently marked inactive', NEW.pickup_slot_id;
        END IF;

        IF v_cnt >= v_cap THEN
            RAISE EXCEPTION 'Pickup slot % is at maximum capacity (% / %)',
                NEW.pickup_slot_id, v_cnt, v_cap;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_slot_capacity
BEFORE INSERT OR UPDATE OF pickup_slot_id ON orders
FOR EACH ROW EXECUTE FUNCTION fn_trg_check_slot_capacity();


-- ----------------------------------------------------------------------------
-- 4. trg_log_inventory_change
-- Automatically logs untracked manual inventory adjustments
-- (Triggers when current_stock is directly altered via UPDATE without explicit transaction log)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_log_inventory_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_delta DECIMAL(10,2);
BEGIN
    IF OLD.current_stock IS DISTINCT FROM NEW.current_stock THEN
        v_delta := NEW.current_stock - OLD.current_stock;

        -- Check if an inventory transaction was created in this same statement/second
        IF NOT EXISTS (
            SELECT 1 FROM inventory_transactions
            WHERE ingredient_id = NEW.id
              AND created_at >= NOW() - INTERVAL '1 second'
        ) THEN
            INSERT INTO inventory_transactions (
                ingredient_id,
                transaction_type,
                quantity,
                reference_id,
                notes,
                created_by
            ) VALUES (
                NEW.id,
                'adjustment',
                v_delta,
                'AUTO-TRG-ADJUST',
                'Automatic trigger adjustment: stock changed from ' || OLD.current_stock || ' to ' || NEW.current_stock,
                NULL
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_inventory_change
AFTER UPDATE OF current_stock ON ingredients
FOR EACH ROW EXECUTE FUNCTION fn_trg_log_inventory_change();


-- ----------------------------------------------------------------------------
-- 5. trg_update_food_availability
-- Automatically sets food_items.is_available = FALSE when any required ingredient reaches 0
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_update_food_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If stock falls to 0 or below minimum requirement
    IF NEW.current_stock <= 0 THEN
        UPDATE food_items
        SET is_available = FALSE, updated_at = NOW()
        WHERE id IN (
            SELECT food_item_id FROM recipes WHERE ingredient_id = NEW.id
        )
        AND is_available = TRUE;
    ELSIF OLD.current_stock <= 0 AND NEW.current_stock > 0 THEN
        -- Check if all ingredients for these dishes are now satisfied
        UPDATE food_items fi
        SET is_available = TRUE, updated_at = NOW()
        WHERE fi.id IN (
            SELECT food_item_id FROM recipes WHERE ingredient_id = NEW.id
        )
        AND fi.is_available = FALSE
        AND NOT EXISTS (
            SELECT 1 FROM recipes r
            JOIN ingredients i ON r.ingredient_id = i.id
            WHERE r.food_item_id = fi.id
              AND i.current_stock < r.quantity_required
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_food_availability
AFTER UPDATE OF current_stock ON ingredients
FOR EACH ROW EXECUTE FUNCTION fn_trg_update_food_availability();


-- ----------------------------------------------------------------------------
-- 6. trg_notify_low_stock
-- Automatically dispatches a notification to staff/admin when an ingredient breaches safety threshold
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_staff_id UUID;
BEGIN
    -- Only trigger when crossing downward below min_stock_level
    IF NEW.current_stock <= NEW.min_stock_level AND OLD.current_stock > NEW.min_stock_level THEN
        -- Send alert to all active canteen staff and admin users
        FOR v_staff_id IN
            SELECT id FROM users WHERE role IN ('staff', 'admin') AND is_active = TRUE
        LOOP
            INSERT INTO notifications (user_id, title, message, notification_type, reference_id)
            VALUES (
                v_staff_id,
                'Low Stock Alert: ' || NEW.name,
                'Ingredient "' || NEW.name || '" stock is down to ' || NEW.current_stock || ' ' || NEW.unit ||
                ' (Safety minimum: ' || NEW.min_stock_level || ' ' || NEW.unit || '). Please arrange reorder.',
                'low_stock',
                'ING-' || NEW.id
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_low_stock
AFTER UPDATE OF current_stock ON ingredients
FOR EACH ROW EXECUTE FUNCTION fn_trg_notify_low_stock();
