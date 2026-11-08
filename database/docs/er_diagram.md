# CampusEats — Entity-Relationship (ER) Model

This document defines the conceptual and logical Entity-Relationship (ER) model for the **CampusEats** Smart Campus Canteen Management System. The design encompasses **11 core relational entities** capturing user authentication, role-based authorization, menu item cataloging with vector embeddings, bill of materials (recipes), inventory tracking, pickup slot scheduling, transactional order processing, payments, and asynchronous notifications.

---

## 1. Complete Mermaid ER Diagram

```mermaid
erDiagram
    USERS ||--o{ ORDERS : "places (1:N)"
    USERS ||--o{ NOTIFICATIONS : "receives (1:N)"
    USERS ||--o{ INVENTORY_TRANSACTIONS : "authorizes (1:N)"
    
    FOOD_CATEGORIES ||--o{ FOOD_ITEMS : "categorizes (1:N)"
    
    FOOD_ITEMS ||--o{ RECIPES : "composed_of (1:N)"
    FOOD_ITEMS ||--o{ ORDER_ITEMS : "included_in (1:N)"
    
    INGREDIENTS ||--o{ RECIPES : "used_in (1:N)"
    INGREDIENTS ||--o{ INVENTORY_TRANSACTIONS : "mutates (1:N)"
    
    PICKUP_SLOTS ||--o{ ORDERS : "schedules (1:N)"
    
    ORDERS ||--o{ ORDER_ITEMS : "contains (1:N)"
    ORDERS ||--|| PAYMENTS : "settled_via (1:1)"

    USERS {
        uuid id PK "gen_random_uuid()"
        varchar email UK "Unique email address"
        varchar password_hash "Bcrypt salted hash"
        varchar full_name "User legal name"
        varchar phone "Contact number"
        varchar role "student | staff | admin"
        boolean is_active "Account status flag"
        timestamptz created_at "Registration time"
        timestamptz updated_at "Profile last modified"
    }

    FOOD_CATEGORIES {
        int id PK "Serial sequence"
        varchar name UK "Unique category name"
        text description "Display summary"
        varchar image_url "Category thumbnail"
        boolean is_active "Visibility toggle"
        timestamptz created_at "Creation timestamp"
    }

    FOOD_ITEMS {
        int id PK "Serial sequence"
        int category_id FK "References food_categories"
        varchar name "Dish name"
        text description "Ingredients & allergens"
        decimal price "Selling price (INR > 0)"
        varchar image_url "Item photo URL"
        boolean is_available "Kitchen stock status"
        boolean is_vegetarian "Dietary indicator"
        int preparation_time "Prep time in minutes"
        vector embedding "384-dim semantic vector"
        timestamptz created_at "Record creation"
        timestamptz updated_at "Last updated"
    }

    INGREDIENTS {
        int id PK "Serial sequence"
        varchar name UK "Raw material name"
        varchar unit "Unit of measure: kg, g, ml, pcs"
        decimal current_stock "Available physical quantity >= 0"
        decimal min_stock_level "Low stock reorder threshold"
        decimal cost_per_unit "Acquisition cost per unit"
        timestamptz created_at "First stocked"
        timestamptz updated_at "Stock level modified"
    }

    RECIPES {
        int id PK "Serial sequence"
        int food_item_id FK "References food_items"
        int ingredient_id FK "References ingredients"
        decimal quantity_required "Portion requirement > 0"
    }

    PICKUP_SLOTS {
        int id PK "Serial sequence"
        date slot_date "Calendar service date"
        time start_time "Slot start window"
        time end_time "Slot end window"
        int max_capacity "Maximum orders accepted > 0"
        int current_count "Orders assigned >= 0"
        boolean is_active "Slot enabled flag"
        timestamptz created_at "Slot generation timestamp"
    }

    ORDERS {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "References users (Customer)"
        int pickup_slot_id FK "References pickup_slots"
        varchar status "Order state machine status"
        decimal total_amount "Order sum in INR >= 0"
        text qr_code "Base64 pickup token"
        boolean qr_verified "Canteen dispatch check"
        text special_instructions "Chef kitchen note"
        timestamptz created_at "Placement timestamp"
        timestamptz updated_at "Status change timestamp"
    }

    ORDER_ITEMS {
        int id PK "Serial sequence"
        uuid order_id FK "References orders"
        int food_item_id FK "References food_items"
        int quantity "Portions ordered > 0"
        decimal unit_price "Historical price at purchase"
        decimal subtotal "quantity * unit_price"
    }

    PAYMENTS {
        uuid id PK "gen_random_uuid()"
        uuid order_id UK_FK "References orders (1:1)"
        varchar razorpay_order_id "Gateway order reference"
        varchar razorpay_payment_id "Gateway payment reference"
        varchar razorpay_signature "HMAC-SHA256 signature"
        decimal amount "Charged amount"
        varchar currency "ISO currency: INR"
        varchar status "created | authorized | captured | failed | refunded"
        timestamptz created_at "Payment initiation"
        timestamptz updated_at "Gateway callback status"
    }

    INVENTORY_TRANSACTIONS {
        int id PK "Serial sequence"
        int ingredient_id FK "References ingredients"
        varchar transaction_type "restock | deduction | adjustment | restoration"
        decimal quantity "Delta quantity change"
        varchar reference_id "Order ID or PO number"
        text notes "Audit justification"
        uuid created_by FK "References users (Staff)"
        timestamptz created_at "Mutation timestamp"
    }

    NOTIFICATIONS {
        int id PK "Serial sequence"
        uuid user_id FK "References users"
        varchar title "Notification headline"
        text message "Full alert payload"
        varchar notification_type "info | alert | promo"
        boolean is_read "Read receipt indicator"
        varchar reference_id "Target entity identifier"
        timestamptz created_at "Dispatch timestamp"
    }
```

---

## 2. Entity Descriptions & Attributes

### 2.1 `users` (Strong Entity)
- **Description**: Stores credentials, contact profiles, and permission roles for all canteen participants.
- **Attributes**:
  - `id` (`UUID`, Primary Key): Auto-generated unique identifier using cryptographic PRNG.
  - `email` (`VARCHAR(255)`, Unique, Not Null): Campus domain email for SSO / login.
  - `password_hash` (`VARCHAR(255)`, Not Null): Salted bcrypt password digest.
  - `full_name` (`VARCHAR(100)`, Not Null): Formal user name.
  - `phone` (`VARCHAR(15)`): Mobile phone number for SMS pickup notifications.
  - `role` (`VARCHAR(20)`, Default `'student'`): Role enum constrained to `'student'`, `'staff'`, `'admin'`.
  - `is_active` (`BOOLEAN`, Default `TRUE`): Soft-delete / suspension toggle.
  - `created_at` (`TIMESTAMPTZ`): Timestamp of user creation.
  - `updated_at` (`TIMESTAMPTZ`): Timestamp of profile modification.

### 2.2 `food_categories` (Strong Entity)
- **Description**: High-level groupings of canteen items (e.g., South Indian, North Indian, Chinese, Beverages, Snacks, Desserts).
- **Attributes**:
  - `id` (`SERIAL`, Primary Key): Incremental surrogate identifier.
  - `name` (`VARCHAR(100)`, Unique, Not Null): Category title.
  - `description` (`TEXT`): Overview of cuisine or meal type.
  - `image_url` (`VARCHAR(500)`): Thumbnail CDN URL.
  - `is_active` (`BOOLEAN`, Default `TRUE`): Whether items in this category are active on the digital menu.
  - `created_at` (`TIMESTAMPTZ`): Record insertion time.

### 2.3 `food_items` (Strong Entity)
- **Description**: Catalog of purchasable menu offerings including dietary properties and semantic embeddings for AI natural language search.
- **Attributes**:
  - `id` (`SERIAL`, Primary Key): Unique item identifier.
  - `category_id` (`INTEGER`, Foreign Key, Not Null): Links to `food_categories.id`.
  - `name` (`VARCHAR(200)`, Not Null): Name of the dish (e.g., "Masala Dosa").
  - `description` (`TEXT`): Full description, recipe notes, allergen information.
  - `price` (`DECIMAL(10,2)`, Not Null): Unit price in INR (Constraint: `price > 0`).
  - `image_url` (`VARCHAR(500)`): Dish photograph URL.
  - `is_available` (`BOOLEAN`, Default `TRUE`): Real-time kitchen availability flag.
  - `is_vegetarian` (`BOOLEAN`, Default `FALSE`): Dietary compliance indicator.
  - `preparation_time` (`INTEGER`, Default `15`): Estimated kitchen cook/prep duration in minutes.
  - `embedding` (`vector(384)`): 384-dimensional dense semantic embedding vector generated via `sentence-transformers/all-MiniLM-L6-v2`.
  - `created_at` (`TIMESTAMPTZ`): Record insertion time.
  - `updated_at` (`TIMESTAMPTZ`): Time of pricing/availability changes.

### 2.4 `ingredients` (Strong Entity)
- **Description**: Raw inventory commodities managed by the canteen kitchen for Bill of Materials (BOM) stock depletion.
- **Attributes**:
  - `id` (`SERIAL`, Primary Key): Raw material identifier.
  - `name` (`VARCHAR(100)`, Unique, Not Null): Ingredient name (e.g., "Basmati Rice", "Paneer", "Cooking Oil").
  - `unit` (`VARCHAR(20)`, Not Null): Stock metric (e.g., `kg`, `g`, `ml`, `l`, `pcs`).
  - `current_stock` (`DECIMAL(10,2)`, Not Null): Real-time balance on hand (Constraint: `current_stock >= 0`).
  - `min_stock_level` (`DECIMAL(10,2)`, Not Null, Default `0`): Safety threshold triggering reorder alerts.
  - `cost_per_unit` (`DECIMAL(10,4)`, Default `0`): Historical landed cost per unit.
  - `created_at` (`TIMESTAMPTZ`): Registration timestamp.
  - `updated_at` (`TIMESTAMPTZ`): Last stock movement timestamp.

### 2.5 `recipes` (Associative Entity / Weak Bridge)
- **Description**: Represents the Bill of Materials (BOM) resolving the Many-to-Many relationship between `food_items` and `ingredients`.
- **Attributes**:
  - `id` (`SERIAL`, Primary Key): Surrogate recipe entry identifier.
  - `food_item_id` (`INTEGER`, Foreign Key, Not Null): Target dish.
  - `ingredient_id` (`INTEGER`, Foreign Key, Not Null): Raw ingredient utilized.
  - `quantity_required` (`DECIMAL(10,2)`, Not Null): Unit amount required per single portion (Constraint: `> 0`).
  - **Constraints**: Composite Unique `(food_item_id, ingredient_id)` preventing duplicate ingredient entries per dish.

### 2.6 `pickup_slots` (Strong Entity)
- **Description**: Staggered kitchen pickup intervals to distribute peak canteen crowds during lunch and break hours.
- **Attributes**:
  - `id` (`SERIAL`, Primary Key): Unique slot identifier.
  - `slot_date` (`DATE`, Not Null): Date of delivery service.
  - `start_time` (`TIME`, Not Null): Slot start window (e.g., 12:30:00).
  - `end_time` (`TIME`, Not Null): Slot conclusion window (e.g., 12:45:00).
  - `max_capacity` (`INTEGER`, Not Null): Maximum number of orders accommodated (Constraint: `> 0`).
  - `current_count` (`INTEGER`, Not Null, Default `0`): Current orders booked (Constraint: `0 <= current_count <= max_capacity`).
  - `is_active` (`BOOLEAN`, Default `TRUE`): Allows kitchen staff to throttle/disable specific windows.
  - `created_at` (`TIMESTAMPTZ`): Slot publication time.
  - **Constraints**: `UNIQUE(slot_date, start_time, end_time)`.

### 2.7 `orders` (Strong Transactional Entity)
- **Description**: The central transaction header documenting student meal bookings, QR verification status, and fulfillment states.
- **Attributes**:
  - `id` (`UUID`, Primary Key): Cryptographic transaction token.
  - `user_id` (`UUID`, Foreign Key, Not Null): Customer account placing the order.
  - `pickup_slot_id` (`INTEGER`, Foreign Key, Nullable): Allocated pickup window.
  - `status` (`VARCHAR(20)`, Not Null, Default `'pending'`): Lifecycle enum: `'pending'`, `'confirmed'`, `'accepted'`, `'preparing'`, `'ready'`, `'picked_up'`, `'cancelled'`.
  - `total_amount` (`DECIMAL(10,2)`, Not Null): Order grand total (Constraint: `>= 0`).
  - `qr_code` (`TEXT`): Base64-encoded encrypted token rendered on student device.
  - `qr_verified` (`BOOLEAN`, Default `FALSE`): Verification flag checked by kitchen scanner.
  - `special_instructions` (`TEXT`): Custom dietary / preparation instructions.
  - `created_at` (`TIMESTAMPTZ`): Placement timestamp.
  - `updated_at` (`TIMESTAMPTZ`): State transition timestamp.

### 2.8 `order_items` (Weak Entity / Dependent on `orders`)
- **Description**: Line items capturing specific food items and snapshot historical pricing at the instant of order placement.
- **Attributes**:
  - `id` (`SERIAL`, Primary Key): Line item surrogate identifier.
  - `order_id` (`UUID`, Foreign Key, Not Null): Owning order header (`ON DELETE CASCADE`).
  - `food_item_id` (`INTEGER`, Foreign Key, Not Null): Selected menu dish.
  - `quantity` (`INTEGER`, Not Null): Portions ordered (Constraint: `quantity > 0`).
  - `unit_price` (`DECIMAL(10,2)`, Not Null): Locked historical unit price.
  - `subtotal` (`DECIMAL(10,2)`, Not Null): Calculated `quantity * unit_price`.

### 2.9 `payments` (Transactional Entity / 1:1 with `orders`)
- **Description**: Financial ledger capturing Razorpay gateway transaction status, payment IDs, and signatures.
- **Attributes**:
  - `id` (`UUID`, Primary Key): Internal payment reference.
  - `order_id` (`UUID`, Foreign Key, Unique, Not Null): 1-to-1 link to `orders.id`.
  - `razorpay_order_id` (`VARCHAR(100)`): Upstream Razorpay order handle.
  - `razorpay_payment_id` (`VARCHAR(100)`): Upstream capture reference.
  - `razorpay_signature` (`VARCHAR(255)`): Cryptographic HMAC verification hash.
  - `amount` (`DECIMAL(10,2)`, Not Null): Total settlement value in INR.
  - `currency` (`VARCHAR(3)`, Default `'INR'`): ISO 4217 currency.
  - `status` (`VARCHAR(20)`, Default `'created'`): State enum: `'created'`, `'authorized'`, `'captured'`, `'failed'`, `'refunded'`.
  - `created_at` (`TIMESTAMPTZ`): Payment initiation timestamp.
  - `updated_at` (`TIMESTAMPTZ`): Webhook confirmation timestamp.

### 2.10 `inventory_transactions` (Audit / Ledger Entity)
- **Description**: Append-only audit journal logging every physical stock movement (kitchen deductions, deliveries, spoilage).
- **Attributes**:
  - `id` (`SERIAL`, Primary Key): Transaction sequential ID.
  - `ingredient_id` (`INTEGER`, Foreign Key, Not Null): Impacted inventory item.
  - `transaction_type` (`VARCHAR(20)`, Not Null): Enum: `'restock'`, `'deduction'`, `'adjustment'`, `'restoration'`.
  - `quantity` (`DECIMAL(10,2)`, Not Null): Signed or context-bound numerical volume change.
  - `reference_id` (`VARCHAR(100)`): Traceability link (e.g., Order UUID or PO Number).
  - `notes` (`TEXT`): Human-readable operational explanation.
  - `created_by` (`UUID`, Foreign Key): Kitchen staff or manager UUID executing the entry.
  - `created_at` (`TIMESTAMPTZ`): Immutable recording timestamp.

### 2.11 `notifications` (User Communication Entity)
- **Description**: Real-time push and inbox notifications dispatched to users on order status updates or kitchen alerts.
- **Attributes**:
  - `id` (`SERIAL`, Primary Key): Notification event identifier.
  - `user_id` (`UUID`, Foreign Key, Not Null): Recipient user account.
  - `title` (`VARCHAR(200)`, Not Null): Brief summary header.
  - `message` (`TEXT`, Not Null): Notification body text.
  - `notification_type` (`VARCHAR(50)`, Default `'info'`): Type classification (`info`, `alert`, `order_status`).
  - `is_read` (`BOOLEAN`, Default `FALSE`): Acknowledgment flag.
  - `reference_id` (`VARCHAR(100)`): Optional target reference (e.g., order ID).
  - `created_at` (`TIMESTAMPTZ`): Timestamp of generation.

---

## 3. Relationship Cardinality & Business Rules

| Parent Entity | Relationship | Child Entity | Cardinality | Participation | Business Rule & Enforcement |
|:---|:---|:---|:---|:---|:---|
| `users` | places | `orders` | 1 : N (One-to-Many) | Mandatory parent, Optional child | A user can place 0 or many orders; each order must belong to exactly one user. |
| `food_categories` | classifies | `food_items` | 1 : N (One-to-Many) | Mandatory parent, Optional child | A category contains 0 or many food items; every food item belongs to exactly one active category. |
| `food_items` | defines recipe via | `recipes` | 1 : N (One-to-Many) | Optional parent, Optional child | A food item may have 0 or many recipe ingredient requirements; recipes point to 1 food item. |
| `ingredients` | used in | `recipes` | 1 : N (One-to-Many) | Optional parent, Optional child | An ingredient can be used across multiple recipes (M:N between `food_items` and `ingredients` via `recipes`). |
| `pickup_slots` | schedules | `orders` | 1 : N (One-to-Many) | Optional parent, Optional child | A pickup slot can host up to `max_capacity` orders; an order is assigned to at most 1 slot. |
| `orders` | contains | `order_items` | 1 : N (One-to-Many) | Mandatory parent, Mandatory child | An order contains 1 or many line items; cascading delete removes line items if draft order drops. |
| `food_items` | appears in | `order_items` | 1 : N (One-to-Many) | Optional parent, Mandatory child | A food item can appear in many order items; historical `unit_price` is frozen on `order_items`. |
| `orders` | settled by | `payments` | 1 : 1 (One-to-One) | Mandatory parent, Optional child | Each order has at most 1 payment record enforced by `payments.order_id UNIQUE`. |
| `ingredients` | mutated by | `inventory_transactions` | 1 : N (One-to-Many) | Mandatory parent, Optional child | Every stock deduction or restock creates an immutable transaction entry. |
| `users` | authorizes | `inventory_transactions` | 1 : N (One-to-Many) | Optional parent, Optional child | Staff member who authorized the stock modification. |
| `users` | receives | `notifications` | 1 : N (One-to-Many) | Mandatory parent, Optional child | Notifications belong to a single user; a user can receive multiple alerts over time. |
