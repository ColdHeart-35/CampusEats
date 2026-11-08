'use client';

import { useState, useEffect, useCallback } from 'react';
import { ordersApi } from '@/lib/api';
import { Order, OrderCreate } from '@/lib/types';
import { wsClient } from '@/lib/websocket';
import toast from 'react-hot-toast';

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Subscribe to WebSocket live order updates
    const unsubscribe = wsClient.on<Order | { order_id: string; status: Order['status'] }>(
      'order_update',
      (payload) => {
        if ('id' in payload) {
          const updatedOrder = payload as Order;
          setOrders((prev) => {
            const index = prev.findIndex((o) => o.id === updatedOrder.id);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = updatedOrder;
              return updated;
            }
            return [updatedOrder, ...prev];
          });
          toast.success(`Order #${updatedOrder.id.slice(0, 8)} status updated to ${updatedOrder.status.toUpperCase()}`);
        } else {
          // If payload is partial: { order_id, status }
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.order_id ? { ...o, status: payload.status } : o
            )
          );
          toast.success(`Order status changed: ${payload.status}`);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [fetchOrders]);

  const createOrder = async (orderData: OrderCreate): Promise<Order> => {
    setSubmitting(true);
    try {
      const newOrder = await ordersApi.createOrder(orderData);
      setOrders((prev) => [newOrder, ...prev]);
      toast.success('Order placed successfully!');
      return newOrder;
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to create order';
      toast.error(errorMsg);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async (orderId: string): Promise<Order> => {
    setSubmitting(true);
    try {
      const cancelledOrder = await ordersApi.cancelOrder(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? cancelledOrder : o))
      );
      toast.success('Order cancelled');
      return cancelledOrder;
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to cancel order';
      toast.error(errorMsg);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    orders,
    loading,
    submitting,
    fetchOrders,
    createOrder,
    cancelOrder,
  };
};

export default useOrders;
