'use client';

import React from 'react';
import { FoodCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

export interface CategoryFilterProps {
  categories: FoodCategory[];
  selected: number | null;
  onSelect: (id: number | null) => void;
  className?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selected,
  onSelect,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto pb-2 scrollbar-none flex items-center gap-2.5 sm:gap-3',
        className
      )}
    >
      {/* 'All' category pill */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all duration-200 border',
          selected === null
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-500 shadow-lg shadow-indigo-600/30 scale-105'
            : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800/80'
        )}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>All Items</span>
      </button>

      {/* Individual category pills */}
      {categories.map((category) => {
        const isSelected = selected === category.id;
        return (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={cn(
              'inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all duration-200 border',
              isSelected
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-500 shadow-lg shadow-indigo-600/30 scale-105'
                : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800/80'
            )}
          >
            <span>{category.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
