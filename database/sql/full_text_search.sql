-- ============================================================================
-- CampusEats Full-Text & Trigram Fuzzy Search Engine
-- Demonstrating Inverted Indexes (GIN), tsvector, tsquery, Ranking, and Trigrams
-- ============================================================================

-- Ensure extensions are loaded
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ----------------------------------------------------------------------------
-- 1. ADD GENERATED TSVECTOR COLUMN TO food_items
-- Automatically computed on INSERT / UPDATE (STORED generated column)
-- Combines name (Weight A - highest priority) and description (Weight B)
-- ----------------------------------------------------------------------------
ALTER TABLE food_items
DROP COLUMN IF EXISTS search_tsv;

ALTER TABLE food_items
ADD COLUMN search_tsv tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;

-- Create GIN index on the generated tsvector column
DROP INDEX IF EXISTS idx_food_items_tsv;
CREATE INDEX idx_food_items_tsv ON food_items USING gin(search_tsv);

COMMENT ON COLUMN food_items.search_tsv IS 'Precomputed inverted document index for lexical search';


-- ----------------------------------------------------------------------------
-- 2. DEMO FULL-TEXT SEARCH QUERIES
-- ----------------------------------------------------------------------------

-- 2.1 Simple Lexical Search: Match single stem words (e.g., 'dosa', 'rice', 'noodles')
-- 'rice' matches 'Rice', 'steamed rice', 'fried rice' via linguistic stemming
SELECT id, name, price, ts_rank(search_tsv, to_tsquery('english', 'rice')) AS rank
FROM food_items
WHERE search_tsv @@ to_tsquery('english', 'rice')
ORDER BY rank DESC;

-- 2.2 Boolean Search: AND (&), OR (|), NOT (!)
-- Find items that have 'cheese' or 'paneer' BUT NOT 'chicken'
SELECT id, name, description, price
FROM food_items
WHERE search_tsv @@ to_tsquery('english', '(paneer | cheese) & !chicken');

-- 2.3 Phrase Search: Followed by (<-> operator)
-- Searches for exact adjacent sequence: "filter" immediately followed by "coffee"
SELECT id, name, description, price
FROM food_items
WHERE search_tsv @@ to_tsquery('english', 'filter <-> coffee');

-- 2.4 Prefix Search (:* operator)
-- Useful for autocomplete: typing "sam" matches "sambar", "samosa", etc.
SELECT id, name, price
FROM food_items
WHERE search_tsv @@ to_tsquery('english', 'sam:*');

-- 2.5 Ranked Relevance Search with ts_rank_cd (Cover Density Ranking)
-- Weights match proximity and location (Title Weight A > Description Weight B)
SELECT
    fi.id,
    fi.name,
    fi.price,
    ROUND(ts_rank_cd(fi.search_tsv, query, 32 /* rank normalization */)::NUMERIC, 4) AS relevance_score,
    ts_headline(
        'english',
        fi.description,
        query,
        'StartSel=<b>, StopSel=</b>, MaxWords=15, MinWords=5'
    ) AS highlighted_snippet
FROM food_items fi,
     to_tsquery('english', 'spicy | masala | potato') query
WHERE fi.search_tsv @@ query
ORDER BY relevance_score DESC, fi.price ASC;


-- ----------------------------------------------------------------------------
-- 3. TRIGRAM SIMILARITY & TYPO-TOLERANT FUZZY SEARCH (pg_trgm)
-- ----------------------------------------------------------------------------

-- Set similarity threshold for current session (default is 0.3)
SET pg_trgm.similarity_threshold = 0.25;

-- 3.1 Trigram String Distance & Similarity
-- Handles user misspellings such as 'dosaa', 'paner', 'hakka noodels', 'biriyani'
SELECT
    name,
    similarity(name, 'dosaa') AS sim_score,
    word_similarity('dosaa', name) AS word_sim
FROM food_items
WHERE name % 'dosaa' OR similarity(name, 'dosaa') > 0.20
ORDER BY sim_score DESC;

-- 3.2 Fuzzy Search for Common Student Typos
SELECT
    id,
    name,
    price,
    ROUND(similarity(name, 'panir btr masala')::NUMERIC, 3) AS similarity_score
FROM food_items
WHERE name % 'panir btr masala' OR description % 'panir'
ORDER BY similarity_score DESC;


-- ----------------------------------------------------------------------------
-- 4. HYBRID SEARCH: COMBINING FTS + TRIGRAM SIMILARITY
-- Best of both worlds: If an exact stemmed word exists, FTS scores high;
-- if a typo is present, Trigram similarity kicks in and rescues the query!
-- ----------------------------------------------------------------------------
WITH QueryInput AS (
    SELECT 'sambhar dosa' AS user_query
)
SELECT
    fi.id,
    fi.name,
    fi.price,
    -- Hybrid scoring: 70% FTS weight + 30% trigram weight
    ROUND((
        COALESCE(ts_rank(fi.search_tsv, plainto_tsquery('english', q.user_query)), 0.0) * 0.70 +
        similarity(fi.name, q.user_query) * 0.30
    )::NUMERIC, 4) AS combined_score
FROM food_items fi, QueryInput q
WHERE fi.search_tsv @@ plainto_tsquery('english', q.user_query)
   OR fi.name % q.user_query
   OR similarity(fi.name, q.user_query) > 0.20
ORDER BY combined_score DESC;
