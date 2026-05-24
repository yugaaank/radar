import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, User, ChevronRight, ExternalLink } from 'lucide-react';
import { RadarItem } from './radar-types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DetailsPanelProps {
  item: RadarItem | null;
  onClose: () => void;
  onSelectItem: (item: RadarItem) => void;
  allItems: RadarItem[];
}

export const DetailsPanel = ({ item, onClose, onSelectItem, allItems }: DetailsPanelProps) => {
  if (!item) return <AnimatePresence />;

  const related = allItems.filter(i => 
    i.id !== item.id && 
    i.correlationKeys.some(k => item.correlationKeys.includes(k))
  );

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute top-0 right-0 h-full w-[420px] bg-gray-900 border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.3)] z-[300] flex flex-col text-white overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 relative">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white">{item.source}</span>
              <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", 
                item.severity === 'critical' ? "bg-red-500/20 text-red-400" : 
                item.severity === 'high' ? "bg-orange-500/20 text-orange-400" : 
                item.severity === 'medium' ? "bg-blue-500/20 text-blue-400" : 
                "bg-emerald-500/20 text-emerald-400"
              )}>
                {item.severity}
              </span>
            </div>
            <h2 className="text-2xl font-black leading-tight tracking-tight mb-4 pr-10">{item.title}</h2>
            <div className="flex items-center gap-3 text-gray-400 text-xs font-bold italic">
              <span className="flex items-center gap-1.5"><Clock size={14} /> {item.health}</span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span className="flex items-center gap-1.5 uppercase tracking-wider">{item.category}</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Entity Type</p>
                <p className="text-sm font-bold flex items-center gap-2"><ChevronRight size={14} className="text-gray-600" /> {item.entityType}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Business Impact</p>
                <p className="text-sm font-bold flex items-center gap-2 text-amber-400"><Zap size={14} /> {item.impactScore}/5</p>
              </div>
              {item.owner && (
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Owner</p>
                  <p className="text-sm font-bold flex items-center gap-2"><User size={14} /> {item.owner}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Updated At</p>
                <p className="text-sm font-bold">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            {item.description && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</p>
                <p className="text-sm leading-relaxed text-gray-300 bg-white/5 p-4 rounded-2xl border border-white/5">{item.description}</p>
              </div>
            )}

            {/* Related Intelligence */}
            {related.length > 0 && (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Related Intelligence</p>
                <div className="space-y-2">
                  {related.map(r => (
                    <div 
                      key={r.id} 
                      onClick={() => onSelectItem(r)}
                      className="p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-tighter">{r.source} • {r.entityType}</span>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          r.severity === 'critical' ? 'bg-red-500' : 
                          r.severity === 'high' ? 'bg-orange-500' : 'bg-blue-500'
                        )} />
                      </div>
                      <p className="text-xs font-bold leading-tight group-hover:text-blue-400 transition-colors line-clamp-1">{r.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-white/5">
              <details className="group">
                <summary className="list-none cursor-pointer flex items-center justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
                  Raw Diagnostics
                  <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                </summary>
                <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 font-mono text-[10px] overflow-x-auto text-gray-400">
                  <pre>{JSON.stringify(item.raw, null, 2)}</pre>
                </div>
              </details>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-8 bg-black/20 border-t border-white/5 flex gap-4">
            {item.url && (
              <a 
                href={item.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-black rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-gray-200 transition-all active:scale-[0.98]"
              >
                <ExternalLink size={16} /> Open in Source
              </a>
            )}
            <button
              onClick={onClose}
              className="px-6 py-4 bg-white/10 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
