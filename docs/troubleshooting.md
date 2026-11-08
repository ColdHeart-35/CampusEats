# CampusEats — Comprehensive Troubleshooting & FAQ Guide

This guide provides targeted diagnostics and resolutions for common issues encountered during setup, database initialization, container orchestration, and application runtime on Fedora Linux.

---

## 1. Docker & Container Network Issues

### 1.1 "Cannot connect to the Docker daemon at unix:///var/run/docker.sock"
- **Cause**: The Docker systemd service is inactive, or the current user is not in the `docker` group.
- **Resolution**:
  ```bash
  # Start and enable docker daemon
  sudo systemctl enable --now docker

  # Add user to docker group and reload group session
  sudo usermod -aG docker $USER
  newgrp docker
  ```

### 1.2 "Port already allocated" (5432, 6379, 7474, 7687)
- **Cause**: A local native PostgreSQL, Redis, or previous container instance is occupying the required host port.
- **Diagnostics**:
  ```bash
  # Check which process is listening on the port (e.g., 5432)
  sudo ss -tulpn | grep 5432
  # Or
  sudo lsof -i :5432
  ```
- **Resolution**:
  - If a local Fedora service is running, stop it:
    ```bash
    sudo systemctl stop postgresql
    sudo systemctl stop redis
    ```
  - If orphaned containers are holding the ports:
    ```bash
    docker compose down
    docker rm -f $(docker ps -aq)
    docker compose up -d
    ```

---

## 2. PostgreSQL & pgvector Issues

### 2.1 "password authentication failed for user 'campuseats'"
- **Cause**: An existing Docker volume (`campuseats_postgres_data`) was created with old credentials. Changing credentials in `.env` does not alter an already initialized volume.
- **Resolution**:
  ```bash
  cd /home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats
  # Reset volume (Caution: deletes all existing container DB data)
  docker compose down -v
  docker compose up -d postgres
  # Re-run schema initialization scripts
  ```

### 2.2 "extension 'vector' is not available"
- **Cause**: Standard `postgres:16` image was used instead of the pgvector image.
- **Resolution**:
  Verify `docker-compose.yml` specifies:
  ```yaml
  image: ankane/pgvector:v0.7.4-pg16
  ```
  Then recreate the container:
  ```bash
  docker compose up -d --force-recreate postgres
  ```

### 2.3 "relation '...' already exists" during script execution
- **Cause**: Scripts were run on an existing non-empty database without dropping tables first.
- **Resolution**:
  The top of `database/sql/schema.sql` contains `DROP TABLE IF EXISTS ... CASCADE;`. Simply re-run `schema.sql` to cleanly reset the schema.

---

## 3. Redis Connection Issues

### 3.1 "redis.exceptions.ConnectionError: Error 111 connecting to localhost:6379"
- **Cause**: Redis container is not running or stopped due to host memory limits.
- **Resolution**:
  ```bash
  docker compose ps redis
  docker compose logs redis
  docker compose restart redis
  ```
  Test ping:
  ```bash
  docker exec -it campuseats-redis redis-cli ping
  ```

---

## 4. Neo4j Authentication & Graph Issues

### 4.1 "The client is unauthorized due to authentication failure"
- **Cause**: Neo4j credentials in `docker-compose.yml` (`NEO4J_AUTH=neo4j/campuseats_neo4j`) do not match the environment variable in `backend/.env`.
- **Resolution**:
  Ensure `backend/.env` contains:
  ```ini
  NEO4J_URI=bolt://localhost:7687
  NEO4J_USER=neo4j
  NEO4J_PASSWORD=campuseats_neo4j
  ```
  If resetting Neo4j credentials:
  ```bash
  docker compose stop neo4j
  docker volume rm campuseats_neo4j_data campuseats_neo4j_logs
  docker compose up -d neo4j
  ```

---

## 5. Python & Alembic Issues

### 5.1 "ModuleNotFoundError: No module named 'psycopg2' or 'asyncpg'"
- **Cause**: Missing Fedora C development libraries before compiling Python database drivers.
- **Resolution**:
  ```bash
  sudo dnf install gcc gcc-c++ python3.11-devel libpq-devel -y
  source backend/venv/bin/activate
  pip install --upgrade pip
  pip install -r backend/requirements.txt
  ```

### 5.2 "Target database is not up to date" in Alembic
- **Cause**: Database contains untracked migrations or schema drift.
- **Resolution**:
  ```bash
  cd backend
  source venv/bin/activate
  # Stamp database with current head version:
  alembic stamp head
  ```

---

## 6. Machine Learning & sentence-transformers Issues

### 6.1 Network Timeout Downloading `all-MiniLM-L6-v2`
- **Cause**: HuggingFace CDN unreachable or slow campus firewall.
- **Resolution**:
  - The CampusEats `embedding_service.py` detects this and **automatically activates a deterministic fallback** mode so the server never crashes.
  - To pre-cache the model manually:
    ```bash
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
    ```

---

## 7. Node.js & Frontend Issues

### 7.1 "Next.js requires Node.js version >= 18.17.0"
- **Cause**: Obsolete Node.js version installed on host.
- **Resolution**:
  ```bash
  # Check version
  node -v
  # Upgrade via Fedora DNF
  sudo dnf install nodejs npm -y
  ```

### 7.2 "CORS Error: No 'Access-Control-Allow-Origin' header is present"
- **Cause**: Frontend origin (`http://localhost:3000`) is not in FastAPI CORS allowed origins.
- **Resolution**:
  In `backend/.env`, verify:
  ```ini
  CORS_ORIGINS=["http://localhost:3000"]
  ```
  Restart the FastAPI uvicorn server.

---

## 8. WebSocket Connection Failures

### 8.1 "WebSocket connection to 'ws://localhost:8000/api/ws' failed"
- **Cause 1**: Token missing or expired in connection URL.
  - Fix: Ensure frontend passes valid token: `ws://localhost:8000/api/ws?token=<valid_jwt>`.
- **Cause 2**: Uvicorn running without websockets package.
  - Fix: Verify `pip install websockets>=12.0` in backend virtualenv.
