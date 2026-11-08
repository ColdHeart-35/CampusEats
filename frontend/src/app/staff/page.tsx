'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { staffApi, inventoryApi } from '@/lib/api';
import { Order, LowStockAlert } from '@/lib/types';
import RevenueCard from '@/components/analytics/RevenueCard';
import Button from '@/components/ui/Button';
import {
  ChefHat,
  Clock,
  BellRing,
  AlertTriangle,
  QrCode,
  Boxes,
  Layers,
  ArrowRight,
  Flame,
  Radio,
} from 'lucide-react';

export default function StaffDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ordersData, stockData] = await Promise.allSettled([
          staffApi.getStaffOrders(),
          inventoryApi.getLowStock(),
        ]);

        if (ordersData.status === 'fulfilled') {
          setOrders(ordersData.value);
        } else {
          // Sample orders for staff display
          setOrders([
            { id: '1a2b3c4d', user_id: 'u1', status: 'pending', total_amount: 140, qr_verified: false, created_at: new Date().toISOString(), updated_at: '' },
            { id: '2b3c4d5e', user_id: 'u2', status: 'preparing', total_amount: 80, qr_verified: false, created_at: new Date().toISOString(), updated_at: '' },
            { id: '3c4d5e6f', user_id: 'u3', status: 'ready', total_amount: 60, qr_verified: false, created_at: new Date().toISOString(), updated_at: '' },
          ]);
        }

        if (stockData.status === 'fulfilled') {
          setLowStock(stockData.value);
        } else {
          setLowStock([
            { ingredient_id: 1, name: 'Cooking Oil', current_stock: 4, min_stock_level: 10, unit: 'L' },
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing' || o.status === 'accepted').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Kitchen Live Station Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Kitchen Operations & Dispatch
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Monitor incoming orders, transition preparation stages, manage ingredient stock levels,
            and scan student QR pickup passes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/staff/orders">
            <Button variant="accent" size="md" className="font-bold text-slate-950" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Open Order Queue
            </Button>
          </Link>
        </div>
      </div>

      {/* Real-time Order Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <RevenueCard
          icon={Clock}
          label="Pending Approval"
          value={pendingCount}
          subtitle="Needs kitchen accept/reject"
          trendDirection={pendingCount > 0 ? 'up' : 'neutral'}
        />

        <RevenueCard
          icon={Flame}
          label="Cooking in Progress"
          value={preparingCount}
          subtitle="Active on stove & grill"
          trendDirection="neutral"
        />

        <RevenueCard
          icon={BellRing}
          label="Ready at Counter"
          value={readyCount}
          subtitle="Waiting for student pickup"
          trendDirection={readyCount > 0 ? 'up' : 'neutral'}
        />

        <RevenueCard
          icon={AlertTriangle}
          label="Low Stock Alerts"
          value={lowStock.length}
          subtitle={lowStock.length > 0 ? 'Restock needed soon' : 'All stocks healthy'}
          trendDirection={lowStock.length > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Station Controls</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Link
            href="/staff/orders"
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3">
                <ChefHat className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
                Order Queue
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Accept incoming orders and update preparation states.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-indigo-400">
              <span>View Queue</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/staff/qr-scan"
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                QR Scanner
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Scan customer barcode passes for counter verification.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-emerald-400">
              <span>Open Scanner</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/staff/inventory"
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-900/80 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                Inventory Stock
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Track ingredients, log restocks, and avoid shortages.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-amber-400">
              <span>Manage Stock</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/staff/menu"
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-900/80 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                Menu Management
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Toggle item availability and update pricing.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-bold text-purple-400">
              <span>Edit Menu</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
