# CampusEats — Relational Algebra Specification & SQL Mapping

This document provides a formal mathematical treatment of **Relational Algebra (RA)** operations applied to the **CampusEats** canteen database. Each algebraic expression is presented with its formal mathematical notation, query intention, intermediate operation breakdown, and corresponding production PostgreSQL query.

---

## 1. Relational Algebra Fundamentals & Operator Symbols

Relational Algebra is a procedural query language consisting of a collection of operations that take one or two relations as input and produce a new relation as their output:

| Operator | Mathematical Symbol | Category | Description |
|:---|:---:|:---|:---|
| **Selection** | $\sigma_{\text{condition}}(R)$ | Unary Fundamental | Filters horizontal tuples matching predicate |
| **Projection** | $\pi_{A_1, A_2, \dots}(R)$ | Unary Fundamental | Extracts vertical columns, removing duplicates |
| **Union** | $R \cup S$ | Binary Set | Tuples appearing in $R$, $S$, or both (requires union compatibility) |
| **Set Difference** | $R - S$ | Binary Set | Tuples appearing in $R$ but not in $S$ |
| **Cartesian Product** | $R \times S$ | Binary Set | All possible concatenated pairs of tuples |
| **Rename** | $\rho_{S}(R)$ or $\rho_{A/B}(R)$ | Unary Auxiliary | Renames relation or attributes |
| **Natural Join** | $R \bowtie S$ | Binary Derived | Joins on equality of identically named attributes |
| **Theta Join** | $R \bowtie_{\theta} S$ | Binary Derived | Conditional cross-product selection ($\sigma_{\theta}(R \times S)$) |
| **Division** | $R \div S$ | Binary Derived | Tuples in $R$ associated with all tuples in $S$ |
| **Aggregation** | $_{G_1}\mathcal{G}_{F_1(A_1)}(R)$ | Unary Extension | Groups by $G_1$ and evaluates aggregate function $F_1$ |

---

## 2. Selection ($\sigma$)

### 2.1 Query A: Retrieve All Available Vegetarian Food Items
- **Query Objective**: Filter all menu dishes that are currently marked vegetarian and available for ordering.
- **Relational Algebra**:
  $$\sigma_{(\text{is\_vegetarian} = \text{TRUE} \land \text{is\_available} = \text{TRUE})}(\text{food\_items})$$
- **SQL Equivalent**:
```sql
SELECT *
FROM food_items
WHERE is_vegetarian = TRUE 
  AND is_available = TRUE;
```

### 2.2 Query B: Retrieve Active Orders Awaiting Kitchen Preparation
- **Query Objective**: Filter all canteen orders whose lifecycle state is either `'confirmed'` or `'accepted'`.
- **Relational Algebra**:
  $$\sigma_{(\text{status} = '\text{confirmed}' \lor \text{status} = '\text{accepted}')}(\text{orders})$$
- **SQL Equivalent**:
```sql
SELECT *
FROM orders
WHERE status IN ('confirmed', 'accepted');
```

---

## 3. Projection ($\pi$)

### Query: Extract Menu Dish Names and Current Selling Prices
- **Query Objective**: Present only the commercial pricing columns to display on public canteen digital signage, suppressing internal keys and vectors.
- **Relational Algebra**:
  $$\pi_{\text{name}, \text{price}}(\text{food\_items})$$
- **SQL Equivalent**:
```sql
SELECT DISTINCT name, price
FROM food_items;
```
*(Note: Relational Algebra projections inherently eliminate duplicates; in SQL, `DISTINCT` enforces set semantics).*

---

## 4. Union ($\cup$)

### Query: Combine All Items from South Indian and North Indian Cuisines
- **Query Objective**: Create a unified menu selection of Indian regional cuisines.
- **Prerequisite**: Both input relations must be **union-compatible** (have identical arity and compatible attribute domains).
- **Relational Algebra**:
  $$R_1 \leftarrow \pi_{\text{id}, \text{name}, \text{price}}(\sigma_{\text{category\_id} = 1}(\text{food\_items}))$$
  $$R_2 \leftarrow \pi_{\text{id}, \text{name}, \text{price}}(\sigma_{\text{category\_id} = 2}(\text{food\_items}))$$
  $$\text{Result} \leftarrow R_1 \cup R_2$$
- **SQL Equivalent**:
```sql
SELECT id, name, price
FROM food_items
WHERE category_id = 1
UNION
SELECT id, name, price
FROM food_items
WHERE category_id = 2;
```

---

## 5. Set Difference ($-$)

### Query: Identify Food Items that Have Never Been Ordered
- **Query Objective**: Support kitchen analytics in pruning inactive or unpopular menu items.
- **Relational Algebra**:
  $$R_{\text{all\_items}} \leftarrow \pi_{\text{id}}(\text{food\_items})$$
  $$R_{\text{ordered\_items}} \leftarrow \pi_{\text{food\_item\_id}}(\text{order\_items})$$
  $$\text{NeverOrdered} \leftarrow R_{\text{all\_items}} - \rho_{\text{id} / \text{food\_item\_id}}(R_{\text{ordered\_items}})$$
- **SQL Equivalent**:
```sql
-- Using EXCEPT (Set Difference)
SELECT id FROM food_items
EXCEPT
SELECT food_item_id FROM order_items;

-- Alternative relational NOT EXISTS formulation
SELECT fi.id, fi.name
FROM food_items fi
WHERE NOT EXISTS (
    SELECT 1 
    FROM order_items oi 
    WHERE oi.food_item_id = fi.id
);
```

---

## 6. Cartesian Product ($\times$)

### Query: Combine All Active Pickup Slots with All Food Categories
- **Query Objective**: Generate a potential scheduling matrix indicating which food categories could theoretically be served at each pickup time slot.
- **Relational Algebra**:
  $$\pi_{\text{slot\_date}, \text{start\_time}}(\sigma_{\text{is\_active} = \text{TRUE}}(\text{pickup\_slots})) \times \pi_{\text{name}}(\sigma_{\text{is\_active} = \text{TRUE}}(\text{food\_categories}))$$
- **SQL Equivalent**:
```sql
SELECT ps.slot_date, ps.start_time, fc.name AS category_name
FROM pickup_slots ps
CROSS JOIN food_categories fc
WHERE ps.is_active = TRUE 
  AND fc.is_active = TRUE;
```

> [!CAUTION]
> **Performance Caution**: The Cartesian product of relation $R$ ($|R|$ tuples) and relation $S$ ($|S|$ tuples) generates $|R| \times |S|$ tuples. Without a selective join condition, unconstrained Cartesian products exhaust memory buffers and cause severe $O(N \cdot M)$ query plan degradation.

---

## 7. Natural Join ($\bowtie$)

### Query: Correlate Orders with User Profiles
- **Query Objective**: Link orders with customer profiles by equating common identification attributes.
- **Relational Algebra**:
  $$\text{RenamedUsers} \leftarrow \rho_{\text{user\_id} / \text{id}}(\text{users})$$
  $$\text{Result} \leftarrow \text{orders} \bowtie \text{RenamedUsers}$$
- **SQL Equivalent**:
```sql
-- Standard SQL explicit equijoin (best practice):
SELECT o.id AS order_id, o.status, o.total_amount, u.full_name, u.email
FROM orders o
JOIN users u ON o.user_id = u.id;

-- Pure ANSI Natural Join (requires identical column name):
SELECT order_id, status, total_amount, full_name, email
FROM orders
NATURAL JOIN (
    SELECT id AS user_id, full_name, email FROM users
) u;
```

---

## 8. Theta Join ($\bowtie_{\theta}$)

### Query: Identify Food Items Priced Higher Than Their Category Average
- **Query Objective**: Pinpoint premium priced items within each food category.
- **Relational Algebra**:
  $$R_{\text{cat\_avg}} \leftarrow \text{category\_id}\mathcal{G}_{\text{AVG}(\text{price}) \rightarrow \text{avg\_price}}(\text{food\_items})$$
  $$\text{Result} \leftarrow \pi_{\text{name}, \text{price}, \text{avg\_price}}(\text{food\_items} \bowtie_{\text{food\_items.category\_id} = R_{\text{cat\_avg}}.\text{category\_id} \land \text{food\_items.price} > R_{\text{cat\_avg}}.\text{avg\_price}} R_{\text{cat\_avg}})$$
- **SQL Equivalent**:
```sql
SELECT fi.name, fi.price, cat_avg.avg_price
FROM food_items fi
JOIN (
    SELECT category_id, AVG(price) AS avg_price
    FROM food_items
    GROUP BY category_id
) cat_avg 
  ON fi.category_id = cat_avg.category_id 
 AND fi.price > cat_avg.avg_price;
```

---

## 9. Relational Division ($\div$)

### Query: Find Students Who Have Ordered ALL Items in the 'Beverages' Category
- **Query Objective**: University canteens running loyalty challenges reward students who have sampled every beverage offering.
- **Theory of Division**: Let $A$ have attributes $(X, Y)$ and $B$ have attributes $(Y)$. $A \div B$ yields tuples over $X$ that are paired in $A$ with **every** tuple in $B$.
- **Relational Algebra**:
  $$B \leftarrow \pi_{\text{id}}(\sigma_{\text{category\_id} = 4}(\text{food\_items})) \quad \text{-- Target beverage item IDs}$$
  $$A \leftarrow \pi_{\text{user\_id}, \text{food\_item\_id}}(\text{orders} \bowtie \text{order\_items}) \quad \text{-- User-Item ordered pairs}$$
  $$\text{Result} \leftarrow A \div B$$
  $$\text{Expanded Expression}: \pi_{\text{user\_id}}(A) - \pi_{\text{user\_id}}((\pi_{\text{user\_id}}(A) \times B) - A)$$
- **SQL Equivalent**:
```sql
-- Classical Relational Division using Double NOT EXISTS
SELECT u.id, u.full_name, u.email
FROM users u
WHERE NOT EXISTS (
    -- All items in category 4 (Beverages)
    SELECT fi.id
    FROM food_items fi
    WHERE fi.category_id = 4
    EXCEPT
    -- Items ordered by this specific student
    SELECT oi.food_item_id
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = u.id
);

-- Alternative Counting formulation (for candidate keys):
SELECT o.user_id, u.full_name
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN users u ON o.user_id = u.id
WHERE oi.food_item_id IN (SELECT id FROM food_items WHERE category_id = 4)
GROUP BY o.user_id, u.full_name
HAVING COUNT(DISTINCT oi.food_item_id) = (
    SELECT COUNT(*) FROM food_items WHERE category_id = 4
);
```

---

## 10. Rename Operator ($\rho$)

### Query: Self-Join to Compare Pairs of Food Items with Identical Prices
- **Query Objective**: Pair dishes sharing identical prices to assist in balanced meal combo packaging.
- **Relational Algebra**:
  $$Item_1 \leftarrow \rho_{I_1}(\text{food\_items})$$
  $$Item_2 \leftarrow \rho_{I_2}(\text{food\_items})$$
  $$\text{Result} \leftarrow \pi_{I_1.\text{name}, I_2.\text{name}, I_1.\text{price}}(\sigma_{I_1.\text{price} = I_2.\text{price} \land I_1.\text{id} < I_2.\text{id}}(Item_1 \times Item_2))$$
- **SQL Equivalent**:
```sql
SELECT 
    i1.name AS item_1_name,
    i2.name AS item_2_name,
    i1.price
FROM food_items i1
JOIN food_items i2 
  ON i1.price = i2.price 
 AND i1.id < i2.id;
```

---

## 11. Aggregate Operations ($\mathcal{G}$)

### 11.1 COUNT, SUM, AVG: Category Financial Summary
- **Query Objective**: Compute total dish count, average price, and highest price within each category.
- **Relational Algebra**:
  $$_{\text{category\_id}}\mathcal{G}_{\text{COUNT}(\text{id}) \rightarrow \text{item\_count}, \text{AVG}(\text{price}) \rightarrow \text{avg\_price}, \text{MAX}(\text{price}) \rightarrow \text{max\_price}}(\text{food\_items})$$
- **SQL Equivalent**:
```sql
SELECT 
    category_id,
    COUNT(id) AS item_count,
    ROUND(AVG(price), 2) AS avg_price,
    MAX(price) AS max_price
FROM food_items
GROUP BY category_id;
```

### 11.2 MIN, MAX: Pickup Slot Demand Analysis
- **Query Objective**: Identify highest and lowest occupancy slots across all days.
- **Relational Algebra**:
  $$\mathcal{G}_{\text{MIN}(\text{current\_count}) \rightarrow \text{min\_booked}, \text{MAX}(\text{current\_count}) \rightarrow \text{max\_booked}}(\text{pickup\_slots})$$
- **SQL Equivalent**:
```sql
SELECT 
    MIN(current_count) AS min_booked,
    MAX(current_count) AS max_booked,
    ROUND(AVG(current_count)::numeric, 2) AS avg_booked
FROM pickup_slots
WHERE is_active = TRUE;
```

---

## 12. Summary Comparison: Relational Algebra vs. SQL

| Concept | Relational Algebra (Formal) | Structured Query Language (SQL) |
|:---|:---|:---|
| **Paradigm** | Purely Procedural / Declarative Foundation | Declarative High-Level Language |
| **Duplicates** | Set Semantics (strictly eliminates duplicate tuples) | Multiset / Bag Semantics (preserves duplicates unless `DISTINCT` specified) |
| **Null Values** | Classical RA assumes two-valued logic ($T, F$) | Three-valued logic ($T, F, \text{UNKNOWN}$) via SQL `NULL` |
| **Expressions** | Composed mathematical operators ($\sigma, \pi, \bowtie, \cup$) | Clauses (`SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`) |
| **Execution** | Serves as internal AST for relational query optimizers | Source language parsed into Relational Algebra AST trees |
