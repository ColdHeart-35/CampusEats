# CampusEats — Complete Fedora Linux Setup Guide

This guide provides end-to-end instructions for installing, configuring, and launching the entire **CampusEats** application stack on **Fedora Linux** (Fedora 38, 39, 40+). It exclusively uses the `dnf` package manager and native system utilities.

---

## 1. Prerequisites & System Package Installation

Open your terminal on Fedora and install the required language runtimes, build tools, and container engines:

```bash
# 1. Update existing system packages
sudo dnf update -y

# 2. Install Development Tools & Compilers (required for C extensions like asyncpg and psycopg2)
sudo dnf groupinstall "Development Tools" -y
sudo dnf install gcc gcc-c++ make git curl wget -y

# 3. Install Python 3.11+ and development headers
sudo dnf install python3.11 python3.11-pip python3.11-devel -y

# 4. Install Node.js 20 LTS and npm
sudo dnf install nodejs npm -y

# 5. Verify installed runtime versions
python3.11 --version
# Expected: Python 3.11.x (or newer)
node --version
# Expected: v20.x.x
npm --version
# Expected: 10.x.x
```

---

## 2. Docker & Container Network Installation

CampusEats relies on Docker to orchestrate PostgreSQL 16 (with `pgvector`), Redis 7, and Neo4j 5.

```bash
# 1. Install Docker and the Docker Compose plugin via DNF
sudo dnf install docker docker-compose-plugin -y

# 2. Enable and start the Docker systemd daemon
sudo systemctl enable --now docker

# 3. Add your current user to the docker group (avoids typing sudo for docker commands)
sudo usermod -aG docker $USER
newgrp docker

# 4. Verify Docker daemon operation
docker --version
# Expected: Docker version 26.x.x (or newer)
docker compose version
# Expected: Docker Compose version v2.x.x
```

---

## 3. Launching Database Infrastructure Containers

Navigate to the project root directory and start the polyglot persistence containers:

```bash
# Navigate to project root
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats

# Start PostgreSQL (pgvector), Redis, and Neo4j in background mode
docker compose up -d
```

### Verification & Health Check:
Check the status of running containers:
```bash
docker compose ps
```
**Expected Terminal Output:**
```text
NAME                  IMAGE                           COMMAND                  SERVICE    CREATED         STATUS                   PORTS
campuseats-neo4j      neo4j:5-community               "tini -g -- /startup…"   neo4j      10 seconds ago  Up 9 seconds (healthy)   0.0.0.0:7474->7474/tcp, 0.0.0.0:7687->7687/tcp
campuseats-postgres   ankane/pgvector:v0.7.4-pg16     "docker-entrypoint.s…"   postgres   10 seconds ago  Up 9 seconds (healthy)   0.0.0.0:5432->5432/tcp
campuseats-redis      redis:7-alpine                  "docker-entrypoint.s…"   redis      10 seconds ago  Up 9 seconds (healthy)   0.0.0.0:6379->6379/tcp
```

Test database connectivity:
```bash
# Verify PostgreSQL readiness
docker exec -it campuseats-postgres pg_isready -U campuseats -d campuseats_db
# Output: /var/run/postgresql:5432 - accepting connections

# Verify Redis ping
docker exec -it campuseats-redis redis-cli ping
# Output: PONG

# Verify Neo4j status
docker exec -it campuseats-neo4j cypher-shell -u neo4j -p campuseats_neo4j "RETURN 1;"
# Output: 1
```

---

## 4. Backend Setup (FastAPI & Python Environment)

### 4.1 Create Virtual Environment & Install Dependencies

```bash
# Navigate to backend directory
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/backend

# Create a clean Python 3.11 virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip and install all backend requirements
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### 4.2 Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```ini
DATABASE_URL=postgresql+asyncpg://campuseats:campuseats_pass@localhost:5432/campuseats_db
DATABASE_URL_SYNC=postgresql://campuseats:campuseats_pass@localhost:5432/campuseats_db
REDIS_URL=redis://localhost:6379/0
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=campuseats_neo4j
JWT_SECRET_KEY=dev-secret-key-campus-eats-super-secure-change-in-prod-2026
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
RAZORPAY_KEY_ID=rzp_test_campuseats_demo
RAZORPAY_KEY_SECRET=campuseats_demo_secret_key
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
CORS_ORIGINS=["http://localhost:3000"]
```

---

## 5. Database Initialization & Schema Seeding

You can seed the database using either the direct SQL scripts or Alembic migrations:

### Option A: Loading Complete Production SQL Scripts (Recommended)

From the project root, execute the SQL scripts in strict dependency order:

```bash
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats

# 1. Execute DDL Schema (Tables, Constraints, Extensions)
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/schema.sql

# 2. Execute Sample Dataset (Categories, Dishes, Ingredients, Recipes, Slots, Users)
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/sample_data.sql

# 3. Create Physical Indexes (B-Tree, GIN, HNSW Vector)
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/indexes.sql

# 4. Create Triggers & Business Logic Validators
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/triggers.sql

# 5. Create Functions & Stored Procedures
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/functions.sql
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/procedures.sql

# 6. Create Views & Materialized Views
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/views.sql

# 7. Initialize Full-Text Search
docker exec -i campuseats-postgres psql -U campuseats -d campuseats_db < database/sql/full_text_search.sql
```

### Option B: Running Alembic Migrations
```bash
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/backend
source venv/bin/activate
alembic upgrade head
```

### Seed Neo4j Graph Database:
```bash
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats
docker exec -i campuseats-neo4j cypher-shell -u neo4j -p campuseats_neo4j < database/neo4j/schema.cypher
docker exec -i campuseats-neo4j cypher-shell -u neo4j -p campuseats_neo4j < database/neo4j/sample_data.cypher
```

---

## 6. Running the Backend Server

```bash
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/backend
source venv/bin/activate

# Start Uvicorn development server with live reload on port 8000
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected Terminal Output:**
```text
INFO:     Will watch for changes in: ['/home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/backend/app']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [12347]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

- **Interactive API Documentation (Swagger UI)**: `http://localhost:8000/docs`
- **Alternative ReDoc UI**: `http://localhost:8000/redoc`

---

## 7. Frontend Setup (Next.js 14)

Open a second terminal window:

```bash
# Navigate to frontend directory
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/frontend

# Copy frontend environment file
cp .env.local.example .env.local

# Install Node.js dependencies
npm install

# Start Next.js development server
npm run dev
```

**Expected Terminal Output:**
```text
   ▲ Next.js 14.2.x
   - Local:        http://localhost:3000
   - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 1.8s
```

Open your browser and navigate to: **`http://localhost:3000`**

---

## 8. Default Seed Credentials for Testing

| Role | Email | Password | Access Capabilities |
|:---|:---|:---|:---|
| **Student** | `student@campus.edu` | `student123` | Browsing menu, semantic search, placing orders, viewing pickup QR |
| **Kitchen Staff** | `staff@campus.edu` | `staff123` | Kitchen Order Display (KDS), queue updates, webcam QR verification |
| **Administrator** | `admin@campus.edu` | `admin123` | Full analytics dashboard, menu/price management, stock replenishment |

---

## 9. Stopping & Managing the Services

```bash
# Stop backend or frontend: Press CTRL + C in their respective terminal windows

# Stop background Docker containers:
cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats
docker compose stop

# Restart background Docker containers:
docker compose start

# Teardown containers and remove volume storage (clean slate reset):
docker compose down -v
```
