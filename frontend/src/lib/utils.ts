import { OrderStatus } from './types';

/**
 * Format numerical amount to Indian Rupee (₹) format with commas and two decimals
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount ?? 0;
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format ISO date string into readable Indian standard format (e.g., 06 Nov 2026)
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format time string or ISO string into readable 12-hour format with AM/PM
 */
export function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return '—';
  try {
    // If format is like "14:30:00"
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeString)) {
      const parts = timeString.split(':');
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    }

    const d = new Date(timeString);
    if (isNaN(d.getTime())) return timeString;
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return timeString;
  }
}

/**
 * Truncate long text strings with ellipsis
 */
export function truncateText(text: string | null | undefined, maxLength: number = 30): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Returns Tailwind CSS classes for order statuses
 */
export function getStatusColor(status: OrderStatus | string): {
  bg: string;
  text: string;
  border: string;
  badge: string;
} {
  switch (status?.toLowerCase()) {
    case 'pending':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    case 'confirmed':
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      };
    case 'accepted':
      return {
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-400',
        border: 'border-indigo-500/30',
        badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      };
    case 'preparing':
      return {
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      };
    case 'ready':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    case 'picked_up':
      return {
        bg: 'bg-slate-500/10',
        text: 'text-slate-400',
        border: 'border-slate-500/30',
        badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
      };
    case 'cancelled':
      return {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      };
    default:
      return {
        bg: 'bg-slate-500/10',
        text: 'text-slate-300',
        border: 'border-slate-500/20',
        badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      };
  }
}

/**
 * Returns icon identifier for an order status
 */
export function getStatusIcon(status: OrderStatus | string): string {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'Clock';
    case 'confirmed':
      return 'CheckCircle2';
    case 'accepted':
      return 'ChefHat';
    case 'preparing':
      return 'Flame';
    case 'ready':
      return 'BellRing';
    case 'picked_up':
      return 'CheckCheck';
    case 'cancelled':
      return 'XCircle';
    default:
      return 'HelpCircle';
  }
}

/**
 * Utility for combining conditional CSS class names safely
 */
export function cn(...inputs: Array<string | boolean | null | undefined | Record<string, boolean>>): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'object') {
      for (const [key, val] of Object.entries(input)) {
        if (val) classes.push(key);
      }
    }
  }

  return classes.filter(Boolean).join(' ');
}
