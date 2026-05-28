"use client";
import React, { useState } from 'react';
import "@openuidev/react-ui/components.css";
import "@openuidev/react-ui/styles/index.css";

import { openAIMessageFormat, openAIReadableStreamAdapter } from "@openuidev/react-headless";
import { FullScreen } from "@openuidev/react-ui";
import { openuiLibrary, openuiPromptOptions } from "@openuidev/react-ui/genui-lib";
import RadarView from "@/components/RadarView";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { MagnifyingGlassIcon, ChatBubbleIcon, Cross2Icon, PlusCircledIcon, UpdateIcon, EyeNoneIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { buildAIContext } from "@/utils/ai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SourceStatus } from "@/components/radar-types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const systemPrompt = openuiLibrary.prompt(openuiPromptOptions);

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [visibleItems, setVisibleItems] = useState<any[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [forceDemo, setForceDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sourceStatus, setSourceStatus] = useState<Record<string, SourceStatus>>({});

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-50 font-sans">
      {/* Header */}
      <header className="absolute top-4 left-4 right-4 md:top-6 md:left-8 md:right-8 h-20 z-30 px-4 md:px-8 flex justify-between items-center bg-white/80 backdrop-blur-xl border border-neutral-200/50 shadow-lg rounded-2xl md:rounded-3xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center relative overflow-hidden shadow-inner">
              <div className="w-3.5 h-3.5 border border-white/60 rounded-full animate-ping absolute opacity-70" />
              <div className="w-2.5 h-2.5 border border-white rounded-full bg-white/20" />
            </div>
            <h1 className="text-sm font-bold tracking-[0.4em] text-neutral-800 hidden sm:block">RADAR</h1>
          </div>

          {/* Live Mode Source Status Badges or Demo Mode Warning Badge */}
          {isDemoMode ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white border border-amber-400 rounded-full text-[8px] font-black uppercase tracking-widest shadow-[0_0_8px_#f59e0b] hidden lg:flex">
              <ExclamationTriangleIcon width={10} height={10} />
              Demo Mode
            </div>
          ) : (
            Object.keys(sourceStatus).length > 0 && (
              <div className="hidden lg:flex gap-2">
                {Object.entries(sourceStatus).map(([name, status]) => (
                  <div key={name} className="flex items-center gap-1.5 px-3 py-1 bg-neutral-150 border border-neutral-200/40 rounded-full text-[8px] font-black uppercase tracking-widest text-neutral-500">
                    <div className={cn("w-1.5 h-1.5 rounded-full", status.status === 'ok' ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-rose-500 shadow-[0_0_6px_#f43f5e]")} />
                    {name} {status.status !== 'ok' && "!"}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Live/Demo Toggle Capsule */}
          <div className="bg-white/85 backdrop-blur-xl border border-neutral-200/50 p-1 rounded-full shadow-sm flex items-center gap-1">
            <div className="flex bg-neutral-100/80 p-0.5 rounded-full">
              <button 
                disabled={forceDemo}
                onClick={() => setIsDemoMode(false)} 
                className={cn(
                  "px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300",
                  !isDemoMode ? "bg-white text-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.1)]" : "text-neutral-400 hover:text-neutral-700 disabled:opacity-50"
                )}
              >
                Live
              </button>
              <button 
                onClick={() => setIsDemoMode(true)} 
                className={cn(
                  "px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300",
                  isDemoMode ? "bg-white text-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.1)]" : "text-neutral-400 hover:text-neutral-700"
                )}
              >
                Demo
              </button>
            </div>
            
            <div className="h-3 w-px bg-neutral-200 mx-0.5" />

            {!isDemoMode && (
              <button 
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="p-1.5 hover:bg-neutral-100 rounded-full transition-all text-neutral-400 hover:text-neutral-800 group"
                title="Force Refresh Live Data"
              >
                <UpdateIcon width={12} height={12} className={cn("transition-transform duration-700", loading && "animate-spin")} />
              </button>
            )}

            <button 
              onClick={() => setForceDemo(!forceDemo)}
              className={cn(
                "p-1.5 rounded-full transition-all",
                forceDemo ? "bg-rose-50 text-rose-600 border border-rose-200" : "text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100"
              )}
              title={forceDemo ? "Disable Force Demo" : "Enable Force Demo (Presentation Safeguard)"}
            >
              <EyeNoneIcon width={12} height={12} />
            </button>
          </div>
          <div className="hidden lg:relative lg:block">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" width={16} height={16} />
            <input 
              type="text" 
              placeholder="Spotlight search..." 
              className="pl-10 pr-4 py-2.5 bg-neutral-100 hover:bg-neutral-200/40 focus:bg-white text-sm border-0 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-400 w-72 focus:w-80 transition-all placeholder-neutral-400 text-neutral-800"
            />
          </div>
          
          <button 
            onClick={() => setIsOnboardingOpen(true)}
            className="flex items-center gap-2 px-3 py-2.5 md:px-4.5 bg-neutral-100 hover:bg-neutral-200/60 rounded-xl text-sm font-semibold text-neutral-700 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <PlusCircledIcon width={16} height={16} className="text-neutral-500" />
            <span className="hidden sm:inline">Add Source</span>
          </button>

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="p-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors shadow-md relative"
          >
            {isChatOpen ? <Cross2Icon width={18} height={18} /> : <ChatBubbleIcon width={18} height={18} />}
          </button>
        </div>
      </header>
 
      {/* Main Radar View */}
      <div className="w-full h-full">
        <RadarView 
          onFilteredItemsChange={setVisibleItems} 
          isDemoMode={isDemoMode}
          setIsDemoMode={setIsDemoMode}
          forceDemo={forceDemo}
          setForceDemo={setForceDemo}
          loading={loading}
          setLoading={setLoading}
          refreshTrigger={refreshTrigger}
          sourceStatus={sourceStatus}
          setSourceStatus={setSourceStatus}
        />
      </div>

      <OnboardingDialog 
        isOpen={isOnboardingOpen} 
        onClose={() => setIsOnboardingOpen(false)} 
      />

      {/* Floating Chat / AI Agent Panel */}
      {isChatOpen && (
        <div className="absolute right-8 bottom-8 w-[480px] h-[700px] z-40 shadow-2xl rounded-3xl border border-neutral-200/60 overflow-hidden bg-white/90 backdrop-blur-2xl flex flex-col transition-all duration-300">
          <div className="p-6 bg-neutral-50/60 border-b border-neutral-200/40 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-neutral-900 rounded-xl text-white">
                <ChatBubbleIcon width={16} height={16} />
              </div>
              <span className="font-bold text-sm text-neutral-800">Radar Assistant</span>
            </div>
            <span className="px-3 py-1 bg-neutral-100 text-neutral-600 text-[11px] rounded-full font-bold uppercase tracking-wider border border-neutral-200/30">Active</span>
          </div>

          {/* Quick Action Chips */}
          <div className="p-3 bg-white/40 border-b border-neutral-200/20 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            {[
              "What's blocking release?",
              "Show critical risks",
              "What should I do next?",
              "Explain correlations"
            ].map(p => (
              <button
                key={p}
                onClick={() => {
                  const input = document.querySelector('textarea');
                  if (input) {
                    (input as HTMLTextAreaElement).value = p;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }}
                className="whitespace-nowrap px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/20 rounded-full text-[11px] font-bold text-neutral-600 transition-all active:scale-[0.98]"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            <FullScreen
              processMessage={async ({ messages, abortController }) => {
                return fetch("/api/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    messages: openAIMessageFormat.toApi(messages),
                    radarContext: buildAIContext(visibleItems)
                  }),
                  signal: abortController.signal,
                });
              }}
              streamProtocol={openAIReadableStreamAdapter()}
              componentLibrary={openuiLibrary}
              agentName="Radar Bot"
            />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute left-8 bottom-8 z-30 p-6 bg-white/70 backdrop-blur-xl border border-neutral-200/40 rounded-2xl shadow-xl text-xs space-y-3.5 max-w-[280px]">
        <p className="font-black text-neutral-400 uppercase tracking-widest text-[10px] mb-1.5">Map Legend</p>
        <div className="flex items-center gap-2.5 text-neutral-700">
          <div className="w-3 h-3 rounded-full bg-sky-500 border border-sky-400" />
          <span className="font-semibold">GitHub Pull Request</span>
        </div>
        <div className="flex items-center gap-2.5 text-neutral-700">
          <div className="w-3 h-3 rounded-full bg-purple-600 border border-purple-500" />
          <span className="font-semibold">Platform Task</span>
        </div>
        <div className="flex items-center gap-2.5 text-neutral-700">
          <div className="w-3 h-3 rounded-full bg-red-600 border border-red-500 animate-pulse" />
          <span className="font-semibold">Incident / Error</span>
        </div>
        <div className="pt-2.5 border-t border-neutral-200/30 text-[11px] text-neutral-400 leading-normal font-medium">
          * Center circles contain critical blockers/incidents. Outer circles contain lower-priority backlog.
        </div>
      </div>
    </main>
  );
}
