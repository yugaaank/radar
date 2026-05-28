import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon, Cross2Icon, CheckIcon } from '@radix-ui/react-icons';
import { RadarItem, CANONICAL_CATEGORIES } from './radar-types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: RadarItem[];
  filteredCount: number;
  selectedSources: string[];
  setSelectedSources: (val: string[]) => void;
  selectedSeverities: string[];
  setSelectedSeverities: (val: string[]) => void;
  selectedCategories: string[];
  setSelectedCategories: (val: string[]) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export const FilterSidebar = ({
  isOpen,
  onClose,
  items,
  filteredCount,
  selectedSources,
  setSelectedSources,
  selectedSeverities,
  setSelectedSeverities,
  selectedCategories,
  setSelectedCategories,
  searchQuery,
  setSearchQuery
}: FilterSidebarProps) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  const allSources = Array.from(new Set(items.map(i => i.source)));
  
  const counts = {
    sources: items.reduce((acc, i) => ({ ...acc, [i.source]: (acc[i.source] || 0) + 1 }), {} as any),
    severities: items.reduce((acc, i) => ({ ...acc, [i.severity]: (acc[i.severity] || 0) + 1 }), {} as any),
    categories: items.reduce((acc, i) => ({ ...acc, [i.category]: (acc[i.category] || 0) + 1 }), {} as any)
  };

  const toggle = (list: string[], item: string, setter: (val: string[]) => void) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  return (
    <motion.div
      animate={{ width: isOpen ? 340 : 0, opacity: isOpen ? 1 : 0 }}
      className="h-full bg-white/70 backdrop-blur-2xl border-r border-neutral-200/50 z-[150] flex flex-col text-neutral-800 shadow-xl relative overflow-hidden shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 border-b border-neutral-200/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-100 rounded-xl">
            <MagnifyingGlassIcon width={16} height={16} className="text-neutral-500" />
          </div>
          <h2 className="font-extrabold uppercase tracking-widest text-[10px] text-neutral-500">Filters</h2>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-600">
          <Cross2Icon width={15} height={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Search */}
        <div className="space-y-2.5">
          <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Search Workspace</p>
          <div className="relative">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search title, keys..."
              className="w-full bg-neutral-100/50 border border-neutral-200/40 rounded-xl py-2 px-3 text-xs focus:border-neutral-300 transition-all outline-none placeholder:text-neutral-450 text-neutral-800"
            />
            {localSearch && (
              <button onClick={() => setLocalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <Cross2Icon width={12} height={12} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => {
              setSelectedSources(allSources);
              setSelectedSeverities(['low', 'medium', 'high', 'critical']);
              setSelectedCategories(CANONICAL_CATEGORIES);
            }}
            className="py-1.5 bg-neutral-150/70 hover:bg-neutral-200/70 rounded-lg text-[9px] font-bold text-neutral-700 transition-all border border-neutral-200/20"
          >
            Reset All
          </button>
          <button 
            onClick={() => {
              setSelectedSeverities(['critical', 'high']);
              setLocalSearch('');
            }}
            className="py-1.5 bg-rose-50 text-rose-600 border border-rose-200/40 hover:bg-rose-100 rounded-lg text-[9px] font-bold transition-all"
          >
            Critical Only
          </button>
          <button onClick={() => { setSelectedCategories(['engineering', 'ops']); setSelectedSeverities(['low', 'medium', 'high', 'critical']); }} className="py-1.5 bg-sky-50 text-sky-600 border border-sky-200/40 hover:bg-sky-100 rounded-lg text-[9px] font-bold transition-all col-span-2 text-center">Engineering Focus</button>
        </div>

        {/* Sources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Sources</p>
            <button onClick={() => setSelectedSources(selectedSources.length === allSources.length ? [] : allSources)} className="text-[9px] font-extrabold text-neutral-400 hover:text-neutral-850">
              {selectedSources.length === allSources.length ? 'Clear' : 'Select All'}
            </button>
          </div>
          <div className="space-y-2">
            {allSources.map(source => (
              <label key={source} className="flex items-center group cursor-pointer">
                <input type="checkbox" checked={selectedSources.includes(source)} onChange={() => toggle(selectedSources, source, setSelectedSources)} className="hidden" />
                <div className={cn("w-3.5 h-3.5 rounded border transition-all flex items-center justify-center mr-3", selectedSources.includes(source) ? "bg-neutral-900 border-neutral-900" : "border-neutral-300 bg-white group-hover:border-neutral-400")}>
                  {selectedSources.includes(source) && <CheckIcon width={8} height={8} className="text-white" />}
                </div>
                <span className={cn("text-xs font-semibold capitalize transition-all", selectedSources.includes(source) ? "text-neutral-900 font-bold" : "text-neutral-500 group-hover:text-neutral-700")}>{source}</span>
                <span className="ml-auto text-[8px] font-black text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">{counts.sources[source] || 0}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div className="space-y-4">
          <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Severity</p>
          <div className="space-y-2">
            {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
              <label key={sev} className="flex items-center group cursor-pointer">
                <input type="checkbox" checked={selectedSeverities.includes(sev)} onChange={() => toggle(selectedSeverities, sev, setSelectedSeverities)} className="hidden" />
                <div className={cn("w-3.5 h-3.5 rounded border transition-all flex items-center justify-center mr-3", selectedSeverities.includes(sev) ? "bg-neutral-900 border-neutral-900" : "border-neutral-300 bg-white group-hover:border-neutral-400")}>
                  {selectedSeverities.includes(sev) && <CheckIcon width={8} height={8} className="text-white" />}
                </div>
                <span className={cn("text-xs font-semibold capitalize transition-all", selectedSeverities.includes(sev) ? "text-neutral-900 font-bold" : "text-neutral-500 group-hover:text-neutral-700")}>{sev}</span>
                <div className={cn("ml-auto w-1.5 h-1.5 rounded-full", 
                  sev === 'critical' ? 'bg-red-500 shadow-[0_0_5px_#ef4444]' : 
                  sev === 'high' ? 'bg-orange-500' : 
                  sev === 'medium' ? 'bg-blue-500' : 'bg-emerald-500'
                )} />
              </label>
            ))}
          </div>
        </div>

        {/* Domains */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Domains</p>
            <div className="flex gap-2">
              <button onClick={() => setSelectedCategories(CANONICAL_CATEGORIES)} className="text-[9px] font-extrabold text-neutral-400 hover:text-neutral-850">All</button>
              <button onClick={() => setSelectedCategories([])} className="text-[9px] font-extrabold text-neutral-400 hover:text-neutral-850">Clear</button>
            </div>
          </div>
          <div className="space-y-2">
            {CANONICAL_CATEGORIES.filter(cat => (counts.categories[cat] || 0) > 0).map(cat => (
              <label key={cat} className="flex items-center group cursor-pointer">
                <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => toggle(selectedCategories, cat, setSelectedCategories)} className="hidden" />
                <div className={cn("w-3.5 h-3.5 rounded border transition-all flex items-center justify-center mr-3", selectedCategories.includes(cat) ? "bg-neutral-900 border-neutral-900" : "border-neutral-300 bg-white group-hover:border-neutral-400")}>
                  {selectedCategories.includes(cat) && <CheckIcon width={8} height={8} className="text-white" />}
                </div>
                <span className={cn("text-xs font-semibold capitalize transition-all", selectedCategories.includes(cat) ? "text-neutral-900 font-bold" : "text-neutral-500 group-hover:text-neutral-700")}>{cat}</span>
                <span className="ml-auto text-[9px] font-bold text-neutral-400">{counts.categories[cat] || 0}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="p-6 bg-neutral-50/50 border-t border-neutral-200/40">
        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-neutral-400">
          <span>Visibility</span>
          <span className="text-neutral-850 font-bold">{filteredCount} / {items.length}</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-200 rounded-full mt-3 overflow-hidden shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(filteredCount / (items.length || 1)) * 100}%` }}
            className="h-full bg-neutral-900 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
};
