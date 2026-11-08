'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { useCart } from '@/hooks/useCart';
import OrderCard from '@/components/orders/OrderCard';
import RevenueCard from '@/components/analytics/RevenueCard';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import {
  Utensils,
  ShoppingCart,
  ClipboardList,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { orders, loading: ordersLoading } = useOrders();
  const { cartCount } = useCart();

  // Active orders (not cancelled and not picked_up)
  const activeOrders = orders.filter(
    (o) => o.status !== 'picked_up' && o.status !== 'cancelled'
  );

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Canteen Open & Cooking Fresh</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, <span className="text-amber-400">{user?.full_name || 'Student'}</span>!
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Order fresh meals right from your desk, track real-time kitchen progress,
              and pick up your food with zero queueing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/student/menu">
              <Button
                variant="accent"
                size="md"
                className="font-bold text-slate-950 shadow-md shadow-amber-500/20"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Browse Menu
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <RevenueCard
          icon={Clock}
          label="Active Kitchen Orders"
          value={activeOrders.length}
          subtitle={activeOrders.length > 0 ? 'Tracking live updates' : 'No active orders'}
          trendDirection={activeOrders.length > 0 ? 'up' : 'neutral'}
        />

        <RevenueCard
          icon={ClipboardList}
          label="Lifetime Orders"
          value={orders.length}
          subtitle="Orders placed on CampusEats"
        />

        <RevenueCard
          icon={ShoppingCart}
          label="Items in Cart"
          value={cartCount}
          subtitle={cartCount > 0 ? 'Ready for checkout' : 'Cart is empty'}
        />
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/student/menu"
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
                Food Menu
              </h4>
              <p className="text-xs text-slate-400">Dosas, Curries, Snacks & Drinks</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/cart"
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/80 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                My Food Cart
              </h4>
              <p className="text-xs text-slate-400">{cartCount} items awaiting checkout</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/orders"
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                Order History
              </h4>
              <p className="text-xs text-slate-400">View receipts and QR passes</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Orders</h2>
          </div>
          <Link
            href="/student/orders"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View All ({orders.length}) →
          </Link>
        </div>

        {ordersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className="h-36 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <EmptyState
              icon={<Utensils className="w-8 h-8 text-indigo-400" />}
              title="No orders yet"
              description="You haven't ordered any meals yet. Explore the menu and enjoy hot canteen food!"
              action={{
                label: 'Browse Menu',
                onClick: () => {
                  window.location.href = '/student/menu';
                },
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
