# CampusEats — Formal Database Normalization Study

This document details the complete mathematical normalization process for **CampusEats**, tracing the decomposition from a single unnormalized flat table through **1NF, 2NF, 3NF, BCNF, 4NF, and 5NF**. It includes formal functional dependency discovery, closure computations via Armstrong's axioms, candidate key derivations, anomaly proofs, and validation of all 11 final relations.

---

## 1. Unnormalized Relation: `CanteenOrder`

Consider an unnormalized, flat spreadsheet-like table used by a naive canteen management system to track orders, menus, ingredients, and payments:

```text
CanteenOrder(
    order_id,
    student_name,
    student_email,
    student_phone,
    item_name,
    item_price,
    item_category,
    ingredient_name,
    ingredient_qty,
    payment_id,
    payment_status,
    slot_date,
    slot_time
)
```

### 1.1 Sample Unnormalized Instance

| order_id | student_name | student_email | student_phone | item_name | item_price | item_category | ingredient_name | ingredient_qty | payment_id | payment_status | slot_date | slot_time |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| ORD-101 | Aarav Patel | aarav@campus.edu | 9876543210 | Masala Dosa | 60.00 | South Indian | {Rice Batter, Potatoes, Ghee} | {150g, 100g, 15g} | PAY-901 | captured | 2026-11-10 | 12:30:00 |
| ORD-101 | Aarav Patel | aarav@campus.edu | 9876543210 | Filter Coffee | 20.00 | Beverages | {Coffee Decoction, Milk, Sugar} | {50ml, 150ml, 15g} | PAY-901 | captured | 2026-11-10 | 12:30:00 |
| ORD-102 | Priya Sharma | priya@campus.edu | 9876543211 | Paneer Butter Masala | 120.00 | North Indian | {Paneer, Tomatoes, Butter} | {120g, 80g, 25g} | PAY-902 | captured | 2026-11-10 | 13:00:00 |

### 1.2 Anomalies in the Unnormalized Relation

1. **Insertion Anomaly**:
   - A new dish (e.g., "Veg Hakka Noodles") cannot be introduced into the system without an active student order. If `order_id` is part of the primary key, inserting a new menu item requires inserting `NULL` for `order_id`, violating entity integrity.
   - Similarly, a new ingredient (e.g., "Soy Sauce") cannot be tracked until a recipe and order exist.

2. **Deletion Anomaly**:
   - If student Priya Sharma cancels her order `ORD-102`, deleting the record deletes the only knowledge in the system that "Paneer Butter Masala" costs ₹120.00, belongs to "North Indian", and uses "Paneer".

3. **Update (Modification) Anomaly**:
   - If the price of "Masala Dosa" increases from ₹60 to ₹70, every past and concurrent order row containing "Masala Dosa" must be updated. Failing to update every row leads to data inconsistency where the same dish exhibits multiple prices.

---

## 2. Functional Dependencies & Armstrong's Axioms

### 2.1 Attribute Abbreviations

Let the attributes of `CanteenOrder` be abbreviated as follows:
- $O$: `order_id`
- $SN$: `student_name`
- $SE$: `student_email`
- $SP$: `student_phone`
- $IN$: `item_name`
- $IP$: `item_price`
- $IC$: `item_category`
- $IG$: `ingredient_name`
- $IQ$: `ingredient_qty`
- $P$: `payment_id`
- $PS$: `payment_status`
- $SD$: `slot_date`
- $ST$: `slot_time`

### 2.2 Domain Real-World Functional Dependencies ($F$)

Based on business operations in an educational institution canteen:
1. $SE \rightarrow SN, SP$ (A unique institutional email identifies a single student name and registered phone).
2. $IN \rightarrow IP, IC$ (A unique dish name determines its price and category).
3. $\{IN, IG\} \rightarrow IQ$ (A specific dish and ingredient combination uniquely specifies the recipe quantity required).
4. $O \rightarrow SE, P, SD, ST$ (An order belongs to a specific student, has one payment, and is scheduled for a pickup date/time).
5. $P \rightarrow O, PS$ (A payment ID uniquely identifies the order and its payment status).
6. $\{O, IN\} \rightarrow \text{quantity}$ (An order can contain multiple dishes, each with an ordered quantity).

### 2.3 Application of Armstrong's Axioms

Armstrong's axioms provide a complete and sound deduction system:

1. **Reflexivity Rule**:
   - If $Y \subseteq X$, then $X \rightarrow Y$.
   - Example: $\{O, IN\} \rightarrow O$ and $\{O, IN\} \rightarrow IN$.
2. **Augmentation Rule**:
   - If $X \rightarrow Y$, then $XZ \rightarrow YZ$ for any attribute set $Z$.
   - Given $SE \rightarrow SN$, augmenting with $IN$: $\{SE, IN\} \rightarrow \{SN, IN\}$.
3. **Transitivity Rule**:
   - If $X \rightarrow Y$ and $Y \rightarrow Z$, then $X \rightarrow Z$.
   - Given $O \rightarrow SE$ and $SE \rightarrow SN$, by Transitivity: $O \rightarrow SN$.
   - Given $O \rightarrow P$ and $P \rightarrow PS$, by Transitivity: $O \rightarrow PS$.
4. **Decomposition (Projectivity) Rule**:
   - If $X \rightarrow YZ$, then $X \rightarrow Y$ and $X \rightarrow Z$.
   - From $O \rightarrow \{SE, P, SD, ST\}$, we decompose into: $O \rightarrow SE$, $O \rightarrow P$, $O \rightarrow SD$, $O \rightarrow ST$.
5. **Union (Additivity) Rule**:
   - If $X \rightarrow Y$ and $X \rightarrow Z$, then $X \rightarrow YZ$.
   - From $IN \rightarrow IP$ and $IN \rightarrow IC$, by Union: $IN \rightarrow \{IP, IC\}$.
6. **Pseudotransitivity Rule**:
   - If $X \rightarrow Y$ and $WY \rightarrow Z$, then $WX \rightarrow Z$.
   - Given $O \rightarrow IN$ (in a single item order context) and $\{IN, IG\} \rightarrow IQ$, then $\{O, IG\} \rightarrow IQ$.

---

## 3. Attribute Closure Computation & Candidate Keys

The attribute closure $X^+$ under functional dependency set $F$ is the set of all attributes functionally determined by $X$.

### 3.1 Step-by-Step Closure Computation

#### Computing $\{O, IN, IG\}^+$:
- **Initialization**: $\{O, IN, IG\}^{(0)} = \{O, IN, IG\}$.
- **Iteration 1**:
  - Since $O \rightarrow \{SE, P, SD, ST\}$, add $\{SE, P, SD, ST\}$.
  - Since $IN \rightarrow \{IP, IC\}$, add $\{IP, IC\}$.
  - Since $\{IN, IG\} \rightarrow IQ$, add $IQ$.
  - Current set: $\{O, IN, IG, SE, P, SD, ST, IP, IC, IQ\}$.
- **Iteration 2**:
  - Since $SE \rightarrow \{SN, SP\}$, add $\{SN, SP\}$.
  - Since $P \rightarrow PS$, add $PS$.
  - Current set: $\{O, IN, IG, SE, P, SD, ST, IP, IC, IQ, SN, SP, PS\}$.
- **Conclusion**:
  $$\{O, IN, IG\}^+ = \text{All attributes of } \text{CanteenOrder}$$

#### Testing Proper Subsets:
- $\{O, IN\}^+$ does not contain $IG$ or $IQ$.
- $\{O, IG\}^+$ does not contain $IN, IP, IC$.
- $\{IN, IG\}^+$ does not contain $O, SE, SN, SP, P, PS, SD, ST$.

Therefore, **$\{O, IN, IG\}$ is a minimal Superkey**, and hence the **Candidate Key** for the flat unnormalized relation.

---

## 4. First Normal Form (1NF)

### Definition:
A relation $R$ is in **1NF** if and only if all underlying domains contain only atomic (indivisible) values, and there are no repeating groups or nested multi-valued collections.

### Violation in Unnormalized Table:
In `CanteenOrder`, the attributes `ingredient_name` and `ingredient_qty` contain sets/arrays of values (e.g., `{"Rice Batter", "Potatoes", "Ghee"}`).

### Resolution:
1. Flatten each tuple so that each cell holds exactly one atomic value.
2. Decompose the recipe relationship into a dedicated structure so that menu dishes do not duplicate their ingredient breakdown per order.

Decomposed tables at 1NF:
- `CanteenOrder_1NF(order_id, student_email, student_name, student_phone, item_name, item_price, item_category, payment_id, payment_status, slot_date, slot_time)`
- `Dish_Ingredients_1NF(item_name, ingredient_name, ingredient_qty)`

Candidate Key for `CanteenOrder_1NF`: $\{O, IN\}$.

---

## 5. Second Normal Form (2NF)

### Definition:
A relation $R$ is in **2NF** if and only if it is in 1NF and **no non-prime attribute is partially dependent on any candidate key**. That is, every non-prime attribute must be fully functionally dependent on the entire primary key.

### Identifying Partial Dependencies in `CanteenOrder_1NF`:
The candidate key is $\{O, IN\}$.
- **Prime attributes**: $O$ (`order_id`), $IN$ (`item_name`).
- **Non-prime attributes**: $SN, SE, SP, IP, IC, P, PS, SD, ST$.

We observe the following partial dependencies:
1. $O \rightarrow SE, SN, SP, P, PS, SD, ST$ (Depends only on $O$, a proper subset of $\{O, IN\}$) $\rightarrow$ **Partial Dependency Violation!**
2. $IN \rightarrow IP, IC$ (Depends only on $IN$, a proper subset of $\{O, IN\}$) $\rightarrow$ **Partial Dependency Violation!**

### 2NF Decomposition:
To eliminate partial dependencies, we project the relation into three relations:

1. **`Order_Header_2NF`**$(\underline{O}, SE, SN, SP, P, PS, SD, ST)$
   - $PK = \{O\}$. All remaining attributes depend on the entire key $O$.
2. **`Food_Item_2NF`**$(\underline{IN}, IP, IC)$
   - $PK = \{IN\}$. All remaining attributes depend on the entire key $IN$.
3. **`Order_Item_2NF`**$(\underline{O, IN}, \text{quantity})$
   - $PK = \{O, IN\}$. Quantity requires both the order and the specific dish.

---

## 6. Third Normal Form (3NF)

### Definition:
A relation $R$ is in **3NF** if it is in 2NF and **no non-prime attribute is transitively dependent on the primary key**.
Formally, for every non-trivial functional dependency $X \rightarrow Y$ in $R$:
- $X$ is a superkey of $R$, OR
- $Y$ is a prime attribute (part of some candidate key).

### Identifying Transitive Dependencies in `Order_Header_2NF`:
In `Order_Header_2NF`$(\underline{O}, SE, SN, SP, P, PS, SD, ST)$:
- Primary Key = $O$.
- $O \rightarrow SE$, and $SE \rightarrow \{SN, SP\}$. Therefore, $O \rightarrow \{SN, SP\}$ is a **transitive dependency** via $SE$. Since $SE$ is not a superkey of `Order_Header_2NF` and $\{SN, SP\}$ are not prime attributes, this violates 3NF!
- $O \rightarrow P$, and $P \rightarrow PS$. Therefore, $O \rightarrow PS$ is a **transitive dependency** via $P$. This also violates 3NF!
- $O \rightarrow \{SD, ST\}$, and $\{SD, ST\} \rightarrow \text{capacity}$.

### 3NF Decomposition:
We decompose `Order_Header_2NF` by removing the transitively dependent attributes to their own relations:

1. **`Student_User`**$(\underline{SE}, SN, SP)$
   - FDs: $SE \rightarrow SN, SP$. Determinant $SE$ is a superkey.
2. **`Payment_Record`**$(\underline{P}, O, PS)$
   - FDs: $P \rightarrow O, PS$. Determinant $P$ is a superkey.
3. **`Pickup_Slot`**$(\underline{SD, ST}, \text{max\_capacity})$
   - Determinant is candidate key.
4. **`Order_Header_3NF`**$(\underline{O}, SE^{\text{FK}}, P^{\text{FK}}, SD^{\text{FK}}, ST^{\text{FK}})$
   - All FDs have $O$ as the determinant, which is a superkey.

---

## 7. Boyce-Codd Normal Form (BCNF) Analysis

### Definition:
A relation $R$ is in **BCNF** if and only if for every non-trivial functional dependency $X \rightarrow Y$, **$X$ is a superkey**.
BCNF is strictly stronger than 3NF because it removes the relaxation clause allowing $Y$ to be a prime attribute.

### Examining CampusEats 3NF Relations for BCNF Compliance:

1. **`users` Relation**:
   - FDs:
     - $\text{id} \rightarrow \text{email}, \dots$ ($\text{id}$ is superkey)
     - $\text{email} \rightarrow \text{id}, \dots$ ($\text{email}$ is superkey)
   - Every determinant is a superkey $\implies$ **In BCNF**.

2. **`food_categories` Relation**:
   - FDs: $\text{id} \rightarrow \text{name}$; $\text{name} \rightarrow \text{id}$.
   - Both determinants are superkeys $\implies$ **In BCNF**.

3. **`food_items` Relation**:
   - FD: $\text{id} \rightarrow \text{category\_id}, \text{name}, \text{price}, \dots$
   - $\text{id}$ is the primary key $\implies$ **In BCNF**.

4. **`recipes` Relation**:
   - FDs:
     - $\text{id} \rightarrow \text{food\_item\_id}, \text{ingredient\_id}, \text{quantity\_required}$
     - $\{\text{food\_item\_id}, \text{ingredient\_id}\} \rightarrow \text{id}, \text{quantity\_required}$
   - Both $\text{id}$ and $\{\text{food\_item\_id}, \text{ingredient\_id}\}$ are candidate keys (superkeys) $\implies$ **In BCNF**.

5. **`payments` Relation**:
   - FDs:
     - $\text{id} \rightarrow \text{order\_id}, \text{amount}, \dots$
     - $\text{order\_id} \rightarrow \text{id}, \text{amount}, \dots$
   - Because `order_id` is defined as `UNIQUE`, both determinants are superkeys $\implies$ **In BCNF**.

---

## 8. Fourth Normal Form (4NF) & Multi-Valued Dependencies

### Definition:
A relation $R$ is in **4NF** if and only if it is in BCNF and for every non-trivial **Multi-Valued Dependency (MVD)** $X \twoheadrightarrow Y$, $X$ is a superkey of $R$.
An MVD $X \twoheadrightarrow Y$ states that the presence of pairs of values of $Y$ associated with $X$ is completely independent of the values of the other attributes in $R$.

### Contextual Discussion in CampusEats:
Suppose we attempted to combine a food item's dietary tags with its available kitchen pickup stations in a single table:
$$\text{FoodItemDetails}(\underline{\text{item\_id}, \text{dietary\_tag}, \text{pickup\_station}})$$
- An item (e.g., "Masala Dosa") can have multiple dietary tags (`{"Vegetarian", "Gluten-Free"}`) and multiple pickup stations (`{"Counter 1", "Counter 3"}`).
- The dietary tags and pickup stations are mutually independent given `item_id`:
  $$\text{item\_id} \twoheadrightarrow \text{dietary\_tag} \quad \text{and} \quad \text{item\_id} \twoheadrightarrow \text{pickup\_station}$$
- In `FoodItemDetails`, the only candidate key is the all-attribute composite key $\{\text{item\_id}, \text{dietary\_tag}, \text{pickup\_station}\}$.
- Therefore, the determinant `item_id` is **not a superkey**, causing Cartesian multiplication of tuples (2 tags $\times$ 2 counters = 4 rows).

### Prevention in CampusEats:
CampusEats strictly isolates independent one-to-many concepts:
- Dietary tags are represented as atomic boolean flags on `food_items` (`is_vegetarian`).
- Recipes are isolated in `recipes`.
- Order selections are isolated in `order_items`.
- As a result, **no independent multi-valued dependencies exist**, satisfying **4NF**.

---

## 9. Fifth Normal Form (5NF / Project-Join Normal Form)

### Definition:
A relation $R$ is in **5NF (PJNF)** if and only if it is in 4NF and every non-trivial **Join Dependency (JD)** $\Join(R_1, R_2, \dots, R_n)$ in $R$ is implied by the candidate keys of $R$.
That is, $R$ cannot be decomposed into smaller projections without loss of semantic integrity, unless the projections can be joined back on superkeys.

### Join Dependency Context in CampusEats:
Consider a tripartite relationship involving:
- Chef $C$
- Food Item $F$
- Ingredient Supplier $S$

If a business rule states that *"A chef prepares a dish only if supplied by an approved supplier, and that supplier can only provide that ingredient if contracted for that dish"*, a cyclic join dependency exists that cannot be broken into binary relations without loss of information.

In **CampusEats**, no cyclic n-ary constraints are imposed between entities. Every association is fundamentally binary:
- Food items associate with ingredients via `recipes` (binary M:N).
- Orders associate with food items via `order_items` (binary M:N).
- Orders associate with pickup slots via `orders.pickup_slot_id` (binary 1:N).

Because every relation represents an elementary semantic association with no cyclic join constraints, all tables trivially satisfy **5NF**.

---

## 10. Summary: Normal Form Achieved by Final CampusEats Tables

| Relation | Primary Key | Alternate Keys | Highest Normal Form | Justification |
|:---|:---|:---|:---:|:---|
| `users` | `id` | `email` | **BCNF / 5NF** | All functional determinants (`id`, `email`) are superkeys. No MVDs. |
| `food_categories` | `id` | `name` | **BCNF / 5NF** | Both determinants (`id`, `name`) are minimal superkeys. |
| `food_items` | `id` | None | **BCNF / 5NF** | Every non-trivial FD is determined by `id`. Vector embedding is atomic. |
| `ingredients` | `id` | `name` | **BCNF / 5NF** | All attributes depend solely on candidate keys. |
| `recipes` | `id` | `(food_item_id, ingredient_id)` | **BCNF / 5NF** | Eliminates M:N between dishes and stock. Determinants are superkeys. |
| `pickup_slots` | `id` | `(slot_date, start_time, end_time)` | **BCNF / 5NF** | Schedule uniqueness is guaranteed; capacity counts are bounded. |
| `orders` | `id` | None | **BCNF / 5NF** | All order header metadata functionally derives directly from `id`. |
| `order_items` | `id` | `(order_id, food_item_id)` | **3NF / BCNF** | `subtotal` is mathematically derived ($qty \times price$); stored for performance/indexing. |
| `payments` | `id` | `order_id` | **BCNF / 5NF** | `order_id` is unique, guaranteeing 1:1 parity and making it a superkey. |
| `inventory_transactions` | `id` | None | **BCNF / 5NF** | Append-only ledger; all audit fields strictly depend on surrogate key `id`. |
| `notifications` | `id` | None | **BCNF / 5NF** | User alert logs uniquely identified by `id`. |

### Conclusion
The CampusEats database schema is verified to achieve **Boyce-Codd Normal Form (BCNF)** and **Fifth Normal Form (5NF)** across all core entities, with controlled, purposeful derivation in `order_items.subtotal` for query optimization and invoice immutability.
