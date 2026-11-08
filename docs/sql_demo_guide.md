# CampusEats — SQL Practical Demonstration & Viva Guide

This guide is designed for **college laboratory evaluations, academic project viva-voce examinations, and technical demonstrations**. It outlines step-by-step instructions for demonstrating each core DBMS concept in PostgreSQL using the provided SQL files, accompanied by key queries, expected outputs, and execution plan explanations.

---

## 1. Connecting to the Database for the Demonstration

Before beginning your demonstration, ensure the Docker database container is running and open an interactive `psql` session:

```bash
# Connect to the running PostgreSQL container via psql
docker exec -it campuseats-postgres psql -U campuseats -d campuseats_db
```

Turn on query execution timing and clean formatting:
```sql
\timing on
\x auto
```

---

## 2. Order of Execution for Demonstration Files

If you need to reload or run all SQL files from scratch during the presentation:

```bash
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats

docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/schema.sql
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/sample_data.sql
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/indexes.sql
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/triggers.sql
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/functions.sql
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/procedures.sql
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/views.sql
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/full_text_search.sql
```

---

## 3. Demonstrating Key DBMS Concepts (Step-by-Step)

### Demo 1: Table Constraints & Entity Integrity (from `schema.sql`)
- **Concept**: Demonstrating that check constraints and foreign keys protect relational integrity.
- **Query 1 (Negative Test — Check constraint violation)**:
  ```sql
  -- Try to insert a dish with a negative price (violates CHECK (price > 0))
  INSERT INTO food_items (category_id, name, price) 
  VALUES (1, 'Illegal Free Dosa', -25.00);
  ```
  **Expected Output**:
  ```text
  ERROR:  new row for relation "food_items" violates check constraint "food_items_price_check"
  DETAIL:  Failing row contains (..., Illegal Free Dosa, ..., -25.00, ...).
  ```
- **Query 2 (Foreign Key Cascade)**:
  ```sql
  -- Verify referential integrity between food_categories and food_items
  SELECT id, name, category_id FROM food_items WHERE category_id = 1 LIMIT 3;
  ```

---

### Demo 2: Set Operations (from `advanced_queries.sql`)
- **Concept**: Set difference (`EXCEPT`) and Intersection (`INTERSECT`).
- **Query**:
  ```sql
  -- Find items ordered by student Aarav Patel AND student Priya Sharma
  SELECT fi.name, fi.price
  FROM food_items fi
  JOIN order_items oi ON fi.id = oi.food_item_id
  JOIN orders o ON oi.order_id = o.id
  WHERE o.user_id = 'a0000000-0000-0000-0000-000000000001' -- Aarav
  INTERSECT
  SELECT fi.name, fi.price
  FROM food_items fi
  JOIN order_items oi ON fi.id = oi.food_item_id
  JOIN orders o ON oi.order_id = o.id
  WHERE o.user_id = 'a0000000-0000-0000-0000-000000000002'; -- Priya
  ```
  **Expected Output**:
  ```text
        name       | price 
  -----------------+-------
   Masala Dosa     | 60.00
   Filter Coffee   | 20.00
  (2 rows)
  ```

---

### Demo 3: Analytic Window Functions (from `advanced_queries.sql`)
- **Concept**: Ranking dishes by price within each cuisine category using `DENSE_RANK() OVER (PARTITION BY ...)`.
- **Query**:
  ```sql
  SELECT 
      fc.name AS category,
      fi.name AS dish,
      fi.price,
      DENSE_RANK() OVER (PARTITION BY fi.category_id ORDER BY fi.price DESC) AS price_rank
  FROM food_items fi
  JOIN food_categories fc ON fi.category_id = fc.id
  ORDER BY fc.name, price_rank;
  ```
  **Expected Output**:
  ```text
      category    |         dish          | price  | price_rank 
  ----------------+-----------------------+--------+------------
   Beverages      | Cold Coffee with Ice  |  50.00 |          1
   Beverages      | Masala Chai           |  15.00 |          2
   Beverages      | Filter Coffee         |  20.00 |          3
   North Indian   | Paneer Butter Masala  | 120.00 |          1
   North Indian   | Dal Makhani           |  90.00 |          2
   North Indian   | Chole Bhature         |  80.00 |          3
   South Indian   | Ghee Roast Dosa       |  80.00 |          1
   South Indian   | Masala Dosa           |  60.00 |          2
   South Indian   | Idli Sambar           |  40.00 |          3
  ```

---

### Demo 4: Database Views & Materialized Views (from `views.sql`)
- **Concept**: Abstracting denormalized reporting logic into views.
- **Query**:
  ```sql
  -- Query the unified order dispatch view
  SELECT order_id, customer_name, order_status, total_amount, slot_start, slot_end, payment_status
  FROM v_order_details
  LIMIT 3;
  ```

---

### Demo 5: Stored Functions (from `functions.sql`)
- **Concept**: Encapsulated business calculations.
- **Query 1: Dynamic Order Total Calculation**:
  ```sql
  -- Calculate grand total for an existing order by summing its order_items
  SELECT fn_calculate_order_total(id) AS recomputed_total, total_amount AS recorded_total
  FROM orders 
  LIMIT 3;
  ```
- **Query 2: Recipe-Based Stock Availability Check**:
  ```sql
  -- Check if kitchen has enough raw materials to prepare 5 portions of Masala Dosa (id=1)
  SELECT fn_check_ingredient_availability(1, 5) AS can_prepare_5_dosas;
  -- Output: TRUE (or FALSE if ingredients depleted)
  ```

---

### Demo 6: Active Triggers & State Machine (from `triggers.sql`)
- **Concept**: Automated rule enforcement.
- **Query (Illegal State Machine Transition)**:
  ```sql
  -- Try to transition an order directly from 'pending' to 'picked_up' (skipping confirmed, preparing, ready)
  UPDATE orders 
  SET status = 'picked_up' 
  WHERE status = 'pending' 
  LIMIT 1;
  ```
  **Expected Output**:
  ```text
  ERROR:  Invalid order status transition from pending to picked_up for order ...
  CONTEXT:  PL/pgSQL function fn_trg_validate_order_status() line 30 at RAISE
  ```

---

### Demo 7: Stored Procedures & ACID Transactions (from `procedures.sql`)
- **Concept**: Atomic multi-table updates with row locking (`SELECT FOR UPDATE`).
- **Query**:
  ```sql
  -- Call the autonomous order placement procedure
  CALL sp_process_order(
      'a0000000-0000-0000-0000-000000000001'::uuid,
      1,
      '[{"food_item_id": 1, "quantity": 1}, {"food_item_id": 7, "quantity": 2}]'::jsonb,
      'Extra spicy please'
  );
  ```
  **Explanation for Evaluator**:
  1. Procedure verifies user is active.
  2. Acquires row lock on `pickup_slots` with `FOR UPDATE` to prevent over-capacity race conditions.
  3. Verifies raw ingredient inventory via recipes.
  4. Inserts row into `orders` and multiple rows into `order_items`.
  5. Automatically logs the inventory deduction in `inventory_transactions`.
  6. Increments `pickup_slots.current_count`.

---

### Demo 8: Query Optimization & EXPLAIN ANALYZE (from `optimization.sql`)
- **Concept**: Explaining execution plans, cost estimation, and index usage.
- **Demonstration 1: Sequential Scan vs Index Scan**:
  ```sql
  -- 1. Sequential scan on unindexed phone column
  EXPLAIN ANALYZE 
  SELECT id, full_name, email FROM users WHERE phone = '+919876543210';
  ```
  *Show evaluator: "Seq Scan on users"*

  ```sql
  -- 2. Index scan on indexed unique email column
  EXPLAIN ANALYZE 
  SELECT id, full_name, email FROM users WHERE email = 'student@campus.edu';
  ```
  *Show evaluator: "Index Scan using users_email_key on users"*

- **Demonstration 2: Composite Index Prefix Rule**:
  ```sql
  EXPLAIN ANALYZE 
  SELECT id, status, total_amount 
  FROM orders 
  WHERE user_id = 'a0000000-0000-0000-0000-000000000001' AND status = 'confirmed';
  ```
  *Show evaluator: "Index Scan using idx_orders_user_status on orders" demonstrating that both columns are leveraged.*

---

### Demo 9: Trigram & Full-Text Search (from `full_text_search.sql`)
- **Concept**: Inverted GIN indexes for fuzzy and lexical search.
- **Query**:
  ```sql
  -- Natural language keyword search
  SELECT id, name, description, ts_rank(to_tsvector('english', name || ' ' || description), to_tsquery('english', 'crispy | spicy')) AS rank
  FROM food_items
  WHERE to_tsvector('english', name || ' ' || description) @@ to_tsquery('english', 'crispy | spicy')
  ORDER BY rank DESC;
  ```

---

## 4. Key Questions & Answers for Viva / Lab Defense

1. **Q: Why are orders and payments separated into two tables instead of one?**
   - *A: An order can be created in a `'pending'` state before payment is initiated. If a payment fails or times out, the payment gateway attempts can be retried without modifying the original order basket. Furthermore, separating them adheres strictly to BCNF and isolates sensitive financial transaction tokens.*

2. **Q: How does the system handle concurrent checkouts of the last remaining pickup slot?**
   - *A: We use pessimistic concurrency control inside `sp_process_order` via `SELECT 1 FROM pickup_slots WHERE id = p_pickup_slot_id FOR UPDATE;`. This serializes concurrent checkout transactions, preventing overselling.*

3. **Q: Why use pgvector in PostgreSQL instead of a separate vector database like Pinecone?**
   - *A: Storing vectors directly inside PostgreSQL eliminates distributed data synchronization issues. We can execute hybrid queries that join relational filters (`is_vegetarian = true AND price <= 100`) with vector similarity (`<=>`) in a single ACID-compliant SQL statement.*
