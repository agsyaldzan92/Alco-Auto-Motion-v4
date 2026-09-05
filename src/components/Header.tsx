import React from 'react';
import { Sparkles, Video, Layers, Wand2, PlayCircle, ShieldCheck } from 'lucide-react';
import { ApiKeyControl } from './ApiKeyControl';

interface HeaderProps {
  activeTab: 'input' | 'analysis' | 'edit_preview';
  onSelectTab: (tab: 'input' | 'analysis' | 'edit_preview') => void;
  hasPlan: boolean;
  isProcessing: boolean;
  onOpenApiKeyModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  hasPlan,
  isProcessing,
  onOpenApiKeyModal,
}) => {
  return (
    <header id="alco-header" className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">
                  ALCO <span className="text-amber-400 font-light text-sm tracking-normal">Auto Motion</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  MVP Testing Tool
                </span>
              </div>
              <p className="text-xs text-slate-400">AI Video Editing Director & Scene Motion Engine</p>
            </div>
          </div>

          {/* Tab Navigation (3 Main Tabs from Blueprint) */}
          <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              id="tab-btn-input"
              onClick={() => onSelectTab('input')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'input'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>1. INPUT</span>
            </button>

            <button
              id="tab-btn-analysis"
              onClick={() => onSelectTab('analysis')}
              disabled={!hasPlan && !isProcessing}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'analysis'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : hasPlan
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  : 'text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2. AI ANALYSIS</span>
              {hasPlan && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              id="tab-btn-preview"
              onClick={() => onSelectTab('edit_preview')}
              disabled={!hasPlan && !isProcessing}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${
                activeTab === 'edit_preview'
                  ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md'
                  : hasPlan
                  ? 'text-amber-300 hover:text-white hover:bg-slate-800/60'
                  : 'text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>3. EDIT PLAN & PREVIEW</span>
              {hasPlan && (
                <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 text-[10px] rounded font-bold">
                  LIVE
                </span>
              )}
            </button>
          </nav>

          {/* Right Area: BYO Gemini API Key Button & Status */}
          <div className="flex items-center gap-3 text-xs">
            <ApiKeyControl onOpenModal={onOpenApiKeyModal} />

            {isProcessing ? (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/50 text-indigo-200 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="font-mono text-[11px] font-bold">AI Active...</span>
              </div>
            ) : (
              <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Gemini 3.7</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

