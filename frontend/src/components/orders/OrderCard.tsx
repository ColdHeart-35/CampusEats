'use client';

import React from 'react';
import Link from 'next/link';
import { Order } from '@/lib/types';
import { formatCurrency, formatDate, formatTime, getStatusColor } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { ChevronRight, Clock, ShoppingBag } from 'lucide-react';

export interface OrderCardProps {
  order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const statusTheme = getStatusColor(order.status);
  const truncatedId = order.id ? order.id.slice(0, 8).toUpperCase() : 'UNKNOWN';
  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || order.items?.length || 0;

  // Derive badge variant from status
  const getBadgeVariant = (st: string) => {
    switch (st.toLowerCase()) {
      case 'ready':
      case 'picked_up':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'danger';
      case 'confirmed':
        return 'info';
      case 'accepted':
      case 'preparing':
      default:
        return 'primary';
    }
  };

  return (
    <Card
      variant="interactive"
      padding="none"
      className="p-5 sm:p-6 bg-slate-900/60 border-slate-800/80 hover:border-indigo-500/40 rounded-2xl transition-all duration-200"
    >
      <div className="flex flex-col gap-4">
        {/* Top: Order ID, Status, and Date */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-mono text-sm sm:text-base font-extrabold text-white">
                #{truncatedId}
              </span>
              <Badge variant={getBadgeVariant(order.status)} size="sm" dot>
                {order.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatDate(order.created_at)} at {formatTime(order.created_at)}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-base sm:text-lg font-black text-amber-400">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </div>

        {/* Middle: Items summary if available */}
        {order.items && order.items.length > 0 && (
          <div className="py-2.5 px-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">
                {order.items.map((i) => `${i.quantity}x ${i.food_item?.name || 'Item'}`).join(', ')}
              </span>
            </div>
            <span className="text-slate-400 font-semibold shrink-0 ml-2">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        )}

        {/* Bottom: Pickup Slot info + View Details link */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
          <div className="text-xs text-slate-400">
            {order.pickup_slot ? (
              <span className="text-indigo-300 font-medium">
                Pickup: {order.pickup_slot.slot_date} ({formatTime(order.pickup_slot.start_time)} - {formatTime(order.pickup_slot.end_time)})
              </span>
            ) : (
              <span className="text-slate-400">Immediate counter prep</span>
            )}
          </div>

          <Link
            href={`/student/orders/${order.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors group"
          >
            <span>View Details</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default OrderCard;
