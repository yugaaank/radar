import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Check } from 'lucide-react';
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
      className="h-full bg-gray-900 border-r border-white/10 z-[150] flex flex-col text-white shadow-2xl relative overflow-hidden shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <Search size={18} className="text-gray-400" />
          </div>
          <h2 className="font-black uppercase tracking-tighter text-lg">Filters</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Search */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Search Workspace</p>
          <div className="relative">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Title, category..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-white/20 transition-all outline-none placeholder:text-gray-600"
            />
            {localSearch && (
              <button onClick={() => setLocalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={14} />
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
            className="py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            Reset All
          </button>
          <button 
            onClick={() => {
              setSelectedSeverities(['critical', 'high']);
              setLocalSearch('');
            }}
            className="py-2 bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            Critical Only
          </button>
          <button onClick={() => { setSelectedCategories(['engineering', 'ops']); setSelectedSeverities(['low', 'medium', 'high', 'critical']); }} className="py-2 bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:bg-blue-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all col-span-2">Engineering Focus</button>
        </div>

        {/* Sources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sources</p>
            <button onClick={() => setSelectedSources(selectedSources.length === allSources.length ? [] : allSources)} className="text-[10px] font-bold text-blue-400 hover:underline">
              {selectedSources.length === allSources.length ? 'Clear' : 'All'}
            </button>
          </div>
          <div className="space-y-2">
            {allSources.map(source => (
              <label key={source} className="flex items-center group cursor-pointer">
                <input type="checkbox" checked={selectedSources.includes(source)} onChange={() => toggle(selectedSources, source, setSelectedSources)} className="hidden" />
                <div className={cn("w-4 h-4 rounded border transition-all flex items-center justify-center mr-3", selectedSources.includes(source) ? "bg-white border-white" : "border-white/20 group-hover:border-white/40")}>
                  {selectedSources.includes(source) && <Check size={10} className="text-black stroke-[4]" />}
                </div>
                <span className={cn("text-sm font-bold transition-all", selectedSources.includes(source) ? "text-white" : "text-gray-500 group-hover:text-gray-300")}>{source}</span>
                <span className="ml-auto text-[10px] font-black text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{counts.sources[source] || 0}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Severity</p>
          <div className="space-y-2">
            {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
              <label key={sev} className="flex items-center group cursor-pointer">
                <input type="checkbox" checked={selectedSeverities.includes(sev)} onChange={() => toggle(selectedSeverities, sev, setSelectedSeverities)} className="hidden" />
                <div className={cn("w-4 h-4 rounded border transition-all flex items-center justify-center mr-3", selectedSeverities.includes(sev) ? "bg-white border-white" : "border-white/20 group-hover:border-white/40")}>
                  {selectedSeverities.includes(sev) && <Check size={10} className="text-black stroke-[4]" />}
                </div>
                <span className={cn("text-sm font-bold capitalize transition-all", selectedSeverities.includes(sev) ? "text-white" : "text-gray-500 group-hover:text-gray-300")}>{sev}</span>
                <div className={cn("ml-auto w-2 h-2 rounded-full", 
                  sev === 'critical' ? 'bg-red-500' : 
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
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Domains</p>
            <div className="flex gap-2">
              <button onClick={() => setSelectedCategories(CANONICAL_CATEGORIES)} className="text-[10px] font-bold text-blue-400 hover:underline">All</button>
              <button onClick={() => setSelectedCategories([])} className="text-[10px] font-bold text-blue-400 hover:underline">Clear</button>
            </div>
          </div>
          <div className="space-y-2">
            {CANONICAL_CATEGORIES.filter(cat => (counts.categories[cat] || 0) > 0).map(cat => (
              <label key={cat} className="flex items-center group cursor-pointer">
                <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => toggle(selectedCategories, cat, setSelectedCategories)} className="hidden" />
                <div className={cn("w-4 h-4 rounded border transition-all flex items-center justify-center mr-3", selectedCategories.includes(cat) ? "bg-white border-white" : "border-white/20 group-hover:border-white/40")}>
                  {selectedCategories.includes(cat) && <Check size={10} className="text-black stroke-[4]" />}
                </div>
                <span className={cn("text-sm font-bold capitalize transition-all", selectedCategories.includes(cat) ? "text-white" : "text-gray-500 group-hover:text-gray-300")}>{cat}</span>
                <span className="ml-auto text-[10px] font-black text-gray-600">{counts.categories[cat] || 0}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="p-6 bg-black/20 border-t border-white/5">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-500">
          <span>Visibility</span>
          <span className="text-white">{filteredCount} / {items.length}</span>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(filteredCount / (items.length || 1)) * 100}%` }}
            className="h-full bg-white"
          />
        </div>
      </div>
    </motion.div>
  );
};
