import React, { useRef, useEffect } from 'react';
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
    if (entityType === 'PR' || entityType === 'pr') return "bg-sky-100/90 border-sky-400 text-sky-700 hover:bg-sky-200/90 shadow-sm";
    if (entityType === 'CI Failure' || entityType === 'ci') return "bg-rose-100 border-rose-500 text-rose-700 hover:bg-rose-200 shadow-sm animate-pulse";
    return "bg-blue-100/90 border-blue-400 text-blue-700 hover:bg-blue-200/90 shadow-sm";
  }
  if (s === 'notion') return "bg-zinc-100/90 border-zinc-400 text-zinc-800 hover:bg-zinc-200/90 shadow-sm";
  if (s === 'clickup') return "bg-purple-100/90 border-purple-400 text-purple-700 hover:bg-purple-200/90 shadow-sm";
  if (s === 'pagerduty' || s === 'incident' || s === 'sentry') return "bg-rose-100/90 border-rose-500 text-rose-700 hover:bg-rose-200/90 shadow-sm";
  if (s === 'datadog') return "bg-indigo-100/90 border-indigo-400 text-indigo-700 hover:bg-indigo-200/90 shadow-sm";
  if (s === 'posthog') return "bg-amber-100/90 border-amber-500 text-amber-800 hover:bg-amber-200/90 shadow-sm";
  if (s === 'intercom') return "bg-emerald-100/90 border-emerald-400 text-emerald-700 hover:bg-emerald-200/90 shadow-sm";
  
  return "bg-neutral-100 border-neutral-400 text-neutral-700 hover:bg-neutral-200 shadow-sm";
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
  const transformRef = useRef<any>(null);

  useEffect(() => {
    if (transformRef.current) {
      const timer = setTimeout(() => {
        transformRef.current.centerView();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <TransformWrapper ref={transformRef} initialScale={0.45} centerOnInit={true} minScale={0.1} maxScale={4}>
      <TransformComponent 
        wrapperStyle={{ width: "100%", height: "100%", display: "block", background: "transparent" }} 
        contentStyle={{ width: `${canvasSize}px`, height: `${canvasSize}px`, background: "transparent" }}
      >
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none bg-transparent" style={{ transform: 'translateY(70px)' }}>

          {/* Sector category Labels */}
          {Object.entries(CATEGORY_ANGLES).map(([name, { start, end }]) => {
            const midAngle = (start + end) / 2;
            const lx = Math.cos((midAngle * Math.PI) / 180) * (maxRadius + 140);
            const ly = Math.sin((midAngle * Math.PI) / 180) * (maxRadius + 140);
            return (
              <div key={name} className="absolute pointer-events-none" style={{ transform: `translate(${lx}px, ${ly}px)` }}>
                <span className="text-[32px] font-black uppercase tracking-[0.3em] text-neutral-500 bg-white backdrop-blur-md px-8 py-4 rounded-[45px] border-[3px] border-neutral-300 shadow-md whitespace-nowrap">{name}</span>
              </div>
            );
          })}

          {/* Sector divider lines */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.12]">
            {Object.values(CATEGORY_ANGLES).map(({ start }) => (
              <div key={start} className="absolute h-[180%] w-[1.5px] bg-neutral-300 origin-center" style={{ transform: `rotate(${start}deg)` }} />
            ))}
          </div>

          {/* Concentric rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {rings.map((ring, i) => (
              <div key={ring.label} className="absolute rounded-full border-[1.5px] border-dashed border-neutral-350" style={{ width: `${(i + 1) * ringStep * 2 + (ringStep)}px`, height: `${(i + 1) * ringStep * 2 + (ringStep)}px` }}>
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-2 rounded-[20px] border-[2px] border-neutral-300 text-[24px] font-black tracking-widest text-neutral-500 shadow-sm">{ring.label}</span>
              </div>
            ))}
          </div>

          {/* Center Immediate Focus Pill */}
          <div className="z-10 bg-neutral-900 text-white border border-white/10 ring-[12px] ring-neutral-950/5 px-10 py-5 rounded-[45px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] text-[26px] font-black uppercase tracking-[0.25em] flex items-center gap-4 animate-pulse">
            <div className="w-5 h-5 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]" />
            Immediate Focus
          </div>

          {/* Nodes */}
          {positionedItems.map((item) => {
            const size = 24 + (item.impactScore || 0) * 3.5;
            const isStuckOrOverdue = item.severity === 'critical';
            const isSelected = selectedItem?.id === item.id;
            const isTopHalf = item.y < 0;

            return (
              <motion.div 
                key={item.id} 
                initial={{ scale: 0, opacity: 0 }} 
                animate={{ scale: isSelected ? 1.25 : 1, opacity: 1, zIndex: isSelected ? 50 : 20 }} 
                whileHover={{ zIndex: 100 }}
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
                    "absolute left-1/2 -translate-x-1/2 hidden group-hover:block w-[500px] p-8 bg-neutral-900/95 backdrop-blur-xl text-white rounded-[32px] shadow-2xl pointer-events-none border-[2px] border-neutral-800/80 z-50 overflow-hidden",
                    isTopHalf ? "top-full mt-8" : "bottom-full mb-8"
                  )}>
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-3 text-[20px] font-black uppercase tracking-wider">
                        <span className="bg-white/10 px-4 py-1.5 rounded-lg text-white">{item.source}</span>
                        {item.category && <span className="text-neutral-450">{item.category}</span>}
                        <span className={cn("ml-auto px-4 py-1.5 rounded-lg font-black", 
                          item.severity === 'critical' ? "text-red-400 bg-red-400/10" : 
                          item.severity === 'high' ? "text-orange-400 bg-orange-400/10" : 
                          item.severity === 'medium' ? "text-sky-400 bg-sky-400/10" : 
                          "text-emerald-450 bg-emerald-450/10"
                        )}>{item.health}</span>
                      </div>
                      <p className="text-[28px] font-bold leading-normal line-clamp-2 text-neutral-100">{item.title}</p>
                      <div className="flex items-center justify-between text-[22px] border-t-[2px] border-white/5 pt-6 mt-3 text-neutral-450">
                        <div className="flex items-center gap-3.5"><CalendarIcon width={24} height={24} /><span>{Math.floor(item.urgencyScore)}d {item.source.toLowerCase() === 'clickup' ? 'rem.' : 'ago'}</span></div>
                        {item.impactScore && <div className="flex items-center gap-3.5 text-amber-400"><LightningBoltIcon width={24} height={24} /><span>Impact: {item.impactScore}/5</span></div>}
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
