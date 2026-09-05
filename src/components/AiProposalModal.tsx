import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Film,
  Volume2,
  Zap,
  Type,
  Eye,
  Play,
  Check,
  ChevronRight,
  SlidersHorizontal,
  X,
  Layers,
} from 'lucide-react';
import { AlcoEditingProject, SceneEditPlan } from '../types';
import { playSoundEffect } from '../utils/audioEffects';

export interface ProposalItem {
  id: string;
  sceneIndex: number;
  type: 'broll' | 'sfx' | 'zoom' | 'text' | 'pattern_interrupt';
  title: string;
  badge: string;
  badgeColor: string;
  timeRange: string;
  reason: string;
  sfxName?: string;
}

interface AiProposalModalProps {
  isOpen: boolean;
  project: AlcoEditingProject | null;
  onApply?: (selectedIds: Set<string>) => void;
  onApplyDecisions?: (acceptedProject: AlcoEditingProject) => void;
  onClose: () => void;
}

export const AiProposalModal: React.FC<AiProposalModalProps> = ({
  isOpen,
  project,
  onApply,
  onApplyDecisions,
  onClose,
}) => {
  // Extract all AI edit proposals from project scenes
  const proposalItems = useMemo<ProposalItem[]>(() => {
    if (!project || !project.scenes) return [];
    const items: ProposalItem[] = [];

    project.scenes.forEach((scene, idx) => {
      const timeStr = `${formatSeconds(scene.start)} – ${formatSeconds(scene.end)}`;

      // 1. Hook / Pattern Interrupt
      if (scene.role === 'hook' || scene.editing_rhythm?.pattern_interrupt_type !== 'NONE') {
        const pattern = scene.editing_rhythm?.pattern_interrupt_type || 'PUNCH_ZOOM_SLAM';
        items.push({
          id: `hook-pattern-${idx}`,
          sceneIndex: idx,
          type: 'pattern_interrupt',
          title: `Hook & Pattern Interrupt (${scene.role.toUpperCase()})`,
          badge: 'Pattern Interrupt',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          timeRange: timeStr,
          reason: scene.director_note || `Mencegah penonton men-scroll di 3 detik pertama dengan pacing cepat dan visual punch.`,
        });
      }

      // 2. Dynamic Zoom / Camera Motion
      if (scene.motion && scene.motion !== 'normal') {
        const motionName = scene.motion.replace(/_/g, ' ').toUpperCase();
        items.push({
          id: `motion-${idx}`,
          sceneIndex: idx,
          type: 'zoom',
          title: `Dynamic Zoom: ${motionName}`,
          badge: 'Dynamic Motion',
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          timeRange: timeStr,
          reason: `Mengubah focal length kamera (${scene.motion_scale}x) agar perhatian mata penonton tetap terkunci pada poin penting.`,
        });
      }

      // 3. B-Roll / Visual Layer
      if (scene.broll || (scene.brollFormat && scene.brollFormat !== 'none')) {
        const formatTitle = scene.broll?.title || scene.brollFormat?.replace(/_/g, ' ').toUpperCase() || 'Grafis Visual';
        items.push({
          id: `broll-${idx}`,
          sceneIndex: idx,
          type: 'broll',
          title: `B-Roll & Visual: ${formatTitle}`,
          badge: scene.brollFormat ? `Format: ${scene.brollFormat}` : 'B-Roll Visual',
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
          timeRange: timeStr,
          reason: scene.brollNeedReasons?.[0] || scene.director_note || `Mengganti visual talking-head dengan grafis penjelas untuk memperjelas narasi.`,
        });
      }

      // 4. Sound Effect (SFX)
      const sfxName = scene.sfxName || scene.sound_effect;
      if (sfxName && sfxName !== 'none') {
        items.push({
          id: `sfx-${idx}`,
          sceneIndex: idx,
          type: 'sfx',
          title: `Sound Effect: ${sfxName.toUpperCase()}`,
          badge: `SFX (${scene.sfxPurpose || 'Emphasis'})`,
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          timeRange: timeStr,
          reason: scene.sfxReason || `Memberikan penegasan audio ritmis pada pergantian topik dan kata kunci.`,
          sfxName,
        });
      }

      // 5. Text Emphasis / Keyword Highlight
      if (scene.highlight_words && scene.highlight_words.length > 0) {
        items.push({
          id: `text-${idx}`,
          sceneIndex: idx,
          type: 'text',
          title: `Text Emphasis: "${scene.highlight_words.join(', ')}"`,
          badge: 'Highlight Text',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          timeRange: timeStr,
          reason: `Memberikan warna kontras tinggi pada kata kunci agar subtitle mudah dibaca sekilas.`,
        });
      }
    });

    return items;
  }, [project]);

  // Selected item IDs state (default all selected)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(proposalItems.map((item) => item.id));
  });

  // Re-sync when proposalItems change
  React.useEffect(() => {
    if (proposalItems.length > 0) {
      setSelectedIds(new Set(proposalItems.map((item) => item.id)));
    }
  }, [proposalItems]);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(proposalItems.map((item) => item.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Metric counts
  const countBroll = proposalItems.filter((i) => i.type === 'broll').length;
  const countSfx = proposalItems.filter((i) => i.type === 'sfx').length;
  const countZoom = proposalItems.filter((i) => i.type === 'zoom').length;
  const countText = proposalItems.filter((i) => i.type === 'text').length;
  const countPattern = proposalItems.filter((i) => i.type === 'pattern_interrupt').length;

  const handleApplyClick = () => {
    if (!project) {
      onClose();
      return;
    }

    // Apply selected proposals to update scenes if any were deselected
    const updatedScenes = project.scenes.map((scene, idx) => {
      const updated = { ...scene };

      // B-Roll proposal
      const brollProp = proposalItems.find((p) => p.sceneIndex === idx && p.type === 'broll');
      if (brollProp && !selectedIds.has(brollProp.id)) {
        updated.broll = null;
        updated.brollFormat = 'none';
        updated.visual_intent = 'none';
      }

      // SFX proposal
      const sfxProp = proposalItems.find((p) => p.sceneIndex === idx && p.type === 'sfx');
      if (sfxProp && !selectedIds.has(sfxProp.id)) {
        updated.sound_effect = 'none';
        updated.sfxName = 'none';
        updated.sfxIntensity = 0;
      }

      // Zoom proposal
      const zoomProp = proposalItems.find((p) => p.sceneIndex === idx && p.type === 'zoom');
      if (zoomProp && !selectedIds.has(zoomProp.id)) {
        updated.motion = 'normal';
        updated.motion_scale = 1.0;
      }

      // Text Highlight proposal
      const textProp = proposalItems.find((p) => p.sceneIndex === idx && p.type === 'text');
      if (textProp && !selectedIds.has(textProp.id)) {
        updated.highlight_words = [];
      }

      // Pattern Interrupt proposal
      const patternProp = proposalItems.find((p) => p.sceneIndex === idx && p.type === 'pattern_interrupt');
      if (patternProp && !selectedIds.has(patternProp.id) && updated.editing_rhythm) {
        updated.editing_rhythm = {
          ...updated.editing_rhythm,
          pattern_interrupt_type: 'NONE',
        };
      }

      return updated;
    });

    const acceptedProject: AlcoEditingProject = {
      ...project,
      scenes: updatedScenes,
    };

    if (typeof onApplyDecisions === 'function') {
      onApplyDecisions(acceptedProject);
    } else if (typeof onApply === 'function') {
      onApply(selectedIds);
    } else {
      onClose();
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0 mt-0.5">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  AI Menemukan {proposalItems.length} Saran Edit
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {proposalItems.length} Saran Edit
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Alco AI Director telah menganalisis ritme narasi dan menyusun saran edit otomatis. Anda dapat meninjau, mencoba preview, atau menyesuaikan saran sebelum masuk ke editor.
              </p>

            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Summary Badges */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-3.5 flex items-center gap-2 overflow-x-auto text-xs shrink-0 no-scrollbar">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-semibold text-purple-800 shrink-0 shadow-2xs">
            <Film className="w-3.5 h-3.5 text-purple-600" />
            <span>{countBroll} B-Roll & Visual</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-semibold text-amber-800 shrink-0 shadow-2xs">
            <Volume2 className="w-3.5 h-3.5 text-amber-600" />
            <span>{countSfx} Sound Effects</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-semibold text-indigo-800 shrink-0 shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>{countZoom} Dynamic Zoom</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-semibold text-emerald-800 shrink-0 shadow-2xs">
            <Type className="w-3.5 h-3.5 text-emerald-600" />
            <span>{countText} Text Emphasis</span>
          </div>
          {countPattern > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-semibold text-rose-800 shrink-0 shadow-2xs">
              <Eye className="w-3.5 h-3.5 text-rose-600" />
              <span>{countPattern} Pattern Interrupt</span>
            </div>
          )}
        </div>

        {/* Item Selection Toolbar */}
        <div className="px-5 sm:px-6 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <span className="font-semibold text-slate-700">
            Terpilih: <span className="font-bold text-indigo-600 font-mono">{selectedIds.size}</span> dari {proposalItems.length} keputusan
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-indigo-50"
            >
              Pilih Semua
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-slate-100"
            >
              Batal Pilih Semua
            </button>
          </div>
        </div>

        {/* Scrollable Proposals List */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
          {proposalItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                  isSelected
                    ? 'bg-white border-indigo-300 shadow-sm ring-1 ring-indigo-500/20'
                    : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300 opacity-75'
                }`}
              >
                {/* Custom Checkbox (Touch Target >= 44px) */}
                <div className="pt-0.5">
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 bg-white hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.timeRange}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        Scene {item.sceneIndex + 1}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>

                    {/* SFX Preview Button */}
                    {item.sfxName && item.sfxName !== 'none' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playSoundEffect(item.sfxName as any, 0.4);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Dengarkan contoh suara SFX"
                      >
                        <Play className="w-3 h-3 fill-amber-700 text-amber-700" />
                        <span>Preview Audio</span>
                      </button>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    💡 <span className="font-semibold text-slate-700">Alasan AI:</span> {item.reason}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Action Footer */}
        <div className="bg-white border-t border-slate-200 p-4 sm:p-5 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer text-center"
          >
            Edit Manual
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleApplyClick}
              disabled={selectedIds.size === 0}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {selectedIds.size === proposalItems.length
                  ? 'Apply Selected Edits (Terapkan Semua)'
                  : `Apply Selected Edits (${selectedIds.size} Terpilih)`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

function formatSeconds(sec: number): string {
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${String(mins).padStart(2, '0')}:${secs < 10 ? '0' : ''}${secs.toFixed(1)}s`;
}
