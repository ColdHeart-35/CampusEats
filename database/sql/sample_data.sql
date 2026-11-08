-- ============================================================================
-- CampusEats Sample Data (Seed Script)
-- Realistic Indian College Canteen Dataset
-- ============================================================================

-- Clear existing data if any (in correct reverse dependency order)
TRUNCATE TABLE notifications, inventory_transactions, payments, order_items,
               orders, pickup_slots, recipes, food_items, ingredients,
               food_categories, users RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------------------
-- 1. USERS
-- Standard bcrypt hash for 'password123':
-- $2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
-- ----------------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active) VALUES
('a0000000-0000-0000-0000-000000000001', 'student@campus.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Aarav Patel', '+919876543210', 'student', TRUE),
('a0000000-0000-0000-0000-000000000002', 'staff@campus.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Ramesh Kumar (Kitchen Staff)', '+919876543211', 'staff', TRUE),
('a0000000-0000-0000-0000-000000000003', 'admin@campus.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Dr. Sunita Sharma (Admin)', '+919876543212', 'admin', TRUE),
('a0000000-0000-0000-0000-000000000004', 'priya.sharma@campus.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Priya Sharma', '+919876543213', 'student', TRUE),
('a0000000-0000-0000-0000-000000000005', 'rohit.verma@campus.edu', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Rohit Verma', '+919876543214', 'student', TRUE);

-- ----------------------------------------------------------------------------
-- 2. FOOD CATEGORIES (6 Categories)
-- ----------------------------------------------------------------------------
INSERT INTO food_categories (id, name, description, image_url, is_active) VALUES
(1, 'South Indian', 'Traditional South Indian delicacies freshly prepared on tawa and steamers', '/images/categories/south_indian.jpg', TRUE),
(2, 'North Indian', 'Rich curries, fresh flatbreads, and tandoori savories', '/images/categories/north_indian.jpg', TRUE),
(3, 'Chinese', 'Desi Chinese street classics, wok-tossed noodles and fried rice', '/images/categories/chinese.jpg', TRUE),
(4, 'Beverages', 'Hot filter coffee, cutting chai, fresh lime soda and milkshakes', '/images/categories/beverages.jpg', TRUE),
(5, 'Snacks', 'Quick bite crisps, samosas, cutlets, and kachoris', '/images/categories/snacks.jpg', TRUE),
(6, 'Desserts', 'Sweet treats and traditional Indian confections', '/images/categories/desserts.jpg', TRUE);

SELECT setval('food_categories_id_seq', 6);

-- ----------------------------------------------------------------------------
-- 3. FOOD ITEMS (22 items, priced ₹15 - ₹150)
-- ----------------------------------------------------------------------------
INSERT INTO food_items (id, category_id, name, description, price, image_url, is_available, is_vegetarian, preparation_time) VALUES
-- South Indian
(1, 1, 'Masala Dosa', 'Crispy fermented crepe stuffed with spiced mashed potato, served with coconut chutney & sambar', 60.00, '/images/items/masala_dosa.jpg', TRUE, TRUE, 12),
(2, 1, 'Idli Sambar (2 pcs)', 'Steamed fluffy rice-lentil cakes served with piping hot vegetable sambar', 40.00, '/images/items/idli_sambar.jpg', TRUE, TRUE, 8),
(3, 1, 'Medu Vada (2 pcs)', 'Golden crisp lentil doughnuts with ginger and peppercorns', 35.00, '/images/items/medu_vada.jpg', TRUE, TRUE, 10),
(4, 1, 'Plain Dosa', 'Golden buttery fermented tawa crepe served with two chutneys and sambar', 45.00, '/images/items/plain_dosa.jpg', TRUE, TRUE, 10),
(5, 1, 'Onion Uttapam', 'Thick savory pancake topped with caramelized onions and green chilies', 55.00, '/images/items/onion_uttapam.jpg', TRUE, TRUE, 15),

-- North Indian
(6, 2, 'Paneer Butter Masala', 'Cottage cheese cubes simmered in creamy tomato-cashew gravy with aromatic spices', 120.00, '/images/items/paneer_butter_masala.jpg', TRUE, TRUE, 20),
(7, 2, 'Chole Bhature', 'Spicy chickpea curry paired with two deep-fried fluffy bhaturas', 80.00, '/images/items/chole_bhature.jpg', TRUE, TRUE, 15),
(8, 2, 'Dal Makhani with Jeera Rice', 'Slow-cooked black lentils in butter served with cumin scented basmati rice', 110.00, '/images/items/dal_makhani.jpg', TRUE, TRUE, 15),
(9, 2, 'Aloo Paratha (2 pcs)', 'Whole wheat flatbread stuffed with spiced potato mash, curd, and pickle', 70.00, '/images/items/aloo_paratha.jpg', TRUE, TRUE, 15),
(10, 2, 'Chicken Biryani Bowl', 'Fragrant basmati rice layered with marinated chicken and saffron notes', 140.00, '/images/items/chicken_biryani.jpg', TRUE, FALSE, 20),

-- Chinese
(11, 3, 'Veg Fried Rice', 'Wok-tossed aromatic rice with finely chopped carrots, beans, and cabbage', 90.00, '/images/items/veg_fried_rice.jpg', TRUE, TRUE, 12),
(12, 3, 'Veg Hakka Noodles', 'Classic wok noodles tossed with julienned vegetables and soy seasoning', 85.00, '/images/items/hakka_noodles.jpg', TRUE, TRUE, 12),
(13, 3, 'Gobi Manchurian Dry', 'Crispy cauliflower florets tossed in zesty garlic-soy glaze with scallions', 75.00, '/images/items/gobi_manchurian.jpg', TRUE, TRUE, 15),
(14, 3, 'Egg Schezwan Noodles', 'Spicy wok noodles tossed with farm eggs and homemade fiery schezwan sauce', 95.00, '/images/items/egg_schezwan.jpg', TRUE, FALSE, 12),

-- Beverages
(15, 4, 'South Indian Filter Coffee', 'Freshly brewed chicory coffee decoction frothed with whole boiled milk', 20.00, '/images/items/filter_coffee.jpg', TRUE, TRUE, 5),
(16, 4, 'Masala Chai', 'Strong Assam CTC tea brewed with crushed ginger, cardamom, and cloves', 15.00, '/images/items/masala_chai.jpg', TRUE, TRUE, 5),
(17, 4, 'Fresh Lime Soda', 'Carbonated soda with freshly squeezed lime juice, mint, and black salt', 30.00, '/images/items/lime_soda.jpg', TRUE, TRUE, 5),
(18, 4, 'Sweet Lassi', 'Chilled creamy churned yogurt sweetened with sugar and rose essence', 40.00, '/images/items/sweet_lassi.jpg', TRUE, TRUE, 5),

-- Snacks
(19, 5, 'Punjabi Samosa (2 pcs)', 'Flaky pastry filled with spiced potatoes, peas, and roasted coriander seeds', 25.00, '/images/items/samosa.jpg', TRUE, TRUE, 5),
(20, 5, 'Pav Bhaji', 'Spiced buttery mashed vegetable medley served with toasted buttery pav', 70.00, '/images/items/pav_bhaji.jpg', TRUE, TRUE, 15),
(21, 5, 'Veg Puff', 'Crispy puff pastry encasing curried vegetables', 20.00, '/images/items/veg_puff.jpg', TRUE, TRUE, 5),

-- Desserts
(22, 6, 'Gulab Jamun (2 pcs)', 'Soft milk-solid dumplings soaked in warm rose and cardamom scented sugar syrup', 35.00, '/images/items/gulab_jamun.jpg', TRUE, TRUE, 5);

SELECT setval('food_items_id_seq', 22);

-- ----------------------------------------------------------------------------
-- 4. INGREDIENTS (18 Items with physical stock levels & costs)
-- ----------------------------------------------------------------------------
INSERT INTO ingredients (id, name, unit, current_stock, min_stock_level, cost_per_unit) VALUES
(1, 'Sona Masoori Rice', 'kg', 120.00, 25.00, 48.0000),
(2, 'Urad Dal', 'kg', 45.00, 10.00, 110.0000),
(3, 'Refined Sunflower Oil', 'litre', 60.00, 15.00, 125.0000),
(4, 'Potatoes', 'kg', 85.00, 20.00, 25.0000),
(5, 'Red Onions', 'kg', 70.00, 18.00, 32.0000),
(6, 'Tomatoes', 'kg', 50.00, 15.00, 28.0000),
(7, 'Fresh Paneer', 'kg', 22.00, 5.00, 320.0000),
(8, 'Kabuli Chickpeas (Chole)', 'kg', 35.00, 8.00, 115.0000),
(9, 'Maida (All Purpose Flour)', 'kg', 65.00, 15.00, 38.0000),
(10, 'Atta (Whole Wheat Flour)', 'kg', 90.00, 20.00, 42.0000),
(11, 'Hakka Noodles (Dried)', 'kg', 30.00, 8.00, 75.0000),
(12, 'Mixed Veggies (Carrot, Beans, Cabbage)', 'kg', 40.00, 12.00, 45.0000),
(13, 'Farm Fresh Eggs', 'pcs', 180.00, 40.00, 6.5000),
(14, 'Fresh Whole Milk', 'litre', 55.00, 15.00, 56.0000),
(15, 'Coffee Powder Blend (80:20)', 'kg', 12.00, 3.00, 450.0000),
(16, 'Assam Tea Leaves', 'kg', 15.00, 4.00, 280.0000),
(17, 'Granulated Sugar', 'kg', 50.00, 10.00, 44.0000),
(18, 'Cauliflower', 'kg', 28.00, 8.00, 30.0000);

SELECT setval('ingredients_id_seq', 18);

-- ----------------------------------------------------------------------------
-- 5. RECIPES (Bill of Materials for 12 items)
-- ----------------------------------------------------------------------------
INSERT INTO recipes (food_item_id, ingredient_id, quantity_required) VALUES
-- Item 1: Masala Dosa
(1, 1, 0.090),  -- 90g Rice
(1, 2, 0.030),  -- 30g Urad Dal
(1, 3, 0.015),  -- 15ml Oil
(1, 4, 0.075),  -- 75g Potatoes
(1, 5, 0.025),  -- 25g Onions

-- Item 2: Idli Sambar (2 pcs)
(2, 1, 0.080),  -- 80g Rice
(2, 2, 0.025),  -- 25g Urad Dal
(2, 5, 0.020),  -- 20g Onions (Sambar)
(2, 6, 0.025),  -- 25g Tomatoes (Sambar)

-- Item 3: Medu Vada (2 pcs)
(3, 2, 0.080),  -- 80g Urad dal
(3, 3, 0.030),  -- 30ml Oil for frying
(3, 5, 0.020),  -- 20g Onions

-- Item 6: Paneer Butter Masala
(6, 7, 0.120),  -- 120g Paneer
(6, 6, 0.100),  -- 100g Tomatoes
(6, 5, 0.050),  -- 50g Onions
(6, 3, 0.025),  -- 25ml Oil/Butter

-- Item 7: Chole Bhature
(7, 8, 0.100),  -- 100g Chickpeas
(7, 9, 0.120),  -- 120g Maida for bhatura
(7, 5, 0.040),  -- 40g Onions
(7, 6, 0.040),  -- 40g Tomatoes
(7, 3, 0.035),  -- 35ml Oil

-- Item 11: Veg Fried Rice
(11, 1, 0.120), -- 120g Rice
(11, 12, 0.080),-- 80g Mixed Veggies
(11, 3, 0.020), -- 20ml Oil
(11, 5, 0.030), -- 30g Onions

-- Item 12: Veg Hakka Noodles
(12, 11, 0.100),-- 100g Hakka Noodles
(12, 12, 0.080),-- 80g Mixed Veggies
(12, 3, 0.020), -- 20ml Oil

-- Item 13: Gobi Manchurian Dry
(13, 18, 0.150),-- 150g Cauliflower
(13, 9, 0.030), -- 30g Maida/Cornflour
(13, 3, 0.030), -- 30ml Oil
(13, 5, 0.025), -- 25g Onions

-- Item 15: South Indian Filter Coffee
(15, 14, 0.150),-- 150ml Milk
(15, 15, 0.015),-- 15g Coffee Powder
(15, 17, 0.015),-- 15g Sugar

-- Item 16: Masala Chai
(16, 14, 0.100),-- 100ml Milk
(16, 16, 0.010),-- 10g Tea Leaves
(16, 17, 0.015),-- 15g Sugar

-- Item 19: Punjabi Samosa (2 pcs)
(19, 9, 0.080), -- 80g Maida
(19, 4, 0.100), -- 100g Potatoes
(19, 3, 0.030), -- 30ml Oil

-- Item 20: Pav Bhaji
(20, 4, 0.090), -- 90g Potatoes
(20, 6, 0.060), -- 60g Tomatoes
(20, 5, 0.040), -- 40g Onions
(20, 3, 0.030); -- 30ml Butter/Oil

-- ----------------------------------------------------------------------------
-- 6. PICKUP SLOTS (6 Scheduled windows across morning & lunch)
-- ----------------------------------------------------------------------------
INSERT INTO pickup_slots (id, slot_date, start_time, end_time, max_capacity, current_count, is_active) VALUES
(1, CURRENT_DATE, '08:30:00', '09:00:00', 30, 8, TRUE),
(2, CURRENT_DATE, '09:00:00', '09:30:00', 40, 15, TRUE),
(3, CURRENT_DATE, '12:30:00', '13:00:00', 50, 25, TRUE),
(4, CURRENT_DATE, '13:00:00', '13:30:00', 50, 18, TRUE),
(5, CURRENT_DATE, '16:00:00', '16:30:00', 35, 12, TRUE),
(6, CURRENT_DATE + INTERVAL '1 day', '09:00:00', '09:30:00', 40, 0, TRUE);

SELECT setval('pickup_slots_id_seq', 6);

-- ----------------------------------------------------------------------------
-- 7. ORDERS (6 sample orders with diverse lifecycle states)
-- ----------------------------------------------------------------------------
INSERT INTO orders (id, user_id, pickup_slot_id, status, total_amount, qr_code, qr_verified, special_instructions) VALUES
-- Order 1: Picked Up (Aarav Patel)
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 'picked_up', 100.00, 'QR-ORD-CAMPUS-001', TRUE, 'Make sambar extra hot please'),

-- Order 2: Ready for Pickup (Priya Sharma)
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 3, 'ready', 200.00, 'QR-ORD-CAMPUS-002', FALSE, 'Pack chutneys in separate container'),

-- Order 3: Preparing (Rohit Verma)
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 3, 'preparing', 175.00, 'QR-ORD-CAMPUS-003', FALSE, 'No onion in fried rice if possible'),

-- Order 4: Confirmed (Aarav Patel)
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 4, 'confirmed', 95.00, 'QR-ORD-CAMPUS-004', FALSE, 'Crispy bhatura'),

-- Order 5: Pending Payment (Priya Sharma)
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 5, 'pending', 35.00, NULL, FALSE, 'Less sugar in coffee'),

-- Order 6: Cancelled (Rohit Verma)
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005', 2, 'cancelled', 60.00, NULL, FALSE, 'Class got rescheduled');

-- ----------------------------------------------------------------------------
-- 8. ORDER ITEMS
-- ----------------------------------------------------------------------------
INSERT INTO order_items (id, order_id, food_item_id, quantity, unit_price, subtotal) VALUES
-- Order 1 items (Total ₹100): Masala Dosa (₹60) + 2x Filter Coffee (₹40)
(1, 'b0000000-0000-0000-0000-000000000001', 1, 1, 60.00, 60.00),
(2, 'b0000000-0000-0000-0000-000000000001', 15, 2, 20.00, 40.00),

-- Order 2 items (Total ₹200): Paneer Butter Masala (₹120) + Chole Bhature (₹80)
(3, 'b0000000-0000-0000-0000-000000000002', 6, 1, 120.00, 120.00),
(4, 'b0000000-0000-0000-0000-000000000002', 7, 1, 80.00, 80.00),

-- Order 3 items (Total ₹175): Veg Fried Rice (₹90) + Hakka Noodles (₹85)
(5, 'b0000000-0000-0000-0000-000000000003', 11, 1, 90.00, 90.00),
(6, 'b0000000-0000-0000-0000-000000000003', 12, 1, 85.00, 85.00),

-- Order 4 items (Total ₹95): Chole Bhature (₹80) + Masala Chai (₹15)
(7, 'b0000000-0000-0000-0000-000000000004', 7, 1, 80.00, 80.00),
(8, 'b0000000-0000-0000-0000-000000000004', 16, 1, 15.00, 15.00),

-- Order 5 items (Total ₹35): Medu Vada (₹35)
(9, 'b0000000-0000-0000-0000-000000000005', 3, 1, 35.00, 35.00),

-- Order 6 items (Total ₹60): Masala Dosa (₹60)
(10, 'b0000000-0000-0000-0000-000000000006', 1, 1, 60.00, 60.00);

SELECT setval('order_items_id_seq', 10);

-- ----------------------------------------------------------------------------
-- 9. PAYMENTS
-- ----------------------------------------------------------------------------
INSERT INTO payments (id, order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'order_rzp_demo_001', 'pay_rzp_demo_001', 'sig_valid_001_hash', 100.00, 'INR', 'captured'),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'order_rzp_demo_002', 'pay_rzp_demo_002', 'sig_valid_002_hash', 200.00, 'INR', 'captured'),
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'order_rzp_demo_003', 'pay_rzp_demo_003', 'sig_valid_003_hash', 175.00, 'INR', 'captured'),
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'order_rzp_demo_004', 'pay_rzp_demo_004', 'sig_valid_004_hash', 95.00, 'INR', 'authorized'),
('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 'order_rzp_demo_005', NULL, NULL, 35.00, 'INR', 'created'),
('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', 'order_rzp_demo_006', 'pay_rzp_demo_006', 'sig_valid_006_hash', 60.00, 'INR', 'refunded');

-- ----------------------------------------------------------------------------
-- 10. INVENTORY TRANSACTIONS
-- ----------------------------------------------------------------------------
INSERT INTO inventory_transactions (id, ingredient_id, transaction_type, quantity, reference_id, notes, created_by) VALUES
(1, 1, 'restock', 150.00, 'PO-2026-OCT-01', 'Initial monthly bulk shipment received from wholesale distributor', 'a0000000-0000-0000-0000-000000000003'),
(2, 7, 'restock', 30.00, 'PO-2026-NOV-01', 'Fresh daily dairy paneer stock delivery', 'a0000000-0000-0000-0000-000000000002'),
(3, 1, 'deduction', -0.09, 'b0000000-0000-0000-0000-000000000001', 'Ingredient consumed for Masala Dosa (Order 1)', 'a0000000-0000-0000-0000-000000000002'),
(4, 7, 'deduction', -0.12, 'b0000000-0000-0000-0000-000000000002', 'Ingredient consumed for Paneer Butter Masala (Order 2)', 'a0000000-0000-0000-0000-000000000002'),
(5, 4, 'adjustment', -2.50, 'AUDIT-DAMAGED-01', 'Rotten potatoes discarded following routine morning quality check', 'a0000000-0000-0000-0000-000000000002'),
(6, 1, 'restoration', 0.09, 'b0000000-0000-0000-0000-000000000006', 'Restored un-cooked batter back to stock due to early order cancellation', 'a0000000-0000-0000-0000-000000000002');

SELECT setval('inventory_transactions_id_seq', 6);

-- ----------------------------------------------------------------------------
-- 11. NOTIFICATIONS
-- ----------------------------------------------------------------------------
INSERT INTO notifications (id, user_id, title, message, notification_type, is_read, reference_id) VALUES
(1, 'a0000000-0000-0000-0000-000000000001', 'Order Completed!', 'Your order #001 has been picked up. Thank you for dining with CampusEats!', 'order_update', TRUE, 'b0000000-0000-0000-0000-000000000001'),
(2, 'a0000000-0000-0000-0000-000000000004', 'Order Ready for Pickup', 'Token #002 is hot & ready at Counter 1. Present your QR code to collect.', 'order_update', FALSE, 'b0000000-0000-0000-0000-000000000002'),
(3, 'a0000000-0000-0000-0000-000000000005', 'Kitchen is Preparing your Food', 'Chef Ramesh has started prepping your Fried Rice & Noodles.', 'order_update', FALSE, 'b0000000-0000-0000-0000-000000000003'),
(4, 'a0000000-0000-0000-0000-000000000002', 'Low Stock Warning: Paneer', 'Fresh Paneer level is down to 22.00 kg. Approaching safety threshold.', 'low_stock', FALSE, 'ING-007'),
(5, 'a0000000-0000-0000-0000-000000000005', 'Refund Processed', 'Refund of ₹60.00 initiated for your cancelled order #006.', 'payment_refund', TRUE, 'b0000000-0000-0000-0000-000000000006');

SELECT setval('notifications_id_seq', 5);
