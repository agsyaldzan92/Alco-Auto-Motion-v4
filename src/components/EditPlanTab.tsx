import React, { useState, useEffect, useCallback } from 'react';
import { AlcoEditingProject, SceneEditPlan, CaptionPreset } from '../types';
import { PreviewPlayer } from './PreviewPlayer';
import { TimelineView } from './TimelineView';
import { SceneInspector } from './SceneInspector';
import {
  Download,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Layers,
  Zap,
  Type,
  Move,
  Film,
  ShieldCheck,
  Target,
  UserCheck,
  Sun,
  AlertTriangle,
  Undo2,
  Redo2,
  VolumeX,
  Volume2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  X,
  ChevronUp,
} from 'lucide-react';
import { getApiHeaders } from '../services/apiKeyService';
import { getStyleProfile } from '../engine/styleProfiles';
import { validateCreativePerformance } from '../engine/creativeValidator';

interface EditPlanTabProps {
  project: AlcoEditingProject;
  videoUrl: string;
  onUpdateProject: (updated: AlcoEditingProject) => void;
  onOpenExportModal: () => void;
  onRegenerateAll: () => Promise<void>;
  onOpenProposalModal?: () => void;
  isProcessing: boolean;
}

export const EditPlanTab: React.FC<EditPlanTabProps> = ({
  project,
  videoUrl,
  onUpdateProject,
  onOpenExportModal,
  onRegenerateAll,
  onOpenProposalModal,
  isProcessing,
}) => {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [enableSfx, setEnableSfx] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'edited' | 'raw' | 'split'>('edited');
  const [isRegeneratingScene, setIsRegeneratingScene] = useState<boolean>(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<AlcoEditingProject[]>([project]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const activeStyleProfile = getStyleProfile(project.video_type);

  // Push state to history stack
  const updateProjectWithHistory = useCallback((newProject: AlcoEditingProject) => {
    setHistory((prev) => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      nextHistory.push(newProject);
      return nextHistory;
    });
    setHistoryIndex((prev) => prev + 1);
    onUpdateProject(newProject);
  }, [historyIndex, onUpdateProject]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateProject(targetState);
    }
  }, [history, historyIndex, onUpdateProject]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateProject(targetState);
    }
  }, [history, historyIndex, onUpdateProject]);

  // Keyboard shortcut listener for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Compute active scene from current time
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    const sceneIdx = project.scenes.findIndex((s) => time >= s.start && time < s.end);
    if (sceneIdx !== -1 && sceneIdx !== activeSceneIndex) {
      setActiveSceneIndex(sceneIdx);
    }
  };

  const handleUpdateScene = (updatedScene: SceneEditPlan) => {
    const newScenes = [...project.scenes];
    newScenes[activeSceneIndex] = updatedScene;
    updateProjectWithHistory({
      ...project,
      scenes: newScenes,
    });
  };

  // Batch Actions
  const handleBatchMuteSfx = () => {
    const newScenes = project.scenes.map((s) => ({
      ...s,
      sound_effect: 'none' as const,
      sfxName: 'none' as const,
      sfxIntensity: 0,
      is_manually_edited: true,
    }));
    updateProjectWithHistory({ ...project, scenes: newScenes });
  };

  const handleBatchRemoveBroll = () => {
    const newScenes = project.scenes.map((s) => ({
      ...s,
      broll: null,
      brollFormat: 'none' as const,
      visual_intent: 'none' as const,
      is_manually_edited: true,
    }));
    updateProjectWithHistory({ ...project, scenes: newScenes });
  };

  const handleBatchApplyCaptionStyle = (style: CaptionPreset) => {
    const newScenes = project.scenes.map((s) => ({
      ...s,
      caption_style: style,
      is_manually_edited: true,
    }));
    updateProjectWithHistory({ ...project, scenes: newScenes });
  };

  const handleBatchResetAllToAi = () => {
    const newScenes = project.scenes.map((s) => ({
      ...s,
      is_manually_edited: false,
    }));
    updateProjectWithHistory({ ...project, scenes: newScenes });
  };

  const handleRegenerateScene = async (sceneIdx: number, customInstruction: string) => {
    setIsRegeneratingScene(true);
    try {
      const sceneToRegen = project.scenes[sceneIdx];
      const res = await fetch('/api/regenerate-scene', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          scene: sceneToRegen,
          instruction: customInstruction,
          contentType: project.video_type,
        }),
      });

      if (!res.ok) {
        let text = '';
        try { text = await res.text(); } catch {}
        if (text && text.length < 200 && !text.includes('<!doctype') && !text.includes('<html')) {
          throw new Error(text);
        }
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }
      const updatedScene: SceneEditPlan = await res.json().catch(() => {
        throw new Error('Gagal membaca response JSON yang valid dari server');
      });

      const newScenes = [...project.scenes];
      newScenes[sceneIdx] = updatedScene;
      updateProjectWithHistory({
        ...project,
        scenes: newScenes,
      });
    } catch (err: any) {
      console.error('Error regenerating scene:', err);
      alert('Gagal meregenerasi scene: ' + err.message);
    } finally {
      setIsRegeneratingScene(false);
    }
  };

  const currentScene = project.scenes[activeSceneIndex] || project.scenes[0];
  const liveAudit = validateCreativePerformance(project);
  const activeAlerts = liveAudit.recommendations.filter(r => r.severity === 'high' || r.severity === 'medium');

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-3 sm:px-6 space-y-5 sm:space-y-6">
      {/* Live Retention & Marketing Quality Warning Bar */}
      {activeAlerts.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl shadow-xs flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Saran Optimasi Retensi ({activeAlerts.length})
                </h3>
                <p className="text-[11px] text-amber-800 font-medium">
                  Sistem mendeteksi saran visual agar video Anda lebih memikat di 3 detik pertama.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold bg-white text-amber-900 px-3 py-1 rounded-full border border-amber-300">
                Skor Retensi: {liveAudit.overallScore}/100 ({liveAudit.grade})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {activeAlerts.slice(0, 2).map((rec) => (
              <div key={rec.id} className="bg-white p-3 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5 bg-amber-100 text-amber-800">
                  {rec.category}
                </span>
                <div>
                  <p className="font-bold text-slate-800">{rec.title}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{rec.actionableFix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Action Bar: Project Summary, History (Undo/Redo), & CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Studio Editor
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${activeStyleProfile.badgeColor}`}>
              {activeStyleProfile.name}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {project.scenes.length} Scenes • {project.total_duration}s Durasi
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1 truncate max-w-xl">
            {project.title}
          </h2>
        </div>

        {/* Action Buttons: Undo/Redo, AI Proposal, Re-analyze, Export */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Undo / Redo Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="min-h-[36px] min-w-[36px] p-2 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="min-h-[36px] min-w-[36px] p-2 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* AI Proposal Summary Button */}
          {onOpenProposalModal && (
            <button
              type="button"
              onClick={onOpenProposalModal}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Saran AI</span>
            </button>
          )}

          <button
            type="button"
            disabled={isProcessing}
            onClick={onRegenerateAll}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Analisis Ulang</span>
          </button>

          <button
            id="btn-open-export"
            type="button"
            onClick={onOpenExportModal}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Video MP4</span>
          </button>
        </div>
      </div>

      {/* Global Batch Actions Bar (Quick Controls) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 flex-wrap text-xs">
        <span className="font-bold text-slate-700 flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
          Aksi Cepat Global:
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleBatchMuteSfx}
            className="min-h-[32px] px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition-colors cursor-pointer flex items-center gap-1"
          >
            <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            <span>Mute Semua SFX</span>
          </button>

          <button
            type="button"
            onClick={handleBatchRemoveBroll}
            className="min-h-[32px] px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition-colors cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Hapus Semua B-Roll</span>
          </button>

          <button
            type="button"
            onClick={() => handleBatchApplyCaptionStyle('hook')}
            className="min-h-[32px] px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition-colors cursor-pointer flex items-center gap-1"
          >
            <Type className="w-3.5 h-3.5 text-slate-500" />
            <span>Subtitle Hook Badge ke Semua</span>
          </button>

          <button
            type="button"
            onClick={handleBatchResetAllToAi}
            className="min-h-[32px] px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Semua ke AI</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: 9:16 Preview Player (5 Cols Desktop) */}
        <div className="lg:col-span-5 flex flex-col items-center w-full">
          <PreviewPlayer
            videoUrl={videoUrl}
            scenes={project.scenes}
            currentTime={currentTime}
            setCurrentTime={handleTimeUpdate}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            activeSceneIndex={activeSceneIndex}
            duration={project.total_duration}
            enableSfx={enableSfx}
            setEnableSfx={setEnableSfx}
            viewMode={viewMode}
            setViewMode={setViewMode}
            contentType={project.video_type}
          />
        </div>

        {/* Right Column: Timeline & Scene Inspector (7 Cols Desktop) */}
        <div className="lg:col-span-7 space-y-6 w-full">
          {/* Timeline Bar */}
          <TimelineView
            scenes={project.scenes}
            currentTime={currentTime}
            duration={project.total_duration}
            activeSceneIndex={activeSceneIndex}
            onSelectScene={(idx) => {
              setActiveSceneIndex(idx);
              const targetScene = project.scenes[idx];
              if (targetScene) {
                setCurrentTime(targetScene.start);
              }
              // On mobile, also trigger bottom sheet for editing
              if (window.innerWidth < 1024) {
                setIsMobileSheetOpen(true);
              }
            }}
            onSeek={(t) => {
              setCurrentTime(t);
              const sIdx = project.scenes.findIndex((s) => t >= s.start && t < s.end);
              if (sIdx !== -1) setActiveSceneIndex(sIdx);
            }}
          />

          {/* Desktop Scene Inspector (Hidden on mobile when using bottom sheet) */}
          <div className="hidden lg:block">
            <SceneInspector
              scene={currentScene}
              sceneIndex={activeSceneIndex}
              onUpdateScene={handleUpdateScene}
              onRegenerateScene={handleRegenerateScene}
              isRegenerating={isRegeneratingScene}
            />
          </div>

          {/* Mobile Scene Edit Button */}
          <div className="block lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileSheetOpen(true)}
              className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Edit Scene #{activeSceneIndex + 1} (Buka Inspector)</span>
              <ChevronUp className="w-4 h-4 ml-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet Modal for Scene Inspector */}
      {isMobileSheetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-fade-in">
          <div
            className="bg-white rounded-t-3xl max-h-[85vh] w-full flex flex-col shadow-2xl overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle & Close */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-2">
              <SceneInspector
                scene={currentScene}
                sceneIndex={activeSceneIndex}
                onUpdateScene={handleUpdateScene}
                onRegenerateScene={handleRegenerateScene}
                isRegenerating={isRegeneratingScene}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
