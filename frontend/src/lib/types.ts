// CampusEats TypeScript Type Definitions

export type UserRole = 'student' | 'staff' | 'admin';

export interface User {
  id: string; // UUID
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: UserRole;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserUpdate {
  full_name?: string;
  phone?: string;
  is_active?: boolean;
  role?: UserRole;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface FoodCategory {
  id: number;
  name: string;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FoodCategoryCreate {
  name: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface FoodItem {
  id: number;
  category_id: number;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  is_available: boolean;
  is_vegetarian: boolean;
  preparation_time: number; // in minutes
  created_at: string;
  updated_at: string;
  category?: FoodCategory;
  category_name?: string;
}

export interface FoodItemCreate {
  category_id: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available?: boolean;
  is_vegetarian?: boolean;
  preparation_time?: number;
}

export interface FoodItemUpdate {
  category_id?: number;
  name?: string;
  description?: string;
  price?: number;
  image_url?: string;
  is_available?: boolean;
  is_vegetarian?: boolean;
  preparation_time?: number;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  cost_per_unit?: number;
  created_at: string;
  updated_at: string;
}

export interface IngredientCreate {
  name: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  cost_per_unit?: number;
}

export interface IngredientUpdate {
  name?: string;
  unit?: string;
  current_stock?: number;
  min_stock_level?: number;
  cost_per_unit?: number;
}

export interface Recipe {
  id: number;
  food_item_id: number;
  ingredient_id: number;
  quantity_required: number;
  ingredient?: Ingredient;
}

export interface RecipeCreate {
  food_item_id: number;
  ingredient_id: number;
  quantity_required: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'cancelled';

export interface OrderItem {
  id: number;
  order_id: string; // UUID
  food_item_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  food_item?: FoodItem;
}

export interface OrderItemCreate {
  food_item_id: number;
  quantity: number;
}

export interface Order {
  id: string; // UUID
  user_id: string; // UUID
  pickup_slot_id?: number | null;
  status: OrderStatus;
  total_amount: number;
  qr_code?: string | null;
  qr_verified: boolean;
  special_instructions?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  user?: User;
  pickup_slot?: PickupSlot;
  payment?: Payment;
}

export interface OrderCreate {
  pickup_slot_id?: number | null;
  special_instructions?: string;
  items?: OrderItemCreate[];
}

export interface OrderStatusUpdate {
  status: OrderStatus;
}

export interface PickupSlot {
  id: number;
  slot_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  max_capacity: number;
  current_count: number;
  is_active: boolean;
  created_at: string;
}

export interface PickupSlotCreate {
  slot_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_active?: boolean;
}

export interface PickupSlotUpdate {
  slot_date?: string;
  start_time?: string;
  end_time?: string;
  max_capacity?: number;
  current_count?: number;
  is_active?: boolean;
}

export type PaymentStatus =
  | 'created'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded';

export interface Payment {
  id: string; // UUID
  order_id: string; // UUID
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface PaymentOrderCreate {
  order_id: string;
  amount: number;
}

export interface PaymentOrderResponse {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  order_id: string;
  key_id?: string;
}

export interface PaymentVerify {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  payment: Payment;
}

export type TransactionType = 'restock' | 'deduction' | 'adjustment' | 'restoration';

export interface InventoryTransaction {
  id: number;
  ingredient_id: number;
  transaction_type: TransactionType;
  quantity: number;
  reference_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  ingredient?: Ingredient;
}

export interface RestockRequest {
  ingredient_id: number;
  quantity: number;
  notes?: string;
}

export interface LowStockAlert {
  ingredient_id: number;
  name: string;
  current_stock: number;
  min_stock_level: number;
  unit: string;
}

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  reference_id?: string | null;
  created_at: string;
}

export interface CartItem {
  food_item_id: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string | null;
  is_vegetarian?: boolean;
}

export interface CartResponse {
  items: CartItem[];
  total_amount: number;
  item_count: number;
}

export interface DashboardStats {
  total_orders: number;
  total_revenue: number;
  active_users: number;
  pending_orders: number;
  low_stock_count: number;
}

export interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface SalesData {
  period: 'daily' | 'weekly' | 'monthly' | string;
  labels: string[];
  revenue: number[];
  order_counts: number[];
  data_points?: SalesDataPoint[];
}

export interface ForecastDataPoint {
  date: string;
  predicted_demand: number;
  actual_demand?: number | null;
  confidence_lower?: number;
  confidence_upper?: number;
}

export interface ForecastData {
  forecast_days: number;
  dates: string[];
  predicted_demand: number[];
  actual_demand?: number[];
  confidence_upper?: number[];
  confidence_lower?: number[];
  data_points?: ForecastDataPoint[];
}

export interface PopularItem {
  id: number;
  name: string;
  order_count: number;
  revenue: number;
  category_name?: string;
}

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
}

export interface WebSocketMessage<T = unknown> {
  type: 'order_update' | 'menu_update' | 'inventory_update' | 'notification' | 'ping' | 'pong';
  payload: T;
  timestamp?: string;
}
