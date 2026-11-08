'use client';

import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'highlighted' | 'interactive' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      children,
      ...props
    },
    ref
  ) => {
    const paddingClasses = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const variantClasses = {
      default:
        'bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-glass rounded-2xl',
      highlighted:
        'bg-gradient-to-b from-indigo-950/40 via-slate-900/70 to-slate-900/80 backdrop-blur-xl border border-indigo-500/30 shadow-glass shadow-indigo-950/40 rounded-2xl',
      interactive:
        'bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-950/30 transition-all duration-300 cursor-pointer rounded-2xl',
      flat: 'bg-slate-900/40 border border-slate-800/60 rounded-xl',
    };

    return (
      <div
        ref={ref}
        className={cn(variantClasses[variant], paddingClasses[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
export default Card;
