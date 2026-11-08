'use client';

import React from 'react';
import { CartItem as CartItemType } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Trash2, Plus, Minus } from 'lucide-react';
import Card from '@/components/ui/Card';

export interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (foodItemId: number, quantity: number) => void;
  onRemove: (foodItemId: number) => void;
  isUpdating?: boolean;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  isUpdating = false,
}) => {
  return (
    <Card
      variant="flat"
      padding="none"
      className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80 transition-all rounded-2xl"
    >
      {/* Left: Item Information */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {/* Veg/Non-Veg icon badge */}
        <span
          className={`w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center ${
            item.is_vegetarian !== false
              ? 'border-emerald-500 bg-emerald-950/30'
              : 'border-rose-500 bg-rose-950/30'
          }`}
          title={item.is_vegetarian !== false ? 'Vegetarian' : 'Non-Vegetarian'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.is_vegetarian !== false ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
        </span>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm sm:text-base text-slate-100 truncate">
            {item.name}
          </h4>
          <p className="text-xs text-slate-400 font-medium">
            {formatCurrency(item.price)} each
          </p>
        </div>
      </div>

      {/* Right: Quantity Controls, Subtotal, and Remove Button */}
      <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
        {/* Quantity Controls */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onUpdateQuantity(item.food_item_id, item.quantity - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <span className="w-8 text-center text-xs sm:text-sm font-bold text-white select-none">
            {item.quantity}
          </span>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onUpdateQuantity(item.food_item_id, item.quantity + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            aria-label="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Subtotal */}
        <div className="text-right min-w-[70px]">
          <span className="text-sm sm:text-base font-extrabold text-amber-400">
            {formatCurrency(item.subtotal || item.price * item.quantity)}
          </span>
        </div>

        {/* Remove Button */}
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onRemove(item.food_item_id)}
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-40"
          aria-label="Remove item from cart"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
};

export default CartItem;
