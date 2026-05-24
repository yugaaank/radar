"use client";
import React, { useState } from 'react';
import "@openuidev/react-ui/components.css";
import "@openuidev/react-ui/styles/index.css";

import { openAIMessageFormat, openAIReadableStreamAdapter } from "@openuidev/react-headless";
import { FullScreen, MessageSquare } from "@openuidev/react-ui";
import { openuiLibrary, openuiPromptOptions } from "@openuidev/react-ui/genui-lib";
import RadarView from "@/components/RadarView";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { Search, Bot, X, PlusCircle } from "lucide-react";

const systemPrompt = openuiLibrary.prompt(openuiPromptOptions);

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-white">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-30 p-6 flex justify-between items-center bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-full animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tighter text-gray-900">RADAR</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search across platforms..." 
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black/5 w-64 transition-all"
            />
          </div>
          
          <button 
            onClick={() => setIsOnboardingOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <PlusCircle size={16} />
            <span>Add Source</span>
          </button>

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg"
          >
            {isChatOpen ? <X size={20} /> : <Bot size={20} />}
          </button>
        </div>
      </header>

      {/* Main Radar View */}
      <div className="w-full h-full pt-20">
        <RadarView />
      </div>

      <OnboardingDialog 
        isOpen={isOnboardingOpen} 
        onClose={() => setIsOnboardingOpen(false)} 
      />

      {/* Floating Chat / AI Agent Panel */}
      {isChatOpen && (
        <div className="absolute right-6 bottom-6 w-[450px] h-[600px] z-40 shadow-2xl rounded-2xl border border-gray-200 overflow-hidden bg-white flex flex-col">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-blue-600" />
              <span className="font-bold text-sm">Radar Intelligence Agent</span>
            </div>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-bold uppercase tracking-wider">Connected via MCP</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <FullScreen
              processMessage={async ({ messages, abortController }) => {
                return fetch("/api/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    systemPrompt,
                    messages: openAIMessageFormat.toApi(messages),
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
      <div className="absolute left-6 bottom-6 z-30 p-4 bg-white/80 backdrop-blur-md border border-gray-100 rounded-xl shadow-sm text-[10px] space-y-2">
        <p className="font-bold text-gray-400 uppercase tracking-widest mb-2">Legend</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>GitHub Pull Request</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Platform Issue</span>
        </div>
        <div className="mt-2 text-gray-400">
          * Distance from center = Days since update
        </div>
      </div>
    </main>
  );
}
