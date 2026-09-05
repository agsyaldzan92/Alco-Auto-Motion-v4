import React from 'react';
import { AlcoEditingProject, ContentRole } from '../types';
import { Sparkles, Brain, ArrowRight, ShieldCheck, Flame, Zap, CheckCircle2, Award, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface AiAnalysisTabProps {
  project: AlcoEditingProject | null;
  onProceedToPreview: () => void;
}

const ROLE_BADGE_STYLES: Record<ContentRole, { label: string; bg: string; text: string; border: string }> = {
  hook: { label: 'HOOK (0-3s)', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  problem: { label: 'PROBLEM', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  curiosity: { label: 'CURIOSITY LOOP', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  explanation: { label: 'EXPLANATION', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  solution: { label: 'SOLUTION', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  proof: { label: 'PROOF / STATS', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  cta: { label: 'CALL TO ACTION', bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/40' },
  continuation: { label: 'A-ROLL CONTINUATION', bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/40' },
};

export const AiAnalysisTab: React.FC<AiAnalysisTabProps> = ({ project, onProceedToPreview }) => {
  if (!project) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-400">
        <Brain className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <p className="text-sm">Belum ada analisis. Silakan kembali ke tab Input dan klik Analyze Video.</p>
      </div>
    );
  }

  const { transcript, analysis, stats, creative_audit, funnel_stage } = project;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Top Banner: Retention & Scoring */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Alco Creative Performance Engine
              </span>
              <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                STAGE: {funnel_stage || 'META_ADS'}
              </span>
              <span className="text-xs text-slate-400">Type: {project.video_type.toUpperCase()}</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{project.title}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Marketing Funnel-based auto editing: Hook → Problem → Curiosity → Solution → Proof → CTA.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Hook Score</div>
              <div className="text-lg font-black text-rose-400 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-rose-500" />
                {stats?.hook_strength || 92}/100
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Audit Score</div>
              <div className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                {creative_audit?.overallScore || 90}/100 ({creative_audit?.grade || 'A+'})
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Visual Diversity</div>
              <div className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1">
                <Award className="w-4 h-4 text-emerald-500" />
                {stats?.visual_variety || 85}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Creative Audit & Recommendations Layer (Prioritas 4) */}
      {creative_audit && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-extrabold text-white uppercase tracking-tight">
                Creative Validation Audit & Edit Recommendations
              </h3>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
              GRADE {creative_audit.grade} ({creative_audit.overallScore}/100)
            </span>
          </div>

          {/* Category Scores Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Hook Retention</span>
              <span className="text-sm font-black text-rose-400">{creative_audit.categoryScores.hookStrength}%</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Readability</span>
              <span className="text-sm font-black text-amber-400">{creative_audit.categoryScores.captionReadability}%</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Proof Presence</span>
              <span className="text-sm font-black text-blue-400">{creative_audit.categoryScores.proofPresence}%</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">CTA Clarity</span>
              <span className="text-sm font-black text-indigo-400">{creative_audit.categoryScores.ctaClarity}%</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Fatigue Control</span>
              <span className="text-sm font-black text-purple-400">{creative_audit.categoryScores.fatigueRiskControl}%</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">9:16 Safe Zone</span>
              <span className="text-sm font-black text-emerald-400">{creative_audit.categoryScores.safeZoneCompliance}%</span>
            </div>
          </div>

          {/* Actionable Fixes List */}
          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Actionable Creative Recommendations:</h4>
            {creative_audit.recommendations.map((rec) => {
              let icon = <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />;
              let badgeStyle = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
              if (rec.severity === 'high') {
                icon = <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
                badgeStyle = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
              } else if (rec.severity === 'medium') {
                icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
                badgeStyle = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
              } else if (rec.severity === 'passed') {
                icon = <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
                badgeStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
              }

              return (
                <div key={rec.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {icon}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{rec.title}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded border ${badgeStyle}`}>
                          {rec.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{rec.description}</p>
                      <p className="text-[11px] font-bold text-amber-300 mt-1">👉 Fix: {rec.actionableFix}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid: 2 Columns - Left: Transcript & Timestamps, Right: Role Breakdown & Reasoning */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Modul 2 - Transkripsi Tersegmentasi (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-indigo-600 text-white text-xs flex items-center justify-center">
                M2
              </span>
              Transkripsi Waktu Nyata
            </h3>
            <span className="text-xs text-slate-400">{transcript.length} Segmen Terdeteksi</span>
          </div>

          <div className="space-y-3">
            {transcript.map((seg, idx) => (
              <div
                key={seg.id || idx}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                    {seg.start.toFixed(1)}s — {seg.end.toFixed(1)}s
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Durasi: {(seg.end - seg.start).toFixed(1)}s
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  "{seg.text}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Modul 3 - AI Content Analyzer (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-amber-500 text-slate-950 text-xs flex items-center justify-center font-bold">
                M3
              </span>
              AI Content Role & Emosi
            </h3>
            <span className="text-xs text-slate-400">Editing Berdasarkan Makna</span>
          </div>

          <div className="space-y-3.5">
            {analysis.map((item, idx) => {
              const roleInfo = ROLE_BADGE_STYLES[item.content_role] || ROLE_BADGE_STYLES.explanation;
              return (
                <div
                  key={item.id || idx}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5 hover:border-indigo-500/50 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${roleInfo.bg} ${roleInfo.text} ${roleInfo.border}`}
                      >
                        {roleInfo.label}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        {item.start.toFixed(1)}s — {item.end.toFixed(1)}s
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400">
                        Emosi:{' '}
                        <span className="text-indigo-300 font-semibold uppercase text-[10px] bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                          {item.emotion}
                        </span>
                      </span>
                      <span className="text-slate-400">
                        Penting: <span className="text-amber-400 font-bold">{item.importance}/10</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-start gap-2">
                    <Brain className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 font-medium block text-[11px]">
                        Kata Kunci Inti: <span className="text-amber-300 font-bold">"{item.key_phrase}"</span>
                      </span>
                      <p className="text-[11px] text-slate-300 mt-1 italic">
                        {item.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action to Proceed */}
          <div className="pt-4 flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div>
              <p className="text-xs font-semibold text-white">Analisis AI Selesai!</p>
              <p className="text-[11px] text-slate-400">
                Lanjut ke pembuatan motion presets, dynamic zoom, dan timeline editor.
              </p>
            </div>

            <button
              id="btn-proceed-to-edit-plan"
              onClick={onProceedToPreview}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all"
            >
              <span>LIHAT EDIT PLAN & PREVIEW</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

