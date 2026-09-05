import React from 'react';
import {
  Film,
  Gauge,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  Server,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { ExportTier, RenderDurationMode, BackendMode, ChecklistItem } from './types';
import { EnvironmentDiagnostics } from '../../engine/ffmpegWasmExportService';

interface ExportSettingsStageProps {
  selectedTier: ExportTier;
  onSelectTier: (tier: ExportTier) => void;
  backendMode: BackendMode;
  backendStatusReason: string;
  renderDurationMode: RenderDurationMode;
  onSelectDurationMode: (mode: RenderDurationMode) => void;
  detectedSourceDuration: number;
  envDiag: EnvironmentDiagnostics;
  preRenderChecklist: ChecklistItem[];
  hasFailCheck: boolean;
  audioWarningMessage: string | null;
  isRendering: boolean;
  onStartRender: () => void;
  onOpenFullTab: () => void;
}

export const ExportSettingsStage: React.FC<ExportSettingsStageProps> = ({
  selectedTier,
  onSelectTier,
  backendMode,
  renderDurationMode,
  onSelectDurationMode,
  detectedSourceDuration,
  envDiag,
  preRenderChecklist,
  hasFailCheck,
  audioWarningMessage,
  isRendering,
  onStartRender,
  onOpenFullTab,
}) => {
  return (
    <div className="space-y-4">
      {/* 1. Pre-Render Safety Checklist */}
      <div className="alco-panel space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${hasFailCheck ? 'text-[var(--error)]' : 'text-[var(--success)]'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-app)]">
              Pre-Render Safety Checklist
            </span>
          </div>
          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
              hasFailCheck
                ? 'alco-status-error'
                : preRenderChecklist.some((c) => c.status === 'WARNING')
                ? 'alco-status-warning'
                : 'alco-status-success'
            }`}
          >
            {hasFailCheck
              ? '❌ EXPORT BLOCKED'
              : preRenderChecklist.some((c) => c.status === 'WARNING')
              ? '⚠️ READY WITH WARNINGS'
              : '✓ EXPORT READY'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {preRenderChecklist.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center gap-2"
            >
              {item.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />}
              {item.status === 'WARNING' && <AlertCircle className="w-4 h-4 text-[var(--warning)] shrink-0" />}
              {item.status === 'FAIL' && <XCircle className="w-4 h-4 text-[var(--error)] shrink-0" />}
              {item.status === 'BELUM DICEK' && <Info className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] text-[var(--muted-foreground)] truncate font-medium">{item.label}</span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1 rounded ${
                      item.status === 'PASS'
                        ? 'text-[var(--success)] bg-emerald-500/10'
                        : item.status === 'WARNING'
                        ? 'text-[var(--warning)] bg-amber-500/10'
                        : item.status === 'FAIL'
                        ? 'text-[var(--error)] bg-rose-500/10'
                        : 'text-[var(--muted-foreground)] bg-[var(--secondary)]'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <span className="font-semibold text-[var(--fg-app)] truncate block text-[11px]">{item.detail}</span>
              </div>
            </div>
          ))}
        </div>

        {hasFailCheck && (
          <div className="pt-2 border-t border-[var(--border)] flex items-center gap-2 text-[var(--error)] text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Render dikunci karena ada item FAIL. Perbaiki input atau video sumber terlebih dahulu.</span>
          </div>
        )}
      </div>

      {/* Audio Warning if missing */}
      {audioWarningMessage && (
        <div className="alco-status-warning w-full p-2.5 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
          <span>{audioWarningMessage}</span>
        </div>
      )}

      {/* 2. Duration Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[var(--fg-app)] flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Durasi Render Output</span>
          </label>
          <span className="text-[11px] font-mono font-bold text-[var(--muted-foreground)]">
            Durasi Video Asli: {detectedSourceDuration.toFixed(1)}s
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSelectDurationMode('full_duration')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
              renderDurationMode === 'full_duration'
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                : 'bg-[var(--card)] text-[var(--fg-app)] border-[var(--border)] hover:border-[var(--muted-foreground)]'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-xs font-bold block">Full Duration Render (Rekomendasi)</span>
              <span
                className={`text-[10px] block ${
                  renderDurationMode === 'full_duration' ? 'text-blue-100' : 'text-[var(--muted-foreground)]'
                }`}
              >
                Render penuh seluruh {detectedSourceDuration.toFixed(1)}s video
              </span>
            </div>
            {renderDurationMode === 'full_duration' && <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-2" />}
          </button>

          <button
            type="button"
            onClick={() => onSelectDurationMode('test_15s')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
              renderDurationMode === 'test_15s'
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                : 'bg-[var(--card)] text-[var(--fg-app)] border-[var(--border)] hover:border-[var(--muted-foreground)]'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-xs font-bold block">Test Render 15s</span>
              <span
                className={`text-[10px] block ${
                  renderDurationMode === 'test_15s' ? 'text-blue-100' : 'text-[var(--muted-foreground)]'
                }`}
              >
                Preview cepat 15 detik pertama
              </span>
            </div>
            {renderDurationMode === 'test_15s' && <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-2" />}
          </button>
        </div>
      </div>

      {/* 3. Export Tier / Render Engine Mode */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[var(--fg-app)] flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Pilih Mode Engine Render</span>
          </label>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span
              className={`px-2 py-0.5 rounded-full font-bold border ${
                envDiag.isCrossOriginIsolated
                  ? 'bg-emerald-500/10 text-[var(--success)] border-emerald-500/30'
                  : 'bg-amber-500/10 text-[var(--warning)] border-amber-500/30'
              }`}
            >
              {envDiag.isCrossOriginIsolated ? '⚡ Multi-Thread' : '🛡️ Sandbox / Iframe'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Tier 0: Server MP4 Render (Primary) */}
          <button
            type="button"
            onClick={() => onSelectTier('server_mp4')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedTier === 'server_mp4'
                ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 text-[var(--fg-app)]'
                : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--muted-foreground)] text-[var(--fg-app)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1 text-[var(--fg-app)]">
                🚀 Server MP4
              </span>
              {backendMode === 'available' ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-[var(--success)] border border-emerald-500/30">
                  🟢 READY
                </span>
              ) : backendMode === 'checking' ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                  🔄 CHECKING
                </span>
              ) : backendMode === 'ffmpeg_missing' ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-[var(--warning)] border border-amber-500/30">
                  ⚠️ NO FFMPEG
                </span>
              ) : (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-[var(--error)] border border-rose-500/30">
                  🔴 SERVER OFF
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
              <strong>720×1280</strong> @ 24 FPS MP4 H.264 + AAC Audio. Render di server tanpa drop frame.
            </p>
          </button>

          {/* Tier 1: Safe 20 FPS 540p */}
          <button
            type="button"
            onClick={() => onSelectTier('safe_20fps')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedTier === 'safe_20fps'
                ? 'bg-blue-500/10 border-[var(--primary)] ring-2 ring-[var(--primary)]/20 text-[var(--fg-app)]'
                : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--muted-foreground)] text-[var(--fg-app)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1 text-[var(--fg-app)]">
                🛡️ Safe 20 FPS
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--secondary)] text-[var(--muted-foreground)] border border-[var(--border)]">
                FALLBACK
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
              <strong>540×960</strong> WebM @ 20 FPS. Browser client fallback, ringan di semua device.
            </p>
          </button>

          {/* Tier 2: Standard 24 FPS 720p */}
          <button
            type="button"
            onClick={() => onSelectTier('standard_24fps')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedTier === 'standard_24fps'
                ? 'bg-blue-500/10 border-[var(--primary)] ring-2 ring-[var(--primary)]/20 text-[var(--fg-app)]'
                : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--muted-foreground)] text-[var(--fg-app)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1 text-[var(--fg-app)]">
                ⚡ Standard 24 FPS
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--secondary)] text-[var(--muted-foreground)] border border-[var(--border)]">
                BROWSER HD
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
              <strong>720×1280</strong> WebM @ 24 FPS. HD via browser MediaRecorder.
            </p>
          </button>

          {/* Tier 3: MP4 FFmpeg WASM */}
          <button
            type="button"
            onClick={() => onSelectTier('mp4_wasm')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedTier === 'mp4_wasm'
                ? 'bg-blue-500/10 border-[var(--primary)] ring-2 ring-[var(--primary)]/20 text-[var(--fg-app)]'
                : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--muted-foreground)] text-[var(--fg-app)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1 text-[var(--fg-app)]">
                🎬 FFmpeg.wasm
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-[var(--warning)] border border-amber-500/30">
                WASM
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
              <strong>540×960</strong> MP4 H.264 via client WebAssembly.
            </p>
          </button>
        </div>
      </div>

      {/* Backend Notification Banner if server_mp4 selected but unavailable */}
      {selectedTier === 'server_mp4' && backendMode === 'missing' && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-[var(--error)] space-y-2">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Backend Server MP4 Belum Aktif</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--fg-app)]">
            Server MP4 Render membutuhkan backend Express aktif. Anda dapat menjalankan aplikasi dengan mode fullstack atau beralih ke mode <strong>Safe 20 FPS (WebM)</strong> yang berjalan langsung di browser.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSelectTier('safe_20fps')}
              className="px-3 py-1.5 rounded bg-[var(--primary)] hover:opacity-90 text-white font-bold text-[11px] cursor-pointer inline-flex items-center gap-1.5 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Beralih ke Safe Mode 20 FPS (WebM)</span>
            </button>
            <button
              type="button"
              onClick={onOpenFullTab}
              className="px-3 py-1.5 rounded bg-[var(--secondary)] hover:bg-[var(--border)] text-[var(--fg-app)] font-bold text-[11px] cursor-pointer inline-flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Tab Penuh</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Start Render Action Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onStartRender}
          disabled={isRendering || (selectedTier === 'server_mp4' && backendMode !== 'available') || hasFailCheck}
          className={`w-full py-3.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedTier === 'server_mp4'
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
              : 'bg-[var(--primary)] hover:opacity-90 text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>
            {selectedTier === 'server_mp4'
              ? backendMode === 'missing'
                ? '🔴 Backend Belum Aktif (Gunakan Safe Mode)'
                : backendMode === 'ffmpeg_missing'
                ? '⚠️ FFmpeg Host Belum Terpasang'
                : '🎬 Mulai Server MP4 Render (720×1280 @ 24 FPS)'
              : selectedTier === 'safe_20fps'
              ? '🛡️ Mulai Safe Render 20 FPS (540×960 WebM)'
              : selectedTier === 'standard_24fps'
              ? '⚡ Mulai Standard Render 24 FPS (720×1280 WebM)'
              : '🎬 Mulai Render FFmpeg.wasm (MP4)'}
          </span>
        </button>
      </div>
    </div>
  );
};
