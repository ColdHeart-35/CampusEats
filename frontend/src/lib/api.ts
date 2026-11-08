import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  User,
  UserCreate,
  UserLogin,
  UserUpdate,
  TokenResponse,
  FoodCategory,
  FoodCategoryCreate,
  FoodItem,
  FoodItemCreate,
  FoodItemUpdate,
  CartResponse,
  Order,
  OrderCreate,
  OrderStatusUpdate,
  PickupSlot,
  PickupSlotCreate,
  PickupSlotUpdate,
  PaymentOrderCreate,
  PaymentOrderResponse,
  PaymentVerify,
  PaymentResponse,
  Ingredient,
  IngredientCreate,
  IngredientUpdate,
  RestockRequest,
  InventoryTransaction,
  LowStockAlert,
  DashboardStats,
  SalesData,
  ForecastData,
  SemanticSearchRequest,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT token if present
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      // Only redirect if not already on the login or register page
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register') &&
        window.location.pathname !== '/'
      ) {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: UserCreate): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/api/auth/register', data);
    return res.data;
  },
  login: async (data: UserLogin): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/api/auth/login', data);
    return res.data;
  },
  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/api/auth/refresh', {
      refresh_token: refreshToken,
    });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/api/users/me');
    return res.data;
  },
  updateMe: async (data: UserUpdate): Promise<User> => {
    const res = await apiClient.put<User>('/api/users/me', data);
    return res.data;
  },
};

// Food API
export const foodApi = {
  getCategories: async (): Promise<FoodCategory[]> => {
    const res = await apiClient.get<FoodCategory[]>('/api/food/categories');
    return res.data;
  },
  createCategory: async (data: FoodCategoryCreate): Promise<FoodCategory> => {
    const res = await apiClient.post<FoodCategory>('/api/food/categories', data);
    return res.data;
  },
  getItems: async (params?: {
    category_id?: number;
    search?: string;
    is_vegetarian?: boolean;
  }): Promise<FoodItem[]> => {
    const res = await apiClient.get<FoodItem[]>('/api/food/items', { params });
    return res.data;
  },
  getItem: async (itemId: number): Promise<FoodItem> => {
    const res = await apiClient.get<FoodItem>(`/api/food/items/${itemId}`);
    return res.data;
  },
  createItem: async (data: FoodItemCreate): Promise<FoodItem> => {
    const res = await apiClient.post<FoodItem>('/api/food/items', data);
    return res.data;
  },
  updateItem: async (itemId: number, data: FoodItemUpdate): Promise<FoodItem> => {
    const res = await apiClient.put<FoodItem>(`/api/food/items/${itemId}`, data);
    return res.data;
  },
  deleteItem: async (itemId: number): Promise<void> => {
    await apiClient.delete(`/api/food/items/${itemId}`);
  },
};

// Cart API
export const cartApi = {
  getCart: async (): Promise<CartResponse> => {
    const res = await apiClient.get<CartResponse>('/api/cart');
    return res.data;
  },
  addToCart: async (foodItemId: number, quantity: number = 1): Promise<CartResponse> => {
    const res = await apiClient.post<CartResponse>('/api/cart/items', {
      food_item_id: foodItemId,
      quantity,
    });
    return res.data;
  },
  updateCartItem: async (foodItemId: number, quantity: number): Promise<CartResponse> => {
    const res = await apiClient.put<CartResponse>(`/api/cart/items/${foodItemId}`, {
      quantity,
    });
    return res.data;
  },
  removeCartItem: async (foodItemId: number): Promise<CartResponse> => {
    const res = await apiClient.delete<CartResponse>(`/api/cart/items/${foodItemId}`);
    return res.data;
  },
  clearCart: async (): Promise<void> => {
    await apiClient.delete('/api/cart');
  },
};

// Orders API
export const ordersApi = {
  createOrder: async (data: OrderCreate): Promise<Order> => {
    const res = await apiClient.post<Order>('/api/orders', data);
    return res.data;
  },
  getOrders: async (): Promise<Order[]> => {
    const res = await apiClient.get<Order[]>('/api/orders');
    return res.data;
  },
  getOrder: async (orderId: string): Promise<Order> => {
    const res = await apiClient.get<Order>(`/api/orders/${orderId}`);
    return res.data;
  },
  cancelOrder: async (orderId: string): Promise<Order> => {
    const res = await apiClient.post<Order>(`/api/orders/${orderId}/cancel`);
    return res.data;
  },
};

// Staff API
export const staffApi = {
  getStaffOrders: async (): Promise<Order[]> => {
    const res = await apiClient.get<Order[]>('/api/staff/orders');
    return res.data;
  },
  updateOrderStatus: async (orderId: string, status: OrderStatusUpdate): Promise<Order> => {
    const res = await apiClient.put<Order>(`/api/staff/orders/${orderId}/status`, status);
    return res.data;
  },
};

// Pickup Slots API
export const pickupSlotsApi = {
  getSlots: async (): Promise<PickupSlot[]> => {
    const res = await apiClient.get<PickupSlot[]>('/api/pickup-slots');
    return res.data;
  },
  createSlot: async (data: PickupSlotCreate): Promise<PickupSlot> => {
    const res = await apiClient.post<PickupSlot>('/api/pickup-slots', data);
    return res.data;
  },
  updateSlot: async (slotId: number, data: PickupSlotUpdate): Promise<PickupSlot> => {
    const res = await apiClient.put<PickupSlot>(`/api/pickup-slots/${slotId}`, data);
    return res.data;
  },
};

// Payments API
export const paymentsApi = {
  createPaymentOrder: async (data: PaymentOrderCreate): Promise<PaymentOrderResponse> => {
    const res = await apiClient.post<PaymentOrderResponse>('/api/payments/create-order', data);
    return res.data;
  },
  verifyPayment: async (data: PaymentVerify): Promise<PaymentResponse> => {
    const res = await apiClient.post<PaymentResponse>('/api/payments/verify', data);
    return res.data;
  },
};

// QR API
export const qrApi = {
  getQR: async (orderId: string): Promise<{ qr_code: string }> => {
    const res = await apiClient.get<{ qr_code: string }>(`/api/qr/${orderId}`);
    return res.data;
  },
  verifyQR: async (qrData: string): Promise<Order> => {
    const res = await apiClient.post<Order>('/api/qr/verify', { qr_data: qrData });
    return res.data;
  },
};

// Inventory API
export const inventoryApi = {
  getIngredients: async (): Promise<Ingredient[]> => {
    const res = await apiClient.get<Ingredient[]>('/api/inventory/ingredients');
    return res.data;
  },
  createIngredient: async (data: IngredientCreate): Promise<Ingredient> => {
    const res = await apiClient.post<Ingredient>('/api/inventory/ingredients', data);
    return res.data;
  },
  updateIngredient: async (
    ingredientId: number,
    data: IngredientUpdate
  ): Promise<Ingredient> => {
    const res = await apiClient.put<Ingredient>(
      `/api/inventory/ingredients/${ingredientId}`,
      data
    );
    return res.data;
  },
  restockIngredient: async (data: RestockRequest): Promise<InventoryTransaction> => {
    const res = await apiClient.post<InventoryTransaction>('/api/inventory/restock', data);
    return res.data;
  },
  getTransactions: async (): Promise<InventoryTransaction[]> => {
    const res = await apiClient.get<InventoryTransaction[]>('/api/inventory/transactions');
    return res.data;
  },
  getLowStock: async (): Promise<LowStockAlert[]> => {
    const res = await apiClient.get<LowStockAlert[]>('/api/inventory/low-stock');
    return res.data;
  },
};

// Analytics API
export const analyticsApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<DashboardStats>('/api/analytics/dashboard');
    return res.data;
  },
  getSales: async (period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<SalesData> => {
    const res = await apiClient.get<SalesData>('/api/analytics/sales', {
      params: { period },
    });
    return res.data;
  },
  getForecast: async (days: number = 7): Promise<ForecastData> => {
    const res = await apiClient.get<ForecastData>('/api/analytics/forecast', {
      params: { days },
    });
    return res.data;
  },
};

// Search API
export const searchApi = {
  semanticSearch: async (request: SemanticSearchRequest): Promise<FoodItem[]> => {
    const res = await apiClient.post<FoodItem[]>('/api/search/semantic', request);
    return res.data;
  },
  fulltextSearch: async (query: string): Promise<FoodItem[]> => {
    const res = await apiClient.get<FoodItem[]>('/api/search/fulltext', {
      params: { q: query },
    });
    return res.data;
  },
};

// Graph / Neo4j API
export const graphApi = {
  getPreferences: async (userId: string): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<Record<string, unknown>>(`/api/graph/preferences/${userId}`);
    return res.data;
  },
  getRecommendations: async (userId: string): Promise<FoodItem[]> => {
    const res = await apiClient.get<FoodItem[]>(`/api/graph/recommendations/${userId}`);
    return res.data;
  },
  syncGraph: async (): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/api/graph/sync');
    return res.data;
  },
};

// Admin API
export const adminApi = {
  getUsers: async (): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/api/admin/users');
    return res.data;
  },
  updateUser: async (userId: string, data: UserUpdate): Promise<User> => {
    const res = await apiClient.put<User>(`/api/admin/users/${userId}`, data);
    return res.data;
  },
};
