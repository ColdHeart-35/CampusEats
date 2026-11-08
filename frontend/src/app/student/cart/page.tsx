'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import CartItem from '@/components/cart/CartItem';
import CartSummary from '@/components/cart/CartSummary';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { ShoppingCart, Trash2, ArrowLeft, Utensils } from 'lucide-react';

export default function StudentCartPage() {
  const { cartItems, cartTotal, cartCount, loading, updating, updateItem, removeItem, clearCart } =
    useCart();
  const router = useRouter();

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-900 rounded w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-24 bg-slate-900 rounded-2xl border border-slate-800" />
            ))}
          </div>
          <div className="lg:col-span-4 h-64 bg-slate-900 rounded-2xl border border-slate-800" />
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="py-12 max-w-xl mx-auto">
        <EmptyState
          icon={<ShoppingCart className="w-10 h-10 text-indigo-400" />}
          title="Your Canteen Cart is Empty"
          description="You don't have any items in your meal tray yet. Check out today's hot dosas, meals, and snacks!"
          action={{
            label: 'Explore Food Menu',
            onClick: () => router.push('/student/menu'),
            icon: <Utensils className="w-4 h-4" />,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <Link
            href="/student/menu"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Back to menu"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>My Meal Cart</span>
              <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Review your items and proceed to choose a pickup break slot
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmClearOpen(true)}
          leftIcon={<Trash2 className="w-4 h-4 text-rose-400" />}
          className="text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
        >
          Clear Cart
        </Button>
      </div>

      {/* Main Grid: Cart Items List + Cart Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items */}
        <div className="lg:col-span-8 space-y-3">
          {cartItems.map((item) => (
            <CartItem
              key={item.food_item_id}
              item={item}
              onUpdateQuantity={(id, qty) => updateItem(id, qty)}
              onRemove={(id) => setItemToRemove(id)}
              isUpdating={updating}
            />
          ))}
        </div>

        {/* Right Column: Sticky Summary */}
        <div className="lg:col-span-4">
          <CartSummary
            total={cartTotal}
            itemCount={cartCount}
            onCheckout={() => router.push('/student/checkout')}
            disabled={updating || cartItems.length === 0}
          />
        </div>
      </div>

      {/* Confirm Remove Item Modal */}
      {itemToRemove !== null && (
        <Modal
          isOpen={itemToRemove !== null}
          onClose={() => setItemToRemove(null)}
          title="Remove Item?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to remove this item from your meal cart?
            </p>
            <div className="flex items-center gap-3 justify-end pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setItemToRemove(null)}
              >
                Keep Item
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (itemToRemove !== null) {
                    removeItem(itemToRemove);
                    setItemToRemove(null);
                  }
                }}
              >
                Yes, Remove
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Clear All Modal */}
      {confirmClearOpen && (
        <Modal
          isOpen={confirmClearOpen}
          onClose={() => setConfirmClearOpen(false)}
          title="Clear Entire Cart?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              This will remove all items from your canteen tray. Do you wish to continue?
            </p>
            <div className="flex items-center gap-3 justify-end pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmClearOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  clearCart();
                  setConfirmClearOpen(false);
                }}
              >
                Clear Cart
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
