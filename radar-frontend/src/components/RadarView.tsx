"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { MagnifyingGlassIcon, UpdateIcon, ExclamationTriangleIcon, EyeNoneIcon, InfoCircledIcon, Cross2Icon } from '@radix-ui/react-icons';
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

interface RadarViewInnerProps {
  onFilteredItemsChange?: (items: RadarItem[]) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  forceDemo: boolean;
  setForceDemo: (val: boolean) => void;
  loading: boolean;
  setLoading: (val: boolean) => void;
  refreshTrigger: number;
  sourceStatus: Record<string, SourceStatus>;
  setSourceStatus: (val: Record<string, SourceStatus>) => void;
}

const RadarViewInner = ({ 
  onFilteredItemsChange,
  isDemoMode,
  setIsDemoMode,
  forceDemo,
  setForceDemo,
  loading,
  setLoading,
  refreshTrigger,
  sourceStatus,
  setSourceStatus
}: RadarViewInnerProps) => {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<RadarItem | null>(null);

  // Filter State
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>(['low', 'medium', 'high', 'critical']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(CANONICAL_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showOnboardingToast, setShowOnboardingToast] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem('radar_visited');
    if (!visited) {
      setShowOnboardingToast(true);
    }
  }, []);

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

  const handleItemAction = async (itemId: string, action: string) => {
    try {
      await axios.post(`http://localhost:3001/api/items/${itemId}/action`, { action });
      
      if (['resolve_task', 'merge_pr', 'resolve_incident'].includes(action)) {
        setItems(prev => prev.filter(i => i.id !== itemId));
        setSelectedItem(null);
      } else if (action === 'block_task') {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, severity: 'critical', health: 'Stuck', radarScore: 99 } : i));
        setSelectedItem(prev => prev && prev.id === itemId ? { ...prev, severity: 'critical', health: 'Stuck', radarScore: 99 } : prev);
      } else if (action === 'ack_incident') {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, health: 'warning', severity: 'medium', radarScore: 40 } : i));
        setSelectedItem(prev => prev && prev.id === itemId ? { ...prev, health: 'warning', severity: 'medium', radarScore: 40 } : prev);
      }
    } catch (error) {
      console.error('Failed to execute item action:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchData(true);
    }
  }, [refreshTrigger, fetchData]);

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
    { label: 'NOW', d: 10 },
    { label: 'TODAY', d: 25 },
    { label: 'WEEK', d: 50 },
    { label: 'MONTH', d: 75 },
    { label: 'LATER', d: 100 }
  ], []);

  const ringStep = 160; 

  const getRadius = useCallback((priorityValue: number) => {
    const innerHole = ringStep * 0.5;
    if (priorityValue <= 1) return innerHole + (ringStep * 0.2);
    let ringIndex = rings.findIndex(r => priorityValue <= r.d);
    if (ringIndex === -1) ringIndex = rings.length - 1;
    const prevD = ringIndex === 0 ? 0 : rings[ringIndex - 1].d;
    const currentD = rings[ringIndex].d;
    const progress = (priorityValue - prevD) / (currentD - prevD);
    return innerHole + (ringIndex + Math.min(progress, 1)) * ringStep;
  }, [ringStep, rings]);

  // Collision Resolution Logic
  const positionedItems = useMemo(() => {
    const resolved: (RadarItem & { x: number; y: number; visualSize: number })[] = [];
    const initial = filteredItems.map(item => {
      const priorityValue = 100 - (item.radarScore || 0);
      const baseRadius = getRadius(priorityValue);
      const hashValue = getNumericHash(item.id);
      const sector = CATEGORY_ANGLES[item.category] || { start: 0, end: 360 };
      const sliceWidth = sector.end - sector.start;
      const jitterFactor = (hashValue % 1000) / 1000; 
      const baseAngle = sector.start + (sliceWidth * 0.15) + (jitterFactor * sliceWidth * 0.7);
      const visualSize = (24 + (item.impactScore || 0) * 3.5) * 3;
      return { ...item, baseRadius, baseAngle, visualSize };
    }).sort((a, b) => b.radarScore - a.radarScore);

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
      className="relative w-full h-full bg-neutral-50 overflow-hidden"
      onClick={() => setSelectedItem(null)}
    >
      {/* Grid Background Pattern covering the entire viewport */}
      <div className="absolute inset-0 opacity-[0.12] pointer-events-none z-0">
         <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #000 1.2px, transparent 1.2px)', backgroundSize: '36px 36px' }} />
      </div>

      <SyncIndicator loading={loading} hasData={items.length > 0} />



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

      <div className="w-full h-full relative">
        {!isFilterOpen && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsFilterOpen(true); }} 
            className="absolute left-8 top-32 z-50 px-5 py-3.5 bg-white border border-neutral-200 shadow-xl hover:bg-neutral-50 transition-all text-neutral-800 rounded-2xl group flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <MagnifyingGlassIcon width={18} height={18} className="group-hover:scale-110 transition-transform text-neutral-500" />
            <span className="text-xs font-bold text-neutral-600">Filters & Search</span>
          </button>
        )}

        {items.length > 0 ? (
            <RadarCanvas 
                positionedItems={positionedItems}
                selectedItem={selectedItem}
                onSelectItem={setSelectedItem}
                rings={rings}
                ringStep={ringStep}
                canvasSize={2200}
                maxRadius={900}
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
          onItemAction={handleItemAction}
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

      {/* Onboarding Welcome Toast */}
      {showOnboardingToast && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] max-w-md w-full px-4">
          <div className="bg-neutral-900/95 backdrop-blur-xl border border-white/10 text-white p-5 rounded-3xl shadow-2xl flex items-start gap-4 animate-scale-up">
            <div className="p-2 bg-white/10 rounded-xl text-amber-400 shrink-0">
              <InfoCircledIcon width={18} height={18} />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-200">First-time Tip</h3>
              <p className="text-[11px] text-neutral-400 leading-normal font-medium">
                Drag the canvas to pan, scroll to zoom, and click nodes to view raw diagnostic parameters. Toggle search filters in the top-left corner.
              </p>
            </div>
            <button 
              onClick={() => {
                localStorage.setItem('radar_visited', 'true');
                setShowOnboardingToast(false);
              }}
              className="p-1 hover:bg-white/15 rounded-lg transition-colors text-neutral-400 hover:text-white shrink-0"
            >
              <Cross2Icon width={16} height={16} />
            </button>
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
