-- ============================================================================
-- CampusEats Database Schema (DDL)
-- Production & Academic Grade Relational Schema for PostgreSQL 16
-- Incorporates pgvector, pg_trgm, UUIDs, Integrity Constraints, and Audit Fields
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Idempotency: Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS pickup_slots CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS food_items CASCADE;
DROP TABLE IF EXISTS food_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Manages authentication, identity, and role-based access (student, staff, admin)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS 'User accounts with role-based access control and contact information';
COMMENT ON COLUMN users.id IS 'Universally unique identifier for each user';
COMMENT ON COLUMN users.role IS 'User permission level: student (ordering), staff (canteen ops), admin (analytics & config)';

-- ----------------------------------------------------------------------------
-- 2. FOOD CATEGORIES TABLE
-- Classifies food items into cuisines and course types
-- ----------------------------------------------------------------------------
CREATE TABLE food_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE food_categories IS 'Canteen food groupings (e.g., South Indian, Beverages, Snacks)';

-- ----------------------------------------------------------------------------
-- 3. FOOD ITEMS TABLE
-- Core menu catalog containing item pricing, dietary tags, and vector embeddings
-- ----------------------------------------------------------------------------
CREATE TABLE food_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES food_categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    preparation_time INTEGER DEFAULT 15, -- Estimated time in minutes
    embedding vector(384),              -- 384-dimensional dense semantic embedding (all-MiniLM-L6-v2)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE food_items IS 'Food item menu catalog with prices, veg flags, prep time, and pgvector embeddings';
COMMENT ON COLUMN food_items.embedding IS 'Dense semantic vector embedding (384-dim) for natural language semantic search';

-- ----------------------------------------------------------------------------
-- 4. INGREDIENTS TABLE
-- Raw materials tracked for stock control, reordering, and recipe consumption
-- ----------------------------------------------------------------------------
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    unit VARCHAR(20) NOT NULL,          -- e.g., kg, g, ml, l, pcs
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock_level DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_per_unit DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ingredients IS 'Raw ingredient inventory tracking physical stock, reorder levels, and unit cost';

-- ----------------------------------------------------------------------------
-- 5. RECIPES TABLE (Bill of Materials)
-- Bridges food items and ingredients (Many-to-Many associative entity)
-- ----------------------------------------------------------------------------
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    food_item_id INTEGER NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10,2) NOT NULL CHECK (quantity_required > 0),
    CONSTRAINT uq_recipe_item_ingredient UNIQUE(food_item_id, ingredient_id)
);

COMMENT ON TABLE recipes IS 'Bill of Materials (BOM) linking menu dishes to required ingredient quantities';

-- ----------------------------------------------------------------------------
-- 6. PICKUP SLOTS TABLE
-- Time slot allocation to prevent canteen queue congestion and balance kitchen load
-- ----------------------------------------------------------------------------
CREATE TABLE pickup_slots (
    id SERIAL PRIMARY KEY,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
    current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_slot_schedule UNIQUE(slot_date, start_time, end_time),
    CONSTRAINT chk_slot_capacity CHECK(current_count <= max_capacity)
);

COMMENT ON TABLE pickup_slots IS 'Scheduled delivery/pickup windows with enforced queue capacity bounds';

-- ----------------------------------------------------------------------------
-- 7. ORDERS TABLE
-- High-level transaction header for student pre-orders
-- ----------------------------------------------------------------------------
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    pickup_slot_id INTEGER REFERENCES pickup_slots(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'confirmed', 'accepted', 'preparing', 'ready', 'picked_up', 'cancelled')
    ),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    qr_code TEXT,
    qr_verified BOOLEAN DEFAULT FALSE,
    special_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE orders IS 'Customer pre-orders with state machine tracking and QR verification flags';

-- ----------------------------------------------------------------------------
-- 8. ORDER ITEMS TABLE
-- Line items belonging to each customer order
-- ----------------------------------------------------------------------------
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    food_item_id INTEGER NOT NULL REFERENCES food_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL
);

COMMENT ON TABLE order_items IS 'Line items capturing quantity and locked historical pricing per order item';

-- ----------------------------------------------------------------------------
-- 9. PAYMENTS TABLE
-- Gateway payment records mapped 1-to-1 with orders
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) UNIQUE,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (
        status IN ('created', 'authorized', 'captured', 'failed', 'refunded')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payments IS 'Payment transaction log interfacing with Razorpay payment gateway';

-- ----------------------------------------------------------------------------
-- 10. INVENTORY TRANSACTIONS TABLE
-- Immutable ledger of all stock mutations (restock, deductions, restorations)
-- ----------------------------------------------------------------------------
CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (
        transaction_type IN ('restock', 'deduction', 'adjustment', 'restoration')
    ),
    quantity DECIMAL(10,2) NOT NULL,    -- Positive for additions, negative or absolute according to context
    reference_id VARCHAR(100),          -- Order ID, purchase order, or manual reason
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inventory_transactions IS 'Immutable inventory audit trail and stock ledger';

-- ----------------------------------------------------------------------------
-- 11. NOTIFICATIONS TABLE
-- Real-time and persistent alerts sent to users
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    reference_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'User alerts for order milestones, low stock warnings, and kitchen updates';
