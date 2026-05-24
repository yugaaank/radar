import React from 'react';
import { motion } from 'framer-motion';
import { GitPullRequest, Terminal, FileText, Check, ShieldAlert, AlertCircle, Calendar, Zap } from 'lucide-react';
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
    if (entityType === 'PR' || entityType === 'pr') return "bg-sky-500 border-sky-400 text-white";
    if (entityType === 'CI Failure' || entityType === 'ci') return "bg-slate-900 border-red-600 text-red-500";
    return "bg-blue-600 border-blue-500 text-white";
  }
  if (s === 'notion') return "bg-stone-800 border-stone-700 text-white";
  if (s === 'clickup') return "bg-purple-600 border-purple-500 text-white";
  if (s === 'pagerduty' || s === 'incident' || s === 'sentry') return "bg-red-600 border-red-500 text-white";
  if (s === 'datadog') return "bg-indigo-600 border-indigo-500 text-white";
  if (s === 'posthog') return "bg-amber-500 border-amber-400 text-black";
  if (s === 'intercom') return "bg-emerald-500 border-emerald-400 text-white";
  
  return "bg-slate-700 border-slate-600 text-white";
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
    <TransformWrapper initialScale={0.5} centerOnInit={true} minScale={0.1} maxScale={4}>
      <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}>
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
             <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          </div>

          {Object.entries(CATEGORY_ANGLES).map(([name, { start, end }]) => {
            const midAngle = (start + end) / 2;
            const lx = Math.cos((midAngle * Math.PI) / 180) * (maxRadius + 120);
            const ly = Math.sin((midAngle * Math.PI) / 180) * (maxRadius + 120);
            return (
              <div key={name} className="absolute pointer-events-none" style={{ transform: `translate(${lx}px, ${ly}px)` }}>
                <span className="text-[14px] font-black uppercase tracking-[0.4em] text-gray-300 whitespace-nowrap">{name}</span>
              </div>
            );
          })}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
            {Object.values(CATEGORY_ANGLES).map(({ start }) => (
              <div key={start} className="absolute h-[200%] w-[2px] bg-black origin-center" style={{ transform: `rotate(${start}deg)` }} />
            ))}
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {rings.map((ring, i) => (
              <div key={ring.label} className="absolute rounded-full border border-gray-200/80" style={{ width: `${(i + 1) * ringStep * 2 + (ringStep)}px`, height: `${(i + 1) * ringStep * 2 + (ringStep)}px` }}>
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#fafafa] px-3 py-1 rounded-full border border-gray-100 text-[10px] font-black text-gray-400 shadow-sm">{ring.label}</span>
              </div>
            ))}
          </div>

          <div className="z-10 bg-black text-white px-8 py-4 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.2)] text-[12px] font-black uppercase tracking-[0.2em] animate-pulse">Immediate Focus</div>

          {positionedItems.map((item) => {
            const size = 12 + (item.impactScore || 0) * 2;
            const isStuckOrOverdue = item.severity === 'critical';
            const isSelected = selectedItem?.id === item.id;
            const isTopHalf = item.y < 0;

            return (
              <motion.div 
                key={item.id} 
                initial={{ scale: 0, opacity: 0 }} 
                animate={{ scale: isSelected ? 1.2 : 1, opacity: 1, zIndex: isSelected ? 40 : 20 }} 
                transition={{ type: 'spring', damping: 15, stiffness: 150 }} 
                className="absolute group cursor-pointer pointer-events-auto" 
                style={{ x: item.x, y: item.y }} 
                onClick={(e) => { e.stopPropagation(); onSelectItem(item); }}
              >
                <div className={cn("rounded-full shadow-lg border-2 transition-all hover:scale-125 hover:shadow-2xl relative flex items-center justify-center", getSubjectColor(item.entityType, item.source), isStuckOrOverdue && "ring-8 ring-red-500/20 animate-pulse border-red-500", item.health === 'Stuck' && "opacity-60", isSelected && "ring-offset-4 ring-4 ring-black scale-110")} style={{ width: size * 3, height: size * 3 }}>
                  {(item.source === 'github' || item.source === 'GitHub') && (['pr', 'PR'].includes(item.entityType) ? <GitPullRequest size={size * 1.2} /> : <Terminal size={size * 1.2} />)}
                  {(item.source === 'notion' || item.source === 'Notion') && <FileText size={size * 1.2} />}
                  {(item.source === 'clickup' || item.source === 'ClickUp') && <Check size={size * 1.2} />}
                  {['pagerduty', 'incident', 'sentry', 'datadog', 'intercom', 'posthog'].includes(item.source.toLowerCase()) && <AlertCircle size={size * 1.2} />}
                  {item.health === 'Stuck' && (
                    <div className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 border-2 border-white shadow-lg"><ShieldAlert size={10} /></div>
                  )}
                </div>

                {!isSelected && (
                  <div className={cn(
                    "absolute left-1/2 -translate-x-1/2 hidden group-hover:block w-80 p-5 bg-gray-900 text-white rounded-[2rem] shadow-[0_30px_70px_rgba(0,0,0,0.5)] pointer-events-none border border-white/10 z-50 overflow-hidden",
                    isTopHalf ? "top-full mt-6" : "bottom-full mb-6"
                  )}>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest">
                        <span className="bg-white/10 px-3 py-1 rounded-full text-white">{item.source}</span>
                        {item.category && <span className="text-gray-400">{item.category}</span>}
                        <span className={cn("ml-auto px-3 py-1 rounded-full", item.severity === 'low' ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10")}>{item.health}</span>
                      </div>
                      <p className="text-[14px] font-bold leading-snug line-clamp-3 mb-4">{item.title}</p>
                      <div className="grid grid-cols-2 gap-3 text-[10px] border-t border-white/5 pt-4 mt-1">
                        <div className="flex items-center gap-2 text-gray-400"><Calendar size={12} /><span>{Math.floor(item.urgencyScore)}d {item.source.toLowerCase() === 'clickup' ? 'rem.' : 'ago'}</span></div>
                        {item.impactScore && <div className="flex items-center gap-2 text-amber-400"><Zap size={12} /><span>Impact: {item.impactScore}/5</span></div>}
                      </div>
                    </div>
                    <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl opacity-30 -mr-16 -mt-16 rounded-full", getSubjectColor(item.entityType, item.source))} />
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
