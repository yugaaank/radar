"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AlertCircle, GitPullRequest, Info, Check, Activity, Terminal, FileText } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  health: 'Healthy' | 'Overdue' | 'Stuck' | 'Stale' | 'Active' | 'Action Required';
  priority?: string | number;
}

const getSubjectColor = (subject?: string) => {
  if (!subject) return "bg-gray-400 border-gray-300 text-white";
  const s = subject.toLowerCase();
  // ClickUp Subjects
  if (s.includes('math')) return "bg-emerald-500 border-emerald-400 text-white";
  if (s.includes('chem')) return "bg-orange-500 border-orange-400 text-white";
  if (s.includes('physic')) return "bg-amber-500 border-amber-400 text-white";
  
  // GitHub Subjects
  if (s === 'action') return "bg-red-500 border-red-400 text-white"; 
  if (s === 'activity') return "bg-blue-500 border-blue-400 text-white"; 
  if (s === 'ci failure') return "bg-slate-900 border-red-600 text-red-500"; 
  if (s === 'pr') return "bg-sky-500 border-sky-400 text-white";

  // Notion
  if (s === 'documentation') return "bg-stone-800 border-stone-700 text-white";
  
  return "bg-purple-600 border-purple-500 text-white";
};

const RadarView = () => {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const rings = [0, 1, 3, 7, 14, 30, 90]; 
  const maxRadius = Math.min(dimensions.width, dimensions.height) * 0.4;
  const ringStep = maxRadius / rings.length;

  const getRadius = (distance: number) => {
    if (distance <= 0) return ringStep * 0.5;
    let ringIndex = rings.findIndex(r => distance <= r);
    if (ringIndex === -1) ringIndex = rings.length;
    const prevRing = ringIndex === 0 ? 0 : rings[ringIndex - 1];
    const currentRing = ringIndex === rings.length ? rings[rings.length - 1] * 2 : rings[ringIndex];
    const progress = (distance - prevRing) / (currentRing - prevRing);
    return (ringIndex + Math.min(progress, 1)) * ringStep;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white overflow-hidden">
      {/* Concentric Circles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {rings.map((day, i) => (
          <div
            key={day}
            className="absolute rounded-full border border-gray-100"
            style={{
              width: `${(i + 1) * ringStep * 2}px`,
              height: `${(i + 1) * ringStep * 2}px`,
            }}
          >
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1 text-[9px] text-gray-300 font-mono">
              {day}d
            </span>
          </div>
        ))}
      </div>

      {/* Center Label */}
      <div className="z-10 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100 text-sm font-bold text-gray-800">
        Workspace Intelligence
      </div>

      {/* Data Points */}
      {items.map((item, index) => {
        const angle = (index * 137.5) % 360; 
        const radius = getRadius(item.distance);
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;

        return (
          <motion.a
            key={index}
            href={item.html_url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 100, delay: index * 0.01 }}
            className="absolute z-20 group cursor-pointer"
            style={{ x, y }}
          >
            <div className={cn(
              "p-2 rounded-full shadow-md border transition-all hover:scale-125 hover:shadow-xl relative text-[10px]",
              getSubjectColor(item.subject),
              (item.health === 'Overdue' || item.health === 'Action Required') && "ring-4 ring-red-500/30 animate-pulse border-red-500"
            )}>
              {item.subject === 'Action' ? <AlertCircle size={12} /> : 
               item.subject === 'Activity' ? <GitPullRequest size={12} /> :
               item.subject === 'CI Failure' ? <Terminal size={12} /> :
               item.subject === 'Documentation' ? <FileText size={12} /> :
               <Check size={12} />}
              
              {/* Health Indicator Small Dot */}
              {(item.health === 'Overdue' || item.health === 'Stuck' || item.health === 'Action Required') && (
                <div className={cn(
                  "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white",
                  "bg-red-600"
                )} />
              )}
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block w-64 p-3 bg-gray-900 text-white rounded-xl shadow-2xl pointer-events-none border border-white/10 z-50">
              <div className="flex items-center gap-2 mb-1.5 text-[8px] font-bold uppercase tracking-widest">
                <span className={cn(
                  "px-1.5 py-0.5 rounded",
                  item.source === 'GitHub' ? "bg-blue-600" : 
                  item.source === 'Notion' ? "bg-stone-600" : "bg-purple-600"
                )}>{item.source}</span>
                {item.subject && <span className="bg-white/10 px-1.5 py-0.5 rounded">{item.subject}</span>}
                <span className={cn(
                  "ml-auto px-1.5 py-0.5 rounded",
                  item.health === 'Healthy' || item.health === 'Active' ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
                )}>{item.health}</span>
              </div>
              <p className="text-[11px] font-medium leading-tight line-clamp-3 mb-2">{item.title}</p>
              <div className="flex justify-between items-center text-[9px] text-gray-400 border-t border-white/5 pt-2">
                <span>{item.source === 'ClickUp' ? `${Math.floor(item.distance)}d left` : `${Math.floor(item.distance)}d ago`}</span>
              </div>
            </div>
          </motion.a>
        );
      })}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-50">
          <p className="text-gray-400 animate-pulse">Scanning Intelligence Radar...</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute left-6 bottom-6 z-30 p-5 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-xl text-[10px] space-y-3 min-w-[200px]">
        <h3 className="font-black text-gray-900 uppercase tracking-tighter text-xs border-b border-gray-100 pb-2">Workspace Insight</h3>
        
        <div className="space-y-2">
          <p className="font-bold text-gray-400 uppercase text-[9px]">Operational Data</p>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="font-medium text-gray-700">GitHub Pull Request</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-stone-800" />
            <span className="font-medium text-gray-700">Notion Documentation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-medium text-gray-700">Maths Ops</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="font-medium text-gray-700">Chemistry Lab</span>
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-gray-50">
          <p className="font-bold text-gray-400 uppercase text-[9px]">Alerts</p>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            <span className="font-medium text-gray-700">Blocker / Stale Doc</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarView;
