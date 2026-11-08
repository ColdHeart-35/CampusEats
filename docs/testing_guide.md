# CampusEats — Testing & Quality Assurance Guide

This guide provides testing instructions for both the backend FastAPI service and the Next.js frontend application, covering automated pytest unit/integration suites, database isolation, mock strategies, and manual end-to-end verification workflows.

---

## 1. Backend Testing Suite (pytest)

Backend test suites are implemented using `pytest` and `pytest-asyncio` with `httpx.AsyncClient` for asynchronous API route verification.

### 1.1 Running Tests

```bash
# Navigate to backend directory and activate virtual environment
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/backend
source venv/bin/activate

# Run all test suites with verbose output
python -m pytest -v

# Run specific test modules
python -m pytest tests/test_auth.py -v
python -m pytest tests/test_food.py -v
python -m pytest tests/test_orders.py -v
python -m pytest tests/test_cart.py -v

# Run tests with code coverage report
python -m pytest --cov=app tests/
```

### 1.2 Test Directory Structure & Module Responsibilities

```text
backend/tests/
├── conftest.py            # Global fixtures: async test DB engine, client session, test tokens
├── test_auth.py           # Registration, login, password hashing, JWT decoding, role checks
├── test_food.py           # Category listing, item filtering, veg flags, price validation
├── test_cart.py           # Redis-backed cart additions, updates, removals, subtotal calculation
├── test_orders.py         # Order placement, atomic transaction rollbacks, slot capacity limits
├── test_staff.py          # Kitchen KDS queue, order status transitions, state machine enforcement
├── test_inventory.py      # Stock checks, low stock triggers, restock logging
└── test_search.py         # Trigram keyword search, semantic vector query handling
```

### 1.3 Test Database Isolation Strategy

To ensure test repeatability without altering development or production datasets:

1. **Async SQLite / Test PostgreSQL Fixture**:
   - `conftest.py` configures an isolated database instance.
   - For PostgreSQL-specific features (`pgvector`, trigrams, PL/pgSQL triggers), tests connect to an isolated test schema (`campuseats_test_db`).
2. **Transaction Rollbacks**:
   - Every individual test function runs inside an isolated SQL transaction that issues a `ROLLBACK` upon test completion, leaving the database clean.
3. **Redis Test Namespace**:
   - Cart tests utilize Redis database index `1` (`redis://localhost:6379/1`) and execute `flushdb()` during fixture teardown.

---

## 2. Frontend Testing & Manual QA Workflows

### 2.1 Student Ordering Workflow (End-to-End)

1. **Authentication**:
   - Open `http://localhost:3000/login`.
   - Log in using `student@campus.edu` / `student123`.
   - Verify redirection to menu catalog (`/menu`).
2. **Menu Exploration & Search**:
   - Filter by "South Indian" cuisine category.
   - Toggle the "Vegetarian Only" green pill switch; confirm non-veg items disappear.
   - Enter a semantic natural-language query in the search bar: *"light morning snack"*.
   - Confirm semantic ranking surfaces Idli / Vada.
3. **Cart Assembly**:
   - Click "Add to Cart" on "Masala Dosa" (₹60) and "Filter Coffee" (₹20).
   - Click the shopping cart icon; verify total items = 2 and subtotal = ₹80.00.
   - Increment Masala Dosa quantity to 2; verify subtotal updates in real time to ₹140.00.
4. **Slot Scheduling & Checkout**:
   - Click "Proceed to Checkout".
   - Select an available pickup slot (e.g., `12:30 PM - 12:45 PM`).
   - Add special instructions: *"Less oil please"*.
   - Click "Confirm Order".
   - Complete simulated Razorpay test payment.
5. **QR Code Receipt**:
   - Verify instant display of the cryptographic QR code modal with order summary.

---

### 2.2 Kitchen Staff KDS & QR Dispatch Workflow

1. **Staff Portal Access**:
   - Open `http://localhost:3000/login`.
   - Log in using `staff@campus.edu` / `staff123`.
   - Navigate to `/staff/orders`.
2. **Kitchen Order Display (KDS)**:
   - Verify the student's order appears in the "Incoming" column.
   - Click "Accept Order" $\rightarrow$ status changes to `accepted`.
   - Click "Start Preparing" $\rightarrow$ status changes to `preparing`.
   - Click "Mark as Ready" $\rightarrow$ status changes to `ready`.
3. **Webcam / QR Verification Counter**:
   - Navigate to `/staff/scan`.
   - Grant browser webcam permission or paste the order ID token.
   - Scan the student's phone QR code.
   - Confirm screen displays green success checkmark with dish list and marks order `picked_up`.
   - Re-scan the same QR code; confirm system blocks dispatch with *"Already Picked Up"* warning.

---

### 2.3 Administrator Analytics & Inventory Workflow

1. **Admin Dashboard**:
   - Log in using `admin@campus.edu` / `admin123`.
   - Navigate to `/admin`.
   - Verify real-time financial cards: Total Revenue Today, Active Orders, Low Stock Alerts.
   - Inspect the Recharts visual graphs (Daily Sales Trend, Demand Forecast).
2. **Stock Replenishment**:
   - Navigate to `/admin/inventory`.
   - Find "Basmati Rice" (or an ingredient under threshold).
   - Click "Restock", input `+25 kg`, and submit.
   - Verify stock immediately increments on screen and an entry appears in `inventory_transactions`.
3. **Neo4j Graph Synchronization**:
   - Navigate to `/admin/graph-sync`.
   - Click "Sync PostgreSQL Orders to Neo4j".
   - Verify confirmation banner showing nodes synced.

---

## 3. Automated Frontend Tests

```bash
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/frontend

# Run Next.js production build check (validates TypeScript types & syntax)
npm run build
```
Any type mismatch or broken component import will immediately be detected during the Next.js compilation phase.
