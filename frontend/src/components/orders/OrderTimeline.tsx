'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock, AlertCircle, ChefHat, Flame, BellRing, PackageCheck } from 'lucide-react';

export interface OrderTimelineProps {
  status: string;
  className?: string;
}

interface TimelineStep {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: TimelineStep[] = [
  {
    key: 'pending',
    label: 'Order Placed',
    description: 'Payment verified and sent to canteen',
    icon: Clock,
  },
  {
    key: 'confirmed',
    label: 'Order Confirmed',
    description: 'Token generated & added to kitchen queue',
    icon: Check,
  },
  {
    key: 'accepted',
    label: 'Kitchen Accepted',
    description: 'Chef acknowledged and prepared ingredients',
    icon: ChefHat,
  },
  {
    key: 'preparing',
    label: 'Cooking in Progress',
    description: 'Your fresh meal is being prepared',
    icon: Flame,
  },
  {
    key: 'ready',
    label: 'Ready for Pickup',
    description: 'Present your QR code at the counter',
    icon: BellRing,
  },
  {
    key: 'picked_up',
    label: 'Completed & Picked Up',
    description: 'Order verified and handed over',
    icon: PackageCheck,
  },
];

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ status, className }) => {
  const normalizedStatus = status?.toLowerCase() || 'pending';
  const isCancelled = normalizedStatus === 'cancelled';

  const statusOrder = ['pending', 'confirmed', 'accepted', 'preparing', 'ready', 'picked_up'];
  const currentIndex = isCancelled ? -1 : statusOrder.indexOf(normalizedStatus);

  if (isCancelled) {
    return (
      <div className={cn('p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-center', className)}>
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-base text-rose-300">Order Cancelled</h4>
        <p className="text-xs text-rose-400/80 mt-1 max-w-sm mx-auto">
          This order was cancelled. Any debited amount has been queued for refund back to your payment source.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative py-2 pl-2', className)}>
      <div className="space-y-7">
        {STEPS.map((step, idx) => {
          const isCompleted = currentIndex > idx;
          const isCurrent = currentIndex === idx;
          const isUpcoming = currentIndex < idx;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="relative flex items-start gap-4 group">
              {/* Vertical connector line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'absolute left-4 top-8 -bottom-7 w-0.5 transition-colors duration-300',
                    isCompleted ? 'bg-emerald-500/80' : 'bg-slate-800'
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Step indicator circle */}
              <div
                className={cn(
                  'relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 border',
                  isCompleted &&
                    'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20',
                  isCurrent &&
                    'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/40 ring-4 ring-indigo-500/20 animate-pulse',
                  isUpcoming && 'bg-slate-900 text-slate-500 border-slate-800'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>

              {/* Step text info */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <h5
                    className={cn(
                      'text-sm font-bold tracking-tight',
                      isCompleted && 'text-emerald-400',
                      isCurrent && 'text-indigo-300',
                      isUpcoming && 'text-slate-500'
                    )}
                  >
                    {step.label}
                  </h5>
                  {isCurrent && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">
                      Live
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'text-xs mt-0.5 leading-relaxed',
                    isUpcoming ? 'text-slate-600' : 'text-slate-400'
                  )}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTimeline;
