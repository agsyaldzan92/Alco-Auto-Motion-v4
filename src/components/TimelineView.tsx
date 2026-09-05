import React, { useRef } from 'react';
import { SceneEditPlan, ContentRole } from '../types';
import { FileEdit, Sparkles, Video, Type, Volume2, Film } from 'lucide-react';

interface TimelineViewProps {
  scenes: SceneEditPlan[];
  currentTime: number;
  duration: number;
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onSeek: (time: number) => void;
}

const PUBLIC_ROLE_LABELS: Record<
  ContentRole,
  { label: string; colorClass: string; bgClass: string; borderClass: string }
> = {
  hook: { label: 'Hook', colorClass: 'text-rose-500', bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/30' },
  problem: { label: 'Problem', colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/30' },
  curiosity: { label: 'Curiosity', colorClass: 'text-purple-500', bgClass: 'bg-purple-500/10', borderClass: 'border-purple-500/30' },
  solution: { label: 'Solution', colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/30' },
  proof: { label: 'Proof', colorClass: 'text-cyan-500', bgClass: 'bg-cyan-500/10', borderClass: 'border-cyan-500/30' },
  cta: { label: 'CTA', colorClass: 'text-indigo-500', bgClass: 'bg-indigo-500/10', borderClass: 'border-indigo-500/30' },
  explanation: { label: 'Explanation', colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/30' },
  continuation: { label: 'A-Roll', colorClass: 'text-[var(--muted-foreground)]', bgClass: 'bg-[var(--secondary)]', borderClass: 'border-[var(--border)]' },
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  scenes,
  currentTime,
  duration,
  activeSceneIndex,
  onSelectScene,
  onSeek,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  const totalDur = Math.max(1, duration);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = fraction * totalDur;
    onSeek(targetTime);
  };

  const playheadPercent = Math.min(100, Math.max(0, (currentTime / totalDur) * 100));

  return (
    <div className="alco-card space-y-3">
      {/* Header with track overview legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="alco-section-label text-xs">
            TIMELINE TRACK ({scenes.length} SCENES)
          </h3>
        </div>

        {/* Visual Track Legend Badges */}
        <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-medium text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1 bg-[var(--secondary)] px-2 py-0.5 rounded border border-[var(--border)]">
            <Video className="w-3 h-3 text-blue-500" /> A-Roll
          </span>
          <span className="flex items-center gap-1 bg-[var(--secondary)] px-2 py-0.5 rounded border border-[var(--border)]">
            <Type className="w-3 h-3 text-emerald-500" /> Caption
          </span>
          <span className="flex items-center gap-1 bg-[var(--secondary)] px-2 py-0.5 rounded border border-[var(--border)]">
            <Sparkles className="w-3 h-3 text-rose-500" /> Hook Text
          </span>
          <span className="flex items-center gap-1 bg-[var(--secondary)] px-2 py-0.5 rounded border border-[var(--border)]">
            <Film className="w-3 h-3 text-purple-500" /> B-Roll
          </span>
          <span className="flex items-center gap-1 bg-[var(--secondary)] px-2 py-0.5 rounded border border-[var(--border)]">
            <Volume2 className="w-3 h-3 text-amber-500" /> SFX
          </span>
        </div>
      </div>

      {/* Time Markers */}
      <div className="flex justify-between text-[10px] font-mono text-[var(--muted-foreground)] px-1">
        <span>0.0s</span>
        <span>{(totalDur * 0.25).toFixed(1)}s</span>
        <span>{(totalDur * 0.5).toFixed(1)}s</span>
        <span>{(totalDur * 0.75).toFixed(1)}s</span>
        <span>{totalDur.toFixed(1)}s</span>
      </div>

      {/* Interactive Timeline Bar with Multi-Track Elements */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative min-h-[135px] bg-[var(--secondary)] rounded-xl border border-[var(--border)] p-1.5 flex gap-1.5 cursor-pointer select-none overflow-x-auto alco-scrollbar"
      >
        {/* Playhead Vertical Line */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none transition-all duration-75"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-0.5 h-full bg-blue-500 shadow-sm" />
          <div className="w-3 h-3 -ml-[5px] -mt-0.5 bg-blue-500 rounded-full border-2 border-white shadow-xs" />
        </div>

        {/* Scene Blocks */}
        {scenes.map((scene, idx) => {
          const sceneDur = Math.max(0.1, scene.end - scene.start);
          const widthPercent = (sceneDur / totalDur) * 100;
          const roleConfig = PUBLIC_ROLE_LABELS[scene.role] || PUBLIC_ROLE_LABELS.explanation;
          const isSelected = activeSceneIndex === idx;

          const hasSfx = (scene.sfxName || scene.sound_effect) && (scene.sfxName || scene.sound_effect) !== 'none';
          const hasBroll = Boolean(scene.broll || (scene.brollFormat && scene.brollFormat !== 'none'));
          const hasHookText = scene.role === 'hook' || idx === 0;

          return (
            <div
              key={scene.id || idx}
              onClick={(e) => {
                e.stopPropagation();
                onSelectScene(idx);
                onSeek(scene.start);
              }}
              style={{ width: `${Math.max(12, widthPercent)}%` }}
              className={`h-full min-w-[105px] sm:min-w-[120px] rounded-lg p-2 flex flex-col justify-between border transition-all relative overflow-hidden group cursor-pointer ${
                isSelected
                  ? `bg-[var(--card)] border-blue-500 ring-1 ring-blue-500 shadow-sm`
                  : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--muted-foreground)] opacity-85 hover:opacity-100'
              }`}
            >
              {/* Top Tag: Public Human Label & Duration */}
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${roleConfig.bgClass} ${roleConfig.colorClass} ${roleConfig.borderClass}`}
                >
                  {roleConfig.label}
                </span>

                {scene.is_manually_edited ? (
                  <span title="Diedit manual" className="text-amber-500 bg-amber-500/10 p-0.5 rounded">
                    <FileEdit className="w-2.5 h-2.5" />
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-[var(--muted-foreground)] font-semibold">{sceneDur.toFixed(1)}s</span>
                )}
              </div>

              {/* Caption text */}
              <div className="my-auto py-0.5">
                <p className="text-[11px] font-bold text-[var(--fg-app)] truncate group-hover:text-blue-500 transition-colors">
                  {scene.caption || 'Subtitle teks'}
                </p>
              </div>

              {/* Simplified Visual Track Layer Indicators */}
              <div className="space-y-1 pt-1 border-t border-[var(--border)]">
                <div className="grid grid-cols-4 gap-0.5">
                  {/* Track 1: Caption */}
                  <div
                    className={`h-1 rounded-full ${
                      scene.caption ? 'bg-emerald-500' : 'bg-[var(--border)]'
                    }`}
                    title={scene.caption ? 'Subtitle active' : 'No subtitle'}
                  />
                  {/* Track 2: Hook Text */}
                  <div
                    className={`h-1 rounded-full ${
                      hasHookText ? 'bg-rose-500' : 'bg-[var(--border)]'
                    }`}
                    title={hasHookText ? 'Hook text active' : 'No hook text'}
                  />
                  {/* Track 3: B-Roll */}
                  <div
                    className={`h-1 rounded-full ${
                      hasBroll ? 'bg-purple-500' : 'bg-[var(--border)]'
                    }`}
                    title={hasBroll ? 'B-Roll layer active' : 'A-Roll raw'}
                  />
                  {/* Track 4: SFX */}
                  <div
                    className={`h-1 rounded-full ${
                      hasSfx ? 'bg-amber-500' : 'bg-[var(--border)]'
                    }`}
                    title={hasSfx ? `SFX active (${scene.sfxName || scene.sound_effect})` : 'No SFX'}
                  />
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-[var(--muted-foreground)]">
                  <span>#{idx + 1}</span>
                  <span>{scene.start.toFixed(1)}s–{scene.end.toFixed(1)}s</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


