import React, { useRef } from 'react';
import { SceneEditPlan, ContentRole } from '../types';
import { Flame, ShieldAlert, Zap, FileEdit, Sparkles, Video, Type, Volume2, Film, Layers } from 'lucide-react';

interface TimelineViewProps {
  scenes: SceneEditPlan[];
  currentTime: number;
  duration: number;
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onSeek: (time: number) => void;
}

const PUBLIC_ROLE_LABELS: Record<ContentRole, { label: string; bg: string; border: string; text: string }> = {
  hook: { label: 'Pembuka', bg: 'bg-rose-50 text-rose-700', border: 'border-rose-300', text: 'text-rose-700' },
  problem: { label: 'Masalah', bg: 'bg-amber-50 text-amber-700', border: 'border-amber-300', text: 'text-amber-700' },
  curiosity: { label: 'Masalah', bg: 'bg-purple-50 text-purple-700', border: 'border-purple-300', text: 'text-purple-700' },
  solution: { label: 'Solusi', bg: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-300', text: 'text-emerald-700' },
  proof: { label: 'Bukti', bg: 'bg-blue-50 text-blue-700', border: 'border-blue-300', text: 'text-blue-700' },
  cta: { label: 'CTA', bg: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-300', text: 'text-indigo-700' },
  explanation: { label: 'Solusi', bg: 'bg-slate-50 text-slate-700', border: 'border-slate-300', text: 'text-slate-700' },
  continuation: { label: 'A-Roll Lanjutan', bg: 'bg-slate-100 text-slate-600', border: 'border-slate-300', text: 'text-slate-600' },
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
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-4">
      {/* Header with track overview legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Timeline Editor ({scenes.length} Scene)
          </h3>
        </div>

        {/* Visual Track Legend Badges */}
        <div className="flex items-center gap-2 flex-wrap text-[10px] font-medium text-slate-600">
          <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
            <Video className="w-3 h-3" /> Video Utama
          </span>
          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
            <Type className="w-3 h-3" /> Subtitle Caption
          </span>
          <span className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 font-semibold">
            <Sparkles className="w-3 h-3" /> Hook Text
          </span>
          <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-semibold">
            <Film className="w-3 h-3" /> B-Roll Visual
          </span>
          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-semibold">
            <Volume2 className="w-3 h-3" /> Sound Effect
          </span>
        </div>
      </div>

      {/* Time Markers */}
      <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
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
        className="relative min-h-[140px] sm:min-h-[150px] bg-slate-50 rounded-2xl border border-slate-200 p-2 flex gap-2 cursor-pointer select-none overflow-x-auto"
      >
        {/* Playhead Vertical Line */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none transition-all duration-75"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-0.5 h-full bg-indigo-600 shadow-md" />
          <div className="w-3.5 h-3.5 -ml-[6px] -mt-1 bg-indigo-600 rounded-full border-2 border-white shadow" />
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
              style={{ width: `${Math.max(14, widthPercent)}%` }}
              className={`h-full min-w-[110px] sm:min-w-[130px] rounded-xl p-2.5 flex flex-col justify-between border transition-all relative overflow-hidden group cursor-pointer ${
                isSelected
                  ? `bg-white ${roleConfig.border} border-2 shadow-md ring-2 ring-indigo-500 scale-[1.01]`
                  : 'bg-white/90 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              {/* Top Tag: Public Human Label & Duration */}
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-current/20 ${roleConfig.bg}`}
                >
                  {roleConfig.label}
                </span>

                {scene.is_manually_edited ? (
                  <span title="Diedit manual" className="text-amber-500 bg-amber-50 p-0.5 rounded">
                    <FileEdit className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">{sceneDur.toFixed(1)}s</span>
                )}
              </div>

              {/* Caption text */}
              <div className="my-auto py-1">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                  {scene.caption || 'Subtitle teks'}
                </p>
              </div>

              {/* Simplified Visual Track Layer Indicators */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <div className="grid grid-cols-4 gap-1">
                  {/* Track 1: Caption */}
                  <div
                    className={`h-1.5 rounded-full ${
                      scene.caption ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                    title={scene.caption ? 'Subtitle aktif' : 'Tanpa subtitle'}
                  />
                  {/* Track 2: Hook Text */}
                  <div
                    className={`h-1.5 rounded-full ${
                      hasHookText ? 'bg-rose-500' : 'bg-slate-200'
                    }`}
                    title={hasHookText ? 'Hook Text aktif' : 'Tanpa Hook Text'}
                  />
                  {/* Track 3: B-Roll */}
                  <div
                    className={`h-1.5 rounded-full ${
                      hasBroll ? 'bg-purple-500' : 'bg-slate-200'
                    }`}
                    title={hasBroll ? 'B-Roll visual aktif' : 'A-Roll mentah'}
                  />
                  {/* Track 4: SFX */}
                  <div
                    className={`h-1.5 rounded-full ${
                      hasSfx ? 'bg-amber-500' : 'bg-slate-200'
                    }`}
                    title={hasSfx ? `SFX aktif (${scene.sfxName || scene.sound_effect})` : 'Tanpa SFX'}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
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

