"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Shield, Check, Loader2, Globe, Info, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      fetchSources();
    }
  }, [isOpen]);

  const fetchSources = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/sources/available');
      setSources(response.data);
    } catch (err) {
      console.error('Failed to fetch sources');
    }
  };

  const handleSelectSource = async (name: string) => {
    setSelectedSource(name);
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:3001/api/sources/info/${name}`);
      setSourceInfo(response.data);
      setStep('form');
    } catch (err) {
      console.error('Failed to fetch source info');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Data Source</h2>
            <p className="text-sm text-gray-500">Connect your tools to the Radar</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'list' ? (
            <div className="grid grid-cols-1 gap-3">
              {sources.map((source) => (
                <button
                  key={source.name}
                  onClick={() => handleSelectSource(source.name)}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-black hover:shadow-md transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                      <Globe size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 capitalize">{source.name}</p>
                      <p className="text-xs text-gray-500">v{source.version}</p>
                    </div>
                  </div>
                  {source.status === 'installed' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50 px-2 py-1 rounded-full">
                      <Check size={12} /> Connected
                    </span>
                  ) : (
                    <Plus size={18} className="text-gray-300 group-hover:text-black" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {sourceInfo?.guide && (
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                    <Info size={18} />
                    <span>Onboarding Guide</span>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    {sourceInfo.guide.instructions}
                  </p>
                  <a 
                    href={sourceInfo.guide.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Open Permissions Page
                  </a>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-700 text-xs">
                  <AlertCircle size={14} className="mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                {sourceInfo?.inputs.map((input) => (
                  <div key={input.key} className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      {input.key}
                      {input.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={input.key.toLowerCase().includes('token') || input.key.toLowerCase().includes('secret') ? 'password' : 'text'}
                      required={input.required}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 focus:outline-none transition-all focus:bg-white"
                      placeholder={`Paste your ${input.key.replace(/_/g, ' ').toLowerCase()} here...`}
                      onChange={(e) => setFormData({ ...formData, [input.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('list')}
                  className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:bg-gray-200"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Complete Setup'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
