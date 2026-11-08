'use client';

import React from 'react';
import { UtensilsCrossed, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-slate-950 border-t border-slate-900 py-6 text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold text-slate-300">CampusEats</span>
          <span>•</span>
          <span>Real-Time Canteen Pre-Ordering & Inventory Intelligence</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Campus Life
          </span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-indigo-400 font-mono">
            v1.0.0-prod
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
