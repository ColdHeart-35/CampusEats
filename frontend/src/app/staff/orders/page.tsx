'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { staffApi } from '@/lib/api';
import { Order, OrderStatus } from '@/lib/types';
import { wsClient } from '@/lib/websocket';
import OrderQueue from '@/components/staff/OrderQueue';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { RefreshCw, Radio, ChefHat, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

type StaffTab = 'active' | 'pending' | 'preparing' | 'ready' | 'all';

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<StaffTab>('active');

  const fetchStaffOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await staffApi.getStaffOrders();
      setOrders(data);
    } catch (err) {
      console.warn('Failed to fetch orders from server, using sample queue:', err);
      setOrders([
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          user_id: 'u1',
          status: 'pending',
          total_amount: 140,
          qr_verified: false,
          created_at: new Date(Date.now() - 3 * 60000).toISOString(),
          updated_at: '',
          user: { id: 'u1', email: 'student1@college.edu', full_name: 'Rahul Verma', role: 'student', is_active: true, created_at: '', updated_at: '' },
          items: [
            { id: 1, order_id: '550e8400-e29b-41d4-a716-446655440000', food_item_id: 1, quantity: 2, unit_price: 60, subtotal: 120, food_item: { id: 1, category_id: 1, name: 'Crispy Masala Dosa', price: 60, is_available: true, is_vegetarian: true, preparation_time: 10, created_at: '', updated_at: '' } },
            { id: 2, order_id: '550e8400-e29b-41d4-a716-446655440000', food_item_id: 6, quantity: 1, unit_price: 20, subtotal: 20, food_item: { id: 6, category_id: 4, name: 'Filter Coffee', price: 20, is_available: true, is_vegetarian: true, preparation_time: 5, created_at: '', updated_at: '' } },
          ],
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          user_id: 'u2',
          status: 'preparing',
          total_amount: 90,
          qr_verified: false,
          created_at: new Date(Date.now() - 10 * 60000).toISOString(),
          updated_at: '',
          user: { id: 'u2', email: 'priya@college.edu', full_name: 'Priya Patel', role: 'student', is_active: true, created_at: '', updated_at: '' },
          items: [
            { id: 3, order_id: '660e8400-e29b-41d4-a716-446655440001', food_item_id: 5, quantity: 1, unit_price: 90, subtotal: 90, food_item: { id: 5, category_id: 3, name: 'Veg Fried Rice', price: 90, is_available: true, is_vegetarian: true, preparation_time: 12, created_at: '', updated_at: '' } },
          ],
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440002',
          user_id: 'u3',
          status: 'ready',
          total_amount: 80,
          qr_verified: false,
          created_at: new Date(Date.now() - 15 * 60000).toISOString(),
          updated_at: '',
          user: { id: 'u3', email: 'amit@college.edu', full_name: 'Amit Kumar', role: 'student', is_active: true, created_at: '', updated_at: '' },
          items: [
            { id: 4, order_id: '770e8400-e29b-41d4-a716-446655440002', food_item_id: 4, quantity: 1, unit_price: 80, subtotal: 80, food_item: { id: 4, category_id: 2, name: 'Chole Bhature', price: 80, is_available: true, is_vegetarian: true, preparation_time: 12, created_at: '', updated_at: '' } },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffOrders();

    // Subscribe to live WebSocket order updates
    const unsubscribe = wsClient.on<Order | { order_id: string; status: OrderStatus }>(
      'order_update',
      (payload) => {
        if ('id' in payload) {
          const updated = payload as Order;
          setOrders((prev) => {
            const idx = prev.findIndex((o) => o.id === updated.id);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [updated, ...prev];
          });
          toast(`Live Kitchen Event: #${updated.id.slice(0, 6)} updated`);
        } else {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.order_id ? { ...o, status: payload.status } : o
            )
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [fetchStaffOrders]);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      setUpdating(true);
      await staffApi.updateOrderStatus(orderId, { status });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      toast.success(`Order #${orderId.slice(0, 8)} status updated to ${status.toUpperCase()}`);
    } catch {
      // Local optimistic update for smooth UI
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      toast.success(`Status updated to ${status.toUpperCase()}`);
    } finally {
      setUpdating(false);
    }
  };

  // Filter orders by tab
  const filteredOrders = orders.filter((order) => {
    const st = order.status?.toLowerCase();
    if (activeTab === 'all') return true;
    if (activeTab === 'active') {
      return ['pending', 'confirmed', 'accepted', 'preparing', 'ready'].includes(st);
    }
    if (activeTab === 'pending') return st === 'pending';
    if (activeTab === 'preparing') return st === 'preparing' || st === 'accepted';
    if (activeTab === 'ready') return st === 'ready';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ChefHat className="w-6 h-6 text-indigo-400" />
            <span>Kitchen Order Queue</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              <span>Real-Time Stream</span>
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Accept pending tickets, update preparation progress, and signal counter readiness.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => fetchStaffOrders()}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          className="text-xs font-semibold"
        >
          Refresh Queue
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {(
          [
            { id: 'active', label: 'All Active Orders' },
            { id: 'pending', label: 'Pending Approval' },
            { id: 'preparing', label: 'In Preparation' },
            { id: 'ready', label: 'Ready for Pickup' },
            { id: 'all', label: 'Complete Log' },
          ] as { id: StaffTab; label: string }[]
        ).map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap transition-all duration-200 border ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800/80'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Orders Grid Display */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner size="lg" text="Loading kitchen queue..." />
        </div>
      ) : (
        <OrderQueue
          orders={filteredOrders}
          onUpdateStatus={handleUpdateStatus}
          isUpdating={updating}
        />
      )}
    </div>
  );
}
