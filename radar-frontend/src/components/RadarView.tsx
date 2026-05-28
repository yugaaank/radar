"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { MagnifyingGlassIcon, UpdateIcon, ExclamationTriangleIcon, EyeNoneIcon } from '@radix-ui/react-icons';
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
      className="relative w-full h-full bg-neutral-50 overflow-hidden flex"
      onClick={() => setSelectedItem(null)}
    >
      <SyncIndicator loading={loading} hasData={items.length > 0} />

      {/* Control Bar */}
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-3 transition-all duration-500",
        isDemoMode ? "top-20" : "top-8"
      )}>
        <div className="bg-white/80 backdrop-blur-xl border border-neutral-200/50 p-1.5 rounded-full shadow-lg flex items-center gap-1.5">
          <div className="flex bg-neutral-100/80 p-0.5 rounded-full">
            <button 
              disabled={forceDemo}
              onClick={() => setIsDemoMode(false)} 
              className={cn(
                "px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300",
                !isDemoMode ? "bg-white text-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.1)]" : "text-neutral-400 hover:text-neutral-700 disabled:opacity-50"
              )}
            >
              Live
            </button>
            <button 
              onClick={() => setIsDemoMode(true)} 
              className={cn(
                "px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300",
                isDemoMode ? "bg-white text-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.1)]" : "text-neutral-400 hover:text-neutral-700"
              )}
            >
              Demo
            </button>
          </div>
          
          <div className="h-4 w-px bg-neutral-200 mx-1" />

          {!isDemoMode && (
            <button 
              onClick={() => fetchData(true)}
              className="p-2 hover:bg-neutral-100 rounded-full transition-all text-neutral-400 hover:text-neutral-800 group"
              title="Force Refresh Live Data"
            >
              <UpdateIcon width={14} height={14} className={cn("transition-transform duration-700", loading && "animate-spin")} />
            </button>
          )}

            <button 
              onClick={() => setForceDemo(!forceDemo)}
              className={cn(
                "p-2 rounded-full transition-all",
                forceDemo ? "bg-rose-50 text-rose-600 border border-rose-200" : "text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100"
              )}
              title={forceDemo ? "Disable Force Demo" : "Enable Force Demo (Presentation Safeguard)"}
            >
              <EyeNoneIcon width={14} height={14} />
            </button>
        </div>

        {/* Source Status Badges */}
        {!isDemoMode && items.length > 0 && (
            <div className="flex gap-2">
                {Object.entries(sourceStatus).map(([name, status]) => (
                    <div key={name} className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-white/80 backdrop-blur-md border border-neutral-200/40 text-neutral-500 shadow-sm"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", status.status === 'ok' ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-rose-500 shadow-[0_0_6px_#f43f5e]")} />
                        {name} {status.status !== 'ok' && "!"}
                    </div>
                ))}
            </div>
        )}
      </div>

      {isDemoMode && (
        <div className="absolute top-0 left-0 w-full bg-amber-500/90 backdrop-blur-md text-white py-2 px-4 text-center z-[250] flex items-center justify-center gap-2 border-b border-amber-600/10 shadow-sm">
          <ExclamationTriangleIcon width={13} height={13} />
          <span className="text-[9px] font-black uppercase tracking-[0.25em]">Demo Mode • Using synthetic deterministic dataset</span>
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
            <MagnifyingGlassIcon width={20} height={20} className="group-hover:scale-110 transition-transform" />
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
                    <MagnifyingGlassIcon width={32} height={32} />
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
