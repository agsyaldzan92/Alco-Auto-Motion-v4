import React from 'react';
import {
  Film,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Server,
  ShieldCheck,
  FileText,
  FileJson,
} from 'lucide-react';
import { ExportTier, BackendMode, VideoFormatConfig } from '../ExportModal';

interface FinalOutputStageProps {
  renderedBlobUrl: string | null;
  finalReadiness: {
    passed: boolean;
    failureReasons: string[];
    mainMessage: string;
  };
  exportedFormat: VideoFormatConfig | null;
  selectedTier: ExportTier;
  audioMuxPending: boolean;
  isDownloading: boolean;
  downloadSuccess: boolean;
  downloadError: string | null;
  onVerifiedDownload: () => void;
  isRendering: boolean;
  onStartRenderCurrentTier: () => void;
  onSelectTier: (tier: ExportTier) => void;
  onStartServerMp4Render: () => void;
  onStartWebmRender: (tier: ExportTier) => void;
  backendMode: BackendMode;
  hasFailCheck: boolean;
  onDownloadFFmpegPackage: () => void;
  onDownloadSrt: () => void;
  onDownloadJson: () => void;
}

export const FinalOutputStage: React.FC<FinalOutputStageProps> = ({
  renderedBlobUrl,
  finalReadiness,
  exportedFormat,
  selectedTier,
  audioMuxPending,
  isDownloading,
  downloadSuccess,
  downloadError,
  onVerifiedDownload,
  isRendering,
  onStartRenderCurrentTier,
  onSelectTier,
  onStartServerMp4Render,
  onStartWebmRender,
  backendMode,
  hasFailCheck,
  onDownloadFFmpegPackage,
  onDownloadSrt,
  onDownloadJson,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main 9:16 Video Output Panel (Spans 2 cols on lg) */}
        <div className="alco-card lg:col-span-2 space-y-3 flex flex-col justify-between border-[var(--border)] shadow-md">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center font-bold">
                  <Film className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--secondary)] text-[var(--fg-app)] border border-[var(--border)] font-mono">
                  9:16 Vertical Video (
                  {selectedTier === 'server_mp4'
                    ? '720×1280 @ 24 FPS MP4'
                    : selectedTier === 'safe_20fps'
                    ? '540×960 @ 20 FPS'
                    : selectedTier === 'standard_24fps'
                    ? '720×1280 @ 24 FPS'
                    : '540×960 MP4'}
                  )
                </span>
              </div>
              {exportedFormat && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${
                    exportedFormat.isUniversalMp4
                      ? 'alco-status-success'
                      : 'alco-status-warning'
                  }`}
                >
                  {exportedFormat.formatLabel}
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-[var(--fg-app)]">Burned-In Video Render</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-[var(--muted-foreground)] leading-snug">
                Render frame-by-frame dengan karaoke caption, dynamic kinetic zoom, dan evidence overlays.
              </p>
              {audioMuxPending && (
                <span className="alco-status-warning text-[10px] py-0.5 px-2">
                  MP4 video only - audio mux pending
                </span>
              )}
            </div>
          </div>

          {renderedBlobUrl ? (
            <div className="space-y-4 pt-2">
              {/* Player Container */}
              <div className="alco-panel p-4 rounded-xl flex flex-col items-center gap-3">
                <div className="text-center w-full">
                  {finalReadiness.passed ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full alco-status-success text-xs font-bold shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Video final siap diunduh</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full alco-status-error text-xs font-bold shadow-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Final Export Readiness Belum Memenuhi Syarat</span>
                    </div>
                  )}
                </div>

                {/* 9:16 Preview Frame */}
                <div className="relative w-full max-w-[220px] sm:max-w-[250px] aspect-[9/16] rounded-xl overflow-hidden border-2 border-[var(--border)] bg-black shadow-lg my-1">
                  <video
                    src={renderedBlobUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Verified Download Button */}
              {finalReadiness.passed ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={onVerifiedDownload}
                    disabled={isDownloading}
                    className="w-full py-3.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Memverifikasi & Mengunduh File MP4...</span>
                      </>
                    ) : downloadSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Video Terverifikasi & Berhasil Diunduh!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Video MP4</span>
                      </>
                    )}
                  </button>

                  {downloadError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[var(--error)] text-xs flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold">Gagal Mengunduh:</span>
                        <p className="text-[11px] leading-tight">{downloadError}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[var(--error)] text-xs space-y-1.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold block">Unduhan Video Final Dinonaktifkan</span>
                      <p className="text-[11px] leading-snug">{finalReadiness.mainMessage}</p>
                      {finalReadiness.failureReasons.length > 0 && (
                        <ul className="list-disc list-inside text-[11px] space-y-0.5 pt-1">
                          {finalReadiness.failureReasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Re-render Button */}
              <button
                type="button"
                onClick={onStartRenderCurrentTier}
                disabled={isRendering || (selectedTier === 'server_mp4' && backendMode !== 'available') || hasFailCheck}
                className="w-full py-2 px-3 rounded-lg bg-[var(--secondary)] hover:bg-[var(--border)] text-[var(--fg-app)] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--border)]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--warning)]" />
                <span>
                  Render Ulang (
                  {selectedTier === 'server_mp4'
                    ? 'Server MP4 24 FPS'
                    : selectedTier === 'safe_20fps'
                    ? 'Safe 20 FPS'
                    : selectedTier === 'standard_24fps'
                    ? 'Standard 24 FPS'
                    : 'FFmpeg.wasm'}
                  )
                </span>
              </button>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[var(--secondary)] border border-[var(--border)] flex flex-col items-center justify-center text-center space-y-2">
              <Film className="w-8 h-8 text-[var(--muted-foreground)]" />
              <span className="text-xs font-bold text-[var(--fg-app)]">Belum Ada Video Yang Dirender</span>
              <p className="text-[11px] text-[var(--muted-foreground)] max-w-xs">
                Klik tombol Mulai Render di atas untuk memproses video final sesuai opsi yang dipilih.
              </p>
            </div>
          )}

          {/* Direct Multi-Choice Fallback Panel */}
          <div className="alco-panel space-y-2 mt-2">
            <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">
              Opsi Ekspor Cepat:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectTier('server_mp4');
                  onStartServerMp4Render();
                }}
                disabled={isRendering || backendMode !== 'available' || hasFailCheck}
                className="py-2 px-2.5 rounded-lg bg-[var(--card)] hover:bg-[var(--secondary)] border border-[var(--border)] text-[var(--fg-app)] text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              >
                <Server className="w-3 h-3 text-[var(--warning)]" />
                <span>Render MP4 Server</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTier('safe_20fps');
                  onStartWebmRender('safe_20fps');
                }}
                disabled={isRendering || hasFailCheck}
                className="py-2 px-2.5 rounded-lg bg-[var(--card)] hover:bg-[var(--secondary)] border border-[var(--border)] text-[var(--fg-app)] text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              >
                <ShieldCheck className="w-3 h-3 text-[var(--success)]" />
                <span>Safe 20 FPS WebM</span>
              </button>

              <button
                type="button"
                onClick={onDownloadFFmpegPackage}
                className="py-2 px-2.5 rounded-lg bg-[var(--card)] hover:bg-[var(--secondary)] border border-[var(--border)] text-[var(--fg-app)] text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              >
                <FileText className="w-3 h-3 text-[var(--primary)]" />
                <span>Script (.sh)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Export Assets (Subtitles SRT & JSON Timeline Plan) */}
        <div className="space-y-4 flex flex-col">
          {/* Subtitles (.SRT) */}
          <div className="alco-card space-y-3 flex-1 flex flex-col justify-between border-[var(--border)]">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-[var(--primary)] flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[var(--fg-app)]">Subtitles (.SRT)</h3>
              <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
                File subtitle bertimestamp standar untuk CapCut, Premiere Pro, atau DaVinci Resolve.
              </p>
            </div>

            <button
              type="button"
              onClick={onDownloadSrt}
              className="w-full py-2.5 px-3 rounded-lg bg-[var(--secondary)] hover:bg-[var(--border)] text-[var(--fg-app)] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-[var(--border)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download SRT</span>
            </button>
          </div>

          {/* JSON Timeline Plan */}
          <div className="alco-card space-y-3 flex-1 flex flex-col justify-between border-[var(--border)]">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-[var(--warning)] flex items-center justify-center font-bold">
                <FileJson className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[var(--fg-app)]">Timeline Metadata (.JSON)</h3>
              <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
                Struktur metadata lengkap scene, kinetic transitions, audio timestamp, dan visual evidence.
              </p>
            </div>

            <button
              type="button"
              onClick={onDownloadJson}
              className="w-full py-2.5 px-3 rounded-lg bg-[var(--secondary)] hover:bg-[var(--border)] text-[var(--fg-app)] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-[var(--border)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
