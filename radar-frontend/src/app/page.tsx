"use client";
import React, { useState } from 'react';
import "@openuidev/react-ui/components.css";
import "@openuidev/react-ui/styles/index.css";

import { openAIMessageFormat, openAIReadableStreamAdapter } from "@openuidev/react-headless";
import { FullScreen } from "@openuidev/react-ui";
import { openuiLibrary, openuiPromptOptions } from "@openuidev/react-ui/genui-lib";
import RadarView from "@/components/RadarView";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { MagnifyingGlassIcon, ChatBubbleIcon, Cross2Icon, PlusCircledIcon } from "@radix-ui/react-icons";
import { buildAIContext } from "@/utils/ai";

const systemPrompt = openuiLibrary.prompt(openuiPromptOptions);

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [visibleItems, setVisibleItems] = useState<any[]>([]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-50 font-sans">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full h-16 z-30 px-8 flex justify-between items-center bg-white/70 backdrop-blur-xl border-b border-neutral-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-neutral-900 rounded-md flex items-center justify-center relative overflow-hidden shadow-inner">
            <div className="w-2.5 h-2.5 border border-white/60 rounded-full animate-ping absolute opacity-70" />
            <div className="w-2 h-2 border border-white rounded-full bg-white/20" />
          </div>
          <h1 className="text-xs font-black tracking-[0.3em] text-neutral-800">RADAR</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" width={14} height={14} />
            <input 
              type="text" 
              placeholder="Spotlight search..." 
              className="pl-8 pr-3 py-1.5 bg-neutral-100 hover:bg-neutral-200/40 focus:bg-white text-xs border-0 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 w-56 focus:w-64 transition-all placeholder-neutral-400 text-neutral-800"
            />
          </div>
          
          <button 
            onClick={() => setIsOnboardingOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200/60 rounded-lg text-xs font-semibold text-neutral-700 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <PlusCircledIcon width={14} height={14} className="text-neutral-500" />
            <span>Add Source</span>
          </button>

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="p-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors shadow-md relative"
          >
            {isChatOpen ? <Cross2Icon width={15} height={15} /> : <ChatBubbleIcon width={15} height={15} />}
          </button>
        </div>
      </header>
 
      {/* Main Radar View */}
      <div className="w-full h-full pt-16">
        <RadarView onFilteredItemsChange={setVisibleItems} />
      </div>

      <OnboardingDialog 
        isOpen={isOnboardingOpen} 
        onClose={() => setIsOnboardingOpen(false)} 
      />

      {/* Floating Chat / AI Agent Panel */}
      {isChatOpen && (
        <div className="absolute right-8 bottom-8 w-[440px] h-[640px] z-40 shadow-2xl rounded-3xl border border-neutral-200/60 overflow-hidden bg-white/90 backdrop-blur-2xl flex flex-col transition-all duration-300">
          <div className="p-5 bg-neutral-50/60 border-b border-neutral-200/40 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-neutral-900 rounded-lg text-white">
                <ChatBubbleIcon width={14} height={14} />
              </div>
              <span className="font-bold text-xs text-neutral-800">Radar Assistant</span>
            </div>
            <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-600 text-[9px] rounded-full font-bold uppercase tracking-wider border border-neutral-200/30">Active</span>
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
                className="whitespace-nowrap px-3 py-1 bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/20 rounded-full text-[9px] font-bold text-neutral-600 transition-all active:scale-[0.98]"
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
      <div className="absolute left-8 bottom-8 z-30 p-5 bg-white/70 backdrop-blur-xl border border-neutral-200/40 rounded-2xl shadow-xl text-[10px] space-y-2.5 max-w-[240px]">
        <p className="font-black text-neutral-400 uppercase tracking-widest text-[8px] mb-1.5">Map Legend</p>
        <div className="flex items-center gap-2 text-neutral-700">
          <div className="w-2 h-2 rounded-full bg-sky-500 border border-sky-400" />
          <span className="font-medium">GitHub Pull Request</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-700">
          <div className="w-2 h-2 rounded-full bg-purple-600 border border-purple-500" />
          <span className="font-medium">Platform Task</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-700">
          <div className="w-2 h-2 rounded-full bg-red-600 border border-red-500 animate-pulse" />
          <span className="font-medium">Incident / Error</span>
        </div>
        <div className="pt-2 border-t border-neutral-200/30 text-[9px] text-neutral-400 leading-normal">
          * Radial distance represents days since last update.
        </div>
      </div>
    </main>
  );
}
