# CampusEats — REST & WebSocket API Reference

All backend routes are served over HTTP/HTTPS with standard base prefix `/api`. 
Authenticated endpoints expect a Bearer token in the `Authorization` header:
```text
Authorization: Bearer <access_token>
```

---

## 1. Authentication Router (`/api/auth`)

### 1.1 Register New User
- **Method / Path**: `POST /api/auth/register`
- **Description**: Registers a student, staff, or admin account. Hashes passwords using salted bcrypt.
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "email": "aarav@campus.edu",
  "password": "Password123!",
  "full_name": "Aarav Patel",
  "phone": "+919876543210",
  "role": "student"
}
```
- **Response Body (201 Created)**:
```json
{
  "id": "a0000000-0000-0000-0000-000000000001",
  "email": "aarav@campus.edu",
  "full_name": "Aarav Patel",
  "phone": "+919876543210",
  "role": "student",
  "is_active": true,
  "created_at": "2026-11-07T14:00:00Z"
}
```
- **Error Codes**: `400 Bad Request` (Email already exists, password validation failure), `422 Unprocessable Entity`.

---

### 1.2 User Login
- **Method / Path**: `POST /api/auth/login`
- **Description**: Verifies credentials and issues signed JWT access and refresh tokens.
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "email": "student@campus.edu",
  "password": "student123"
}
```
- **Response Body (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "a0000000-0000-0000-0000-000000000001",
    "email": "student@campus.edu",
    "full_name": "Aarav Patel",
    "role": "student"
  }
}
```
- **Error Codes**: `401 Unauthorized` (Invalid email or password).

---

### 1.3 Refresh Access Token
- **Method / Path**: `POST /api/auth/refresh`
- **Description**: Exchanges a valid refresh token for a newly signed access token.
- **Auth**: None
- **Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response Body (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```
- **Error Codes**: `401 Unauthorized` (Expired or tampered token).

---

## 2. Users Router (`/api/users`)

### 2.1 Get Current Profile
- **Method / Path**: `GET /api/users/me`
- **Description**: Returns profile details of the authenticated caller.
- **Auth**: Required (`student`, `staff`, `admin`)
- **Response Body (200 OK)**:
```json
{
  "id": "a0000000-0000-0000-0000-000000000001",
  "email": "student@campus.edu",
  "full_name": "Aarav Patel",
  "phone": "+919876543210",
  "role": "student",
  "is_active": true
}
```
- **Error Codes**: `401 Unauthorized`.

---

### 2.2 Update Profile
- **Method / Path**: `PUT /api/users/me`
- **Description**: Updates profile details (full name, phone number).
- **Auth**: Required
- **Request Body**:
```json
{
  "full_name": "Aarav K. Patel",
  "phone": "+919876543999"
}
```
- **Response Body (200 OK)**:
```json
{
  "id": "a0000000-0000-0000-0000-000000000001",
  "email": "student@campus.edu",
  "full_name": "Aarav K. Patel",
  "phone": "+919876543999",
  "role": "student"
}
```

---

## 3. Food Catalog Router (`/api/food`)

### 3.1 List Categories
- **Method / Path**: `GET /api/food/categories`
- **Description**: Fetches all active food categories.
- **Auth**: Public
- **Response Body (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "South Indian",
    "description": "Traditional dosas, idlis, and filter coffee",
    "image_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc",
    "is_active": true
  }
]
```

### 3.2 Create Category
- **Method / Path**: `POST /api/food/categories`
- **Description**: Creates a new food category.
- **Auth**: Required (`staff`, `admin`)
- **Request Body**:
```json
{
  "name": "Continental",
  "description": "Sandwiches, burgers, and pasta",
  "image_url": "https://images.unsplash.com/photo-1550547660-d9450f859349"
}
```
- **Response Body (201 Created)**: Category object.
- **Error Codes**: `403 Forbidden` (Insufficient role).

### 3.3 List Food Items
- **Method / Path**: `GET /api/food/items`
- **Description**: Returns dishes with optional filtering.
- **Query Parameters**:
  - `category_id` (`int`, optional)
  - `is_vegetarian` (`bool`, optional)
  - `search` (`string`, optional)
- **Auth**: Public
- **Response Body (200 OK)**:
```json
[
  {
    "id": 1,
    "category_id": 1,
    "name": "Masala Dosa",
    "description": "Crisp fermented rice crepe stuffed with spiced potato masala",
    "price": 60.00,
    "image_url": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976",
    "is_available": true,
    "is_vegetarian": true,
    "preparation_time": 12
  }
]
```

### 3.4 Get Food Item by ID
- **Method / Path**: `GET /api/food/items/{item_id}`
- **Auth**: Public
- **Response Body (200 OK)**: Single FoodItemResponse object.
- **Error Codes**: `404 Not Found`.

### 3.5 Create Food Item
- **Method / Path**: `POST /api/food/items`
- **Auth**: Required (`staff`, `admin`)
- **Request Body**:
```json
{
  "category_id": 1,
  "name": "Rava Dosa",
  "description": "Semolina crepe tempered with mustard and ginger",
  "price": 70.00,
  "image_url": "https://images.unsplash.com/photo-rava-dosa",
  "is_vegetarian": true,
  "preparation_time": 15
}
```
- **Response Body (201 Created)**: Created FoodItemResponse.

### 3.6 Update Food Item
- **Method / Path**: `PUT /api/food/items/{item_id}`
- **Auth**: Required (`staff`, `admin`)
- **Request Body**: Subset of food item fields to modify.

### 3.7 Delete Food Item
- **Method / Path**: `DELETE /api/food/items/{item_id}`
- **Auth**: Required (`staff`, `admin`)
- **Response Body (204 No Content)**.

---

## 4. Shopping Cart Router (`/api/cart`)

Backed by Redis in-memory storage (`cart:{user_id}`) with 48-hour TTL.

### 4.1 Get Current User Cart
- **Method / Path**: `GET /api/cart/`
- **Auth**: Required (`student`)
- **Response Body (200 OK)**:
```json
{
  "items": [
    {
      "food_item_id": 1,
      "name": "Masala Dosa",
      "price": 60.00,
      "quantity": 2,
      "subtotal": 120.00
    }
  ],
  "total_amount": 120.00,
  "total_items": 2
}
```

### 4.2 Add Item to Cart
- **Method / Path**: `POST /api/cart/items`
- **Auth**: Required
- **Request Body**:
```json
{
  "food_item_id": 1,
  "quantity": 2
}
```
- **Response Body (200 OK)**: Updated CartResponse.

### 4.3 Update Cart Item Quantity
- **Method / Path**: `PUT /api/cart/items/{item_id}`
- **Auth**: Required
- **Request Body**: `{"quantity": 3}`.

### 4.4 Remove Item from Cart
- **Method / Path**: `DELETE /api/cart/items/{item_id}`
- **Auth**: Required
- **Response Body (200 OK)**: Updated CartResponse.

### 4.5 Clear Cart
- **Method / Path**: `DELETE /api/cart/`
- **Auth**: Required
- **Response Body (204 No Content)**.

---

## 5. Orders Router (`/api/orders`)

### 5.1 Create Order
- **Method / Path**: `POST /api/orders/`
- **Description**: Atomic order placement. Validates stock, locks slot capacity, creates order header, line items, and pending payment entity.
- **Auth**: Required (`student`)
- **Request Body**:
```json
{
  "pickup_slot_id": 2,
  "special_instructions": "Extra spicy sambar on the side"
}
```
- **Response Body (201 Created)**:
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "a0000000-0000-0000-0000-000000000001",
  "pickup_slot_id": 2,
  "status": "pending",
  "total_amount": 120.00,
  "qr_verified": false,
  "items": [
    {
      "food_item_id": 1,
      "food_name": "Masala Dosa",
      "quantity": 2,
      "unit_price": 60.00,
      "subtotal": 120.00
    }
  ],
  "created_at": "2026-11-07T14:15:00Z"
}
```
- **Error Codes**: `400 Bad Request` (Empty cart, pickup slot fully booked, insufficient ingredient inventory).

### 5.2 List User Orders
- **Method / Path**: `GET /api/orders/`
- **Auth**: Required
- **Response Body (200 OK)**: Array of `OrderResponse` objects sorted chronologically descending.

### 5.3 Get Order by ID
- **Method / Path**: `GET /api/orders/{order_id}`
- **Auth**: Required (Owner or Staff/Admin)
- **Response Body (200 OK)**: Full `OrderResponse` with items, slot, and payment metadata.

### 5.4 Cancel Order
- **Method / Path**: `POST /api/orders/{order_id}/cancel`
- **Description**: Cancels order, triggers ingredient stock restoration, and decrements slot counter.
- **Auth**: Required (Owner or Staff/Admin)
- **Response Body (200 OK)**: Updated `OrderResponse` (`status="cancelled"`).
- **Error Codes**: `400 Bad Request` (Order is already preparing or picked up).

---

## 6. Staff Kitchen Queue Router (`/api/staff`)

### 6.1 List Live Orders Queue
- **Method / Path**: `GET /api/staff/orders`
- **Description**: Live Kitchen Display System (KDS) queue sorted by pickup time.
- **Auth**: Required (`staff`, `admin`)
- **Response Body (200 OK)**: Array of active orders.

### 6.2 Update Order Status
- **Method / Path**: `PUT /api/staff/orders/{order_id}/status`
- **Description**: Transitions order lifecycle (`confirmed` $\rightarrow$ `accepted` $\rightarrow$ `preparing` $\rightarrow$ `ready` $\rightarrow$ `picked_up`).
- **Auth**: Required (`staff`, `admin`)
- **Request Body**:
```json
{
  "status": "ready"
}
```
- **Response Body (200 OK)**: Updated `OrderResponse`.
- **Error Codes**: `400 Bad Request` (Illegal state transition according to `trg_validate_order_status`).

---

## 7. Pickup Slots Router (`/api/pickup-slots`)

### 7.1 List Available Slots
- **Method / Path**: `GET /api/pickup-slots/`
- **Query Params**: `slot_date` (optional, default today).
- **Auth**: Public
- **Response Body (200 OK)**:
```json
[
  {
    "id": 1,
    "slot_date": "2026-11-07",
    "start_time": "12:30:00",
    "end_time": "12:45:00",
    "max_capacity": 30,
    "current_count": 14,
    "is_available": true
  }
]
```

### 7.2 Create Pickup Slot
- **Method / Path**: `POST /api/pickup-slots/`
- **Auth**: Required (`staff`, `admin`)
- **Request Body**: `{"slot_date": "2026-11-08", "start_time": "13:00:00", "end_time": "13:15:00", "max_capacity": 40}`.

---

## 8. Payments Router (`/api/payments`)

### 8.1 Create Razorpay Order
- **Method / Path**: `POST /api/payments/create-order`
- **Auth**: Required
- **Request Body**: `{"order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"}`.
- **Response Body (200 OK)**:
```json
{
  "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "razorpay_order_id": "order_NXKj29djAkd201",
  "amount": 12000,
  "currency": "INR",
  "key_id": "rzp_test_campuseats_demo"
}
```

### 8.2 Verify Payment Signature
- **Method / Path**: `POST /api/payments/verify`
- **Description**: Verifies cryptographic HMAC-SHA256 signature returned by Razorpay checkout client.
- **Auth**: Required
- **Request Body**:
```json
{
  "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "razorpay_order_id": "order_NXKj29djAkd201",
  "razorpay_payment_id": "pay_NXKj887Gf76dss",
  "razorpay_signature": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
- **Response Body (200 OK)**: `{"status": "captured", "message": "Payment verified successfully"}`.
- **Error Codes**: `400 Bad Request` (Signature mismatch / verification failure).

---

## 9. QR Code Router (`/api/qr`)

### 9.1 Get Order QR Code
- **Method / Path**: `GET /api/qr/{order_id}`
- **Auth**: Required (Order Owner or Staff)
- **Response Body (200 OK)**:
```json
{
  "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "qr_verified": false
}
```

### 9.2 Verify Pickup QR at Counter
- **Method / Path**: `POST /api/qr/verify`
- **Description**: Scanned by staff webcam scanner to dispatch food.
- **Auth**: Required (`staff`, `admin`)
- **Request Body**: `{"order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"}`.
- **Response Body (200 OK)**: Updated `OrderResponse` (`qr_verified=true`, `status="picked_up"`).

---

## 10. Inventory Router (`/api/inventory`)

### 10.1 List Ingredients & Stock
- **Method / Path**: `GET /api/inventory/ingredients`
- **Auth**: Required (`staff`, `admin`)
- **Response Body (200 OK)**: List of all tracked raw materials, current stock, and safety limits.

### 10.2 Restock Ingredient
- **Method / Path**: `POST /api/inventory/restock`
- **Auth**: Required (`staff`, `admin`)
- **Request Body**:
```json
{
  "ingredient_id": 1,
  "quantity": 50.00,
  "notes": "Weekly procurement from APMC wholesale mandi"
}
```
- **Response Body (200 OK)**: Logged `InventoryTransactionResponse`.

### 10.3 Low Stock Alerts
- **Method / Path**: `GET /api/inventory/low-stock`
- **Auth**: Required (`staff`, `admin`)
- **Response Body (200 OK)**: List of ingredients where `current_stock <= min_stock_level`.

---

## 11. Analytics Router (`/api/analytics`)

### 11.1 Executive Dashboard Statistics
- **Method / Path**: `GET /api/analytics/dashboard`
- **Auth**: Required (`admin`)
- **Response Body (200 OK)**:
```json
{
  "total_revenue_today": 18450.00,
  "total_orders_today": 142,
  "active_orders": 8,
  "top_selling_item": "Masala Dosa",
  "low_stock_count": 2
}
```

### 11.2 Historical Sales Trends
- **Method / Path**: `GET /api/analytics/sales`
- **Query Params**: `period` (`daily` | `weekly` | `monthly`).
- **Auth**: Required (`admin`)
- **Response Body (200 OK)**: Time-series revenue points for Recharts visualization.

### 11.3 Demand Forecast
- **Method / Path**: `GET /api/analytics/forecast`
- **Description**: Uses scikit-learn / moving averages to project tomorrow's portion demand per dish.
- **Auth**: Required (`admin`)

---

## 12. Search Router (`/api/search`)

### 12.1 Natural Language Semantic Vector Search
- **Method / Path**: `POST /api/search/semantic`
- **Description**: Generates 384-dimensional query embedding via `all-MiniLM-L6-v2` and executes HNSW cosine distance search (`<=>`) against `food_items.embedding`.
- **Auth**: Public
- **Request Body**:
```json
{
  "query": "something light and warm for breakfast",
  "limit": 5
}
```
- **Response Body (200 OK)**: Array of `FoodItemResponse` ranked by semantic similarity.

### 12.2 Trigram & Full-Text Search
- **Method / Path**: `GET /api/search/fulltext`
- **Query Params**: `q=crispy dosa`
- **Auth**: Public
- **Description**: Uses `to_tsvector` and `to_tsquery` with GIN indexing.

---

## 13. Graph / Neo4j Router (`/api/graph`)

### 13.1 Graph-Based Personalized Recommendations
- **Method / Path**: `GET /api/graph/recommendations/{user_id}`
- **Description**: Executes collaborative filtering in Cypher (`(:User)-[:ORDERED]->(:FoodItem)<-[:ORDERED]-(:User)-[:ORDERED]->(rec:FoodItem)`).
- **Auth**: Required
- **Response Body (200 OK)**: Array of recommended `FoodItemResponse`.

### 13.2 Trigger PostgreSQL-to-Neo4j Sync
- **Method / Path**: `POST /api/graph/sync`
- **Auth**: Required (`admin`)
- **Response Body (200 OK)**: `{"status": "completed", "nodes_synced": 450}`.

---

## 14. Admin User Management Router (`/api/admin`)

### 14.1 List All Users
- **Method / Path**: `GET /api/admin/users`
- **Auth**: Required (`admin`)

### 14.2 Modify User Role & Status
- **Method / Path**: `PUT /api/admin/users/{user_id}`
- **Auth**: Required (`admin`)
- **Request Body**: `{"role": "staff", "is_active": true}`.

---

## 15. Real-Time WebSocket (`/api/ws`)

- **Protocol & Endpoint**: `ws://localhost:8000/api/ws?token=<jwt_access_token>`
- **Description**: Establishes bi-directional full duplex event stream for live kitchen notifications, order stage transitions, and slot updates.
- **Client Frame Event Example**:
```json
{
  "event": "order_status_change",
  "data": {
    "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "old_status": "preparing",
    "new_status": "ready",
    "pickup_slot": "12:30 - 12:45"
  }
}
```
