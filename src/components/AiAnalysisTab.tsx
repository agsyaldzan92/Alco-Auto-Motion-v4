import React, { useState } from 'react';
import { AlcoEditingProject, ContentRole } from '../types';
import {
  Sparkles,
  Brain,
  ArrowRight,
  ShieldCheck,
  Flame,
  Award,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

interface AiAnalysisTabProps {
  project: AlcoEditingProject | null;
  onProceedToPreview: () => void;
}

const ROLE_BADGE_STYLES: Record<
  ContentRole,
  { label: string; colorClass: string; borderClass: string; bgClass: string }
> = {
  hook: { label: 'HOOK', colorClass: 'text-rose-500', borderClass: 'border-rose-500/30', bgClass: 'bg-rose-500/10' },
  problem: { label: 'PROBLEM', colorClass: 'text-amber-500', borderClass: 'border-amber-500/30', bgClass: 'bg-amber-500/10' },
  curiosity: { label: 'CURIOSITY', colorClass: 'text-purple-500', borderClass: 'border-purple-500/30', bgClass: 'bg-purple-500/10' },
  explanation: { label: 'EXPLANATION', colorClass: 'text-blue-500', borderClass: 'border-blue-500/30', bgClass: 'bg-blue-500/10' },
  solution: { label: 'SOLUTION', colorClass: 'text-emerald-500', borderClass: 'border-emerald-500/30', bgClass: 'bg-emerald-500/10' },
  proof: { label: 'PROOF', colorClass: 'text-cyan-500', borderClass: 'border-cyan-500/30', bgClass: 'bg-cyan-500/10' },
  cta: { label: 'CTA', colorClass: 'text-indigo-500', borderClass: 'border-indigo-500/30', bgClass: 'bg-indigo-500/10' },
  continuation: { label: 'A-ROLL', colorClass: 'text-[var(--muted-foreground)]', borderClass: 'border-[var(--border)]', bgClass: 'bg-[var(--secondary)]' },
};

const FUNNEL_SEQUENCE: { role: ContentRole; label: string }[] = [
  { role: 'hook', label: '1. Hook' },
  { role: 'problem', label: '2. Problem' },
  { role: 'curiosity', label: '3. Curiosity' },
  { role: 'explanation', label: '4. Explanation' },
  { role: 'solution', label: '5. Solution' },
  { role: 'proof', label: '6. Proof' },
  { role: 'cta', label: '7. CTA' },
];

export const AiAnalysisTab: React.FC<AiAnalysisTabProps> = ({ project, onProceedToPreview }) => {
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [showAuditDetails, setShowAuditDetails] = useState<boolean>(false);

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-[var(--muted-foreground)] space-y-3">
        <Brain className="w-12 h-12 mx-auto text-[var(--muted-foreground)] opacity-40" />
        <h3 className="text-sm font-semibold text-[var(--fg-app)]">No Analysis Available</h3>
        <p className="text-xs">Please go to the Input tab and click "Analyze with AI" to generate a scene plan.</p>
      </div>
    );
  }

  const { transcript, analysis, stats, creative_audit, funnel_stage } = project;

  const toggleReasoning = (id: string) => {
    setExpandedReasoning((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Find present roles in analysis
  const presentRoles = new Set(analysis.map((a) => a.content_role));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Workspace Header & Top Metrics Summary */}
      <div className="alco-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="alco-section-label">AI ANALYSIS WORKSPACE</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase">
                {funnel_stage || 'META_ADS'}
              </span>
              <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                {project.video_type.toUpperCase()}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[var(--fg-app)] tracking-tight">{project.title}</h2>
          </div>

          <button
            id="btn-proceed-to-edit-plan"
            onClick={onProceedToPreview}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer self-start md:self-auto"
          >
            <span>Continue to Edit & Preview</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Key Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border)] text-xs">
          <div className="alco-panel flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="alco-section-label text-[9px] block">TOTAL SCENES</span>
              <span className="font-bold text-[var(--fg-app)] text-sm">{analysis.length} Scenes</span>
            </div>
          </div>

          <div className="alco-panel flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="alco-section-label text-[9px] block">HOOK STRENGTH</span>
              <span className="font-bold text-rose-500 text-sm">{stats?.hook_strength || 92}/100</span>
            </div>
          </div>

          <div className="alco-panel flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="alco-section-label text-[9px] block">AUDIT GRADE</span>
              <span className="font-bold text-amber-500 text-sm">
                {creative_audit?.grade || 'A+'} ({creative_audit?.overallScore || 90}/100)
              </span>
            </div>
          </div>

          <div className="alco-panel flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="alco-section-label text-[9px] block">VISUAL DIVERSITY</span>
              <span className="font-bold text-emerald-500 text-sm">{stats?.visual_variety || 85}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Sequence Visual Bar */}
      <section className="alco-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="alco-section-label">MARKETING FUNNEL STRUCTURE</span>
          <span className="text-[10px] text-[var(--muted-foreground)]">
            {presentRoles.size} of 7 Roles Detected
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {FUNNEL_SEQUENCE.map((item) => {
            const isPresent = presentRoles.has(item.role);
            const style = ROLE_BADGE_STYLES[item.role];

            return (
              <div
                key={item.role}
                className={`p-2 rounded-lg border text-center transition-all ${
                  isPresent
                    ? `${style.bgClass} ${style.borderClass}`
                    : 'bg-[var(--secondary)] border-[var(--border)] opacity-40'
                }`}
              >
                <div className={`text-xs font-bold ${isPresent ? style.colorClass : 'text-[var(--muted-foreground)]'}`}>
                  {item.label}
                </div>
                <div className="text-[9px] text-[var(--muted-foreground)] mt-0.5">
                  {isPresent ? '✓ Detected' : 'Missing'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Grid: Scene Breakdown & Transcript */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Scene Breakdown & Roles (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-app)] flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-500" />
              <span>Scene Breakdown ({analysis.length} Scenes)</span>
            </h3>
            <span className="alco-section-label text-[10px]">TIMESTAMPED ROLES</span>
          </div>

          <div className="space-y-2.5">
            {analysis.map((item, idx) => {
              const roleInfo = ROLE_BADGE_STYLES[item.content_role] || ROLE_BADGE_STYLES.explanation;
              const itemId = item.id || `scene-${idx}`;
              const isExpanded = !!expandedReasoning[itemId];

              return (
                <div
                  key={itemId}
                  className="alco-card space-y-2 hover:border-[var(--primary)] transition-all"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {item.start.toFixed(1)}s – {item.end.toFixed(1)}s
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${roleInfo.bgClass} ${roleInfo.colorClass} ${roleInfo.borderClass}`}
                      >
                        {roleInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase">
                        Emotion: <strong className="text-[var(--fg-app)]">{item.emotion}</strong>
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase">
                        Score: <strong className="text-amber-500">{item.importance}/10</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-[var(--fg-app)] font-medium leading-relaxed bg-[var(--secondary)] p-2.5 rounded-lg border border-[var(--border)]">
                    <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase block mb-0.5">Key Phrase:</span>
                    <span className="text-blue-500 font-semibold">"{item.key_phrase}"</span>
                  </div>

                  {/* Expand / Collapse AI Reasoning */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleReasoning(itemId)}
                      className="text-[11px] font-medium text-[var(--muted-foreground)] hover:text-[var(--fg-app)] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>{isExpanded ? 'Hide AI Reasoning' : 'View AI Scene Reasoning'}</span>
                    </button>

                    {isExpanded && (
                      <p className="mt-2 text-xs text-[var(--muted-foreground)] italic bg-[var(--card)] p-2.5 rounded-lg border border-[var(--border)] leading-relaxed">
                        {item.reasoning}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Verbatim Segmented Transcript (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-app)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span>Verbatim Audio Transcript</span>
            </h3>
            <span className="alco-section-label text-[10px]">{transcript.length} Segments</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 alco-scrollbar">
            {transcript.map((seg, idx) => (
              <div
                key={seg.id || idx}
                className="alco-panel space-y-1 hover:border-[var(--muted-foreground)] transition-colors"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted-foreground)]">
                  <span className="font-bold text-amber-500">
                    {seg.start.toFixed(1)}s – {seg.end.toFixed(1)}s
                  </span>
                  <span>{(seg.end - seg.start).toFixed(1)}s</span>
                </div>
                <p className="text-xs text-[var(--fg-app)] leading-relaxed">"{seg.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Creative Audit Recommendations (Collapsible Section) */}
      {creative_audit && (
        <section className="alco-card space-y-3">
          <button
            type="button"
            onClick={() => setShowAuditDetails(!showAuditDetails)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-app)]">
                Creative Validation Audit & Recommendations
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="alco-status-success text-[10px]">
                Grade {creative_audit.grade} ({creative_audit.overallScore}/100)
              </span>
              {showAuditDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showAuditDetails && (
            <div className="space-y-4 pt-3 border-t border-[var(--border)]">
              {/* Category Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { label: 'Hook Retention', score: creative_audit.categoryScores.hookStrength },
                  { label: 'Readability', score: creative_audit.categoryScores.captionReadability },
                  { label: 'Proof Presence', score: creative_audit.categoryScores.proofPresence },
                  { label: 'CTA Clarity', score: creative_audit.categoryScores.ctaClarity },
                  { label: 'Fatigue Control', score: creative_audit.categoryScores.fatigueRiskControl },
                  { label: '9:16 Safe Zone', score: creative_audit.categoryScores.safeZoneCompliance },
                ].map((item) => (
                  <div key={item.label} className="alco-panel text-center py-2">
                    <span className="alco-section-label text-[9px] block">{item.label}</span>
                    <span className="font-bold text-xs text-[var(--fg-app)]">{item.score}%</span>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <span className="alco-section-label block">ACTIONABLE FIXES</span>
                {creative_audit.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-xs space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--fg-app)]">{rec.title}</span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[var(--card)] border border-[var(--border)] text-amber-500">
                        {rec.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--muted-foreground)]">{rec.description}</p>
                    <p className="text-[11px] font-semibold text-blue-500">👉 Fix: {rec.actionableFix}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="alco-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--card)]">
        <div>
          <h4 className="text-xs font-bold text-[var(--fg-app)]">AI Analysis Complete</h4>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Proceed to the timeline editor to review dynamic zooms, captions, and B-roll overlays.
          </p>
        </div>

        <button
          onClick={onProceedToPreview}
          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <span>Continue to Edit & Preview</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};


