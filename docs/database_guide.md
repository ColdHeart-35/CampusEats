# CampusEats — Database Operations & Administration Guide

This guide covers PostgreSQL database lifecycle administration for **CampusEats**: container orchestration, connecting via `psql`, script loading order, verification checks, backup/restore, and Alembic database migrations.

---

## 1. Starting the Database Container

The primary database runs as `campuseats-postgres` using the official `ankane/pgvector:v0.7.4-pg16` image on port `5432`.

To start the database:
```bash
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats
docker compose up -d postgres
```

Verify the container is healthy:
```bash
docker exec -it campuseats-postgres pg_isready -U campuseats -d campuseats_db
# Output: /var/run/postgresql:5432 - accepting connections
```

---

## 2. Connecting with `psql`

### 2.1 Interactive Terminal inside Docker
```bash
docker exec -it campuseats-postgres psql -U campuseats -d campuseats_db
```

### 2.2 Native Host Client Connection
If you have `postgresql` installed on Fedora (`sudo dnf install postgresql`):
```bash
psql -h localhost -p 5432 -U campuseats -d campuseats_db
# Password: campuseats_pass
```

### 2.3 Graphical Tools (DBeaver, pgAdmin, VSCode)
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `campuseats_db`
- **Username**: `campuseats`
- **Password**: `campuseats_pass`

---

## 3. Executing Database Scripts in Order

All relational scripts reside in `database/sql/`. Because of foreign key dependencies, triggers, and function requirements, execute them in the following sequence:

```bash
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats

# 1. Base DDL Schema (Extensions, Tables, Constraints)
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/schema.sql

# 2. Seed Data (Categories, Food Items, Ingredients, Recipes, Users, Slots)
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/sample_data.sql

# 3. Physical Indexes (B-Tree, Partial, Composite, GIN, HNSW Vector)
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/indexes.sql

# 4. Triggers (Updated timestamps, Order state validator, Stock deduction alerts)
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/triggers.sql

# 5. Computational Stored Functions
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/functions.sql

# 6. Transactional Stored Procedures (ACID Order Processing, Restock)
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/procedures.sql

# 7. Views & Materialized Views (Analytics and reporting)
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/views.sql

# 8. Full-Text Search Configurations & Trigram Dictionaries
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/full_text_search.sql
```

---

## 4. Verification & Health Audit Queries

Launch `psql` and run these verification queries to confirm proper database initialization:

```sql
-- 1. Check that all 11 tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- Expected: 11 tables (food_categories, food_items, ingredients, inventory_transactions,
--                    notifications, order_items, orders, payments, pickup_slots, recipes, users)

-- 2. Verify row counts in seed data
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'food_categories', COUNT(*) FROM food_categories
UNION ALL SELECT 'food_items', COUNT(*) FROM food_items
UNION ALL SELECT 'ingredients', COUNT(*) FROM ingredients
UNION ALL SELECT 'recipes', COUNT(*) FROM recipes
UNION ALL SELECT 'pickup_slots', COUNT(*) FROM pickup_slots;

-- 3. Verify pgvector extension is installed
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
-- Expected: vector | 0.7.4

-- 4. Verify triggers are attached
SELECT event_object_table, trigger_name 
FROM information_schema.triggers 
ORDER BY event_object_table;

-- 5. Test a Stored Function
SELECT fn_calculate_order_total('f47ac10b-58cc-4372-a567-0e02b2c3d479');

-- 6. Test a View
SELECT * FROM v_popular_items LIMIT 5;
```

---

## 5. Working with Alembic Migrations (Alternative)

For developers managing incremental schema changes via Python models rather than raw SQL files:

### 5.1 Initialize & Apply Migrations
```bash
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/backend
source venv/bin/activate

# Apply all available database revisions
alembic upgrade head
```

### 5.2 Generating a New Migration
Whenever you modify an SQLAlchemy model in `backend/app/models/`:
```bash
# Auto-generate migration revision script comparing models with live DB
alembic revision --autogenerate -m "add_allergen_info_to_food_items"

# Inspect generated file in backend/alembic/versions/
# Apply the revision:
alembic upgrade head
```

### 5.3 Rollback / Downgrade
```bash
# Roll back the most recent migration:
alembic downgrade -1

# Roll back to baseline:
alembic downgrade base
```

---

## 6. Backup and Restoration

### Backup Database (Logical Dump)
```bash
docker exec -t campuseats-postgres pg_dump -U campuseats -d campuseats_db -F c -b -v -f /tmp/campuseats_backup.dump
docker cp campuseats-postgres:/tmp/campuseats_backup.dump ./campuseats_backup.dump
```

### Restore Database from Dump
```bash
docker cp ./campuseats_backup.dump campuseats-postgres:/tmp/campuseats_backup.dump
docker exec -i campuseats-postgres pg_restore -U campuseats -d campuseats_db -v --clean /tmp/campuseats_backup.dump
```
