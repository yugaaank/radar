import React from 'react';
import { motion } from 'framer-motion';
import { CommitIcon, CodeIcon, FileTextIcon, CheckIcon, ExclamationTriangleIcon, CalendarIcon, LightningBoltIcon } from '@radix-ui/react-icons';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { RadarItem, CATEGORY_ANGLES } from './radar-types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RadarCanvasProps {
  positionedItems: (RadarItem & { x: number; y: number; visualSize: number })[];
  selectedItem: RadarItem | null;
  onSelectItem: (item: RadarItem) => void;
  rings: { label: string; d: number }[];
  ringStep: number;
  canvasSize: number;
  maxRadius: number;
}

const getSubjectColor = (entityType?: string, source?: string) => {
  const s = source?.toLowerCase() || '';
  if (s === 'github') {
    if (entityType === 'PR' || entityType === 'pr') return "bg-sky-50/90 border-sky-400/80 text-sky-600 hover:bg-sky-150/90 shadow-sm";
    if (entityType === 'CI Failure' || entityType === 'ci') return "bg-rose-50/90 border-rose-500/80 text-rose-600 hover:bg-rose-100/90 shadow-sm animate-pulse";
    return "bg-blue-50/90 border-blue-400/80 text-blue-600 hover:bg-blue-100/90 shadow-sm";
  }
  if (s === 'notion') return "bg-zinc-50/90 border-zinc-400/80 text-zinc-800 hover:bg-zinc-100/90 shadow-sm";
  if (s === 'clickup') return "bg-purple-50/90 border-purple-400/80 text-purple-600 hover:bg-purple-100/90 shadow-sm";
  if (s === 'pagerduty' || s === 'incident' || s === 'sentry') return "bg-rose-50/90 border-rose-500/80 text-rose-600 hover:bg-rose-100/90 shadow-sm";
  if (s === 'datadog') return "bg-indigo-50/90 border-indigo-400/80 text-indigo-600 hover:bg-indigo-100/90 shadow-sm";
  if (s === 'posthog') return "bg-amber-50/90 border-amber-400/80 text-amber-700 hover:bg-amber-100/90 shadow-sm";
  if (s === 'intercom') return "bg-emerald-50/90 border-emerald-400/80 text-emerald-700 hover:bg-emerald-100/90 shadow-sm";
  
  return "bg-neutral-50/90 border-neutral-400/80 text-neutral-600 hover:bg-neutral-100/90 shadow-sm";
};

export const RadarCanvas = ({
  positionedItems,
  selectedItem,
  onSelectItem,
  rings,
  ringStep,
  canvasSize,
  maxRadius
}: RadarCanvasProps) => {
  return (
    <TransformWrapper initialScale={0.55} centerOnInit={true} minScale={0.1} maxScale={4}>
      <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}>
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none bg-neutral-50">
          
          {/* Grid Background Pattern */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
             <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #000 1.2px, transparent 1.2px)', backgroundSize: '36px 36px' }} />
          </div>

          {/* Radial depth shadow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.02)_100%)] pointer-events-none" />

          {/* Sector category Labels */}
          {Object.entries(CATEGORY_ANGLES).map(([name, { start, end }]) => {
            const midAngle = (start + end) / 2;
            const lx = Math.cos((midAngle * Math.PI) / 180) * (maxRadius + 110);
            const ly = Math.sin((midAngle * Math.PI) / 180) * (maxRadius + 110);
            return (
              <div key={name} className="absolute pointer-events-none" style={{ transform: `translate(${lx}px, ${ly}px)` }}>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-200/40 shadow-sm whitespace-nowrap">{name}</span>
              </div>
            );
          })}

          {/* Sector divider lines */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
            {Object.values(CATEGORY_ANGLES).map(({ start }) => (
              <div key={start} className="absolute h-[180%] w-[1px] bg-neutral-900 origin-center" style={{ transform: `rotate(${start}deg)` }} />
            ))}
          </div>

          {/* Concentric rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {rings.map((ring, i) => (
              <div key={ring.label} className="absolute rounded-full border border-dashed border-neutral-300/50" style={{ width: `${(i + 1) * ringStep * 2 + (ringStep)}px`, height: `${(i + 1) * ringStep * 2 + (ringStep)}px` }}>
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-neutral-200/40 text-[8px] font-black tracking-widest text-neutral-400 shadow-sm">{ring.label}</span>
              </div>
            ))}
          </div>

          {/* Center Immediate Focus Pill */}
          <div className="z-10 bg-neutral-900 text-white border border-white/10 ring-8 ring-neutral-950/5 px-7 py-3 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.15)] text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2 animate-pulse">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444]" />
            Immediate Focus
          </div>

          {/* Nodes */}
          {positionedItems.map((item) => {
            const size = 12 + (item.impactScore || 0) * 1.8;
            const isStuckOrOverdue = item.severity === 'critical';
            const isSelected = selectedItem?.id === item.id;
            const isTopHalf = item.y < 0;

            return (
              <motion.div 
                key={item.id} 
                initial={{ scale: 0, opacity: 0 }} 
                animate={{ scale: isSelected ? 1.25 : 1, opacity: 1, zIndex: isSelected ? 50 : 20 }} 
                transition={{ type: 'spring', damping: 20, stiffness: 250 }} 
                className="absolute group cursor-pointer pointer-events-auto" 
                style={{ x: item.x, y: item.y }} 
                onClick={(e) => { e.stopPropagation(); onSelectItem(item); }}
              >
                {/* Visual Glow behind selected node */}
                {isSelected && (
                  <div className="absolute -inset-2 bg-neutral-900/10 rounded-full blur-md animate-pulse" />
                )}

                <div 
                  className={cn(
                    "rounded-full border shadow-sm transition-all duration-300 hover:scale-115 hover:shadow-md relative flex items-center justify-center", 
                    getSubjectColor(item.entityType, item.source), 
                    isStuckOrOverdue && "ring-4 ring-red-500/10 border-red-500/80 animate-pulse", 
                    item.health === 'Stuck' && "opacity-60", 
                    isSelected && "ring-4 ring-neutral-900/20 scale-110 border-neutral-800"
                  )} 
                  style={{ width: size * 3, height: size * 3 }}
                >
                  {(item.source === 'github' || item.source === 'GitHub') && (['pr', 'PR'].includes(item.entityType) ? <CommitIcon width={size * 1.1} height={size * 1.1} /> : <CodeIcon width={size * 1.1} height={size * 1.1} />)}
                  {(item.source === 'notion' || item.source === 'Notion') && <FileTextIcon width={size * 1.1} height={size * 1.1} />}
                  {(item.source === 'clickup' || item.source === 'ClickUp') && <CheckIcon width={size * 1.1} height={size * 1.1} />}
                  {['pagerduty', 'incident', 'sentry', 'datadog', 'intercom', 'posthog'].includes(item.source.toLowerCase()) && <ExclamationTriangleIcon width={size * 1.1} height={size * 1.1} />}
                  {item.health === 'Stuck' && (
                    <div className="absolute -top-0.5 -right-0.5 bg-red-600 text-white rounded-full p-0.5 border border-white shadow-md"><ExclamationTriangleIcon width={8} height={8} /></div>
                  )}
                </div>

                {/* Glassmorphic Tooltip */}
                {!isSelected && (
                  <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 hidden group-hover:block w-72 p-4 bg-neutral-900/95 backdrop-blur-xl text-white rounded-2xl shadow-xl pointer-events-none border border-neutral-800/80 z-50 overflow-hidden",
                    isTopHalf ? "top-full mt-4" : "bottom-full mb-4"
                  )}>
                    <div className="relative z-10 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider">
                        <span className="bg-white/10 px-2 py-0.5 rounded text-white">{item.source}</span>
                        {item.category && <span className="text-neutral-400">{item.category}</span>}
                        <span className={cn("ml-auto px-2 py-0.5 rounded font-black", 
                          item.severity === 'critical' ? "text-red-400 bg-red-400/10" : 
                          item.severity === 'high' ? "text-orange-400 bg-orange-400/10" : 
                          item.severity === 'medium' ? "text-sky-400 bg-sky-400/10" : 
                          "text-emerald-400 bg-emerald-400/10"
                        )}>{item.health}</span>
                      </div>
                      <p className="text-xs font-semibold leading-normal line-clamp-2 text-neutral-100">{item.title}</p>
                      <div className="flex items-center justify-between text-[9px] border-t border-white/5 pt-2.5 mt-1 text-neutral-400">
                        <div className="flex items-center gap-1.5"><CalendarIcon width={11} height={11} /><span>{Math.floor(item.urgencyScore)}d {item.source.toLowerCase() === 'clickup' ? 'rem.' : 'ago'}</span></div>
                        {item.impactScore && <div className="flex items-center gap-1.5 text-amber-400"><LightningBoltIcon width={11} height={11} /><span>Impact: {item.impactScore}/5</span></div>}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};
