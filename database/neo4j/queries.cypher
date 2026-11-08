// ============================================================================
// CampusEats Graph Queries & Algorithms (Neo4j Cypher)
// Demonstrating Graph Traversal, Pattern Matching, Recommendation Engines,
// Shortest Path, Centrality, and Graph Aggregations
// ============================================================================

// ----------------------------------------------------------------------------
// 1. ALL ITEMS ORDERED BY A SPECIFIC STUDENT
// Purpose: Basic 1-hop path traversal from student to menu items
// DBMS Relevance: Equivalent to a 3-table SQL join (users JOIN orders JOIN order_items)
// but traverses direct index-free adjacency in constant O(1) pointer time.
// ----------------------------------------------------------------------------
MATCH (s:Student {user_id: 'a0000000-0000-0000-0000-000000000001'})-[r:ORDERED]->(f:FoodItem)
RETURN s.name AS student,
       f.name AS ordered_item,
       f.price AS unit_price,
       r.quantity AS quantity_purchased,
       r.timestamp AS order_timestamp
ORDER BY r.timestamp DESC;


// ----------------------------------------------------------------------------
// 2. INGREDIENTS COMMONLY USED TOGETHER (Co-occurrence Network)
// Purpose: Find ingredient pairs that frequently co-exist across recipes
// DBMS Relevance: In relational DBs, this requires expensive self-joins on recipes.
// In Graph DBs, it is an intuitive diamond pattern traversal (i1)<-[:CONTAINS]-(f)-[:CONTAINS]->(i2).
// ----------------------------------------------------------------------------
MATCH (i1:Ingredient)<-[:CONTAINS]-(f:FoodItem)-[:CONTAINS]->(i2:Ingredient)
WHERE id(i1) < id(i2) // Prevent duplicate symmetric pairs
RETURN i1.name AS ingredient_a,
       i2.name AS ingredient_b,
       count(f) AS shared_dishes_count,
       collect(f.name) AS dishes
ORDER BY shared_dishes_count DESC, ingredient_a
LIMIT 10;


// ----------------------------------------------------------------------------
// 3. STUDENT FOOD PREFERENCE ANALYSIS (Favorite Categories)
// Purpose: Aggregates student consumption patterns up to the cuisine category level
// DBMS Relevance: Multi-hop graph projection (Student -> FoodItem -> Category)
// with Cypher group aggregation to generate real-time dietary profiles.
// ----------------------------------------------------------------------------
MATCH (s:Student)-[r:ORDERED]->(f:FoodItem)-[:BELONGS_TO]->(c:Category)
RETURN s.name AS student,
       c.name AS preferred_category,
       sum(r.quantity) AS total_orders_in_category,
       collect(DISTINCT f.name) AS favorite_dishes
ORDER BY student, total_orders_in_category DESC;


// ----------------------------------------------------------------------------
// 4. COLLABORATIVE FILTERING: STUDENTS WHO ORDERED SIMILAR ITEMS
// Purpose: Identifies peer students who share taste profiles (Item-based / User-based CF)
// Pattern: (Student A) -[:ORDERED]-> (Item) <-[:ORDERED]- (Student B)
// DBMS Relevance: Foundational recommendation pattern. Fast in graph because it navigates
// shared node hubs rather than calculating cartesian matrix dot-products.
// ----------------------------------------------------------------------------
MATCH (s1:Student {name: 'Aarav Patel'})-[:ORDERED]->(shared:FoodItem)<-[:ORDERED]-(s2:Student)
WHERE s1 <> s2
RETURN s1.name AS target_student,
       s2.name AS similar_peer,
       count(shared) AS common_items_count,
       collect(shared.name) AS common_items
ORDER BY common_items_count DESC;


// ----------------------------------------------------------------------------
// 5. SHORTEST PATH BETWEEN INGREDIENT AND STUDENT
// Purpose: Trace supply chain connection: how a batch of raw material reached a student plate
// DBMS Relevance: Demonstrates graph pathfinding algorithm (Breadth-First Search).
// Extremely cumbersome in SQL (requires recursive CTE with arbitrary depth limits).
// ----------------------------------------------------------------------------
MATCH (s:Student {name: 'Aarav Patel'}),
      (ing:Ingredient {name: 'Red Onions'}),
      p = shortestPath((s)-[*..5]-(ing))
RETURN p, length(p) AS hops_count;


// ----------------------------------------------------------------------------
// 6. DEGREE CENTRALITY: MOST CONNECTED FOOD ITEMS
// Purpose: Identify menu items with the highest connectivity (orders + ingredients)
// DBMS Relevance: Network centrality metric highlighting high-impact core dishes.
// If a high-degree item runs out of stock, it ripples across multiple operational flows.
// ----------------------------------------------------------------------------
MATCH (f:FoodItem)
OPTIONAL MATCH (f)<-[ord:ORDERED]-()
OPTIONAL MATCH (f)-[con:CONTAINS]->()
RETURN f.name AS item_name,
       f.price AS price,
       count(DISTINCT ord) AS order_connections,
       count(DISTINCT con) AS ingredient_connections,
       (count(DISTINCT ord) + count(DISTINCT con)) AS total_degree_centrality
ORDER BY total_degree_centrality DESC;


// ----------------------------------------------------------------------------
// 7. GRAPH PATTERN MATCHING FOR PERSONALIZED RECOMMENDATIONS
// Purpose: "Students who bought items you like also bought these items that you haven't tried yet"
// Pattern: (Target) -[:ORDERED]-> (Shared) <-[:ORDERED]- (Peer) -[:ORDERED]-> (Recommendation)
// ----------------------------------------------------------------------------
MATCH (target:Student {user_id: 'a0000000-0000-0000-0000-000000000001'})-[:ORDERED]->(f1:FoodItem)
      <-[:ORDERED]-(peer:Student)-[:ORDERED]->(rec:FoodItem)
WHERE NOT (target)-[:ORDERED]->(rec)
RETURN rec.name AS recommended_dish,
       rec.price AS price,
       count(DISTINCT peer) AS recommendation_strength,
       collect(DISTINCT peer.name) AS recommended_by_peers
ORDER BY recommendation_strength DESC, rec.price ASC
LIMIT 5;


// ----------------------------------------------------------------------------
// 8. GRAPH AGGREGATION: INGREDIENT CONSUMPTION BY STUDENT CUISINE DEMAND
// Purpose: Quantifies how student orders drive raw ingredient demand in kilograms
// DBMS Relevance: Demonstrates deep graph aggregation with relationship weight accumulation
// ----------------------------------------------------------------------------
MATCH (s:Student)-[ord:ORDERED]->(f:FoodItem)-[con:CONTAINS]->(ing:Ingredient)
RETURN ing.name AS ingredient_name,
       ing.unit AS unit_of_measure,
       round(sum(ord.quantity * con.quantity), 3) AS total_consumed_amount,
       count(DISTINCT s) AS distinct_students_served
ORDER BY total_consumed_amount DESC;
