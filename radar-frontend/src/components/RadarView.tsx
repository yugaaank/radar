"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  AlertCircle, GitPullRequest, Info, Check, Activity, 
  Terminal, FileText, Target, Calendar, Zap, ShieldAlert,
  Search, ZoomIn, ZoomOut, Maximize
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TransformWrapper, TransformComponent, useTransformContext } from "react-zoom-pan-pinch";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RadarItem {
  source: 'GitHub' | 'ClickUp' | 'Slack' | 'Notion';
  title: string;
  updated_at: string;
  html_url: string;
  distance: number; 
  subject?: string;
  category?: 'Finance' | 'Engineering' | 'Learning' | 'Admin' | 'Health' | 'Strategy';
  health: 'Healthy' | 'Overdue' | 'Stuck' | 'Stale' | 'Active' | 'Action Required';
  priority?: string | number;
  impact?: number; 
  isBlocked?: boolean;
}

const CATEGORY_ANGLES = {
  Finance: { start: 0, end: 60 },
  Engineering: { start: 60, end: 120 },
  Learning: { start: 120, end: 180 },
  Admin: { start: 180, end: 240 },
  Health: { start: 240, end: 300 },
  Strategy: { start: 300, end: 360 },
};

const getSubjectColor = (subject?: string, source?: string) => {
  if (source === 'GitHub') {
    if (subject === 'PR') return "bg-sky-500 border-sky-400 text-white";
    if (subject === 'CI Failure') return "bg-slate-900 border-red-600 text-red-500";
    return "bg-blue-600 border-blue-500 text-white";
  }
  if (source === 'Notion') return "bg-stone-800 border-stone-700 text-white";
  
  const s = subject?.toLowerCase() || '';
  if (s.includes('math')) return "bg-emerald-500 border-emerald-400 text-white";
  if (s.includes('chem')) return "bg-orange-500 border-orange-400 text-white";
  if (s.includes('physic')) return "bg-amber-500 border-amber-400 text-white";
  
  return "bg-purple-600 border-purple-500 text-white";
};

const RadarView = () => {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 2000, height: 2000 }); // Large virtual canvas

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/workspace-radar');
        setItems(response.data);
      } catch (error) {
        console.error('Error fetching radar data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const rings = [
    { label: '24h', d: 1 },
    { label: '3d', d: 3 },
    { label: '1w', d: 7 },
    { label: '1m', d: 30 },
    { label: 'Someday', d: 90 }
  ];

  const canvasSize = 2400; // Large fixed canvas for better mapping experience
  const maxRadius = 1000;
  const ringStep = maxRadius / rings.length;

  const getRadius = (distance: number) => {
    const innerHole = ringStep * 0.5;
    if (distance <= 0) return innerHole + (ringStep * 0.2);
    let ringIndex = rings.findIndex(r => distance <= r.d);
    if (ringIndex === -1) ringIndex = rings.length - 1;
    const prevD = ringIndex === 0 ? 0 : rings[ringIndex - 1].d;
    const currentD = rings[ringIndex].d;
    const progress = (distance - prevD) / (currentD - prevD);
    return innerHole + (ringIndex + Math.min(progress, 1)) * ringStep;
  };

  const getPosition = (item: RadarItem, index: number) => {
    const radius = getRadius(item.distance);
    let baseAngle = (index * 137.5) % 360; 

    if (item.category && CATEGORY_ANGLES[item.category]) {
      const { start, end } = CATEGORY_ANGLES[item.category];
      const sliceWidth = end - start;
      const jitter = (Math.sin(index * 2) * (sliceWidth * 0.25)); 
      baseAngle = start + (sliceWidth / 2) + jitter;
    }

    const x = Math.cos((baseAngle * Math.PI) / 180) * radius;
    const y = Math.sin((baseAngle * Math.PI) / 180) * radius;
    return { x, y };
  };

  const Controls = () => {
    return (
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
        <button className="p-3 bg-white border border-gray-100 rounded-xl shadow-xl hover:bg-gray-50 transition-colors text-gray-400 hover:text-black">
          <ZoomIn size={20} />
        </button>
        <button className="p-3 bg-white border border-gray-100 rounded-xl shadow-xl hover:bg-gray-50 transition-colors text-gray-400 hover:text-black">
          <ZoomOut size={20} />
        </button>
        <button className="p-3 bg-white border border-gray-100 rounded-xl shadow-xl hover:bg-gray-50 transition-colors text-gray-400 hover:text-black mt-4">
          <Maximize size={20} />
        </button>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full bg-[#fafafa] overflow-hidden cursor-grab active:cursor-grabbing">
      <TransformWrapper
        initialScale={0.5}
        initialPositionX={0}
        initialPositionY={0}
        centerOnInit={true}
        minScale={0.1}
        maxScale={4}
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Custom Floating Controls */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
              <button onClick={() => zoomIn()} className="p-4 bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl hover:bg-white transition-all text-gray-500 hover:text-black group">
                <ZoomIn size={20} className="group-hover:scale-110 transition-transform" />
              </button>
              <button onClick={() => zoomOut()} className="p-4 bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl hover:bg-white transition-all text-gray-500 hover:text-black group">
                <ZoomOut size={20} className="group-hover:scale-110 transition-transform" />
              </button>
              <button onClick={() => resetTransform()} className="p-4 bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl hover:bg-white transition-all text-gray-500 hover:text-black group mt-4">
                <Maximize size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}>
              <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                {/* Background Grid (Static on canvas) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                   <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                </div>

                {/* Category Labels */}
                {Object.entries(CATEGORY_ANGLES).map(([name, { start, end }]) => {
                  const midAngle = (start + end) / 2;
                  const lx = Math.cos((midAngle * Math.PI) / 180) * (maxRadius + 120);
                  const ly = Math.sin((midAngle * Math.PI) / 180) * (maxRadius + 120);
                  return (
                    <div key={name} className="absolute pointer-events-none" style={{ transform: `translate(${lx}px, ${ly}px)` }}>
                      <span className="text-[18px] font-black uppercase tracking-[0.5em] text-gray-300 whitespace-nowrap">
                        {name}
                      </span>
                    </div>
                  );
                })}

                {/* Grid Lines */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
                  {Object.values(CATEGORY_ANGLES).map(({ start }) => (
                    <div
                      key={start}
                      className="absolute h-[200%] w-[2px] bg-black origin-center"
                      style={{ transform: `rotate(${start}deg)` }}
                    />
                  ))}
                </div>

                {/* Concentric Circles */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {rings.map((ring, i) => (
                    <div
                      key={ring.label}
                      className="absolute rounded-full border border-gray-200/80"
                      style={{
                        width: `${(i + 1) * ringStep * 2 + (ringStep)}px`,
                        height: `${(i + 1) * ringStep * 2 + (ringStep)}px`,
                      }}
                    >
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#fafafa] px-3 py-1 rounded-full border border-gray-100 text-[11px] font-black text-gray-400 shadow-sm">
                        {ring.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Center Label */}
                <div className="z-10 bg-black text-white px-8 py-4 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.2)] text-[12px] font-black uppercase tracking-[0.2em] animate-pulse">
                  Immediate Focus
                </div>

                {/* Data Points */}
                {items.map((item, index) => {
                  const { x, y } = getPosition(item, index);
                  const baseSize = 12;
                  const size = baseSize + (item.impact || 0) * 2;

                  return (
                    <motion.a
                      key={index}
                      href={item.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 150, delay: index * 0.005 }}
                      className="absolute z-20 group cursor-pointer pointer-events-auto"
                      style={{ x, y }}
                    >
                      <div className={cn(
                        "rounded-full shadow-lg border-2 transition-all hover:scale-150 hover:shadow-2xl relative flex items-center justify-center",
                        getSubjectColor(item.subject, item.source),
                        (item.health === 'Overdue' || item.isBlocked) && "ring-8 ring-red-500/20 animate-pulse border-red-500",
                        item.isBlocked && "opacity-60"
                      )}
                      style={{ width: size * 3, height: size * 3 }}
                      >
                        {item.source === 'GitHub' && (item.subject === 'PR' ? <GitPullRequest size={size * 1.2} /> : <Terminal size={size * 1.2} />)}
                        {item.source === 'Notion' && <FileText size={size * 1.2} />}
                        {item.source === 'ClickUp' && <Check size={size * 1.2} />}
                        
                        {item.isBlocked && (
                          <div className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 border-2 border-white shadow-lg">
                            <ShieldAlert size={10} />
                          </div>
                        )}
                      </div>
                      
                      {/* Tooltip (Enlarged for Virtual Canvas) */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 hidden group-hover:block w-80 p-5 bg-gray-900 text-white rounded-[2rem] shadow-[0_30px_70px_rgba(0,0,0,0.5)] pointer-events-none border border-white/10 z-50 overflow-hidden">
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest">
                            <span className="bg-white/10 px-3 py-1 rounded-full text-white">{item.source}</span>
                            {item.category && <span className="text-gray-400">{item.category}</span>}
                            <span className={cn(
                              "ml-auto px-3 py-1 rounded-full",
                              item.health === 'Healthy' || item.health === 'Active' ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
                            )}>{item.health}</span>
                          </div>
                          <p className="text-[14px] font-bold leading-snug line-clamp-3 mb-4">{item.title}</p>
                          
                          <div className="grid grid-cols-2 gap-3 text-[10px] border-t border-white/5 pt-4 mt-1">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Calendar size={12} />
                              <span>{Math.floor(item.distance)}d {item.source === 'ClickUp' ? 'rem.' : 'ago'}</span>
                            </div>
                            {item.impact && (
                              <div className="flex items-center gap-2 text-amber-400">
                                <Zap size={12} />
                                <span>Impact: {item.impact}/5</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          "absolute top-0 right-0 w-32 h-32 blur-3xl opacity-30 -mr-16 -mt-16 rounded-full",
                          getSubjectColor(item.subject, item.source)
                        )} />
                      </div>
                    </motion.a>
                  );
                })}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">Syncing Intelligence</p>
          </div>
        </div>
      )}

      {/* Legend - Static UI */}
      <div className="absolute left-10 bottom-10 z-[100] p-8 bg-white/95 backdrop-blur-2xl border border-gray-100 rounded-[3rem] shadow-2xl text-[11px] space-y-6 min-w-[260px]">
        <h3 className="font-black text-gray-900 uppercase tracking-tighter text-lg border-b border-gray-100 pb-4">Decision Engine</h3>
        
        <div className="space-y-4">
          <p className="font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Dimensions</p>
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-gray-200 rounded-sm" />
            <span className="font-bold text-gray-600 italic tracking-tight">Angle = Domain Category</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 border-2 border-gray-200 rounded-full" />
            <span className="font-bold text-gray-600 italic tracking-tight">Size = Business Impact</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-1 bg-red-100 rounded-full">
              <Activity className="text-red-600 animate-pulse" size={16} />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">Blocker / Collision</span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
           <p className="text-[10px] leading-relaxed text-gray-400 font-medium">
             Center ring represents items requiring action in <span className="text-black font-black">24 hours</span>.
           </p>
           <p className="text-[10px] mt-2 text-gray-300">
             Wheel to zoom • Drag to explore
           </p>
        </div>
      </div>
    </div>
  );
};

export default RadarView;
