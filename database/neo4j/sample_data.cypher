// ============================================================================
// CampusEats Neo4j Graph Database Sample Dataset
// Replicates PostgreSQL data in graph format for recommendation & path analysis
// ============================================================================

// Clear existing graph elements
MATCH (n) DETACH DELETE n;

// ----------------------------------------------------------------------------
// 1. CREATE CATEGORIES
// ----------------------------------------------------------------------------
CREATE
(c1:Category {id: 1, name: 'South Indian'}),
(c2:Category {id: 2, name: 'North Indian'}),
(c3:Category {id: 3, name: 'Chinese'}),
(c4:Category {id: 4, name: 'Beverages'}),
(c5:Category {id: 5, name: 'Snacks'}),
(c6:Category {id: 6, name: 'Desserts'});

// ----------------------------------------------------------------------------
// 2. CREATE INGREDIENTS
// ----------------------------------------------------------------------------
CREATE
(ing1:Ingredient {ingredient_id: 1, name: 'Sona Masoori Rice', unit: 'kg'}),
(ing2:Ingredient {ingredient_id: 2, name: 'Urad Dal', unit: 'kg'}),
(ing3:Ingredient {ingredient_id: 3, name: 'Refined Sunflower Oil', unit: 'litre'}),
(ing4:Ingredient {ingredient_id: 4, name: 'Potatoes', unit: 'kg'}),
(ing5:Ingredient {ingredient_id: 5, name: 'Red Onions', unit: 'kg'}),
(ing6:Ingredient {ingredient_id: 6, name: 'Tomatoes', unit: 'kg'}),
(ing7:Ingredient {ingredient_id: 7, name: 'Fresh Paneer', unit: 'kg'}),
(ing8:Ingredient {ingredient_id: 8, name: 'Kabuli Chickpeas (Chole)', unit: 'kg'}),
(ing9:Ingredient {ingredient_id: 9, name: 'Maida', unit: 'kg'}),
(ing11:Ingredient {ingredient_id: 11, name: 'Hakka Noodles', unit: 'kg'}),
(ing12:Ingredient {ingredient_id: 12, name: 'Mixed Veggies', unit: 'kg'}),
(ing14:Ingredient {ingredient_id: 14, name: 'Fresh Whole Milk', unit: 'litre'}),
(ing15:Ingredient {ingredient_id: 15, name: 'Coffee Powder', unit: 'kg'}),
(ing16:Ingredient {ingredient_id: 16, name: 'Assam Tea Leaves', unit: 'kg'}),
(ing17:Ingredient {ingredient_id: 17, name: 'Granulated Sugar', unit: 'kg'}),
(ing18:Ingredient {ingredient_id: 18, name: 'Cauliflower', unit: 'kg'});

// ----------------------------------------------------------------------------
// 3. CREATE FOOD ITEMS & BELONGS_TO RELATIONSHIPS
// ----------------------------------------------------------------------------
CREATE
(f1:FoodItem {item_id: 1, name: 'Masala Dosa', price: 60.00, is_vegetarian: true}),
(f2:FoodItem {item_id: 2, name: 'Idli Sambar (2 pcs)', price: 40.00, is_vegetarian: true}),
(f3:FoodItem {item_id: 3, name: 'Medu Vada (2 pcs)', price: 35.00, is_vegetarian: true}),
(f6:FoodItem {item_id: 6, name: 'Paneer Butter Masala', price: 120.00, is_vegetarian: true}),
(f7:FoodItem {item_id: 7, name: 'Chole Bhature', price: 80.00, is_vegetarian: true}),
(f11:FoodItem {item_id: 11, name: 'Veg Fried Rice', price: 90.00, is_vegetarian: true}),
(f12:FoodItem {item_id: 12, name: 'Veg Hakka Noodles', price: 85.00, is_vegetarian: true}),
(f13:FoodItem {item_id: 13, name: 'Gobi Manchurian Dry', price: 75.00, is_vegetarian: true}),
(f15:FoodItem {item_id: 15, name: 'South Indian Filter Coffee', price: 20.00, is_vegetarian: true}),
(f16:FoodItem {item_id: 16, name: 'Masala Chai', price: 15.00, is_vegetarian: true}),
(f19:FoodItem {item_id: 19, name: 'Punjabi Samosa (2 pcs)', price: 25.00, is_vegetarian: true}),
(f20:FoodItem {item_id: 20, name: 'Pav Bhaji', price: 70.00, is_vegetarian: true}),
(f22:FoodItem {item_id: 22, name: 'Gulab Jamun (2 pcs)', price: 35.00, is_vegetarian: true});

// Link items to categories
MATCH (f:FoodItem), (c:Category)
WHERE (f.item_id IN [1,2,3] AND c.name = 'South Indian')
   OR (f.item_id IN [6,7] AND c.name = 'North Indian')
   OR (f.item_id IN [11,12,13] AND c.name = 'Chinese')
   OR (f.item_id IN [15,16] AND c.name = 'Beverages')
   OR (f.item_id IN [19,20] AND c.name = 'Snacks')
   OR (f.item_id IN [22] AND c.name = 'Desserts')
CREATE (f)-[:BELONGS_TO]->(c);

// ----------------------------------------------------------------------------
// 4. CREATE RECIPE CONTAINS RELATIONSHIPS (FoodItem -> Ingredient)
// ----------------------------------------------------------------------------
MATCH (f1:FoodItem {item_id: 1}), (f2:FoodItem {item_id: 2}), (f3:FoodItem {item_id: 3}),
      (f6:FoodItem {item_id: 6}), (f7:FoodItem {item_id: 7}), (f11:FoodItem {item_id: 11}),
      (f12:FoodItem {item_id: 12}), (f15:FoodItem {item_id: 15}), (f16:FoodItem {item_id: 16}),
      (ing1:Ingredient {ingredient_id: 1}), (ing2:Ingredient {ingredient_id: 2}),
      (ing3:Ingredient {ingredient_id: 3}), (ing4:Ingredient {ingredient_id: 4}),
      (ing5:Ingredient {ingredient_id: 5}), (ing6:Ingredient {ingredient_id: 6}),
      (ing7:Ingredient {ingredient_id: 7}), (ing8:Ingredient {ingredient_id: 8}),
      (ing9:Ingredient {ingredient_id: 9}), (ing11:Ingredient {ingredient_id: 11}),
      (ing12:Ingredient {ingredient_id: 12}), (ing14:Ingredient {ingredient_id: 14}),
      (ing15:Ingredient {ingredient_id: 15}), (ing16:Ingredient {ingredient_id: 16}),
      (ing17:Ingredient {ingredient_id: 17})
CREATE
(f1)-[:CONTAINS {quantity: 0.09, unit: 'kg'}]->(ing1),
(f1)-[:CONTAINS {quantity: 0.03, unit: 'kg'}]->(ing2),
(f1)-[:CONTAINS {quantity: 0.075, unit: 'kg'}]->(ing4),
(f1)-[:CONTAINS {quantity: 0.025, unit: 'kg'}]->(ing5),

(f2)-[:CONTAINS {quantity: 0.08, unit: 'kg'}]->(ing1),
(f2)-[:CONTAINS {quantity: 0.025, unit: 'kg'}]->(ing2),

(f3)-[:CONTAINS {quantity: 0.08, unit: 'kg'}]->(ing2),
(f3)-[:CONTAINS {quantity: 0.03, unit: 'litre'}]->(ing3),

(f6)-[:CONTAINS {quantity: 0.12, unit: 'kg'}]->(ing7),
(f6)-[:CONTAINS {quantity: 0.10, unit: 'kg'}]->(ing6),
(f6)-[:CONTAINS {quantity: 0.05, unit: 'kg'}]->(ing5),

(f7)-[:CONTAINS {quantity: 0.10, unit: 'kg'}]->(ing8),
(f7)-[:CONTAINS {quantity: 0.12, unit: 'kg'}]->(ing9),

(f11)-[:CONTAINS {quantity: 0.12, unit: 'kg'}]->(ing1),
(f11)-[:CONTAINS {quantity: 0.08, unit: 'kg'}]->(ing12),

(f12)-[:CONTAINS {quantity: 0.10, unit: 'kg'}]->(ing11),
(f12)-[:CONTAINS {quantity: 0.08, unit: 'kg'}]->(ing12),

(f15)-[:CONTAINS {quantity: 0.15, unit: 'litre'}]->(ing14),
(f15)-[:CONTAINS {quantity: 0.015, unit: 'kg'}]->(ing15),
(f15)-[:CONTAINS {quantity: 0.015, unit: 'kg'}]->(ing17),

(f16)-[:CONTAINS {quantity: 0.10, unit: 'litre'}]->(ing14),
(f16)-[:CONTAINS {quantity: 0.010, unit: 'kg'}]->(ing16),
(f16)-[:CONTAINS {quantity: 0.015, unit: 'kg'}]->(ing17);

// ----------------------------------------------------------------------------
// 5. CREATE STUDENTS (Users from PostgreSQL)
// ----------------------------------------------------------------------------
CREATE
(s1:Student {
    user_id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Aarav Patel',
    email: 'student@campus.edu'
}),
(s2:Student {
    user_id: 'a0000000-0000-0000-0000-000000000004',
    name: 'Priya Sharma',
    email: 'priya.sharma@campus.edu'
}),
(s3:Student {
    user_id: 'a0000000-0000-0000-0000-000000000005',
    name: 'Rohit Verma',
    email: 'rohit.verma@campus.edu'
});

// ----------------------------------------------------------------------------
// 6. CREATE SAMPLE ORDER RELATIONSHIPS
// (Student)-[:ORDERED {order_id, quantity, timestamp}]->(FoodItem)
// ----------------------------------------------------------------------------
MATCH (s1:Student {user_id: 'a0000000-0000-0000-0000-000000000001'}),
      (s2:Student {user_id: 'a0000000-0000-0000-0000-000000000004'}),
      (s3:Student {user_id: 'a0000000-0000-0000-0000-000000000005'}),
      (f1:FoodItem {item_id: 1}),
      (f3:FoodItem {item_id: 3}),
      (f6:FoodItem {item_id: 6}),
      (f7:FoodItem {item_id: 7}),
      (f11:FoodItem {item_id: 11}),
      (f12:FoodItem {item_id: 12}),
      (f15:FoodItem {item_id: 15}),
      (f16:FoodItem {item_id: 16})
CREATE
// Aarav ordered Masala Dosa and Filter Coffee (Order 1) & Chole Bhature + Tea (Order 4)
(s1)-[:ORDERED {order_id: 'b0000000-0000-0000-0000-000000000001', quantity: 1, timestamp: '2026-11-06T08:35:00Z'}]->(f1),
(s1)-[:ORDERED {order_id: 'b0000000-0000-0000-0000-000000000001', quantity: 2, timestamp: '2026-11-06T08:35:00Z'}]->(f15),
(s1)-[:ORDERED {order_id: 'b0000000-0000-0000-0000-000000000004', quantity: 1, timestamp: '2026-11-06T13:05:00Z'}]->(f7),
(s1)-[:ORDERED {order_id: 'b0000000-0000-0000-0000-000000000004', quantity: 1, timestamp: '2026-11-06T13:05:00Z'}]->(f16),

// Priya ordered Paneer Butter Masala & Chole Bhature (Order 2) & Medu Vada (Order 5)
(s2)-[:ORDERED {order_id: 'b0000000-0000-0000-0000-000000000002', quantity: 1, timestamp: '2026-11-06T12:40:00Z'}]->(f6),
(s2)-[:ORDERED {order_id: 'b0000000-0000-0000-0000-000000000002', quantity: 1, timestamp: '2026-11-06T12:40:00Z'}]->(f7),
(s2)-[:ORDERED {order_id: 'b0000000-0000-0000-0000-000000000005', quantity: 1, timestamp: '2026-11-06T16:10:00Z'}]->(f3),

// Rohit ordered Veg Fried Rice & Hakka Noodles (Order 3)
(s3)-[:ORDERED {order_id: 'b0000000-0000-0000-0000-000000000003', quantity: 1, timestamp: '2026-11-06T12:45:00Z'}]->(f11),
(s3)-[:ORDERED {order_id: 'b0000000-0000-0000-0000-000000000003', quantity: 1, timestamp: '2026-11-06T12:45:00Z'}]->(f12);
