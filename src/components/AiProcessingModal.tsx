import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Layers,
  Cpu,
  Scissors,
  Wand2,
  Film,
  Zap,
} from 'lucide-react';
import { ProcessingState, ProcessingStepId } from '../types';

interface AiProcessingModalProps {
  state: ProcessingState;
  onRetry: () => void;
  onClose: () => void;
}

const STEP_ICONS: Record<ProcessingStepId, React.ReactNode> = {
  init: <Cpu className="w-4 h-4" />,
  segmentation: <Scissors className="w-4 h-4" />,
  content_analysis: <Wand2 className="w-4 h-4" />,
  edit_plan: <Film className="w-4 h-4" />,
  finalizing: <Zap className="w-4 h-4" />,
};

export const AiProcessingModal: React.FC<AiProcessingModalProps> = ({
  state,
  onRetry,
  onClose,
}) => {
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [state.logs]);

  // Format Elapsed Time: 00:04.2s
  const formatTime = (ms: number) => {
    const totalSec = ms / 1000;
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${secs < 10 ? '0' : ''}${secs.toFixed(1)}s`;
  };

  const activeStep = state.steps.find((s) => s.status === 'running') || state.steps[0];
  const activeStepIdx = state.steps.findIndex((s) => s.id === state.currentStepId);
  const isFinished = state.overallProgress >= 100 && !state.error;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col my-auto transition-all">
        {/* Top Header with Pulse & Timer */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md transition-transform ${
              state.error
                ? 'bg-rose-500 text-white'
                : isFinished
                ? 'bg-emerald-500 text-white'
                : 'bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 text-white animate-pulse'
            }`}>
              {state.error ? (
                <AlertCircle className="w-5 h-5" />
              ) : isFinished ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-white">
                  {state.error
                    ? 'Proses Analisis Terhenti'
                    : isFinished
                    ? 'AI Director Siap!'
                    : 'Alco AI Director Bekerja'}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                  {state.error ? 'ERROR' : `Step ${Math.min(5, Math.max(1, activeStepIdx + 1))} / 5`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {state.error
                  ? 'Terjadi kendala pada tahap pemrosesan'
                  : activeStep?.subtitle || 'Mempersiapkan pipeline pengeditan'}
              </p>
            </div>
          </div>

          {/* Live Timer Counter Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-mono text-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              <span>{formatTime(state.elapsedMs)}</span>
            </div>

            {state.error && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="px-6 pt-5 pb-3 space-y-2 bg-slate-50/60 border-b border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${state.error ? 'bg-rose-500' : 'bg-indigo-600 animate-ping'}`} />
              {state.error ? 'Status: Menunggu Tindakan' : activeStep?.title || 'Menjalankan Analisis'}
            </span>
            <span className="font-mono font-bold text-indigo-600 text-sm">
              {Math.round(state.overallProgress)}%
            </span>
          </div>

          {/* Smooth Interpolated Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-300/80">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                state.error
                  ? 'bg-rose-500'
                  : isFinished
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 shadow-sm'
              }`}
              style={{ width: `${Math.min(100, Math.max(3, state.overallProgress))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
            <span>
              {state.error
                ? 'Silakan coba lagi atau periksa koneksi.'
                : isFinished
                ? 'Selesai 100%'
                : 'Estimasi: ~2-4 detik tersisa'}
            </span>
            <span className="font-mono text-[10px] text-slate-400">Gemini 3.7 + Alco Heuristic Engine</span>
          </div>
        </div>

        {/* 5-Step Pipeline List */}
        <div className="p-6 space-y-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Tahapan Pemrosesan Nyata:
          </div>

          <div className="space-y-2.5">
            {state.steps.map((step, idx) => {
              const isRunning = step.status === 'running';
              const isDone = step.status === 'completed';
              const isErr = step.status === 'error';
              const isPending = step.status === 'pending';

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isRunning
                      ? 'border-indigo-400 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-400/40'
                      : isDone
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : isErr
                      ? 'border-rose-300 bg-rose-50'
                      : 'border-slate-200/80 bg-slate-50/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Step Icon Indicator */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs transition-colors ${
                        isRunning
                          ? 'bg-indigo-600 text-white shadow-xs animate-pulse'
                          : isDone
                          ? 'bg-emerald-500 text-white'
                          : isErr
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isErr ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : isRunning ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        STEP_ICONS[step.id] || (idx + 1)
                      )}
                    </div>

                    {/* Step Titles & Realtime Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold truncate ${
                          isRunning ? 'text-indigo-950' : isDone ? 'text-slate-900' : isErr ? 'text-rose-900' : 'text-slate-600'
                        }`}>
                          {idx + 1}. {step.title}
                        </span>
                        {step.badge && (
                          <span className="px-2 py-0.2 rounded-md bg-white border border-slate-200 text-[10px] font-mono text-slate-700 font-semibold shadow-xs">
                            {step.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {step.details || step.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Step Status Badge */}
                  <div className="shrink-0 text-right">
                    {isRunning && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                        Bekerja...
                      </span>
                    )}
                    {isDone && (
                      <span className="text-[11px] font-semibold text-emerald-700 font-mono">
                        {step.durationMs ? `${(step.durationMs / 1000).toFixed(1)}s` : 'Selesai'}
                      </span>
                    )}
                    {isErr && (
                      <span className="text-[11px] font-bold text-rose-600 bg-white px-2 py-0.5 rounded border border-rose-200">
                        Gagal
                      </span>
                    )}
                    {isPending && (
                      <span className="text-[10px] font-mono text-slate-400">Antrean</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Activity Log Terminal (Collapsible) */}
        <div className="border-t border-slate-200 bg-slate-950 text-slate-300">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time Engine Activity Log ({state.logs.length} events)</span>
              {!isFinished && !state.error && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showLogs && (
            <div
              ref={logContainerRef}
              className="p-4 pt-1 max-h-36 overflow-y-auto font-mono text-[11px] space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 select-text"
            >
              {state.logs.length === 0 ? (
                <p className="text-slate-600 italic">Memulai koneksi ke Alco AI Director...</p>
              ) : (
                state.logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-600 shrink-0 select-none">[{log.relativeTime}]</span>
                    <span
                      className={`shrink-0 text-[10px] px-1 py-0.2 rounded font-bold uppercase select-none ${
                        log.type === 'error'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : log.type === 'success'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : log.type === 'metric'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-900 text-indigo-300 border border-slate-800'
                      }`}
                    >
                      {log.type}
                    </span>
                    <span
                      className={
                        log.type === 'error'
                          ? 'text-rose-400 font-semibold'
                          : log.type === 'success'
                          ? 'text-emerald-300'
                          : log.type === 'metric'
                          ? 'text-amber-200'
                          : 'text-slate-300'
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Error Action Footer if failed */}
        {state.error && (
          <div className="p-4 bg-rose-50 border-t border-rose-200 flex items-center justify-between gap-3">
            <div className="text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="line-clamp-2">{state.error}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onRetry}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
