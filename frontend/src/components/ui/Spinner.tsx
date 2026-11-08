'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  label = 'Loading...',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
    xl: 'w-14 h-14 border-4',
  };

  return (
    <div className="inline-flex flex-col items-center justify-center gap-2" role="status">
      <div
        className={cn(
          'rounded-full border-slate-700/60 border-t-indigo-500 animate-spin',
          sizeMap[size],
          className
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default Spinner;
