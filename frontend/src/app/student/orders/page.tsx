'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useOrders } from '@/hooks/useOrders';
import OrderCard from '@/components/orders/OrderCard';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { ClipboardList, Utensils, RefreshCw, Radio } from 'lucide-react';

type TabType = 'all' | 'active' | 'completed' | 'cancelled';

export default function StudentOrdersPage() {
  const { orders, loading, fetchOrders } = useOrders();
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Filter orders
  const filteredOrders = orders
    .filter((order) => {
      const st = order.status?.toLowerCase();
      if (activeTab === 'all') return true;
      if (activeTab === 'active') {
        return ['pending', 'confirmed', 'accepted', 'preparing', 'ready'].includes(st);
      }
      if (activeTab === 'completed') {
        return st === 'picked_up';
      }
      if (activeTab === 'cancelled') {
        return st === 'cancelled';
      }
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>My Orders & Receipts</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              <span>Live Synced</span>
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track kitchen preparation status, view receipts, and present your QR pickup passes.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => fetchOrders()}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          className="text-xs font-semibold"
        >
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {(['all', 'active', 'completed', 'cancelled'] as TabType[]).map((tab) => {
          const isSelected = activeTab === tab;
          const label =
            tab === 'all'
              ? 'All Orders'
              : tab === 'active'
              ? 'Active Cooking'
              : tab === 'completed'
              ? 'Completed'
              : 'Cancelled';

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide capitalize whitespace-nowrap transition-all duration-200 border ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800/80'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-40 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
          <EmptyState
            icon={<ClipboardList className="w-10 h-10 text-indigo-400" />}
            title={
              activeTab === 'all'
                ? 'No Orders Placed Yet'
                : `No ${activeTab} orders found`
            }
            description="You don't have any orders matching this category."
            action={{
              label: 'Browse Food Menu',
              onClick: () => {
                window.location.href = '/student/menu';
              },
              icon: <Utensils className="w-4 h-4" />,
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
