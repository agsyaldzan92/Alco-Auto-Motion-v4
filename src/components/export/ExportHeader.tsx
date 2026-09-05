import React from 'react';
import { X, CheckCircle2, Video } from 'lucide-react';

interface ExportHeaderProps {
  title: string;
  videoType: string;
  onClose: () => void;
}

export const ExportHeader: React.FC<ExportHeaderProps> = ({ title, videoType, onClose }) => {
  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border)]">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="alco-status-success text-[11px] py-0.5 px-2.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> High-Performance 9:16 Video Studio
          </span>
          <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--secondary)] text-[var(--muted-foreground)] border border-[var(--border)]">
            {videoType}
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-extrabold text-[var(--fg-app)] tracking-tight">
          {title || 'Export Video Master'}
        </h2>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Ekspor video vertikal 9:16 dengan kinetic dynamic zoom, visual evidence overlays, karaoke captions, dan verified quality audit.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup dialog ekspor"
        className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--fg-app)] hover:bg-[var(--secondary)] transition-colors cursor-pointer shrink-0"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
