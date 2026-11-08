'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { PopularItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import { Award } from 'lucide-react';

export interface PopularItemsProps {
  items: PopularItem[];
  title?: string;
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PopularItem }>;
}

const CustomBarTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-xl backdrop-blur-md">
        <p className="text-xs font-bold text-white mb-1">{item.name}</p>
        <p className="text-xs text-indigo-300">Orders: <span className="font-extrabold text-white">{item.order_count}</span></p>
        <p className="text-xs text-amber-400">Total: <span className="font-extrabold">{formatCurrency(item.revenue)}</span></p>
      </div>
    );
  }
  return null;
};

const BAR_COLORS = ['#F59E0B', '#6366F1', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];

export const PopularItems: React.FC<PopularItemsProps> = ({
  items,
  title = 'Most Popular Dishes',
  height = 300,
}) => {
  if (items.length === 0) {
    return (
      <div className="w-full p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-glass">
        <EmptyState
          icon={<Award className="w-8 h-8 text-amber-400" />}
          title="No Popular Items Data"
          description="Sales data will appear here once orders are fulfilled."
        />
      </div>
    );
  }

  // Top items sorted by order count
  const sortedItems = [...items]
    .sort((a, b) => b.order_count - a.order_count)
    .slice(0, 6);

  return (
    <div className="w-full p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-glass">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>{title}</span>
        </h4>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          By Order Volume
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={sortedItems}
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
            <XAxis
              type="number"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#CBD5E1"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              width={100}
            />
            <Tooltip content={<CustomBarTooltip />} />
            <Bar dataKey="order_count" radius={[0, 6, 6, 0]}>
              {sortedItems.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PopularItems;
