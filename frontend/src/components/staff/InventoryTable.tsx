'use client';

import React from 'react';
import { Ingredient } from '@/lib/types';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { AlertTriangle, PlusCircle, Boxes, CheckCircle2 } from 'lucide-react';

export interface InventoryTableProps {
  ingredients: Ingredient[];
  onRestock: (id: number) => void;
  isLoading?: boolean;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  ingredients,
  onRestock,
  isLoading = false,
}) => {
  if (ingredients.length === 0 && !isLoading) {
    return (
      <EmptyState
        icon={<Boxes className="w-8 h-8 text-indigo-400" />}
        title="No ingredients found"
        description="The canteen kitchen currently has no tracked ingredients in this view."
      />
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-glass">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-xs uppercase font-semibold tracking-wider text-slate-400">
            <tr>
              <th scope="col" className="px-5 py-4">Ingredient Name</th>
              <th scope="col" className="px-5 py-4">Current Stock</th>
              <th scope="col" className="px-5 py-4">Minimum Level</th>
              <th scope="col" className="px-5 py-4">Stock Health</th>
              <th scope="col" className="px-5 py-4">Status</th>
              <th scope="col" className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-32" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-20" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-slate-800 rounded w-16" /></td>
                  <td className="px-5 py-4"><div className="h-3 bg-slate-800 rounded w-36" /></td>
                  <td className="px-5 py-4"><div className="h-5 bg-slate-800 rounded-full w-20" /></td>
                  <td className="px-5 py-4 text-right"><div className="h-8 bg-slate-800 rounded-lg w-20 ml-auto" /></td>
                </tr>
              ))
            ) : (
              ingredients.map((ingredient) => {
                const current = Number(ingredient.current_stock) || 0;
                const min = Number(ingredient.min_stock_level) || 1;
                // Ratio relative to safe threshold (2x min stock is considered full capacity standard)
                const safeMax = Math.max(min * 2.5, 10);
                const percent = Math.min(Math.round((current / safeMax) * 100), 100);

                let healthColor = 'bg-emerald-500';
                let healthVariant: 'success' | 'warning' | 'danger' = 'success';
                let healthLabel = 'Sufficient';

                if (current <= min || percent < 20) {
                  healthColor = 'bg-rose-500';
                  healthVariant = 'danger';
                  healthLabel = 'Critical';
                } else if (percent < 50) {
                  healthColor = 'bg-amber-500';
                  healthVariant = 'warning';
                  healthLabel = 'Low';
                }

                return (
                  <tr
                    key={ingredient.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-100 whitespace-nowrap">
                      {ingredient.name}
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-white whitespace-nowrap">
                      {current} <span className="text-xs font-normal text-slate-400">{ingredient.unit}</span>
                    </td>

                    <td className="px-5 py-4 font-mono text-slate-400 whitespace-nowrap">
                      {min} <span className="text-xs">{ingredient.unit}</span>
                    </td>

                    {/* Stock Bar Column */}
                    <td className="px-5 py-4 min-w-[160px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${healthColor}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400 w-9 text-right">
                          {percent}%
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant={healthVariant} size="sm" dot>
                        {healthLabel}
                      </Badge>
                    </td>

                    {/* Restock Action */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Button
                        variant={healthVariant === 'danger' ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => onRestock(ingredient.id)}
                        leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Restock
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;
