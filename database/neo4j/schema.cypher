// ============================================================================
// CampusEats Neo4j Graph Database Schema & Constraints
// Neo4j 5.x Cypher DDL: Uniqueness Constraints and Property Indexes
// ============================================================================

// ----------------------------------------------------------------------------
// 1. UNIQUENESS CONSTRAINTS
// Enforce global uniqueness and automatically create underlying B-Tree indexes
// ----------------------------------------------------------------------------

// Student unique constraint on user_id (matches PostgreSQL users.id)
CREATE CONSTRAINT cst_student_user_id IF NOT EXISTS
FOR (s:Student)
REQUIRE s.user_id IS UNIQUE;

// FoodItem unique constraint on item_id (matches PostgreSQL food_items.id)
CREATE CONSTRAINT cst_food_item_id IF NOT EXISTS
FOR (f:FoodItem)
REQUIRE f.item_id IS UNIQUE;

// Ingredient unique constraint on ingredient_id (matches PostgreSQL ingredients.id)
CREATE CONSTRAINT cst_ingredient_id IF NOT EXISTS
FOR (i:Ingredient)
REQUIRE i.ingredient_id IS UNIQUE;

// Category unique constraint on category name (matches PostgreSQL food_categories.name)
CREATE CONSTRAINT cst_category_name IF NOT EXISTS
FOR (c:Category)
REQUIRE c.name IS UNIQUE;


// ----------------------------------------------------------------------------
// 2. SECONDARY LOOKUP INDEXES
// Fast point and range queries on frequently searched properties
// ----------------------------------------------------------------------------

// Index on Student email and full name
CREATE INDEX idx_student_email IF NOT EXISTS
FOR (s:Student)
ON (s.email);

CREATE INDEX idx_student_name IF NOT EXISTS
FOR (s:Student)
ON (s.name);

// Index on FoodItem name, price, and vegetarian flag
CREATE INDEX idx_food_item_name IF NOT EXISTS
FOR (f:FoodItem)
ON (f.name);

CREATE INDEX idx_food_item_veg IF NOT EXISTS
FOR (f:FoodItem)
ON (f.is_vegetarian);

CREATE INDEX idx_food_item_price IF NOT EXISTS
FOR (f:FoodItem)
ON (f.price);

// Index on Ingredient name
CREATE INDEX idx_ingredient_name IF NOT EXISTS
FOR (i:Ingredient)
ON (i.name);
