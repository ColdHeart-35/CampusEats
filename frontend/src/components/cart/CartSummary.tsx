'use client';

import React from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export interface CartSummaryProps {
  total: number;
  itemCount: number;
  onCheckout?: () => void;
  disabled?: boolean;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  total,
  itemCount,
  onCheckout,
  disabled = false,
}) => {
  return (
    <Card
      variant="highlighted"
      padding="lg"
      className="sticky top-24 flex flex-col justify-between border-indigo-500/30"
    >
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Order Summary</span>
          </h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="space-y-3.5 text-sm mb-6">
          <div className="flex justify-between text-slate-300">
            <span>Items Subtotal</span>
            <span className="font-semibold text-slate-100">{formatCurrency(total)}</span>
          </div>

          <div className="flex justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <span>Canteen Platform Fee</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                FREE
              </span>
            </span>
            <span className="text-emerald-400 font-semibold">₹0.00</span>
          </div>

          <div className="flex justify-between text-slate-300">
            <span>Estimated Taxes</span>
            <span className="font-semibold text-slate-400">Included</span>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex justify-between items-baseline">
            <span className="text-base font-bold text-white">Grand Total</span>
            <span className="text-2xl font-black text-amber-400 drop-shadow-sm">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {onCheckout ? (
          <Button
            variant="accent"
            size="lg"
            className="w-full text-slate-950 font-extrabold text-sm shadow-amber-500/20 shadow-lg"
            disabled={disabled || itemCount === 0}
            onClick={onCheckout}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Proceed to Checkout
          </Button>
        ) : (
          <Link href="/student/checkout" className="block w-full">
            <Button
              variant="accent"
              size="lg"
              className="w-full text-slate-950 font-extrabold text-sm shadow-amber-500/20 shadow-lg"
              disabled={disabled || itemCount === 0}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Proceed to Checkout
            </Button>
          </Link>
        )}

        <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Secure checkout powered by Razorpay</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-indigo-300/80">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Instant kitchen queue entry upon payment</span>
        </div>
      </div>
    </Card>
  );
};

export default CartSummary;
