'use client';

import React from 'react';
import { FoodItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Clock, Plus, Check } from 'lucide-react';

interface FoodCardProps {
  item: FoodItem;
  onAddToCart?: (item: FoodItem) => void;
  isLoading?: boolean;
  isInCart?: boolean;
}

// Map common canteen food names to rich emojis
function getFoodEmoji(name: string, isVeg: boolean): string {
  const lower = name.toLowerCase();
  if (lower.includes('dosa') || lower.includes('idli') || lower.includes('vada')) return '🥞';
  if (lower.includes('coffee')) return '☕';
  if (lower.includes('tea') || lower.includes('chai')) return '🍵';
  if (lower.includes('paneer') || lower.includes('curry')) return '🥘';
  if (lower.includes('rice') || lower.includes('biryani') || lower.includes('pulao')) return '🍚';
  if (lower.includes('noodle') || lower.includes('manchurian') || lower.includes('chow')) return '🍜';
  if (lower.includes('samosa') || lower.includes('puff') || lower.includes('snack')) return '🥟';
  if (lower.includes('jamun') || lower.includes('sweet') || lower.includes('dessert') || lower.includes('cake')) return '🍮';
  if (lower.includes('burger')) return '🍔';
  if (lower.includes('sandwich')) return '🥪';
  if (lower.includes('juice') || lower.includes('shake')) return '🥤';
  return isVeg ? '🥗' : '🍗';
}

export const FoodCard: React.FC<FoodCardProps> = ({
  item,
  onAddToCart,
  isLoading = false,
  isInCart = false,
}) => {
  const emoji = getFoodEmoji(item.name, item.is_vegetarian);

  return (
    <Card
      variant="interactive"
      padding="none"
      className="group relative flex flex-col justify-between overflow-hidden bg-slate-900/70 border-slate-800/80 hover:border-indigo-500/40"
    >
      {/* Top Image / Gradient placeholder */}
      <div className="relative w-full h-44 bg-gradient-to-tr from-slate-900 via-indigo-950/60 to-slate-900 flex items-center justify-center overflow-hidden border-b border-slate-800/70">
        <span className="text-6xl filter drop-shadow-lg transform transition-transform duration-300 group-hover:scale-125 select-none">
          {emoji}
        </span>

        {/* Veg / Non-Veg Indicator */}
        <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1.5 shadow-sm">
          <span
            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
              item.is_vegetarian
                ? 'border-emerald-500 bg-emerald-950/40'
                : 'border-rose-500 bg-rose-950/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                item.is_vegetarian ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
          </span>
          <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
            {item.is_vegetarian ? 'Veg' : 'Non-Veg'}
          </span>
        </div>

        {/* Prep Time Badge */}
        <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1 text-slate-300 text-xs font-medium shadow-sm">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{item.preparation_time || 15}m</span>
        </div>

        {!item.is_available && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider">
              Currently Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-base text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
              {item.name}
            </h3>
            <span className="text-base font-extrabold text-amber-400 shrink-0">
              {formatCurrency(item.price)}
            </span>
          </div>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
            {item.description || 'Deliciously made fresh to order in the campus kitchen.'}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400">
            {item.category?.name || 'Canteen Special'}
          </span>

          <Button
            size="sm"
            variant={isInCart ? 'secondary' : 'primary'}
            disabled={!item.is_available || isLoading}
            isLoading={isLoading}
            onClick={() => onAddToCart && onAddToCart(item)}
            leftIcon={isInCart ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
          >
            {isInCart ? 'Added' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default FoodCard;
