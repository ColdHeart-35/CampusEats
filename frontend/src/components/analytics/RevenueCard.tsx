'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RevenueCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: string | number;
  trendDirection?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  className?: string;
}

export const RevenueCard: React.FC<RevenueCardProps> = ({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection = 'up',
  subtitle,
  className,
}) => {
  return (
    <Card
      variant="highlighted"
      padding="none"
      className={cn(
        'p-5 sm:p-6 bg-slate-900/60 border-slate-800/80 hover:border-indigo-500/40 rounded-2xl transition-all duration-200 flex flex-col justify-between',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
          <Icon className="w-5 h-5 text-indigo-400" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {value}
        </div>

        {(trend !== undefined || subtitle) && (
          <div className="flex items-center gap-2 pt-1 text-xs">
            {trend !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full border',
                  trendDirection === 'up' &&
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  trendDirection === 'down' &&
                    'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  trendDirection === 'neutral' &&
                    'bg-slate-700/20 text-slate-400 border-slate-700/30'
                )}
              >
                {trendDirection === 'up' && <TrendingUp className="w-3 h-3" />}
                {trendDirection === 'down' && <TrendingDown className="w-3 h-3" />}
                {trendDirection === 'neutral' && <Minus className="w-3 h-3" />}
                <span>{trend}</span>
              </span>
            )}
            {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RevenueCard;
