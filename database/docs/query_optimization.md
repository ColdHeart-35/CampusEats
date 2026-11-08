# CampusEats — Database Query Optimization & Execution Plan Guide

This document presents a comprehensive study of query performance engineering in PostgreSQL 16 for the **CampusEats** canteen application. It explores the cost-based optimizer, indexing strategies (B-Tree, GIN, GiST, HNSW), plan tree interpretation, join mechanisms, query rewriting, and analytical trade-offs.

---

## 1. The PostgreSQL Query Processing Pipeline

When an application issues an SQL statement to PostgreSQL, the query traverses five distinct stages before data blocks are returned to the client:

```text
[ SQL Query Text ]
       │
       ▼
 1. Parser & Lexer      ──► Generates Abstract Syntax Tree (AST); verifies grammar.
       │
       ▼
 2. Analyzer & Rewriter ──► Resolves table/column names; applies active VIEW rules.
       │
       ▼
 3. Planner / Optimizer ──► Evaluates candidate execution paths; estimates cost.
       │
       ▼
 4. Executor            ──► Traverses execution tree; requests pages from Buffer Pool.
       │
       ▼
[ Result Tuples ]
```

### 1.1 The Cost-Based Optimizer (CBO)
PostgreSQL utilizes a **Cost-Based Optimizer** to evaluate multiple mathematically equivalent Relational Algebra expressions and access paths, choosing the plan with the lowest estimated total cost.

The cost metric is dimensionless, calibrated relative to a single sequential disk page fetch:

| Cost Parameter | Default Value | Description & Hardware Calibration |
|:---|:---:|:---|
| `seq_page_cost` | `1.0` | Cost of fetching a 8KB disk page sequentially from NVMe/HDD storage. Baseline reference. |
| `random_page_cost`| `4.0` | Cost of a non-sequential random 8KB page read. On modern SSDs/NVMe, recommended to set to `1.1` - `1.5`. |
| `cpu_tuple_cost` | `0.01` | CPU cost of processing a single row/tuple in memory. |
| `cpu_index_tuple_cost`| `0.005`| CPU cost of processing an index leaf node entry. |
| `cpu_operator_cost`| `0.0025` | CPU cost of evaluating an operator or function in a `WHERE` clause. |
| `parallel_tuple_cost`| `0.1` | Cost of transferring one tuple between parallel worker processes. |

---

## 2. Reading & Interpreting EXPLAIN and EXPLAIN ANALYZE

### 2.1 The EXPLAIN Command Syntax
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)
SELECT o.id, o.status, u.full_name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'confirmed';
```

- **`EXPLAIN` alone**: Displays the estimated execution plan calculated from table statistics without executing the query. Safe for data modification queries (`DELETE`, `UPDATE`).
- **`EXPLAIN ANALYZE`**: Actually executes the query, outputting real runtimes, row counts, memory consumption, and loop counts alongside the original optimizer estimates.
- **`BUFFERS`**: Displays shared memory buffer hits, reads from OS disk cache, and dirty written pages.

### 2.2 Cost Notation Breakdown

```text
->  Index Scan using idx_orders_user_status on orders  (cost=0.15..8.17 rows=1 width=48) (actual time=0.032..0.033 rows=1 loops=1)
```

1. **`cost=0.15..8.17`**:
   - `0.15` (**Startup Cost**): The estimated cost incurred before the node can emit its very first row (e.g., traversing B-Tree upper branch pages or building a hash table).
   - `8.17` (**Total Cost**): The estimated cost to run this node to full completion and output all expected rows.
2. **`rows=1`**: The expected number of rows emitted by this plan node. If `rows` estimate deviates drastically from `actual rows`, statistics (`ANALYZE`) are stale!
3. **`width=48`**: Average size of output rows in bytes.
4. **`actual time=0.032..0.033`**: True elapsed wall-clock time in milliseconds for the first row and all rows respectively.
5. **`loops=1`**: Number of times this node was re-evaluated (common in nested loops). Multiply time and rows by `loops` for grand totals.

---

## 3. Physical Index Access Paths & Specialized Index Types

CampusEats uses distinct index types designed for specific data domains:

```text
                           PostgreSQL Index Types
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
           B-Tree                    GIN                     HNSW
    (Scalar Comparisons)      (Composite/Trigrams)    (High-Dim Vectors)
     =, <, >, <=, >=,           Arrays, JSONB,         L2 Distance (<->),
     BETWEEN, IN, ORDER BY      Full-Text Search,      Cosine (<=>),
                                LIKE '%pattern%'       Inner Product (<#>)
```

### 3.1 B-Tree (Balanced Multi-Way Search Tree)
- **Time Complexity**: $O(\log N)$ point lookups, range scans, and prefix searches.
- **CampusEats Application**:
  - Primary Keys (`users.id`, `food_items.id`).
  - Foreign Keys (`orders.user_id`, `recipes.ingredient_id`).
  - Composite Indexes: `idx_orders_user_status ON orders(user_id, status)` optimizes user dashboards fetching their active orders.

> [!TIP]
> **Left-Prefix Rule**: An index on `(A, B)` can satisfy queries filtering on `A`, or filtering on `A AND B`. It **cannot** efficiently satisfy queries filtering exclusively on `B`.

### 3.2 GIN (Generalized Inverted Index)
- **Architecture**: Inverted index where each leaf points to a posting list of heap tuple IDs containing that key.
- **CampusEats Application**:
  - **Trigram Similarity**: `idx_food_items_name_trgm ON food_items USING gin(name gin_trgm_ops)`. Accelerates fuzzy searches (`WHERE name ILIKE '%dosa%'`).
  - **Full-Text Search**: `idx_food_items_fts ON food_items USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')))`. Accelerates keyword searches via `to_tsquery('english', 'crispy & spicy')`.

### 3.3 HNSW (Hierarchical Navigable Small World) for Vector Search
- **Architecture**: Multi-layer geometric proximity graph for Approximate Nearest Neighbor (ANN) search across dense vector spaces.
- **CampusEats Application**:
  ```sql
  CREATE INDEX idx_food_items_embedding_hnsw 
  ON food_items 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
  ```
- **Trade-off Comparison**:
  - **HNSW vs IVFFlat**:
    - `IVFFlat` (Inverted File Flat) clusters vectors into Voronoi cells. It requires an existing populated dataset to train centroids and suffers accuracy loss on dynamic updates.
    - `HNSW` builds a hierarchical small-world graph. It requires zero training phase, accepts real-time inserts without accuracy degradation, and delivers 10x lower query latency at the expense of higher index build memory and RAM footprint.

---

## 4. Join Optimization Strategies

PostgreSQL chooses among three join algorithms depending on cardinality, indexes, and memory (`work_mem`):

### 4.1 Nested Loop Join
```text
For each outer row in Table A:
    Search matching inner rows in Table B (ideally via Index Scan)
```
- **Optimal When**: Outer table is small (< 100 rows) and inner table has a highly selective index on the join key.
- **Example in CampusEats**: Joining a single student order (`orders` by UUID) with its corresponding line items (`order_items`).

### 4.2 Hash Join
```text
1. Read inner table into an in-memory Hash Table keyed by join attribute.
2. Scan outer table sequentially, probing the Hash Table for matches.
```
- **Optimal When**: Joining medium to large unindexed datasets without ordering requirements. Requires adequate `work_mem` to prevent spilling to temporary disk files (Batch 1 vs multi-batch).
- **Example in CampusEats**: Joining large historical `orders` with `users` for daily analytics summaries.

### 4.3 Merge Join
```text
1. Sort Table A by join key (or use pre-sorted B-Tree index).
2. Sort Table B by join key.
3. Advance both pointers synchronously in a single linear pass.
```
- **Optimal When**: Both inputs are already sorted by the join key (e.g., via B-Tree index) or when joining very large relations that exceed available RAM.

---

## 5. Query Rewriting & Anti-Pattern Refactoring

### 5.1 Correlated Subquery to `JOIN` Transformation
- **Anti-Pattern**:
  ```sql
  -- Subquery runs once for EVERY food item (N+1 query problem inside database)
  SELECT fi.name, fi.price,
         (SELECT fc.name FROM food_categories fc WHERE fc.id = fi.category_id) AS category_name
  FROM food_items fi;
  ```
- **Optimized Rewrite**:
  ```sql
  -- Evaluated as a single Hash Join or Nested Loop
  SELECT fi.name, fi.price, fc.name AS category_name
  FROM food_items fi
  JOIN food_categories fc ON fi.category_id = fc.id;
  ```

### 5.2 CTE Materialization Fencing in PostgreSQL 12+
In older PostgreSQL versions, Common Table Expressions (`WITH cte AS (...)`) acted as rigid optimization fences, forcing PostgreSQL to evaluate and materialize the subquery into temporary memory even when outer predicates could have pruned rows.
In PostgreSQL 16:
- CTEs are **inlined automatically** by default if they are side-effect free.
- If optimization fencing is explicitly desired: `WITH cte AS MATERIALIZED (...)`.
- If inlining is explicitly forced: `WITH cte AS NOT MATERIALIZED (...)`.

### 5.3 `EXISTS` vs `IN` with Subqueries
- `WHERE id IN (SELECT user_id FROM orders)` can produce suboptimal plans if the subquery returns nulls, as SQL three-valued logic prevents index optimizations.
- `WHERE EXISTS (SELECT 1 FROM orders WHERE orders.user_id = users.id)` converts directly into an efficient **Semi-Join**, halting the probe on the first matching record.

---

## 6. Denormalization Trade-Offs

While CampusEats maintains a strict 3NF/BCNF transactional core, deliberate engineering trade-offs are utilized to balance transaction throughput and analytical performance:

| Technique | Implementation in CampusEats | Write Overhead | Read Performance Gain | Concurrency Impact |
|:---|:---|:---:|:---:|:---:|
| **Stored Derived Column** | `order_items.subtotal` ($qty \times price$) | Negligible (computed on insert) | Eliminates arithmetic evaluation on every cart/order render | None |
| **Materialized Views** | `mv_revenue_by_category` | High on refresh (`REFRESH MATERIALIZED VIEW CONCURRENTLY`) | 100x faster dashboard aggregation over millions of rows | Zero locking during concurrent refresh |
| **Volatile Caching Layer** | Redis 7 Caching for active carts & slot counters | Dual-write invalidation in backend service | Sub-millisecond reads; removes database CPU load during campus rush hour | Prevents DB connection pool starvation |

---

## 7. Practical Optimization Checklist for CampusEats

1. **Foreign Key Indexing**: Verify every foreign key column (`user_id`, `category_id`, `food_item_id`, `pickup_slot_id`) has an explicit B-Tree index.
2. **Partial Indexes for Active Workloads**: Maintain indexes only on active records (`WHERE is_available = TRUE` or `WHERE status IN ('pending', 'confirmed')`) to reduce B-Tree page depth.
3. **Analyze Table Statistics Regularly**: Ensure PostgreSQL auto-vacuum daemon is tuned with aggressive cost limits so `pg_statistic` histogram buckets accurately reflect changing order distributions.
4. **Tune `work_mem` for Analytics**: Default 4MB `work_mem` can force Hash Joins to spill to temporary disk files; set `work_mem = '64MB'` in analytical reporting sessions.
