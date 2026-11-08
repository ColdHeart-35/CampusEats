'use client';

import { useState, useEffect, useCallback } from 'react';
import { cartApi } from '@/lib/api';
import { CartItem } from '@/lib/types';
import toast from 'react-hot-toast';

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cartApi.getCart();
      setCartItems(data.items || []);
      setCartTotal(data.total_amount || 0);
    } catch {
      // If unauthorized or network error, fallback to empty or local
      setCartItems([]);
      setCartTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = async (foodItemId: number, quantity: number = 1) => {
    try {
      setUpdating(true);
      const data = await cartApi.addToCart(foodItemId, quantity);
      setCartItems(data.items || []);
      setCartTotal(data.total_amount || 0);
      toast.success('Added to cart!');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to add item to cart';
      toast.error(errorMsg);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const updateItem = async (foodItemId: number, quantity: number) => {
    if (quantity <= 0) {
      return removeItem(foodItemId);
    }

    try {
      setUpdating(true);
      const data = await cartApi.updateCartItem(foodItemId, quantity);
      setCartItems(data.items || []);
      setCartTotal(data.total_amount || 0);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to update cart';
      toast.error(errorMsg);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (foodItemId: number) => {
    try {
      setUpdating(true);
      const data = await cartApi.removeCartItem(foodItemId);
      setCartItems(data.items || []);
      setCartTotal(data.total_amount || 0);
      toast.success('Item removed');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to remove item';
      toast.error(errorMsg);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const clearCart = async () => {
    try {
      setUpdating(true);
      await cartApi.clearCart();
      setCartItems([]);
      setCartTotal(0);
      toast.success('Cart cleared');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to clear cart';
      toast.error(errorMsg);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return {
    cartItems,
    cartTotal,
    cartCount,
    loading,
    updating,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    refreshCart: fetchCart,
  };
};

export default useCart;
