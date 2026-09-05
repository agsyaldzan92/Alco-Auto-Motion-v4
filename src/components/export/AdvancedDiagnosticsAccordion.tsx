import React from 'react';
import {
  Eye,
  ChevronDown,
  CheckCircle2,
  FileText,
  Zap,
  Film,
  Volume2,
  UserCheck,
  Check,
  Copy,
  ChevronUp,
} from 'lucide-react';
import {
  HookReviewState,
  CaptionReviewState,
  SfxReviewState,
  BrollReviewState,
  TalkingHeadReviewState,
  ExportTier,
  RenderDurationMode,
  BackendMode,
} from './types';
import { AlcoEditingProject, RenderDiagnosticInfo, OutputQualityAuditResult } from '../../types';
import { EnvironmentDiagnostics } from '../../engine/ffmpegWasmExportService';

interface AdvancedDiagnosticsAccordionProps {
  diagnosticInfo: RenderDiagnosticInfo | null;
  currentProject: AlcoEditingProject;
  selectedTier: ExportTier;
  renderDurationMode: RenderDurationMode;
  videoUrl: string;
  videoFile?: File | null;
  envDiag: EnvironmentDiagnostics;
  backendMode: BackendMode;
  backendStatusReason: string;
  healthEndpointDiag?: any;
  pingEndpointDiag?: any;
  auditResult: OutputQualityAuditResult | null;
  videoStreamUrl: string | null;
  videoDownloadUrl: string | null;
  renderedBlobUrl: string | null;
  finalReadiness: { passed: boolean; failureReasons: string[]; mainMessage: string };
  hookReviewState: HookReviewState;
  setHookReviewState: (val: HookReviewState) => void;
  captionReviewState: CaptionReviewState;
  setCaptionReviewState: (val: CaptionReviewState) => void;
  sfxReviewState: SfxReviewState;
  setSfxReviewState: (val: SfxReviewState) => void;
  brollReviewState: BrollReviewState;
  setBrollReviewState: (val: BrollReviewState) => void;
  talkingHeadReviewState: TalkingHeadReviewState;
  setTalkingHeadReviewState: (val: TalkingHeadReviewState) => void;
  quickFixToast: string | null;
  handleFixHook: () => void;
  handleShortenCaption: () => void;
  handleMoveCaptionUp: () => void;
  handleReduceSfx: () => void;
  handleDisableBroll: () => void;
  handleEnhanceTalkingHead: () => void;
  handleCopyDiagnosticReport: () => void;
  copiedDiagnostic: boolean;
  showDiagnosticDetails: boolean;
  setShowDiagnosticDetails: React.Dispatch<React.SetStateAction<boolean>>;
  buildRenderDiagnosticReport: (diagnosticInfo: any, options: any) => string;
}

export const AdvancedDiagnosticsAccordion: React.FC<AdvancedDiagnosticsAccordionProps> = ({
  diagnosticInfo,
  currentProject,
  selectedTier,
  renderDurationMode,
  videoUrl,
  videoFile,
  envDiag,
  backendMode,
  backendStatusReason,
  healthEndpointDiag,
  pingEndpointDiag,
  auditResult,
  videoStreamUrl,
  videoDownloadUrl,
  renderedBlobUrl,
  finalReadiness,
  hookReviewState,
  setHookReviewState,
  captionReviewState,
  setCaptionReviewState,
  sfxReviewState,
  setSfxReviewState,
  brollReviewState,
  setBrollReviewState,
  talkingHeadReviewState,
  setTalkingHeadReviewState,
  quickFixToast,
  handleFixHook,
  handleShortenCaption,
  handleMoveCaptionUp,
  handleReduceSfx,
  handleDisableBroll,
  handleEnhanceTalkingHead,
  handleCopyDiagnosticReport,
  copiedDiagnostic,
  showDiagnosticDetails,
  setShowDiagnosticDetails,
  buildRenderDiagnosticReport,
}) => {
  return (
    <details className="alco-card group overflow-hidden border-[var(--border)] shadow-xs">
      <summary className="p-3.5 flex items-center justify-between cursor-pointer list-none font-bold text-xs text-[var(--fg-app)] hover:bg-[var(--secondary)] transition-colors rounded-lg">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[var(--primary)]" />
          <span>Advanced Diagnostic & Review Teknis</span>
        </div>
        <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)] transition-transform group-open:rotate-180" />
      </summary>

      <div className="p-4 border-t border-[var(--border)] space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
          <div>
            <h4 className="text-xs font-bold text-[var(--fg-app)]">Review Visual & Audio</h4>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Evaluasi kualitas editing hasil render sebelum dipublikasikan.
            </p>
          </div>
          <span className="alco-status-warning text-[10px] py-0.5 px-2">
            Terindikasi Aman (Cek Visual Manual)
          </span>
        </div>

        {/* Quick Fix Toast */}
        {quickFixToast && (
          <div className="alco-status-success w-full p-2.5 text-xs flex items-center gap-2 animate-fade-in font-medium">
            <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />
            <span>{quickFixToast}</span>
          </div>
        )}

        {/* 5 Quick Fix Review Rows */}
        <div className="space-y-3 text-xs">
          {/* 1. Teks Hook */}
          <div className="alco-panel space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-[var(--fg-app)]">
                <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Teks Hook</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={hookReviewState}
                  onChange={(e) => setHookReviewState(e.target.value as HookReviewState)}
                  className="alco-control text-xs font-semibold cursor-pointer"
                >
                  <option value="bagus">Bagus & Ringkas</option>
                  <option value="terlalu_panjang">Terlalu Panjang</option>
                  <option value="terlalu_kecil">Terlalu Kecil</option>
                  <option value="menutup_wajah">Menutup Wajah</option>
                </select>

                {hookReviewState !== 'bagus' && (
                  <button
                    type="button"
                    onClick={handleFixHook}
                    className="px-2.5 py-1 bg-[var(--primary)] hover:opacity-90 text-white rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>Fix Hook</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
              💡 <strong>Rekomendasi:</strong>{' '}
              {hookReviewState === 'terlalu_panjang'
                ? 'Teks hook terlalu panjang. Buat 3-5 kata agar penonton langsung paham di 3 detik awal.'
                : hookReviewState === 'terlalu_kecil'
                ? 'Teks hook terlalu kecil. Perbesar font teks hook agar menonjol di feed.'
                : hookReviewState === 'menutup_wajah'
                ? 'Teks hook menutup wajah. Geser posisi ke area atas atau sesuaikan posisi Y.'
                : 'Teks hook ringkas, jelas, dan berada di posisi yang aman.'}
            </p>
          </div>

          {/* 2. Subtitle */}
          <div className="alco-panel space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-[var(--fg-app)]">
                <Film className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Subtitle</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={captionReviewState}
                  onChange={(e) => setCaptionReviewState(e.target.value as CaptionReviewState)}
                  className="alco-control text-xs font-semibold cursor-pointer"
                >
                  <option value="clean">Clean & Rapi</option>
                  <option value="terlalu_panjang">Terlalu Panjang</option>
                  <option value="terlalu_rendah">Terlalu Rendah</option>
                  <option value="terlalu_besar">Terlalu Besar</option>
                  <option value="masih_box">Masih Latar Box</option>
                </select>

                {captionReviewState !== 'clean' && (
                  <button
                    type="button"
                    onClick={captionReviewState === 'terlalu_panjang' ? handleShortenCaption : handleMoveCaptionUp}
                    className="px-2.5 py-1 bg-[var(--primary)] hover:opacity-90 text-white rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>{captionReviewState === 'terlalu_panjang' ? 'Shorten Caption' : 'Move Caption Up'}</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
              💡 <strong>Rekomendasi:</strong>{' '}
              {captionReviewState === 'terlalu_panjang'
                ? 'Subtitle terlalu panjang per scene. Persingkat teks agar penonton tidak kelelahan membaca.'
                : captionReviewState === 'terlalu_rendah'
                ? 'Subtitle terlalu rendah (terpotong UI TikTok/Reels). Naikkan posisi Y 8-12% ke atas.'
                : captionReviewState === 'terlalu_besar'
                ? 'Ukuran subtitle terlalu besar. Kurangi font size agar tidak menghalangi visual.'
                : captionReviewState === 'masih_box'
                ? 'Subtitle masih menggunakan latar box. Ubah ke gaya bersih tanpa background.'
                : 'Subtitle bersih, kontras tinggi, dan mudah dibaca.'}
            </p>
          </div>

          {/* 3. Efek Suara (SFX) */}
          <div className="alco-panel space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-[var(--fg-app)]">
                <Volume2 className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Efek Suara</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={sfxReviewState}
                  onChange={(e) => setSfxReviewState(e.target.value as SfxReviewState)}
                  className="alco-control text-xs font-semibold cursor-pointer"
                >
                  <option value="sesuai">Sesuai & Balance</option>
                  <option value="terlalu_ramai">Terlalu Ramai</option>
                  <option value="terlalu_pelan">Terlalu Pelan</option>
                  <option value="terlalu_keras">Terlalu Keras</option>
                  <option value="tidak_cocok_scene">Tidak Cocok Scene</option>
                </select>

                {sfxReviewState !== 'sesuai' && (
                  <button
                    type="button"
                    onClick={handleReduceSfx}
                    className="px-2.5 py-1 bg-[var(--primary)] hover:opacity-90 text-white rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>Reduce SFX</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
              💡 <strong>Rekomendasi:</strong>{' '}
              {sfxReviewState === 'terlalu_ramai'
                ? 'Efek suara terlalu ramai. Kurangi SFX berlebih atau ganti ke data_blip atau ding.'
                : sfxReviewState === 'terlalu_pelan'
                ? 'Efek suara terlalu pelan. Naikkan volume SFX agar dinamika scene terasa.'
                : sfxReviewState === 'terlalu_keras'
                ? 'Efek suara terlalu keras. Turunkan volume SFX agar vokal pembicara jernih.'
                : sfxReviewState === 'tidak_cocok_scene'
                ? 'Efek suara kurang pas dengan tempo scene.'
                : 'Efek suara seimbang dengan vokal pembicara.'}
            </p>
          </div>

          {/* 4. Visual Tambahan (B-roll) */}
          <div className="alco-panel space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-[var(--fg-app)]">
                <Film className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Visual Tambahan</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={brollReviewState}
                  onChange={(e) => setBrollReviewState(e.target.value as BrollReviewState)}
                  className="alco-control text-xs font-semibold cursor-pointer"
                >
                  <option value="relevan">Relevan & Pas</option>
                  <option value="generik">Terlihat Generik</option>
                  <option value="kaku">Transisi Kaku</option>
                  <option value="menutup_wajah">Menutup Wajah</option>
                </select>

                {brollReviewState !== 'relevan' && (
                  <button
                    type="button"
                    onClick={handleDisableBroll}
                    className="px-2.5 py-1 bg-[var(--primary)] hover:opacity-90 text-white rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>Disable B-roll</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
              💡 <strong>Rekomendasi:</strong>{' '}
              {brollReviewState === 'generik'
                ? 'Visual tambahan terlihat generik. Gunakan aset user atau matikan B-roll.'
                : brollReviewState === 'kaku'
                ? 'Transisi visual tambahan terlalu kaku.'
                : brollReviewState === 'menutup_wajah'
                ? 'Visual tambahan menutup area wajah pembicara.'
                : 'Visual tambahan mendukung alur cerita.'}
            </p>
          </div>

          {/* 5. Wajah Pembicara (Talking Head) */}
          <div className="alco-panel space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-[var(--fg-app)]">
                <UserCheck className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Wajah Pembicara</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={talkingHeadReviewState}
                  onChange={(e) => setTalkingHeadReviewState(e.target.value as TalkingHeadReviewState)}
                  className="alco-control text-xs font-semibold cursor-pointer"
                >
                  <option value="aman">Framing Aman</option>
                  <option value="terlalu_kecil">Terlalu Kecil</option>
                  <option value="wajah_tertutup">Wajah Tertutup Overlay</option>
                  <option value="crop_kurang_bagus">Crop Kurang Pas</option>
                </select>

                {talkingHeadReviewState !== 'aman' && (
                  <button
                    type="button"
                    onClick={handleEnhanceTalkingHead}
                    className="px-2.5 py-1 bg-[var(--primary)] hover:opacity-90 text-white rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>Enhance Talking Head</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
              💡 <strong>Rekomendasi:</strong>{' '}
              {talkingHeadReviewState === 'terlalu_kecil'
                ? 'Wajah pembicara terlalu kecil. Gunakan punch zoom 1.12x.'
                : talkingHeadReviewState === 'wajah_tertutup'
                ? 'Wajah pembicara tertutup elemen grafis.'
                : talkingHeadReviewState === 'crop_kurang_bagus'
                ? 'Sesuaikan posisi framing atau eyeline pembicara di 33%.'
                : 'Framing wajah pembicara proporsional di area sepertiga atas.'}
            </p>
          </div>
        </div>

        {/* Diagnostic Actions & Log Dump */}
        <div className="pt-3 border-t border-[var(--border)] space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyDiagnosticReport}
              className="px-3 py-1.5 rounded-lg bg-[var(--primary)] hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
            >
              {copiedDiagnostic ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDiagnostic ? 'Diagnostic Report Tersalin!' : 'Copy Diagnostic Report'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDiagnosticDetails((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg bg-[var(--secondary)] hover:bg-[var(--border)] text-[var(--fg-app)] font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-[var(--border)] transition-all"
            >
              {showDiagnosticDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showDiagnosticDetails ? 'Sembunyikan Detail Log' : 'Lihat Detail Log Lengkap'}</span>
            </button>
          </div>

          {showDiagnosticDetails && (
            <div className="p-3 bg-black/90 text-slate-200 rounded-lg border border-slate-800 space-y-2 text-[11px] font-mono overflow-x-auto max-h-64 overflow-y-auto animate-fade-in">
              <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800 text-[10px]">
                <span>RENDER DIAGNOSTIC LOG</span>
                <span>{finalReadiness.passed ? 'certified_ready' : (diagnosticInfo?.failedStage || 'audit_unqualified')}</span>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
                {buildRenderDiagnosticReport(diagnosticInfo, {
                  project: currentProject,
                  selectedTier,
                  renderDurationMode,
                  videoUrl,
                  videoFile,
                  envDiag,
                  backendMode,
                  backendReason: backendStatusReason,
                  healthCheck: healthEndpointDiag,
                  pingCheck: pingEndpointDiag,
                  auditResult,
                  videoStreamUrl,
                  videoDownloadUrl,
                  renderedBlobUrl,
                })}
              </pre>
            </div>
          )}
        </div>
      </div>
    </details>
  );
};
