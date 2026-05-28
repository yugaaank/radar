import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cross2Icon, ClockIcon, LightningBoltIcon, PersonIcon, ChevronRightIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
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
  onItemAction?: (itemId: string, action: string) => void;
}

export const DetailsPanel = ({ item, onClose, onSelectItem, allItems, onItemAction }: DetailsPanelProps) => {
  if (!item) return <AnimatePresence />;

  const related = allItems.filter(i => 
    i.id !== item.id && 
    i.correlationKeys.some(k => item.correlationKeys.includes(k))
  );

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ x: '110%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '110%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="absolute top-4 bottom-4 right-4 w-[440px] h-[calc(100%-2rem)] bg-white/80 backdrop-blur-2xl border border-neutral-200/60 shadow-[0_15px_50px_rgba(0,0,0,0.08)] z-[300] flex flex-col text-neutral-800 rounded-3xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-200/40 relative">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-neutral-150 rounded-full transition-colors text-neutral-450 hover:text-neutral-700"
            >
              <Cross2Icon width={18} height={18} />
            </button>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="px-3 py-1 bg-neutral-100 border border-neutral-200/30 rounded-full text-[11px] font-black uppercase tracking-wider text-neutral-500">{item.source}</span>
              <span className={cn("px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border", 
                item.severity === 'critical' ? "bg-red-50 text-red-600 border-red-200" : 
                item.severity === 'high' ? "bg-orange-50 text-orange-600 border-orange-200" : 
                item.severity === 'medium' ? "bg-sky-50 text-sky-600 border-sky-200" : 
                "bg-emerald-50 text-emerald-600 border-emerald-200"
              )}>
                {item.severity}
              </span>
            </div>
            <h2 className="text-xl font-black leading-snug tracking-tight text-neutral-900 mb-4 pr-8">{item.title}</h2>
            <div className="flex items-center gap-2.5 text-neutral-400 text-xs font-bold">
              <span className="flex items-center gap-1"><ClockIcon width={14} height={14} /> {item.health}</span>
              <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full" />
              <span className="flex items-center gap-1 uppercase tracking-wider text-neutral-500">{item.category}</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Entity Type</p>
                <p className="text-sm font-bold text-neutral-700 flex items-center gap-1"><ChevronRightIcon width={14} height={14} className="text-neutral-400" /> {item.entityType}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Business Impact</p>
                <p className="text-sm font-bold flex items-center gap-1 text-amber-500"><LightningBoltIcon width={14} height={14} /> {item.impactScore}/5</p>
              </div>
              {item.owner && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Owner</p>
                  <p className="text-sm font-bold text-neutral-700 flex items-center gap-1"><PersonIcon width={14} height={14} /> {item.owner}</p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Updated At</p>
                <p className="text-sm font-bold text-neutral-700">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            {item.description && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Description</p>
                <p className="text-sm leading-relaxed text-neutral-600 bg-neutral-50/50 p-5 rounded-2xl border border-neutral-200/40">{item.description}</p>
              </div>
            )}

            {/* Related Intelligence */}
            {related.length > 0 && (
              <div className="space-y-3.5">
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Related Intelligence</p>
                <div className="space-y-2.5">
                  {related.map(r => (
                    <div 
                      key={r.id} 
                      onClick={() => onSelectItem(r)}
                      className="p-4 bg-neutral-50/50 border border-neutral-200/40 rounded-2xl cursor-pointer hover:bg-neutral-100/80 transition-all group hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">{r.source} • {r.entityType}</span>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          r.severity === 'critical' ? 'bg-red-500 shadow-[0_0_4px_#ef4444]' : 
                          r.severity === 'high' ? 'bg-orange-500' : 'bg-blue-500'
                        )} />
                      </div>
                      <p className="text-sm font-bold leading-normal text-neutral-700 group-hover:text-neutral-900 transition-colors line-clamp-2">{r.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions (Command Center) */}
            {onItemAction && (
              <div className="space-y-3.5 pt-5 border-t border-neutral-200/40">
                <p className="text-[10px] font-black text-neutral-450 uppercase tracking-widest">Command Center Actions</p>
                <div className="flex flex-wrap gap-2.5">
                  {item.source === 'github' && item.entityType === 'pr' && (
                    <>
                      <button 
                        onClick={() => onItemAction(item.id, 'merge_pr')}
                        className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
                      >
                        Merge Pull Request
                      </button>
                      <button 
                        onClick={() => onItemAction(item.id, 'ping_reviewer')}
                        className="px-4.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-750 border border-neutral-200 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer"
                      >
                        Ping Reviewer
                      </button>
                    </>
                  )}
                  {(item.source === 'clickup' || item.source === 'jira') && (
                    <>
                      <button 
                        onClick={() => onItemAction(item.id, 'resolve_task')}
                        className="px-4.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
                      >
                        Mark Done
                      </button>
                      <button 
                        onClick={() => onItemAction(item.id, 'block_task')}
                        className="px-4.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer"
                      >
                        Mark Blocked
                      </button>
                    </>
                  )}
                  {['pagerduty', 'sentry', 'datadog', 'incident'].includes(item.source.toLowerCase()) && (
                    <>
                      <button 
                        onClick={() => onItemAction(item.id, 'resolve_incident')}
                        className="px-4.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
                      >
                        Resolve Incident
                      </button>
                      <button 
                        onClick={() => onItemAction(item.id, 'ack_incident')}
                        className="px-4.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-750 border border-neutral-200 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="pt-5 border-t border-neutral-200/40">
              <details className="group">
                <summary className="list-none cursor-pointer flex items-center justify-between text-[10px] font-black text-neutral-400 uppercase tracking-widest hover:text-neutral-700 transition-colors">
                  Raw Diagnostics
                  <ChevronRightIcon width={14} height={14} className="group-open:rotate-90 transition-transform text-neutral-400" />
                </summary>
                <div className="mt-3 p-5 bg-neutral-900 rounded-2xl border border-neutral-850 font-mono text-[11px] overflow-x-auto text-neutral-300 shadow-inner">
                  <pre>{JSON.stringify(item.raw, null, 2)}</pre>
                </div>
              </details>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-7 bg-neutral-50/50 border-t border-neutral-200/40 flex gap-3">
            {item.url && (
              <a 
                href={item.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-4.5 bg-neutral-900 text-white rounded-2xl font-black uppercase text-[12px] tracking-widest hover:bg-neutral-800 transition-all active:scale-[0.98] shadow-sm"
              >
                <ExternalLinkIcon width={16} height={16} /> Open
              </a>
            )}
            <button
              onClick={onClose}
              className="px-5 py-4.5 bg-neutral-150 hover:bg-neutral-200 text-neutral-700 rounded-2xl font-black uppercase text-[12px] tracking-widest transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
