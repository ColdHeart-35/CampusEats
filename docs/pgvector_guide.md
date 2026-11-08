# CampusEats — pgvector & Semantic Vector Search Guide

This document details the configuration and operational mechanics of the **pgvector** extension within PostgreSQL 16 for **CampusEats**. It explains how dense neural embeddings enable natural-language semantic menu search, discusses distance operators, compares vector index architectures (HNSW vs IVFFlat), and outlines production fallback strategies.

---

## 1. What is pgvector & Why is it Used?

Traditional relational database search relies on exact keyword matching (`WHERE name = 'Dosa'`) or string wildcards (`LIKE '%rice%'`). However, hungry campus students frequently search conceptually:
- *"hot soup for cold weather"*
- *"protein packed post workout meal"*
- *"sweet comfort food"*
- *"light breakfast snack"*

Lexical search fails when user keywords do not match dish titles literally. **pgvector** solves this by storing dense 384-dimensional mathematical embeddings directly alongside relational records, executing **Approximate Nearest Neighbor (ANN)** searches at SQL query speeds.

---

## 2. Docker Container & Extension Installation

CampusEats uses the official `ankane/pgvector:v0.7.4-pg16` Docker image, which pre-compiles the C vector extension for PostgreSQL 16.

Within SQL DDL (`database/sql/schema.sql`), the extension is activated via:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Verify extension activation in `psql`:
```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
-- Expected: vector | 0.7.4
```

---

## 3. Embedding Pipeline: `all-MiniLM-L6-v2`

CampusEats generates dense vector representations using the lightweight, high-performance Sentence-Transformers model `sentence-transformers/all-MiniLM-L6-v2`:
- **Dimensionality**: 384 dimensions ($D = 384$).
- **Context Length**: Up to 256 WordPiece tokens.
- **Normalized Geometry**: Vectors are normalized to unit sphere length ($\|v\| = 1.0$), making Cosine Distance computationally equivalent to Euclidean distance.

### 3.1 Relational Schema Definition
In `food_items`:
```sql
CREATE TABLE food_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    embedding vector(384),   -- 384-dimensional dense semantic vector
    ...
);
```

### 3.2 Embedding Generation Script
The backend service (`backend/app/services/embedding_service.py`) encapsulates model inference:
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

def generate_embedding(text: str) -> list[float]:
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()
```

Each food item embedding encodes both its title and culinary description:
```text
text = f"{name}: {description}. Vegetarian: {is_vegetarian}"
```

---

## 4. Vector Distance Operators in PostgreSQL

pgvector introduces dedicated binary operators for distance metrics:

| Operator | Distance Metric | Formula | Recommended Use Case |
|:---|:---|:---:|:---|
| `<=>` | **Cosine Distance** | $1 - \frac{u \cdot v}{\|u\|_2 \|v\|_2}$ | **Recommended for text embeddings** (direction-based semantic similarity). Range: $[0, 2]$. |
| `<->` | **L2 / Euclidean Distance** | $\|u - v\|_2 = \sqrt{\sum (u_i - v_i)^2}$ | Geometric Euclidean spatial distance. |
| `<#>` | **Negative Inner Product** | $-(u \cdot v)$ | Maximizing dot product when vectors are pre-normalized. |

---

## 5. Semantic Vector Search SQL Queries

### 5.1 Basic Semantic Similarity Search
Retrieve the top 5 food items matching a student's natural-language query embedding:

```sql
SELECT 
    id,
    name,
    price,
    is_vegetarian,
    description,
    1 - (embedding <=> '[0.0213, -0.0451, ..., 0.0812]') AS similarity_score
FROM food_items
WHERE is_available = TRUE 
  AND embedding IS NOT NULL
ORDER BY embedding <=> '[0.0213, -0.0451, ..., 0.0812]' ASC
LIMIT 5;
```

### 5.2 Hybrid Filtered Vector Search
Combine relational boolean filters (dietary requirements, price budget) with vector similarity:

```sql
SELECT 
    fi.id,
    fi.name,
    fi.price,
    fc.name AS category_name,
    1 - (fi.embedding <=> '[0.0213, -0.0451, ..., 0.0812]') AS similarity_score
FROM food_items fi
JOIN food_categories fc ON fi.category_id = fc.id
WHERE fi.is_available = TRUE
  AND fi.is_vegetarian = TRUE       -- Relational filter
  AND fi.price <= 100.00            -- Budget constraint
ORDER BY fi.embedding <=> '[0.0213, -0.0451, ..., 0.0812]' ASC
LIMIT 5;
```

---

## 6. Vector Indexing: HNSW vs. IVFFlat

CampusEats configures **HNSW** for production vector lookups. Here is why:

| Architectural Feature | IVFFlat (Inverted File Flat) | HNSW (Hierarchical Navigable Small World) |
|:---|:---|:---|
| **Underlying Structure** | Inverted list based on k-means cluster centroids (Voronoi partitions). | Multi-layer graph network of proximity links between vectors. |
| **Index Training Required**| **Yes**. Must run `CREATE INDEX` only *after* populating data to train centroids. | **No**. Can be created on empty or small tables; accepts real-time inserts seamlessly. |
| **Search Query Latency** | Moderate ($5 - 15\text{ ms}$). Degrades if `ivfflat.probes` is increased. | Ultra-low ($1 - 3\text{ ms}$) with $98\%+$ recall. |
| **Build Time & RAM Usage**| Fast build time; small RAM footprint. | Slower initial build; higher RAM usage during construction. |
| **Dynamic Mutability** | Poor. Degrades as new rows are inserted unless re-indexed (`REINDEX`). | **Excellent**. New items automatically link into the small-world graph. |

### HNSW Index DDL in CampusEats:
Defined in `database/sql/indexes.sql`:
```sql
CREATE INDEX idx_food_items_embedding_hnsw 
ON food_items 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```
- **`m = 16`**: Maximum number of bidirectional connection links per node (higher improves recall at the expense of memory).
- **`ef_construction = 64`**: Size of dynamic candidate list examined during index construction.

---

## 7. Graceful Fallback Behavior

In resource-constrained environments (e.g., student laptops without PyTorch, offline mode, or low RAM), `backend/app/services/embedding_service.py` implements a graceful fallback:

1. **Model Loading Try/Catch**:
   - If `sentence-transformers` is not installed or fails to initialize, the service logs:
     ```text
     WARNING: sentence-transformers model unavailable. Falling back to deterministic trigram vector approximation.
     ```
2. **Deterministic Hash Vectors**:
   - Generates repeatable pseudo-embeddings derived from ASCII hash buckets for demo consistency.
3. **Automatic Fallback to Trigram / ILIKE**:
   - If `food_items.embedding` is NULL, the API search endpoint automatically falls back to the PostgreSQL Trigram Full-Text search engine (`to_tsquery('english', query)` or `ILIKE`), ensuring the user never receives a 500 Internal Server Error.
