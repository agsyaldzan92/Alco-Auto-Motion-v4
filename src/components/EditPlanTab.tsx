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
  AlertTriangle,
  Undo2,
  Redo2,
  VolumeX,
  Trash2,
  RotateCcw,
  Type,
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
    <div className="w-full space-y-4 sm:space-y-5">
      {/* Live Retention & Marketing Quality Warning Bar */}
      {activeAlerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 sm:p-4 rounded-xl shadow-xs flex flex-col gap-2.5 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--fg-app)] uppercase tracking-wider">
                  Retention Optimization Feedback ({activeAlerts.length})
                </h3>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Saran visual terdeteksi agar video Anda lebih memikat di 3 detik pertama.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold bg-[var(--card)] text-amber-500 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Score: {liveAudit.overallScore}/100 ({liveAudit.grade})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {activeAlerts.slice(0, 2).map((rec) => (
              <div key={rec.id} className="bg-[var(--card)] p-2.5 rounded-lg border border-amber-500/20 flex items-start gap-2 text-xs">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5 bg-amber-500/10 text-amber-500">
                  {rec.category}
                </span>
                <div>
                  <p className="font-bold text-[var(--fg-app)] text-[11px]">{rec.title}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{rec.actionableFix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Workspace Toolbar: Project Summary, History (Undo/Redo), & CTA */}
      <div className="alco-toolbar flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Studio Editor
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${activeStyleProfile.badgeColor}`}>
              {activeStyleProfile.name}
            </span>
            <span className="text-xs text-[var(--muted-foreground)] font-mono">
              {project.scenes.length} Scenes • {project.total_duration}s Durasi
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-[var(--fg-app)] tracking-tight mt-1 truncate max-w-xl">
            {project.title}
          </h2>
        </div>

        {/* Action Buttons: Undo/Redo, AI Proposal, Re-analyze, Export */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
          {/* Undo / Redo Buttons */}
          <div className="flex items-center bg-[var(--secondary)] p-0.5 rounded-lg border border-[var(--border)]">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="w-8 h-8 rounded text-[var(--muted-foreground)] hover:text-blue-500 hover:bg-[var(--card)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--muted-foreground)] transition-colors flex items-center justify-center cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="w-8 h-8 rounded text-[var(--muted-foreground)] hover:text-blue-500 hover:bg-[var(--card)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--muted-foreground)] transition-colors flex items-center justify-center cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI Proposal Summary Button */}
          {onOpenProposalModal && (
            <button
              type="button"
              onClick={onOpenProposalModal}
              className="alco-btn alco-btn-secondary text-xs h-9 px-3 text-purple-500 border-purple-500/30 hover:bg-purple-500/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Saran AI</span>
            </button>
          )}

          <button
            type="button"
            disabled={isProcessing}
            onClick={onRegenerateAll}
            className="alco-btn alco-btn-secondary text-xs h-9 px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Analisis Ulang</span>
          </button>

          <button
            id="btn-open-export"
            type="button"
            onClick={onOpenExportModal}
            className="alco-btn alco-btn-primary text-xs h-9 px-4 font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Video</span>
          </button>
        </div>
      </div>

      {/* Global Batch Actions Bar (Quick Controls) */}
      <div className="bg-[var(--secondary)]/50 border border-[var(--border)] rounded-xl p-2.5 px-3 flex items-center justify-between gap-2 flex-wrap text-xs">
        <span className="text-[11px] font-bold text-[var(--fg-app)] flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
          Aksi Cepat Global:
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleBatchMuteSfx}
            className="alco-btn alco-btn-secondary text-xs h-7 px-2"
          >
            <VolumeX className="w-3 h-3 text-[var(--muted-foreground)]" />
            <span>Mute Semua SFX</span>
          </button>

          <button
            type="button"
            onClick={handleBatchRemoveBroll}
            className="alco-btn alco-btn-secondary text-xs h-7 px-2"
          >
            <Trash2 className="w-3 h-3 text-[var(--muted-foreground)]" />
            <span>Hapus Semua B-Roll</span>
          </button>

          <button
            type="button"
            onClick={() => handleBatchApplyCaptionStyle('hook')}
            className="alco-btn alco-btn-secondary text-xs h-7 px-2"
          >
            <Type className="w-3 h-3 text-[var(--muted-foreground)]" />
            <span>Hook Subtitle ke Semua</span>
          </button>

          <button
            type="button"
            onClick={handleBatchResetAllToAi}
            className="alco-btn alco-btn-secondary text-xs h-7 px-2"
          >
            <RotateCcw className="w-3 h-3 text-[var(--muted-foreground)]" />
            <span>Reset Semua ke AI</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout (Desktop: Preview + Timeline on Left, Inspector on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column: Video Preview Player & Timeline Track beneath it (~62% width) */}
        <div className="lg:col-span-7 flex flex-col space-y-4 w-full">
          {/* Video Preview Player */}
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

          {/* Timeline Bar (Directly beneath preview) */}
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
              // On mobile, trigger bottom sheet for editing
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
        </div>

        {/* Right Column: Scene Inspector Panel (~38% width) */}
        <div className="lg:col-span-5 space-y-4 w-full">
          {/* Desktop Scene Inspector */}
          <div className="hidden lg:block sticky top-4">
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
              className="alco-btn alco-btn-primary w-full min-h-[44px] py-2.5 px-4 font-bold text-xs flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-fade-in">
          <div
            className="bg-[var(--card)] rounded-t-2xl max-h-[85vh] w-full flex flex-col shadow-2xl border-t border-[var(--border)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle & Close */}
            <div className="p-3 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--secondary)]">
              <div className="w-10 h-1 bg-[var(--muted-foreground)]/40 rounded-full mx-auto" />
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="p-1 rounded-lg hover:bg-[var(--secondary)] text-[var(--muted-foreground)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-3 alco-scrollbar">
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
