'use client';

import React from 'react';
import { FoodItem } from '@/lib/types';
import FoodCard from './FoodCard';
import EmptyState from '@/components/ui/EmptyState';
import { Utensils } from 'lucide-react';

export interface FoodGridProps {
  items: FoodItem[];
  onAddToCart?: (item: FoodItem, qty?: number) => void;
  loading?: boolean;
}

export const FoodGrid: React.FC<FoodGridProps> = ({
  items,
  onAddToCart,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={`skeleton-${idx}`}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden animate-pulse flex flex-col justify-between h-[380px]"
          >
            <div className="w-full h-44 bg-slate-800/80" />
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="h-5 bg-slate-800 rounded w-1/2" />
                  <div className="h-5 bg-slate-800 rounded w-1/4" />
                </div>
                <div className="h-3 bg-slate-800/70 rounded w-full mb-2" />
                <div className="h-3 bg-slate-800/70 rounded w-3/4" />
              </div>
              <div className="pt-4 border-t border-slate-800/60 flex justify-between items-center">
                <div className="h-3 bg-slate-800 rounded w-1/3" />
                <div className="h-8 bg-slate-800 rounded-lg w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Utensils className="w-8 h-8 text-indigo-400" />}
        title="No food items found"
        description="Try adjusting your category selection, search terms, or dietary preferences."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <FoodCard
          key={item.id}
          item={item}
          onAddToCart={(food) => onAddToCart && onAddToCart(food, 1)}
        />
      ))}
    </div>
  );
};

export default FoodGrid;
