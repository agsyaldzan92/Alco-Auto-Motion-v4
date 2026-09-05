import React from 'react';
import { Loader2, Film, Sparkles, CheckCircle2 } from 'lucide-react';
import { ExportTier } from '../ExportModal';

interface RenderProgressStageProps {
  selectedTier: ExportTier;
  renderProgress: number;
  renderStatusText: string;
  onCancelRender: () => void;
}

export const RenderProgressStage: React.FC<RenderProgressStageProps> = ({
  selectedTier,
  renderProgress,
  renderStatusText,
  onCancelRender,
}) => {
  return (
    <div className="alco-card space-y-4 border-[var(--primary)] shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--fg-app)] flex items-center gap-2">
              <span>Sedang Merender Video</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--secondary)] text-[var(--muted-foreground)] border border-[var(--border)] font-mono">
                {selectedTier === 'server_mp4'
                  ? 'Server FFmpeg 720×1280 @ 24 FPS'
                  : selectedTier === 'safe_20fps'
                  ? '540×960 @ 20 FPS'
                  : selectedTier === 'standard_24fps'
                  ? '720×1280 @ 24 FPS'
                  : 'MP4 FFmpeg.wasm'}
              </span>
            </h4>
            <p className="text-xs text-[var(--muted-foreground)] italic">{renderStatusText}</p>
          </div>
        </div>
        <span className="font-mono font-black text-[var(--primary)] text-xl">{renderProgress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[var(--secondary)] rounded-full h-2.5 overflow-hidden p-0.5 border border-[var(--border)]">
        <div
          className="bg-[var(--primary)] h-full rounded-full transition-all duration-200"
          style={{ width: `${renderProgress}%` }}
        />
      </div>

      {/* Phased Steps */}
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
        <div
          className={`p-2 rounded-lg border flex items-center gap-1.5 transition-colors ${
            renderProgress >= 15
              ? 'bg-blue-500/10 border-[var(--primary)]/40 text-[var(--primary)] font-bold'
              : 'bg-[var(--secondary)] border-[var(--border)] text-[var(--muted-foreground)]'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" /> 1. Assets Ingest
        </div>
        <div
          className={`p-2 rounded-lg border flex items-center gap-1.5 transition-colors ${
            renderProgress >= 88
              ? 'bg-amber-500/10 border-amber-500/40 text-[var(--warning)] font-bold'
              : 'bg-[var(--secondary)] border-[var(--border)] text-[var(--muted-foreground)]'
          }`}
        >
          <Film className="w-3 h-3" /> 2. Frame Encoding
        </div>
        <div
          className={`p-2 rounded-lg border flex items-center gap-1.5 transition-colors ${
            renderProgress >= 95
              ? 'bg-emerald-500/10 border-emerald-500/40 text-[var(--success)] font-bold'
              : 'bg-[var(--secondary)] border-[var(--border)] text-[var(--muted-foreground)]'
          }`}
        >
          <Sparkles className="w-3 h-3" /> 3. Quality Probe
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onCancelRender}
          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[var(--error)] border border-rose-500/30 text-xs font-bold cursor-pointer transition-all"
        >
          Batalkan Render
        </button>
      </div>
    </div>
  );
};
