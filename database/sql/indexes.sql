-- ============================================================================
-- CampusEats Physical Indexing Strategy
-- Optimized Access Paths: B-Trees, Partial, Composite, Inverted (GIN), Trigram, and HNSW Vector
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FOREIGN KEY B-TREE INDEXES
-- PostgreSQL does not automatically index foreign keys. Without these, JOINs and
-- parent-table DELETE/UPDATE operations incur expensive sequential table scans.
-- ----------------------------------------------------------------------------

-- Indexes on Food Items
CREATE INDEX idx_food_items_category_id ON food_items(category_id);
COMMENT ON INDEX idx_food_items_category_id IS 'Speeds up category menu lookups and enforces FK checks on food_categories';

-- Indexes on Recipes (Many-to-Many bridge)
CREATE INDEX idx_recipes_food_item_id ON recipes(food_item_id);
CREATE INDEX idx_recipes_ingredient_id ON recipes(ingredient_id);
COMMENT ON INDEX idx_recipes_food_item_id IS 'Accelerates BOM retrieval for kitchen preparation and cost calculations';
COMMENT ON INDEX idx_recipes_ingredient_id IS 'Accelerates reverse lookup: finding which dishes are impacted when an ingredient changes';

-- Indexes on Orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_pickup_slot_id ON orders(pickup_slot_id);
COMMENT ON INDEX idx_orders_user_id IS 'Accelerates student order history retrieval';
COMMENT ON INDEX idx_orders_pickup_slot_id IS 'Accelerates slot aggregation and order fulfillment queues';

-- Indexes on Order Items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_food_item_id ON order_items(food_item_id);

-- Indexes on Payments
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Indexes on Notifications
CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, is_read);
COMMENT ON INDEX idx_notifications_user_id_read IS 'Composite index for instant fetching of unread user notifications';


-- ----------------------------------------------------------------------------
-- 2. COMPOSITE B-TREE INDEXES
-- Designed for queries filtering or sorting across multiple correlated columns
-- ----------------------------------------------------------------------------

-- Orders: Composite on (user_id, status)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
COMMENT ON INDEX idx_orders_user_status IS 'Optimizes user dashboard queries filtering active vs past orders for a specific user';

-- Order Items: Composite on (order_id, food_item_id)
CREATE INDEX idx_order_items_order_food ON order_items(order_id, food_item_id);
COMMENT ON INDEX idx_order_items_order_food IS 'Accelerates invoice detail lookups and prevents duplicate line queries';

-- Inventory Transactions: Composite on (ingredient_id, created_at)
CREATE INDEX idx_inv_trans_ingredient_created ON inventory_transactions(ingredient_id, created_at DESC);
COMMENT ON INDEX idx_inv_trans_ingredient_created IS 'Enables rapid chronological audit trail rendering per ingredient';

-- Pickup Slots: Composite on (slot_date, is_active)
CREATE INDEX idx_pickup_slots_date_active ON pickup_slots(slot_date, is_active);
COMMENT ON INDEX idx_pickup_slots_date_active IS 'Fast lookup of available reservation slots for a chosen booking date';


-- ----------------------------------------------------------------------------
-- 3. PARTIAL INDEXES (Filtered B-Trees)
-- Dramatically reduces index size and write overhead by indexing only relevant subsets
-- ----------------------------------------------------------------------------

-- Active Orders Partial Index: Excludes terminal statuses ('picked_up', 'cancelled')
-- Only ~5-10% of total lifetime orders will be active at any given moment
CREATE INDEX idx_orders_active_queue
ON orders(created_at ASC)
WHERE status NOT IN ('picked_up', 'cancelled');

COMMENT ON INDEX idx_orders_active_queue IS 'Partial index for the live kitchen display system (KDS) containing only active orders';

-- Critical Ingredients Partial Index
CREATE INDEX idx_ingredients_low_stock
ON ingredients(id, current_stock, min_stock_level)
WHERE current_stock <= min_stock_level;

COMMENT ON INDEX idx_ingredients_low_stock IS 'Partial index for the daily reorder scan and dashboard low-stock widget';


-- ----------------------------------------------------------------------------
-- 4. GENERALIZED INVERTED INDEX (GIN) FOR FULL-TEXT SEARCH (FTS)
-- Precomputed lexeme inverted index for natural language document matching
-- ----------------------------------------------------------------------------

CREATE INDEX idx_food_items_fts_gin ON food_items USING gin(
    (
        setweight(to_tsvector('english', name), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B')
    )
);

COMMENT ON INDEX idx_food_items_fts_gin IS 'GIN expression index for ranked English text search over dish titles and descriptions';


-- ----------------------------------------------------------------------------
-- 5. TRIGRAM (pg_trgm) GIN INDEX FOR FUZZY & TYPO-TOLERANT SEARCH
-- Breaks text into 3-character n-grams. Allows fast LIKE ''%term%'', ILIKE, and % operator
-- ----------------------------------------------------------------------------

CREATE INDEX idx_food_items_name_trgm_gin ON food_items USING gin(name gin_trgm_ops);
CREATE INDEX idx_ingredients_name_trgm_gin ON ingredients USING gin(name gin_trgm_ops);

COMMENT ON INDEX idx_food_items_name_trgm_gin IS 'Trigram index enabling substring matching and spelling error tolerance on dish names';


-- ----------------------------------------------------------------------------
-- 6. DENSE VECTOR INDEX (pgvector HNSW - Hierarchical Navigable Small World)
-- Fast approximate nearest neighbor (ANN) search over 384-dimensional embeddings
-- HNSW offers superior QPS and recall compared to IVFFlat without requiring training
-- ----------------------------------------------------------------------------

CREATE INDEX idx_food_items_embedding_hnsw ON food_items USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX idx_food_items_embedding_hnsw IS 'HNSW vector cosine distance index for real-time semantic menu discovery';
