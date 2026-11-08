# CampusEats — Formal Relational Schema Specification

This document presents the formal relational schema representation of the **CampusEats** database, complete with column attributes, primary keys, foreign keys, unique constraints, functional dependencies, and theoretical ER-to-Relational conversion proofs.

---

## 1. Formal Relational Schema Notation

In relational database theory, a relational schema is denoted by the relation name followed by the list of attributes enclosed in parentheses:
$$R(A_1, A_2, \dots, A_n)$$
Primary Key ($PK$) attributes are **underlined**, Foreign Keys ($FK$) indicate directional referential integrity ($\rightarrow S(K)$), and Unique Keys ($UK$) enforce alternate uniqueness constraints.

### 1.1 Relation Signatures

1. **`users`**
   $$\text{users}(\underline{\text{id}}, \text{email}^{\text{UK}}, \text{password\_hash}, \text{full\_name}, \text{phone}, \text{role}, \text{is\_active}, \text{created\_at}, \text{updated\_at})$$

2. **`food_categories`**
   $$\text{food\_categories}(\underline{\text{id}}, \text{name}^{\text{UK}}, \text{description}, \text{image\_url}, \text{is\_active}, \text{created\_at})$$

3. **`food_items`**
   $$\text{food\_items}(\underline{\text{id}}, \text{category\_id}^{\text{FK} \rightarrow \text{food\_categories(id)}}, \text{name}, \text{description}, \text{price}, \text{image\_url}, \text{is\_available}, \text{is\_vegetarian}, \text{preparation\_time}, \text{embedding}, \text{created\_at}, \text{updated\_at})$$

4. **`ingredients`**
   $$\text{ingredients}(\underline{\text{id}}, \text{name}^{\text{UK}}, \text{unit}, \text{current\_stock}, \text{min\_stock\_level}, \text{cost\_per\_unit}, \text{created\_at}, \text{updated\_at})$$

5. **`recipes`**
   $$\text{recipes}(\underline{\text{id}}, \text{food\_item\_id}^{\text{FK} \rightarrow \text{food\_items(id)}}, \text{ingredient\_id}^{\text{FK} \rightarrow \text{ingredients(id)}}, \text{quantity\_required})$$
   *Note: $(\text{food\_item\_id}, \text{ingredient\_id})$ forms an alternate composite candidate key ($UK$).*

6. **`pickup_slots`**
   $$\text{pickup\_slots}(\underline{\text{id}}, \text{slot\_date}, \text{start\_time}, \text{end\_time}, \text{max\_capacity}, \text{current\_count}, \text{is\_active}, \text{created\_at})$$
   *Note: $(\text{slot\_date}, \text{start\_time}, \text{end\_time})$ forms an alternate composite candidate key ($UK$).*

7. **`orders`**
   $$\text{orders}(\underline{\text{id}}, \text{user\_id}^{\text{FK} \rightarrow \text{users(id)}}, \text{pickup\_slot\_id}^{\text{FK} \rightarrow \text{pickup\_slots(id)}}, \text{status}, \text{total\_amount}, \text{qr\_code}, \text{qr\_verified}, \text{special\_instructions}, \text{created\_at}, \text{updated\_at})$$

8. **`order_items`**
   $$\text{order\_items}(\underline{\text{id}}, \text{order\_id}^{\text{FK} \rightarrow \text{orders(id)}}, \text{food\_item\_id}^{\text{FK} \rightarrow \text{food\_items(id)}}, \text{quantity}, \text{unit\_price}, \text{subtotal})$$

9. **`payments`**
   $$\text{payments}(\underline{\text{id}}, \text{order\_id}^{\text{FK} \rightarrow \text{orders(id)}, \text{UK}}, \text{razorpay\_order\_id}, \text{razorpay\_payment\_id}, \text{razorpay\_signature}, \text{amount}, \text{currency}, \text{status}, \text{created\_at}, \text{updated\_at})$$

10. **`inventory_transactions`**
    $$\text{inventory\_transactions}(\underline{\text{id}}, \text{ingredient\_id}^{\text{FK} \rightarrow \text{ingredients(id)}}, \text{transaction\_type}, \text{quantity}, \text{reference\_id}, \text{notes}, \text{created\_by}^{\text{FK} \rightarrow \text{users(id)}}, \text{created\_at})$$

11. **`notifications`**
    $$\text{notifications}(\underline{\text{id}}, \text{user\_id}^{\text{FK} \rightarrow \text{users(id)}}, \text{title}, \text{message}, \text{notification\_type}, \text{is\_read}, \text{reference\_id}, \text{created\_at})$$

---

## 2. Detailed Table Definitions & Functional Dependencies

### 2.1 `users`
- **Candidate Keys**: $K_1 = \{\text{id}\}$, $K_2 = \{\text{email}\}$
- **Primary Key**: $\text{id}$
- **Functional Dependencies ($F_1$)**:
  1. $\text{id} \rightarrow \text{email}, \text{password\_hash}, \text{full\_name}, \text{phone}, \text{role}, \text{is\_active}, \text{created\_at}, \text{updated\_at}$
  2. $\text{email} \rightarrow \text{id}, \text{password\_hash}, \text{full\_name}, \text{phone}, \text{role}, \text{is\_active}, \text{created\_at}, \text{updated\_at}$
- **Integrity Constraints**:
  - `role IN ('student', 'staff', 'admin')`
  - `email` must conform to standard RFC format and uniqueness.

### 2.2 `food_categories`
- **Candidate Keys**: $K_1 = \{\text{id}\}$, $K_2 = \{\text{name}\}$
- **Primary Key**: $\text{id}$
- **Functional Dependencies ($F_2$)**:
  1. $\text{id} \rightarrow \text{name}, \text{description}, \text{image\_url}, \text{is\_active}, \text{created\_at}$
  2. $\text{name} \rightarrow \text{id}, \text{description}, \text{image\_url}, \text{is\_active}, \text{created\_at}$

### 2.3 `food_items`
- **Candidate Keys**: $K_1 = \{\text{id}\}$
- **Primary Key**: $\text{id}$
- **Foreign Key**: $\text{category\_id} \rightarrow \text{food\_categories(id)}$ with `ON DELETE CASCADE`
- **Functional Dependencies ($F_3$)**:
  1. $\text{id} \rightarrow \text{category\_id}, \text{name}, \text{description}, \text{price}, \text{image\_url}, \text{is\_available}, \text{is\_vegetarian}, \text{preparation\_time}, \text{embedding}, \text{created\_at}, \text{updated\_at}$
- **Integrity Constraints**:
  - `price > 0.00`
  - `preparation_time >= 0`

### 2.4 `ingredients`
- **Candidate Keys**: $K_1 = \{\text{id}\}$, $K_2 = \{\text{name}\}$
- **Primary Key**: $\text{id}$
- **Functional Dependencies ($F_4$)**:
  1. $\text{id} \rightarrow \text{name}, \text{unit}, \text{current\_stock}, \text{min\_stock\_level}, \text{cost\_per\_unit}, \text{created\_at}, \text{updated\_at}$
  2. $\text{name} \rightarrow \text{id}, \text{unit}, \text{current\_stock}, \text{min\_stock\_level}, \text{cost\_per\_unit}, \text{created\_at}, \text{updated\_at}$
- **Integrity Constraints**:
  - `current_stock >= 0.00`
  - `min_stock_level >= 0.00`

### 2.5 `recipes`
- **Candidate Keys**: $K_1 = \{\text{id}\}$, $K_2 = \{\text{food\_item\_id}, \text{ingredient\_id}\}$
- **Primary Key**: $\text{id}$
- **Foreign Keys**:
  - $\text{food\_item\_id} \rightarrow \text{food\_items(id)}$ with `ON DELETE CASCADE`
  - $\text{ingredient\_id} \rightarrow \text{ingredients(id)}$ with `ON DELETE CASCADE`
- **Functional Dependencies ($F_5$)**:
  1. $\text{id} \rightarrow \text{food\_item\_id}, \text{ingredient\_id}, \text{quantity\_required}$
  2. $\{\text{food\_item\_id}, \text{ingredient\_id}\} \rightarrow \text{id}, \text{quantity\_required}$
- **Integrity Constraints**:
  - `quantity_required > 0.00`

### 2.6 `pickup_slots`
- **Candidate Keys**: $K_1 = \{\text{id}\}$, $K_2 = \{\text{slot\_date}, \text{start\_time}, \text{end\_time}\}$
- **Primary Key**: $\text{id}$
- **Functional Dependencies ($F_6$)**:
  1. $\text{id} \rightarrow \text{slot\_date}, \text{start\_time}, \text{end\_time}, \text{max\_capacity}, \text{current\_count}, \text{is\_active}, \text{created\_at}$
  2. $\{\text{slot\_date}, \text{start\_time}, \text{end\_time}\} \rightarrow \text{id}, \text{max\_capacity}, \text{current\_count}, \text{is\_active}, \text{created\_at}$
- **Integrity Constraints**:
  - `max_capacity > 0`
  - `current_count >= 0`
  - `current_count <= max_capacity`
  - `end_time > start_time`

### 2.7 `orders`
- **Candidate Keys**: $K_1 = \{\text{id}\}$
- **Primary Key**: $\text{id}$
- **Foreign Keys**:
  - $\text{user\_id} \rightarrow \text{users(id)}$
  - $\text{pickup\_slot\_id} \rightarrow \text{pickup\_slots(id)}$ (Nullable)
- **Functional Dependencies ($F_7$)**:
  1. $\text{id} \rightarrow \text{user\_id}, \text{pickup\_slot\_id}, \text{status}, \text{total\_amount}, \text{qr\_code}, \text{qr\_verified}, \text{special\_instructions}, \text{created\_at}, \text{updated\_at}$
- **Integrity Constraints**:
  - `status IN ('pending', 'confirmed', 'accepted', 'preparing', 'ready', 'picked_up', 'cancelled')`
  - `total_amount >= 0.00`

### 2.8 `order_items`
- **Candidate Keys**: $K_1 = \{\text{id}\}$, $K_2 = \{\text{order\_id}, \text{food\_item\_id}\}$ *(in canonical non-repetition)*
- **Primary Key**: $\text{id}$
- **Foreign Keys**:
  - $\text{order\_id} \rightarrow \text{orders(id)}$ with `ON DELETE CASCADE`
  - $\text{food\_item\_id} \rightarrow \text{food\_items(id)}$
- **Functional Dependencies ($F_8$)**:
  1. $\text{id} \rightarrow \text{order\_id}, \text{food\_item\_id}, \text{quantity}, \text{unit\_price}, \text{subtotal}$
  2. $\{\text{quantity}, \text{unit\_price}\} \rightarrow \text{subtotal}$ *(Derived arithmetic dependency: $\text{subtotal} = \text{quantity} \times \text{unit\_price}$)*
- **Integrity Constraints**:
  - `quantity > 0`
  - `unit_price >= 0.00`
  - `subtotal >= 0.00`

### 2.9 `payments`
- **Candidate Keys**: $K_1 = \{\text{id}\}$, $K_2 = \{\text{order\_id}\}$
- **Primary Key**: $\text{id}$
- **Foreign Key**: $\text{order\_id} \rightarrow \text{orders(id)}$ with `UNIQUE` constraint (enforces 1:1)
- **Functional Dependencies ($F_9$)**:
  1. $\text{id} \rightarrow \text{order\_id}, \text{razorpay\_order\_id}, \text{razorpay\_payment\_id}, \text{razorpay\_signature}, \text{amount}, \text{currency}, \text{status}, \text{created\_at}, \text{updated\_at}$
  2. $\text{order\_id} \rightarrow \text{id}, \text{razorpay\_order\_id}, \text{razorpay\_payment\_id}, \text{razorpay\_signature}, \text{amount}, \text{currency}, \text{status}, \text{created\_at}, \text{updated\_at}$
- **Integrity Constraints**:
  - `status IN ('created', 'authorized', 'captured', 'failed', 'refunded')`
  - `currency = 'INR'`

### 2.10 `inventory_transactions`
- **Candidate Keys**: $K_1 = \{\text{id}\}$
- **Primary Key**: $\text{id}$
- **Foreign Keys**:
  - $\text{ingredient\_id} \rightarrow \text{ingredients(id)}$
  - $\text{created\_by} \rightarrow \text{users(id)}$
- **Functional Dependencies ($F_{10}$)**:
  1. $\text{id} \rightarrow \text{ingredient\_id}, \text{transaction\_type}, \text{quantity}, \text{reference\_id}, \text{notes}, \text{created\_by}, \text{created\_at}$
- **Integrity Constraints**:
  - `transaction_type IN ('restock', 'deduction', 'adjustment', 'restoration')`

### 2.11 `notifications`
- **Candidate Keys**: $K_1 = \{\text{id}\}$
- **Primary Key**: $\text{id}$
- **Foreign Key**: $\text{user\_id} \rightarrow \text{users(id)}$
- **Functional Dependencies ($F_{11}$)**:
  1. $\text{id} \rightarrow \text{user\_id}, \text{title}, \text{message}, \text{notification\_type}, \text{is\_read}, \text{reference\_id}, \text{created\_at}$

---

## 3. ER-to-Relational Conversion Rules Applied

The conceptual ER model is converted to relational tables following standard formal database reduction rules:

### Step 1: Mapping Strong (Regular) Entity Sets
- Each regular entity set $E$ in the ER diagram becomes a distinct relation $R$ containing all atomic attributes of $E$.
- The primary key of $E$ becomes the primary key of $R$.
- **Applied to**:
  - `users` $\rightarrow$ Primary Key `id`
  - `food_categories` $\rightarrow$ Primary Key `id`
  - `food_items` $\rightarrow$ Primary Key `id`
  - `ingredients` $\rightarrow$ Primary Key `id`
  - `pickup_slots` $\rightarrow$ Primary Key `id`
  - `orders` $\rightarrow$ Primary Key `id`

### Step 2: Mapping 1:N (One-to-Many) Binary Relationships
- In a 1:N relationship between entity types $S$ (at the 1-side) and $T$ (at the N-side), the primary key of $S$ is imported as a **Foreign Key ($FK$)** into relation $T$.
- **Applied to**:
  - `food_categories` (1) to `food_items` (N): `food_items` receives `category_id FK -> food_categories(id)`.
  - `users` (1) to `orders` (N): `orders` receives `user_id FK -> users(id)`.
  - `pickup_slots` (1) to `orders` (N): `orders` receives `pickup_slot_id FK -> pickup_slots(id)` (optional participation on the order side permits walk-ins or pending assignment).
  - `ingredients` (1) to `inventory_transactions` (N): `inventory_transactions` receives `ingredient_id FK -> ingredients(id)`.
  - `users` (1) to `inventory_transactions` (N): `inventory_transactions` receives `created_by FK -> users(id)`.
  - `users` (1) to `notifications` (N): `notifications` receives `user_id FK -> users(id)`.

### Step 3: Mapping M:N (Many-to-Many) Relationships
- For an M:N relationship between entities $A$ and $B$, a new relation $R$ (associative entity) is created.
- $R$ includes the primary keys of $A$ and $B$ as foreign keys referencing their parent relations.
- The combination of these foreign keys, or an artificial surrogate key, forms the primary key of $R$. Any relationship descriptive attributes become attributes in $R$.
- **Applied to**:
  - **`recipes`**: Represents the Many-to-Many relationship between `food_items` and `ingredients`. Contains foreign keys `food_item_id` and `ingredient_id` with descriptive attribute `quantity_required`. A composite unique constraint ensures that a given dish-ingredient pair cannot be duplicated.

### Step 4: Mapping Weak Entity Sets & Composition
- A weak entity does not possess a primary key of its own and depends existence-wise on an identifying owner entity.
- In relational mapping, the weak entity table includes the owner entity's primary key as a foreign key, with `ON DELETE CASCADE`.
- **Applied to**:
  - **`order_items`**: While an integer surrogate `id` is allocated for relational convenience, conceptually `order_items` depends strictly on `orders`. If an order is purged, its line items cascade-delete.

### Step 5: Mapping 1:1 (One-to-One) Binary Relationships
- In a 1:1 relationship between $A$ and $B$, the primary key of $A$ is placed as a foreign key in $B$ (or vice-versa), accompanied by a **UNIQUE** constraint on that column to guarantee one-to-one mapping.
- **Applied to**:
  - `orders` (1) to `payments` (1): `payments` contains `order_id FK -> orders(id) UNIQUE`. This guarantees each order has at most one payment record.

### Step 6: Handling Specialized Attributes (Dense Vectors)
- The attribute `food_items.embedding` represents high-dimensional unstructured semantic meaning (384 floating-point coordinates).
- In standard relational normalization, multi-valued attributes require auxiliary tables. However, utilizing modern Object-Relational extensions (PostgreSQL `pgvector`), the 384-dimensional vector is treated as an atomic native spatial primitive ($vector(384)$), preserving 1NF compliance while enabling accelerated approximate nearest-neighbor (ANN) vector indexing.
