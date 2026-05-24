"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Search, RefreshCw, AlertCircle, ShieldOff } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { RadarItem, CANONICAL_CATEGORIES, CATEGORY_ANGLES, WorkspaceResponse, SourceStatus } from './radar-types';
import { getNumericHash } from '../utils/radar';
import { FilterSidebar } from './FilterSidebar';
import { DetailsPanel } from './DetailsPanel';
import { RadarCanvas } from './RadarCanvas';
import { SyncIndicator } from './SyncIndicator';
import { RadarErrorBoundary } from './RadarErrorBoundary';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RadarViewInner = ({ onFilteredItemsChange }: { onFilteredItemsChange?: (items: RadarItem[]) => void }) => {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RadarItem | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [forceDemo, setForceDemo] = useState(false);
  const [sourceStatus, setSourceStatus] = useState<Record<string, SourceStatus>>({});

  // Filter State
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>(['low', 'medium', 'high', 'critical']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(CANONICAL_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItem(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchData = useCallback(async (refresh = false) => {
    if (forceDemo && !isDemoMode) {
        setIsDemoMode(true);
        return;
    }

    setLoading(true);
    try {
      const endpoint = isDemoMode 
        ? 'http://localhost:3001/api/demo-radar' 
        : `http://localhost:3001/api/workspace-radar${refresh ? '?refresh=true' : ''}`;
      
      const response = await axios.get(endpoint);
      
      let newItems: RadarItem[] = [];
      if (isDemoMode) {
          newItems = response.data;
          setSourceStatus({ demo: { status: 'ok', latencyMs: 0 } });
      } else {
          const data = response.data as WorkspaceResponse;
          newItems = data.items;
          setSourceStatus(data.sourceStatus);
      }
      
      setItems(newItems);
      
      const sources = Array.from(new Set(newItems.map((i: RadarItem) => i.source))) as string[];
      if (selectedSources.length === 0 || refresh) setSelectedSources(sources);
    } catch (error: any) {
      console.error('Error fetching radar data:', error);
      // If live fails, and not in forceDemo, we could show error but let's just log
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, forceDemo, selectedSources.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtering Logic (Memoized)
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSource = selectedSources.includes(item.source);
      const matchesSeverity = selectedSeverities.includes(item.severity);
      const matchesCategory = selectedCategories.includes(item.category);
      
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchLower) ||
        item.source.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower) ||
        item.entityType.toLowerCase().includes(searchLower) ||
        (item.correlationKeys && item.correlationKeys.some(k => k.toLowerCase().includes(searchLower)));

      return matchesSource && matchesSeverity && matchesCategory && matchesSearch;
    });
  }, [items, selectedSources, selectedSeverities, selectedCategories, searchQuery]);

  useEffect(() => {
    if (onFilteredItemsChange) {
      onFilteredItemsChange(filteredItems);
    }
  }, [filteredItems, onFilteredItemsChange]);

  const rings = useMemo(() => [
    { label: 'NOW', d: 1 },
    { label: 'TODAY', d: 3 },
    { label: 'WEEK', d: 7 },
    { label: 'MONTH', d: 30 },
    { label: 'LATER', d: 90 }
  ], []);

  const ringStep = 200; 

  const getRadius = useCallback((urgencyScore: number) => {
    const innerHole = ringStep * 0.5;
    if (urgencyScore <= 0.1) return innerHole + (ringStep * 0.2);
    let ringIndex = rings.findIndex(r => urgencyScore <= r.d);
    if (ringIndex === -1) ringIndex = rings.length - 1;
    const prevD = ringIndex === 0 ? 0 : rings[ringIndex - 1].d;
    const currentD = rings[ringIndex].d;
    const progress = (urgencyScore - prevD) / (currentD - prevD);
    return innerHole + (ringIndex + Math.min(progress, 1)) * ringStep;
  }, [ringStep, rings]);

  // Collision Resolution Logic
  const positionedItems = useMemo(() => {
    const resolved: (RadarItem & { x: number; y: number; visualSize: number })[] = [];
    const initial = filteredItems.map(item => {
      const baseRadius = getRadius(item.urgencyScore);
      const hashValue = getNumericHash(item.id);
      const sector = CATEGORY_ANGLES[item.category] || { start: 0, end: 360 };
      const sliceWidth = sector.end - sector.start;
      const jitterFactor = (hashValue % 1000) / 1000; 
      const baseAngle = sector.start + (sliceWidth * 0.15) + (jitterFactor * sliceWidth * 0.7);
      const visualSize = (12 + (item.impactScore || 0) * 2) * 3;
      return { ...item, baseRadius, baseAngle, visualSize };
    }).sort((a, b) => a.urgencyScore - b.urgencyScore);

    for (const item of initial) {
      let currentAngle = item.baseAngle;
      let currentRadius = item.baseRadius;
      let attempts = 0;
      const maxAttempts = 40;
      const padding = 8;
      const getXY = (r: number, a: number) => ({
        x: Math.cos((a * Math.PI) / 180) * r,
        y: Math.sin((a * Math.PI) / 180) * r
      });
      let { x, y } = getXY(currentRadius, currentAngle);
      while (attempts < maxAttempts) {
        let collision = false;
        for (const other of resolved) {
          const dx = x - other.x;
          const dy = y - other.y;
          if (Math.sqrt(dx * dx + dy * dy) < (item.visualSize + other.visualSize) / 2 + padding) {
            collision = true;
            break;
          }
        }
        if (!collision) break;
        attempts++;
        const angleShift = (attempts % 2 === 0 ? 1 : -1) * (Math.ceil(attempts / 2) * 4);
        currentAngle = item.baseAngle + angleShift;
        if (attempts > 15) currentRadius = item.baseRadius + (Math.floor(attempts / 5) * 15);
        const pos = getXY(currentRadius, currentAngle);
        x = pos.x; y = pos.y;
      }
      resolved.push({ ...item, x, y });
    }
    return resolved;
  }, [filteredItems, getRadius]);

  return (
    <div 
      className="relative w-full h-full bg-[#fafafa] overflow-hidden flex"
      onClick={() => setSelectedItem(null)}
    >
      <SyncIndicator loading={loading} hasData={items.length > 0} />

      {/* Control Bar */}
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-4 transition-all duration-500",
        isDemoMode ? "top-16" : "top-8"
      )}>
        <div className="bg-white/95 backdrop-blur-2xl border border-gray-200 p-2 rounded-3xl shadow-2xl flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button 
              disabled={forceDemo}
              onClick={() => setIsDemoMode(false)} 
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                !isDemoMode ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-black disabled:opacity-50"
              )}
            >
              Live
            </button>
            <button 
              onClick={() => setIsDemoMode(true)} 
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isDemoMode ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-black"
              )}
            >
              Demo
            </button>
          </div>
          
          <div className="h-6 w-px bg-gray-200 mx-2" />

          {!isDemoMode && (
            <button 
              onClick={() => fetchData(true)}
              className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-500 hover:text-black group"
              title="Force Refresh Live Data"
            >
              <RefreshCw size={18} className={cn("transition-transform duration-700", loading && "animate-spin")} />
            </button>
          )}

          <button 
            onClick={() => setForceDemo(!forceDemo)}
            className={cn(
              "p-3 rounded-2xl transition-all group",
              forceDemo ? "bg-red-50 text-red-600" : "text-gray-400 hover:text-black"
            )}
            title={forceDemo ? "Disable Force Demo" : "Enable Force Demo (Presentation Safeguard)"}
          >
            <ShieldOff size={18} />
          </button>
        </div>

        {/* Source Status Badges */}
        {!isDemoMode && items.length > 0 && (
            <div className="flex gap-2">
                {Object.entries(sourceStatus).map(([name, status]) => (
                    <div key={name} className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        status.status === 'ok' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                    )}>
                        <div className={cn("w-1 h-1 rounded-full", status.status === 'ok' ? "bg-emerald-500" : "bg-red-500")} />
                        {name} {status.status !== 'ok' && "!"}
                    </div>
                ))}
            </div>
        )}
      </div>

      {isDemoMode && (
        <div className="absolute top-0 left-0 w-full bg-amber-400/90 backdrop-blur-md text-black py-1.5 px-4 text-center z-[250] flex items-center justify-center gap-3 border-b border-amber-500/20">
          <AlertCircle size={14} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Demo Mode • Using synthetic deterministic dataset</span>
        </div>
      )}

      <FilterSidebar 
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        items={items}
        filteredCount={filteredItems.length}
        selectedSources={selectedSources}
        setSelectedSources={setSelectedSources}
        selectedSeverities={selectedSeverities}
        setSelectedSeverities={setSelectedSeverities}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="flex-1 relative">
        {!isFilterOpen && (
          <button onClick={(e) => { e.stopPropagation(); setIsFilterOpen(true); }} className="absolute left-8 top-8 z-50 p-4 bg-white border border-gray-100 rounded-2xl shadow-2xl hover:bg-gray-50 transition-all text-black group">
            <Search size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        )}

        {items.length > 0 ? (
            <RadarCanvas 
                positionedItems={positionedItems}
                selectedItem={selectedItem}
                onSelectItem={setSelectedItem}
                rings={rings}
                ringStep={ringStep}
                canvasSize={2400}
                maxRadius={1000}
            />
        ) : !loading && (
            <div className="w-full h-full flex items-center justify-center flex-col gap-4 text-gray-400">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                    <Search size={32} />
                </div>
                <div className="text-center">
                    <p className="font-black uppercase tracking-[0.2em] text-xs text-gray-900">No active items detected</p>
                    <p className="text-[10px] mt-1">Connect more sources or clear filters to see data</p>
                </div>
            </div>
        )}

        <DetailsPanel 
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSelectItem={setSelectedItem}
          allItems={items}
        />
      </div>

      {loading && items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-[500]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">Initializing Interface</p>
          </div>
        </div>
      )}
    </div>
  );
};

const RadarView = (props: any) => (
  <RadarErrorBoundary>
    <RadarViewInner {...props} />
  </RadarErrorBoundary>
);

export default RadarView;
