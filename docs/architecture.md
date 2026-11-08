# CampusEats — System Architecture & Data Flow

This document details the multi-tier software architecture of the **CampusEats** platform. It provides high-level topological maps, component interactions, runtime deployment configurations, and end-to-end data flow specifications for core transactional workflows (ordering, payment settlement, and inventory deduction).

---

## 1. High-Level System Architecture

CampusEats follows a modern decoupled, multi-tier micro-monolith architecture designed for high concurrency, low latency, and ACID-compliant transaction safety.

```mermaid
graph TB
    subgraph ClientLayer ["Client Presentation Tier"]
        StudentDevice["Student Browser / Mobile PWA\n(Order, QR Display, Search)"]
        KitchenDevice["Canteen Staff Dashboard\n(KDS, QR Scanner, Order Queue)"]
        AdminDevice["Administrator Portal\n(Analytics, Inventory, Menu Config)"]
    end

    subgraph FrontendTier ["Next.js 14 Frontend Application (Port 3000)"]
        NextServer["Next.js App Router (SSR & Static Optimization)"]
        TailwindUI["Tailwind CSS + Lucide Icons + Recharts"]
        QRScanner["html5-qrcode Client Engine"]
        StateManagement["Client Context & Local Cache"]
    end

    subgraph APITier ["FastAPI Backend Application (Port 8000)"]
        UvicornServer["ASGI Server (Uvicorn / FastAPI Core)"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
        RouteHandlers["Modular Routers\n(Auth, Food, Cart, Orders, Staff, Payments, Search, Analytics)"]
        ServiceLayer["Service Layer & Transaction Coordinators\n(OrderService, InventoryService, PaymentService)"]
        WSManager["WebSocket Connection Manager\n(Order Milestone Broadcasts)"]
    end

    subgraph PolyglotPersistence ["Polyglot Persistence Layer"]
        PostgresDB[("PostgreSQL 16 + pgvector\n(Relational ACID Core, Foreign Keys,\nTriggers, Procedures, HNSW Vector Embeddings)\nPort 5432")]
        RedisCache[("Redis 7.0 In-Memory Store\n(Active Session Carts, Pub/Sub, Slot Cache)\nPort 6379")]
        Neo4jGraph[("Neo4j 5 Graph Database\n(User Interaction Graphs, Collaborative Filtering)\nPort 7687 / 7474")]
    end

    subgraph ExternalServices ["External Gateways"]
        RazorpayGateway["Razorpay Payment Gateway API\n(Order Creation & Webhook Verification)"]
    end

    %% Client to Frontend
    StudentDevice -->|HTTPS / WSS| NextServer
    KitchenDevice -->|HTTPS / WSS| NextServer
    AdminDevice -->|HTTPS / WSS| NextServer

    %% Frontend to Backend
    NextServer -->|REST API JSON / HTTP 1.1| UvicornServer
    TailwindUI -.->|Direct WebSocket Connection| WSManager

    %% Backend Routing
    UvicornServer --> AuthMiddleware
    AuthMiddleware --> RouteHandlers
    RouteHandlers --> ServiceLayer
    RouteHandlers --> WSManager

    %% Service Layer to Persistence
    ServiceLayer -->|SQLAlchemy 2.0 AsyncPG| PostgresDB
    ServiceLayer -->|redis-py Async| RedisCache
    ServiceLayer -->|neo4j-python-driver| Neo4jGraph

    %% External Gateway
    ServiceLayer -->|REST HTTPS| RazorpayGateway
```

---

## 2. Component Diagram

The following diagram illustrates internal modular components within the backend and frontend systems and their explicit dependency boundaries:

```mermaid
classDiagram
    direction TB

    class NextJSFrontend {
        +AuthContext
        +CartContext
        +MenuBrowser
        +QRDisplayModal
        +StaffOrderQueue
        +AnalyticsDashboard
    }

    class APIGateway {
        +verify_token()
        +require_role()
        +rate_limiter()
    }

    class OrderService {
        +create_order(db, user_id, cart) Order
        +update_status(db, order_id, status) Order
        +cancel_order(db, order_id) Order
    }

    class InventoryService {
        +check_stock(db, items) bool
        +deduct_stock(db, order_id) void
        +restore_stock(db, order_id) void
        +restock_ingredient(db, id, qty) void
    }

    class PaymentService {
        +create_order(amount, order_id) dict
        +verify_signature(order_id, pay_id, sig) bool
    }

    class CartService {
        +get_cart(redis, user_id) Cart
        +add_item(redis, user_id, item) Cart
        +clear_cart(redis, user_id) void
    }

    class SearchService {
        +semantic_search(db, query) List~FoodItem~
        +fulltext_search(db, query) List~FoodItem~
    }

    class Neo4jService {
        +sync_order_to_graph(order) void
        +get_recommendations(user_id) List~int~
    }

    NextJSFrontend --> APIGateway : HTTP Requests
    APIGateway --> OrderService
    APIGateway --> CartService
    APIGateway --> PaymentService
    APIGateway --> SearchService
    APIGateway --> Neo4jService

    OrderService --> InventoryService : Uses Stock Check & Deductions
    OrderService --> CartService : Clears on Checkout
    OrderService --> Neo4jService : Asynchronous Sync
```

---

## 3. Core Transactional Data Flows

### 3.1 End-to-End Order Placement & Payment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Client
    participant Frontend as Next.js Web App
    participant API as FastAPI Backend
    participant Redis as Redis Cache
    participant DB as PostgreSQL 16
    participant RZP as Razorpay Gateway
    participant WS as WebSocket Hub
    actor Staff as Kitchen Staff

    Student->>Frontend: Click "Proceed to Checkout"
    Frontend->>API: POST /api/cart/checkout (or /api/orders)
    API->>Redis: GET cart:{user_id}
    Redis-->>API: Active Cart Items

    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT current_stock FROM ingredients FOR UPDATE (Lock stock)
    alt Insufficient Ingredients
        DB-->>API: Stock Insufficient
        API->>DB: ROLLBACK
        API-->>Frontend: 400 Bad Request ("Item out of stock")
    else Stock Available
        API->>DB: INSERT INTO orders (status='pending')
        API->>DB: INSERT INTO order_items (...)
        API->>DB: COMMIT
        API->>RZP: POST /orders (amount, currency='INR')
        RZP-->>API: razorpay_order_id
        API->>DB: INSERT INTO payments (status='created', rzp_order_id)
        API-->>Frontend: 200 OK (order_id, rzp_order_id, razorpay_key)
    end

    Frontend->>Student: Launch Razorpay Checkout Modal
    Student->>RZP: Enter UPI / Card Credentials
    RZP-->>Frontend: Return payment_id & signature

    Frontend->>API: POST /api/payments/verify (order_id, payment_id, signature)
    API->>API: Verify HMAC-SHA256 signature
    alt Signature Valid
        API->>DB: BEGIN TRANSACTION
        API->>DB: UPDATE payments SET status='captured'
        API->>DB: UPDATE orders SET status='confirmed'
        API->>DB: Deduct ingredient stock & log inventory_transactions
        API->>DB: Increment pickup_slots.current_count
        API->>DB: COMMIT
        API->>Redis: DEL cart:{user_id}
        API->>WS: Broadcast new order to Kitchen Staff
        WS-->>Staff: Real-time sound alert & order ticket render
        API-->>Frontend: 200 OK (Payment Verified, QR Code Data)
        Frontend->>Student: Display Order Confirmation & Pickup QR
    else Signature Invalid
        API->>DB: UPDATE payments SET status='failed'
        API-->>Frontend: 400 Bad Request ("Signature mismatch")
    end
```

---

### 3.2 Kitchen Dispatch & QR Code Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Canteen Staff
    participant Scanner as Staff Web Dashboard (html5-qrcode)
    actor Student as Student at Counter
    participant API as FastAPI Backend
    participant DB as PostgreSQL 16
    participant WS as WebSocket Hub

    Student->>Staff: Presents Order QR Code on Phone
    Staff->>Scanner: Scans QR code using webcam / handheld scanner
    Scanner->>API: POST /api/qr/verify (order_id, token)
    
    API->>DB: SELECT * FROM orders WHERE id = order_id
    alt Order already picked up
        DB-->>API: qr_verified = TRUE, status = 'picked_up'
        API-->>Scanner: 400 Error ("Order has already been picked up!")
    else Order is READY
        API->>DB: UPDATE orders SET status = 'picked_up', qr_verified = TRUE, updated_at = NOW()
        API->>DB: INSERT INTO notifications (user_id, title, message)
        API->>WS: Broadcast event to Student device
        WS-->>Student: Push Notification: "Your order has been collected. Enjoy your meal!"
        API-->>Scanner: 200 OK (Order Verified: Student Name, Dishes, Status=Picked Up)
        Staff->>Student: Hands over food tray
    end
```

---

### 3.3 Inventory Depletion & Restock Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Canteen Manager
    participant Frontend as Admin Portal
    participant API as FastAPI Backend
    participant DB as PostgreSQL 16
    participant Triggers as PostgreSQL Trigger Engine

    Note over API, DB: Automated Recipe-Based Depletion
    API->>DB: Trigger/Procedure decrements ingredient stock on confirmed order
    DB->>Triggers: trg_notify_low_stock fires AFTER UPDATE on ingredients
    alt current_stock <= min_stock_level
        Triggers->>DB: INSERT INTO notifications (role='staff', title='Low Stock Alert')
    end

    Note over Admin, DB: Manual Restock Workflow
    Admin->>Frontend: Enters Restock: Basmati Rice +50 kg
    Frontend->>API: POST /api/inventory/restock
    API->>DB: CALL sp_restock_ingredient(ingredient_id=1, quantity=50, user_id=...)
    DB->>DB: UPDATE ingredients SET current_stock = current_stock + 50
    DB->>DB: INSERT INTO inventory_transactions (transaction_type='restock', quantity=50)
    DB-->>API: Success
    API-->>Frontend: 200 OK (Updated stock level: 75.00 kg)
```

---

## 4. Physical Deployment Architecture

CampusEats is architected for containerized deployment on Linux/Fedora workstations and production Kubernetes/Docker environments:

```mermaid
graph TD
    subgraph HostEnvironment ["Host Workstation / Fedora Linux"]
        subgraph DockerBridge ["Docker Container Network (campuseats_default)"]
            PostgresCont["campuseats-postgres\nankane/pgvector:v0.7.4-pg16\nPort: 5432:5432\nVolume: campuseats_postgres_data"]
            RedisCont["campuseats-redis\nredis:7-alpine\nPort: 6379:6379\nVolume: campuseats_redis_data"]
            Neo4jCont["campuseats-neo4j\nneo4j:5-community\nPorts: 7474:7474, 7687:7687\nVolume: campuseats_neo4j_data"]
        end

        subgraph HostServices ["Local Native Processes"]
            BackendProcess["FastAPI ASGI App\nUvicorn :8000\n(Python 3.11+ Venv)"]
            FrontendProcess["Next.js Node Server\nNext Dev/Start :3000\n(Node.js 20)"]
        end
    end

    FrontendProcess -->|Local Loopback HTTP| BackendProcess
    BackendProcess -->|TCP 5432| PostgresCont
    BackendProcess -->|TCP 6379| RedisCont
    BackendProcess -->|Bolt TCP 7687| Neo4jCont
```

---

## 5. Security & Isolation Architecture

1. **Authentication**: Stateless HMAC-SHA256 JSON Web Tokens (JWT) issued with 30-minute access expiration and 7-day refresh tokens.
2. **Authorization**: Strict Role-Based Access Control (RBAC) enforced via FastAPI dependency injection:
   - `student`: Can view active menu, manage personal cart, book orders, view personal QR.
   - `staff`: Can view kitchen queue, verify QR codes, modify order states, view ingredient stock.
   - `admin`: Can modify categories, alter item prices, trigger restock, access financial reports, inspect user graph.
3. **Database Concurrency Isolation**: Explicit row-level pessimistic locking (`SELECT ... FOR UPDATE`) prevents race conditions and overselling during simultaneous checkout of limited ingredients and pickup slots.
