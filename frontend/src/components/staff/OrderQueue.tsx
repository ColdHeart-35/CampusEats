'use client';

import React from 'react';
import { Order, OrderStatus } from '@/lib/types';
import { formatCurrency, formatTime, getStatusColor } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { Check, X, Clock, ChefHat, BellRing, PackageCheck, User } from 'lucide-react';

export interface OrderQueueProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  isUpdating?: boolean;
}

export const OrderQueue: React.FC<OrderQueueProps> = ({
  orders,
  onUpdateStatus,
  isUpdating = false,
}) => {
  // Sort orders with pending first, then by created_at desc
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (sortedOrders.length === 0) {
    return (
      <EmptyState
        icon={<ChefHat className="w-8 h-8 text-indigo-400" />}
        title="Kitchen Queue Empty"
        description="There are currently no active orders waiting in the queue."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {sortedOrders.map((order) => {
        const isPending = order.status === 'pending';
        const isAccepted = order.status === 'accepted';
        const isPreparing = order.status === 'preparing';
        const isReady = order.status === 'ready';

        return (
          <Card
            key={order.id}
            variant="flat"
            padding="none"
            className={`flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 ${
              isPending
                ? 'border-amber-500/50 bg-amber-950/10 shadow-lg shadow-amber-950/20'
                : isReady
                ? 'border-emerald-500/40 bg-emerald-950/10'
                : 'border-slate-800 bg-slate-900/60'
            }`}
          >
            {/* Header: Order ID, Time, Badge */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-black text-white">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <Badge
                    variant={
                      isReady
                        ? 'success'
                        : isPending
                        ? 'warning'
                        : order.status === 'cancelled'
                        ? 'danger'
                        : 'primary'
                    }
                    size="sm"
                    dot
                  >
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Placed at {formatTime(order.created_at)}</span>
                  {order.user && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <User className="w-3 h-3" />
                        {order.user.full_name || order.user.email}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <span className="text-sm font-extrabold text-amber-400 shrink-0">
                {formatCurrency(order.total_amount)}
              </span>
            </div>

            {/* Order Items Body */}
            <div className="p-4 sm:p-5 flex-1 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Ordered Items ({order.items?.length || 0})
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {order.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-950/50 border border-slate-800/50"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-extrabold text-amber-400 w-5 shrink-0">
                        {item.quantity}x
                      </span>
                      <span className="font-semibold text-slate-200 truncate">
                        {item.food_item?.name || `Item #${item.food_item_id}`}
                      </span>
                    </div>
                    <span className="text-slate-400 shrink-0 font-medium">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {order.special_instructions && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  <span className="font-bold">Instructions: </span>
                  {order.special_instructions}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-slate-950/70 border-t border-slate-800/80">
              {isPending ? (
                /* Pending Orders: Accept or Reject Buttons */
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={isUpdating}
                    onClick={() => onUpdateStatus(order.id, 'cancelled')}
                    leftIcon={<X className="w-3.5 h-3.5" />}
                    className="w-full text-xs"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isUpdating}
                    onClick={() => onUpdateStatus(order.id, 'accepted')}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                    className="w-full text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-500/30"
                  >
                    Accept Order
                  </Button>
                </div>
              ) : (
                /* Non-pending orders: Quick Stage Progression + Dropdown */
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  {/* Primary next action button */}
                  {isAccepted && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => onUpdateStatus(order.id, 'preparing')}
                      leftIcon={<ChefHat className="w-3.5 h-3.5" />}
                      className="w-full sm:flex-1 text-xs"
                    >
                      Start Cooking
                    </Button>
                  )}

                  {isPreparing && (
                    <Button
                      variant="accent"
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => onUpdateStatus(order.id, 'ready')}
                      leftIcon={<BellRing className="w-3.5 h-3.5" />}
                      className="w-full sm:flex-1 text-xs"
                    >
                      Mark as Ready
                    </Button>
                  )}

                  {isReady && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => onUpdateStatus(order.id, 'picked_up')}
                      leftIcon={<PackageCheck className="w-3.5 h-3.5 text-emerald-400" />}
                      className="w-full sm:flex-1 text-xs hover:border-emerald-500/40"
                    >
                      Complete Pickup
                    </Button>
                  )}

                  {/* Manual status selector fallback */}
                  <select
                    value={order.status}
                    disabled={isUpdating}
                    onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                    className="w-full sm:w-auto bg-slate-900 text-slate-300 text-xs border border-slate-700 rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="accepted">Accepted</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default OrderQueue;
