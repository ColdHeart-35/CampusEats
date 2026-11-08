'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchBarProps {
  onSearch: (query: string) => void;
  onSemanticToggle?: (enabled: boolean) => void;
  semanticEnabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onSemanticToggle,
  semanticEnabled = false,
  placeholder = 'Search delicious foods, snacks, beverages...',
  className,
}) => {
  const [query, setQuery] = useState('');
  const isInitialMount = useRef(true);

  // Debounced search trigger (300ms)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const handler = setTimeout(() => {
      onSearch(query.trim());
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className={cn('flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full', className)}>
      {/* Search Input Box */}
      <div className="relative flex-1 flex items-center">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4 text-slate-400" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            semanticEnabled
              ? 'AI Semantic Search: Try "spicy breakfast" or "refreshing cold drinks"...'
              : placeholder
          }
          className={cn(
            'w-full bg-slate-900/80 text-slate-100 placeholder:text-slate-500 rounded-xl text-sm pl-10 pr-10 py-3 border transition-all duration-200 outline-none',
            semanticEnabled
              ? 'border-indigo-500/60 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 bg-slate-900/90 shadow-lg shadow-indigo-950/40'
              : 'border-slate-800/80 hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          )}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Clear search query"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Semantic Search AI Toggle */}
      {onSemanticToggle && (
        <button
          type="button"
          onClick={() => onSemanticToggle(!semanticEnabled)}
          className={cn(
            'inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 border whitespace-nowrap select-none',
            semanticEnabled
              ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-amber-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 ring-1 ring-amber-400/50'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-slate-800/80'
          )}
          title="Toggle pgvector AI semantic meaning search"
        >
          <Sparkles
            className={cn(
              'w-4 h-4',
              semanticEnabled ? 'text-amber-300 animate-pulse' : 'text-slate-500'
            )}
          />
          <span>AI Search</span>
          <span
            className={cn(
              'text-[10px] uppercase px-1.5 py-0.5 rounded-full font-extrabold',
              semanticEnabled
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                : 'bg-slate-800 text-slate-400'
            )}
          >
            {semanticEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      )}
    </div>
  );
};

export default SearchBar;
