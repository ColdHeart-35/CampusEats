# CampusEats — Academic DBMS Syllabus Curriculum Mapping

This document provides a comprehensive mapping of **CampusEats** against standard undergraduate university **Database Management Systems (DBMS)** curricula (e.g., VTU, Anna University, Mumbai University, AKTU, AICTE Model Curriculum).

Each theoretical concept is cross-referenced with its corresponding implementation file, architectural design, and practical SQL/Cypher demonstrations.

---

## Unit 1: Database Fundamentals, Data Modeling & Relational Algebra

| Academic Syllabus Concept | Theoretical Description | CampusEats Implementation & Artifact | File Location |
|:---|:---|:---|:---|
| **Entity-Relationship (ER) Modeling** | Conceptual schema design, entities, attributes, relationships, cardinalities. | Mermaid diagram modeling all 11 entities (`users`, `food_items`, `orders`, etc.) with cardinality proofs. | [`database/docs/er_diagram.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/docs/er_diagram.md) |
| **Relational Model & Conversion** | Formal relation signatures, primary keys, foreign keys, mapping ER models to relational tables. | Formal relational schema notation with ER-to-relational reduction rules (1:1, 1:N, M:N, weak entities). | [`database/docs/relational_schema.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/docs/relational_schema.md) |
| **Relational Algebra (RA)** | Procedural query language: Selection ($\sigma$), Projection ($\pi$), Cartesian ($\times$), Joins ($\bowtie$), Division ($\div$), Aggregation ($\mathcal{G}$). | Mathematical algebraic formulations mapped 1-to-1 to production PostgreSQL queries. | [`database/docs/relational_algebra.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/docs/relational_algebra.md) |
| **Integrity Constraints & DDL** | Entity integrity, referential integrity (`ON DELETE CASCADE`), domain constraints, check constraints. | Complete PostgreSQL DDL schema with check constraints (`price > 0`, `role IN (...)`), unique keys, and defaults. | [`database/sql/schema.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/schema.sql) |

---

## Unit 2: SQL, Advanced Queries & Procedural Database Programming

| Academic Syllabus Concept | Theoretical Description | CampusEats Implementation & Artifact | File Location |
|:---|:---|:---|:---|
| **Data Manipulation Language (DML)** | `INSERT`, `UPDATE`, `DELETE`, conditional case modifications, returning clauses. | DML operations with `RETURNING`, `CASE` expressions, and soft-delete/cascading patterns. | [`database/sql/advanced_queries.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/advanced_queries.sql#L8-L34) |
| **Complex Joins & Subqueries** | Inner Joins, Left/Right Outer Joins, Full Outer Joins, Correlated Subqueries, Semi-Joins. | Comprehensive joins across 4+ tables (Orders, Users, Items, Slots) and correlated `EXISTS` subqueries. | [`database/sql/advanced_queries.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/advanced_queries.sql#L65-L140) |
| **Set Operations** | `UNION`, `INTERSECT`, `EXCEPT` (Relational set operations with duplicate elimination). | Union of regional cuisines, intersection of common student meal preferences, difference for inactive dishes. | [`database/sql/advanced_queries.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/advanced_queries.sql#L36-L63) |
| **Common Table Expressions (CTEs)** | Non-recursive and recursive CTEs for breaking down complex hierarchical and analytical queries. | Monthly financial CTEs, category sales ranking, and recipe ingredient hierarchy breakdowns. | [`database/sql/advanced_queries.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/advanced_queries.sql#L142-L210) |
| **Analytic Window Functions** | `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`, `LEAD()`, `LAG()`, running totals via `OVER (PARTITION BY)`. | Daily running revenue calculations, meal ranking per category, and peak order velocity analysis. | [`database/sql/advanced_queries.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/advanced_queries.sql#L212-L290) |
| **Database Views & Materialized Views** | Logical views for abstraction and security; materialized views with concurrent refresh for performance. | `v_menu_with_categories`, `v_order_details`, `v_popular_items`, and `mv_revenue_by_category`. | [`database/sql/views.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/views.sql) |
| **Active Database Triggers** | Event-Condition-Action (ECA) rules: `BEFORE/AFTER INSERT/UPDATE/DELETE`, statement vs row triggers. | `trg_validate_order_status` (state machine), `trg_update_timestamp`, `trg_notify_low_stock`. | [`database/sql/triggers.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/triggers.sql) |
| **Stored Functions** | Encapsulated computational business logic returning scalar or tabular values. | `fn_calculate_order_total`, `fn_check_ingredient_availability`, `fn_get_popular_items`. | [`database/sql/functions.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/functions.sql) |
| **Stored Procedures & ACID Transactions** | Autonomous transaction boundaries (`COMMIT`, `ROLLBACK`), `SAVEPOINT`, row locking (`SELECT FOR UPDATE`). | `sp_process_order` (atomic order placement with stock check & slot lock), `sp_cancel_order`, `sp_restock_ingredient`. | [`database/sql/procedures.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/procedures.sql) |
| **Full-Text & Trigram Search** | Information retrieval in relational engines: inverted indexes, lexemes, stemming, ranking. | PostgreSQL `to_tsvector`, `to_tsquery`, English stop-words, and `pg_trgm` fuzzy similarity search. | [`database/sql/full_text_search.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/full_text_search.sql) |

---

## Unit 3: Normalization, Indexing & Query Optimization

| Academic Syllabus Concept | Theoretical Description | CampusEats Implementation & Artifact | File Location |
|:---|:---|:---|:---|
| **Functional Dependencies (FDs)** | Formal definition of $X \rightarrow Y$, Armstrong's axioms (reflexivity, augmentation, transitivity, union, decomposition). | Mathematical derivation of all domain FDs using Armstrong's inference rules. | [`database/docs/normalization.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/docs/normalization.md#L45-L95) |
| **Attribute Closure & Candidate Keys** | Algorithm for $X^+$, minimal superkey determination, finding all candidate keys. | Step-by-step computation of candidate keys from unnormalized `CanteenOrder` relation. | [`database/docs/normalization.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/docs/normalization.md#L97-L140) |
| **Normal Forms (1NF, 2NF, 3NF, BCNF)** | Elimination of repeating groups (1NF), partial dependencies (2NF), transitive dependencies (3NF), BCNF test. | Complete decomposition study from unnormalized flat table to 3NF/BCNF with anomaly proofs. | [`database/docs/normalization.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/docs/normalization.md#L142-L280) |
| **Higher Normal Forms (4NF, 5NF)** | Multi-valued dependencies ($X \twoheadrightarrow Y$) in 4NF; Join dependencies ($\Join(R_1, \dots, R_n)$) in 5NF. | Formal examination of independent multivalued facts and join dependencies in CampusEats. | [`database/docs/normalization.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/docs/normalization.md#L282-L345) |
| **Physical Indexing Architecture** | B-Trees, Hash, Composite indexes, Partial indexes, Inverted indexes (GIN/GiST). | Production B-Trees on all FKs, composite `(user_id, status)`, partial on active dishes, GIN on text. | [`database/sql/indexes.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/indexes.sql) |
| **Cost-Based Query Planning & EXPLAIN** | Cost formulas, `seq_page_cost`, `random_page_cost`, reading `EXPLAIN ANALYZE` execution trees. | Query execution plan demonstrations, plan tree reading, and index access path benchmarks. | [`database/docs/query_optimization.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/docs/query_optimization.md) & [`database/sql/optimization.sql`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/sql/optimization.sql) |

---

## Unit 4: NoSQL, Graph & Modern Specialized Databases

| Academic Syllabus Concept | Theoretical Description | CampusEats Implementation & Artifact | File Location |
|:---|:---|:---|:---|
| **Key-Value Data Stores** | In-memory key-value architecture, ephemeral caching, TTLs, session management. | **Redis 7**: Active shopping carts (`cart:{user_id}`), cached menu catalogs, slot counters, eviction policies. | [`docs/redis_guide.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/docs/redis_guide.md) |
| **Graph Databases & Cypher** | Property graph model (Nodes, Relationships, Properties), Index-Free Adjacency, Cypher query language. | **Neo4j 5**: Graph schema (`:Student`, `:FoodItem`, `:Ingredient`), collaborative filtering recommendation engine. | [`docs/neo4j_guide.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/docs/neo4j_guide.md) & [`database/neo4j/`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/database/neo4j/) |
| **Vector Databases & Neural Search** | High-dimensional dense embeddings, Approximate Nearest Neighbor (ANN) search, Cosine similarity, HNSW. | **pgvector in PostgreSQL 16**: 384-dimensional sentence-transformers embeddings with HNSW indexing for natural language search. | [`docs/pgvector_guide.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/docs/pgvector_guide.md) |
| **Polyglot Persistence Architecture** | Choosing the right database model for each sub-domain within a single unified enterprise application. | Unified system combining Relational ACID Core (PostgreSQL) + Key-Value Cache (Redis) + Graph Network (Neo4j) + Vector Search. | [`docs/architecture.md`](file:///home/myth/Documents/5thSem/Mini_Projects/DBMS/CampusEats/docs/architecture.md) |
