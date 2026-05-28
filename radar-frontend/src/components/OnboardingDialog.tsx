"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Cross2Icon, PlusIcon, CheckIcon, UpdateIcon, GlobeIcon, InfoCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface Source {
  name: string;
  version: string;
  status: string;
}

interface Input {
  key: string;
  type: string;
  required: boolean;
  description: string;
}

interface SourceInfo {
  name: string;
  inputs: Input[];
  guide?: { link: string; instructions: string };
}

export const OnboardingDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'list' | 'form'>('list');
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/sources/available');
      setSources(response.data);
    } catch (err) {
      console.error('Failed to fetch sources', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSources();
    }
  }, [isOpen, fetchSources]);

  const handleSelectSource = async (name: string) => {
    setSelectedSource(name);
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:3001/api/sources/info/${name}`);
      setSourceInfo(response.data);
      setStep('form');
    } catch (err) {
      console.error('Failed to fetch source info', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await axios.post('http://localhost:3001/api/sources/add', {
        name: selectedSource,
        inputs: formData
      });
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect source');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/20 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white/90 backdrop-blur-2xl w-full max-w-md rounded-3xl border border-neutral-200/50 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
        <div className="p-6 border-b border-neutral-200/40 flex justify-between items-center bg-neutral-50/20">
          <div>
            <h2 className="text-sm font-extrabold text-neutral-900 tracking-tight">Add Data Source</h2>
            <p className="text-[10px] text-neutral-400">Connect your developer tool workspace</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-neutral-700">
            <Cross2Icon width={15} height={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'list' ? (
            <div className="grid grid-cols-1 gap-2.5">
              {sources.map((source) => (
                <button
                  key={source.name}
                  onClick={() => handleSelectSource(source.name)}
                  className="flex items-center justify-between p-3 rounded-2xl border border-neutral-200/50 hover:border-neutral-400 bg-white/40 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-500 group-hover:bg-neutral-900 group-hover:text-white transition-all shadow-inner">
                      <GlobeIcon width={16} height={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-850 capitalize leading-normal">{source.name}</p>
                      <p className="text-[9px] text-neutral-400 font-medium">v{source.version}</p>
                    </div>
                  </div>
                  {source.status === 'installed' ? (
                    <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-200/40 px-2 py-0.5 rounded-full">
                      <CheckIcon width={10} height={10} /> Connected
                    </span>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white transition-colors flex items-center justify-center">
                      <PlusIcon width={12} height={12} className="text-neutral-400 group-hover:text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {sourceInfo?.guide && (
                <div className="bg-sky-50/50 p-4.5 rounded-2xl border border-sky-200/30 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-sky-700 font-bold text-xs">
                    <InfoCircledIcon width={14} height={14} />
                    <span>Onboarding Guide</span>
                  </div>
                  <p className="text-[10px] text-sky-850 leading-relaxed font-medium">
                    {sourceInfo.guide.instructions}
                  </p>
                  <a 
                    href={sourceInfo.guide.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-sky-700 transition-colors shadow-sm"
                  >
                    Open API Panel
                  </a>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-700 text-[10px] leading-normal font-medium">
                  <ExclamationTriangleIcon width={12} height={12} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3.5">
                {sourceInfo?.inputs.map((input) => (
                  <div key={input.key} className="space-y-1">
                    <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-0.5">
                      {input.key}
                      {input.required && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type={input.key.toLowerCase().includes('token') || input.key.toLowerCase().includes('secret') ? 'password' : 'text'}
                      required={input.required}
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-250/60 rounded-xl text-xs focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-450 focus:outline-none transition-all focus:bg-white placeholder:text-neutral-400 text-neutral-800 font-medium"
                      placeholder={`Paste your ${input.key.replace(/_/g, ' ').toLowerCase()} here...`}
                      onChange={(e) => setFormData({ ...formData, [input.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => setStep('list')}
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3.5 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-1.5 shadow-md disabled:bg-neutral-200 disabled:text-neutral-400"
                >
                  {loading ? <UpdateIcon className="animate-spin" width={14} height={14} /> : 'Complete Setup'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
