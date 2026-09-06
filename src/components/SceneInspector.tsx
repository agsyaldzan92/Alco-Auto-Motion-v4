import React, { useState } from 'react';
import {
  SceneEditPlan,
  MotionPreset,
  CaptionPreset,
  CaptionMode,
  ContentRole,
  SoundEffectType,
  BrollType,
  BrollFormat,
} from '../types';
import { SFX_TO_PURPOSE_FALLBACK } from '../engine/decisionEngine';
import { playSoundEffect } from '../utils/audioEffects';
import { generateWordTimings, formatCaptionByMode } from '../engine/captionEngine';
import {
  Sparkles,
  RefreshCw,
  Video,
  Volume2,
  Type,
  Move,
  Trash2,
  Play,
  UserCheck,
  ShieldCheck,
  Sun,
  Layout,
  FileEdit,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SceneInspectorProps {
  scene: SceneEditPlan | null;
  sceneIndex: number;
  onUpdateScene: (updated: SceneEditPlan) => void;
  onRegenerateScene: (sceneIndex: number, customInstruction: string) => Promise<void>;
  isRegenerating: boolean;
}

const MOTION_OPTIONS: { id: MotionPreset; label: string; desc: string }[] = [
  { id: 'normal', label: 'Steady Camera', desc: '1.0x baseline camera stabil' },
  { id: 'slow_zoom_in', label: 'Slow Zoom In', desc: 'Push-in halus (1.0x → 1.12x)' },
  { id: 'slow_zoom_out', label: 'Slow Zoom Out', desc: 'Pull-out halus (1.12x → 1.0x)' },
  { id: 'punch_zoom', label: 'Punch Zoom Slam', desc: 'Zoom sentak cepat (1.18x – 1.25x)' },
  { id: 'pan_left', label: 'Cinematic Pan Left', desc: 'Gerakan kamera geser ke kiri' },
  { id: 'pan_right', label: 'Cinematic Pan Right', desc: 'Gerakan kamera geser ke kanan' },
];

const CAPTION_OPTIONS: { id: CaptionPreset; label: string; desc: string }[] = [
  { id: 'hook', label: 'Hook Badge', desc: 'Kotak kontras tinggi ukuran besar' },
  { id: 'highlight', label: 'Word Highlight', desc: 'Warna kuning/sian dinamis per kata' },
  { id: 'normal', label: 'Pill Standar', desc: 'Kotak subtitle bersih & elegan' },
];

const ROLE_OPTIONS: { id: ContentRole; label: string; color: string }[] = [
  { id: 'hook', label: 'Hook (0-3s)', color: 'bg-rose-500/10 text-rose-500 border-rose-500/30' },
  { id: 'problem', label: 'Problem', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  { id: 'curiosity', label: 'Curiosity', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  { id: 'solution', label: 'Solution', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  { id: 'proof', label: 'Proof / Data', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' },
  { id: 'cta', label: 'CTA / Penutup', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' },
];

const BROLL_TYPES: { id: BrollType; label: string; desc: string }[] = [
  { id: 'literal', label: 'Literal Object', desc: 'Visual objek langsung sesuai narasi teks' },
  { id: 'problem', label: 'Problem Visual', desc: 'Visualisasi pain-point / masalah audiens' },
  { id: 'product', label: 'Product Showcase', desc: 'Tampilan fisik atau fitur produk' },
  { id: 'demo', label: 'Demo / Simulasi', desc: 'Alur cara kerja & langkah penggunaan' },
  { id: 'proof', label: 'Proof / Testimoni', desc: 'Bukti hasil, ulasan, atau testimonial' },
  { id: 'data', label: 'Data & Metrik', desc: 'Grafik metrik atau angka kuantitatif' },
  { id: 'comparison', label: 'Before vs After', desc: 'Perbandingan sebelum dan sesudah' },
  { id: 'outcome', label: 'Outcome Transformasi', desc: 'Hasil akhir / keberhasilan' },
  { id: 'ui', label: 'Tampilan Layar / UI', desc: 'Tampilan aplikasi atau dashboard' },
  { id: 'reaction', label: 'Reaksi Emosional', desc: 'Ekspresi / respon emosional' },
  { id: 'pattern_interrupt', label: 'Pattern Interrupt', desc: 'Kejutan visual pencegah scroll' },
];

const BROLL_FORMATS: { id: BrollFormat; label: string; desc: string; isInternal?: boolean }[] = [
  { id: 'none', label: 'Tanpa B-Roll (Fokus Wajah)', desc: 'Kamera utama pembicara tanpa overlay' },
  { id: 'typography', label: 'Teks Tipografi Kinetik', desc: 'Headline teks tebal animasi otomatis (Grafis Bawaan)', isInternal: true },
  { id: 'motion_graphic', label: 'Grafis & Vektor Animasi', desc: 'Aksen garis/badge grafis otomatis (Grafis Bawaan)', isInternal: true },
  { id: 'data_card', label: 'Kartu Data / Metrik', desc: 'Kartu metrik analytics / perbandingan (Grafis Bawaan)', isInternal: true },
  { id: 'image', label: 'Foto / Gambar', desc: 'Aset foto dari koleksi atau upload pengguna' },
  { id: 'footage', label: 'Video Footage', desc: 'Klip rekaman video b-roll pengguna' },
  { id: 'screen_recording', label: 'Rekaman Layar (Screencast)', desc: 'Rekaman layar software atau web pengguna' },
  { id: 'ui_overlay', label: 'Overlay Logo & Badge', desc: 'Logo, rating, atau badge kustom pengguna' },
];

// Categorized SFX Options
const SFX_CATEGORIES = [
  {
    name: 'Transisi & Gerakan',
    items: [
      { id: 'whoosh', label: 'Whoosh Cepat', desc: 'Transisi geser / zoom' },
      { id: 'fast_whoosh', label: 'Fast Whoosh', desc: 'Transisi cepat punch' },
      { id: 'swipe', label: 'Swipe Lembut', desc: 'Perpindahan halus' },
    ],
  },
  {
    name: 'Impact & Penegasan',
    items: [
      { id: 'impact', label: 'Impact Berat', desc: 'Hook 0-3s / Poin penting' },
      { id: 'short_impact', label: 'Short Impact', desc: 'Penegasan kata kunci' },
      { id: 'low_hit', label: 'Low Hit', desc: 'Ketukan bass berat' },
    ],
  },
  {
    name: 'Perhatian & Muncul Visual',
    items: [
      { id: 'pop', label: 'Pop Ceria', desc: 'Elemen grafis / badge muncul' },
      { id: 'soft_pop', label: 'Soft Pop', desc: 'Muncul teks halus' },
      { id: 'bubble', label: 'Bubble', desc: 'Gelembung animasi' },
      { id: 'glitch', label: 'Glitch Error', desc: 'Masalah / peringatan' },
    ],
  },
  {
    name: 'Interaksi & UI',
    items: [
      { id: 'click', label: 'Mouse Click', desc: 'Klik tombol / aksi' },
      { id: 'button_click', label: 'Button Click', desc: 'Interaksi aplikasi' },
      { id: 'camera_shutter', label: 'Camera Shutter', desc: 'Tangkapan bukti foto' },
      { id: 'data_blip', label: 'Data Blip', desc: 'Poin data / statistik' },
    ],
  },
  {
    name: 'Tensi & Riser',
    items: [
      { id: 'riser', label: 'Riser Standar', desc: 'Membangun rasa penasaran' },
      { id: 'soft_riser', label: 'Soft Riser', desc: 'Penasaran halus' },
      { id: 'dark_riser', label: 'Dark Riser', desc: 'Membangun tensi masalah' },
      { id: 'tension_pulse', label: 'Tension Pulse', desc: 'Denyut urgensi' },
    ],
  },
  {
    name: 'Sukses, Bukti & CTA',
    items: [
      { id: 'ding', label: 'Ding Cerah', desc: 'Solusi / jawaban benar' },
      { id: 'success_chime', label: 'Success Chime', desc: 'Pencapaian hasil / bukti' },
      { id: 'cash_register', label: 'Cash Register (Kaching)', desc: 'Penjualan / profit' },
      { id: 'notification', label: 'Notification Ping', desc: 'Pesan / pengingat CTA' },
      { id: 'downlifter', label: 'Downlifter', desc: 'Penutup kalimat santai' },
    ],
  },
];

export const SceneInspector: React.FC<SceneInspectorProps> = ({
  scene,
  sceneIndex,
  onUpdateScene,
  onRegenerateScene,
  isRegenerating,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'text' | 'visual' | 'audio'>('text');
  const [customAiPrompt, setCustomAiPrompt] = useState<string>('');
  const [showAdvancedDetails, setShowAdvancedDetails] = useState<boolean>(false);

  if (!scene) {
    return (
      <div className="alco-card p-8 text-center text-[var(--muted-foreground)]">
        <Sparkles className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-pulse" />
        <p className="text-sm font-semibold text-[var(--fg-app)]">Pilih salah satu scene di timeline</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">Anda dapat menyetel teks subtitle, efek visual, dan sound effect per-scene.</p>
      </div>
    );
  }

  // Update scene helper that also marks scene as manually edited
  const updateSceneWithEditFlag = (patch: Partial<SceneEditPlan>) => {
    onUpdateScene({
      ...scene,
      ...patch,
      is_manually_edited: true,
    });
  };

  const handleRoleChange = (role: ContentRole) => {
    updateSceneWithEditFlag({ role });
  };

  const handleMotionChange = (motion: MotionPreset) => {
    let scale = scene.motion_scale;
    if (motion === 'punch_zoom') scale = 1.2;
    else if (motion === 'slow_zoom_in' || motion === 'slow_zoom_out') scale = 1.12;
    else if (motion === 'normal') scale = 1.0;
    updateSceneWithEditFlag({ motion, motion_scale: scale });
  };

  const handleCaptionTextChange = (caption: string) => {
    const segDur = Math.max(0.5, scene.end - scene.start);
    const timings = generateWordTimings(caption, segDur, scene.highlight_words || []);
    updateSceneWithEditFlag({ caption, word_timings: timings });
  };

  const handleCaptionStyleChange = (caption_style: CaptionPreset) => {
    updateSceneWithEditFlag({ caption_style });
  };

  const handleCaptionModeChange = (mode: CaptionMode) => {
    const baseText = scene.caption;
    const formatted = formatCaptionByMode(baseText, mode, scene.role);
    const segDur = Math.max(0.5, scene.end - scene.start);
    const timings = generateWordTimings(formatted, segDur, scene.highlight_words || []);
    updateSceneWithEditFlag({ caption: formatted, caption_mode: mode, word_timings: timings });
  };

  const handleHighlightWordsChange = (wordsStr: string) => {
    const words = wordsStr
      .split(',')
      .map((w) => w.trim().toUpperCase())
      .filter(Boolean);
    const segDur = Math.max(0.5, scene.end - scene.start);
    const timings = generateWordTimings(scene.caption, segDur, words);
    updateSceneWithEditFlag({ highlight_words: words, word_timings: timings });
  };

  const handleSoundEffectChange = (sound_effect: SoundEffectType) => {
    if (sound_effect === 'none') {
      updateSceneWithEditFlag({
        sound_effect: 'none',
        sfxName: 'none',
        selectedSfxName: 'none',
        selectedSfxIntent: 'none',
        sfxPurpose: 'none',
        sfxIntensity: 0,
        sfxLayered: false,
        sfxLayers: [],
        sfxReason: 'User disabled SFX for this scene',
        sfxLayerSkipReason: 'User disabled SFX for this scene',
        sfxIntent: 'none:none',
      });
      return;
    }

    const sfxPurpose = SFX_TO_PURPOSE_FALLBACK[sound_effect] || 'emphasis';
    const sfxReason = `User selected SFX: ${sound_effect} (${sfxPurpose})`;
    const sfxIntensity = scene.sfxIntensity || 0.75;

    updateSceneWithEditFlag({
      sound_effect,
      sfxName: sound_effect,
      selectedSfxName: sound_effect,
      sfxPurpose,
      sfxIntensity,
      sfxReason,
      sfxIntent: `${sfxPurpose}:${sound_effect}`,
      sfxLayered: true,
      sfxLayers: [{ purpose: sfxPurpose as any, name: sound_effect, offsetMs: 0, intensity: sfxIntensity }],
    });
  };

  const handleDisableSfx = () => {
    handleSoundEffectChange('none');
  };

  const handleKeepSfx = () => {
    const sfxToKeep = (scene.sfxName && scene.sfxName !== 'none') ? scene.sfxName : (scene.selectedSfxName && scene.selectedSfxName !== 'none') ? scene.selectedSfxName : 'short_impact';
    handleSoundEffectChange(sfxToKeep as SoundEffectType);
  };

  const handlePlayPreview = () => {
    const intensity = scene.sfxIntensity ?? 0.75;
    if (scene.sfxLayers && scene.sfxLayers.length > 0) {
      scene.sfxLayers.forEach((layer) => {
        const vol = (layer.intensity ?? 1.0) * intensity;
        const offsetMs = layer.offsetMs || 0;
        setTimeout(() => {
          playSoundEffect(layer.name, vol);
        }, Math.max(0, offsetMs + 200));
      });
    } else {
      const sfxName = (scene.sfxName && scene.sfxName !== 'none') ? scene.sfxName : scene.sound_effect;
      if (sfxName && sfxName !== 'none') {
        playSoundEffect(sfxName as SoundEffectType, intensity);
      }
    }
  };

  const handleResetToAiDefaults = () => {
    onUpdateScene({
      ...scene,
      is_manually_edited: false,
    });
  };

  const handleRegenClick = async () => {
    await onRegenerateScene(sceneIndex, customAiPrompt);
  };

  const activeRoleObj = ROLE_OPTIONS.find((r) => r.id === scene.role) || ROLE_OPTIONS[0];

  // Real-time Scene Design & Safe Zone Audit calculations
  const isHookScene = sceneIndex === 0 || scene.role === 'hook' || scene.adRole === 'hook';
  const assPt = (scene as any).hook_font_pt !== undefined ? (scene as any).hook_font_pt : 68;
  const framing = scene.talking_head_framing as any;
  const isFaceOverlap = framing?.is_talking_head && (scene.hook_layout === 'center_top_impact' || !scene.hook_layout) && (framing?.head_y_start ?? framing?.eyeline_y_percent ?? 20) < 25;

  let hookStatusText = 'visible';
  if (isHookScene) {
    if (assPt < 50) hookStatusText = 'too small';
    else if (isFaceOverlap) hookStatusText = 'too close to face';
    else hookStatusText = 'visible';
  } else {
    hookStatusText = 'N/A';
  }

  const captionStyleStr = String(scene.caption_style || '');
  const captionTextClean = (scene.caption || '').trim();
  const wordsCount = captionTextClean.split(/\s+/).filter(Boolean).length;
  let captionStatusText = 'clean floating';
  if (captionStyleStr === 'solid_box' || captionStyleStr === 'heavy_box' || (scene as any).caption_mode === 'solid_box') {
    captionStatusText = 'heavy box';
  } else if (wordsCount > 7 && (!scene.word_timings || scene.word_timings.length === 0)) {
    captionStatusText = 'too long';
  } else {
    captionStatusText = 'clean floating';
  }

  const faceSafeText = (isFaceOverlap || (framing?.is_talking_head && captionStatusText === 'heavy box')) ? 'risk' : 'safe';

  return (
    <div className="alco-card p-0 overflow-hidden flex flex-col transition-all">
      {/* Top Header with Scene Title, Timing & Manual Edit Badge */}
      <div className="p-3.5 sm:p-4 bg-[var(--secondary)] border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              #{sceneIndex + 1}
            </span>
            <h3 className="text-sm font-bold text-[var(--fg-app)] tracking-tight">
              Scene {sceneIndex + 1} Inspector
            </h3>

            {/* Manual Edit Indicator */}
            {scene.is_manually_edited ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                <FileEdit className="w-3 h-3" /> Diedit Manual
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Optimized
              </span>
            )}
          </div>

          <p className="text-[11px] font-mono text-[var(--muted-foreground)] mt-1">
            Timecode: {scene.start.toFixed(1)}s – {scene.end.toFixed(1)}s ({(scene.end - scene.start).toFixed(1)}s)
          </p>
        </div>

        {/* Reset to AI Button if manually edited */}
        {scene.is_manually_edited && (
          <button
            type="button"
            onClick={handleResetToAiDefaults}
            className="alco-btn alco-btn-secondary text-xs h-8 px-2.5 py-1"
            title="Kembalikan semua pengaturan scene ini ke keputusan awal AI"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
            <span>Reset AI</span>
          </button>
        )}
      </div>

      {/* AI Decision Explanation Box (Why AI made this edit) */}
      <div className="bg-[var(--secondary)]/40 border-b border-[var(--border)] p-3 sm:p-3.5 flex items-start gap-2.5 text-xs">
        <div className="w-6 h-6 rounded bg-blue-600/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-bold text-[var(--fg-app)]">AI Director Reasoning:</span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${activeRoleObj.color}`}>
              {activeRoleObj.label}
            </span>
            {scene.editing_intensity && (
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                scene.editing_intensity === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                scene.editing_intensity === 'LOW' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                'bg-blue-500/10 text-blue-400 border-blue-500/30'
              }`}>
                {scene.editing_intensity} Intensity
              </span>
            )}
            {scene.motion_cooldown_applied && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Pacing Cooldown
              </span>
            )}
          </div>
          <p className="text-[var(--muted-foreground)] leading-relaxed text-[11px]">
            {scene.director_note ||
              (scene.role === 'hook'
                ? 'Bagian hook 0–3 detik dirancang dengan zoom tegas & teks tebal untuk mencegah penonton men-scroll.'
                : 'Pacing dan visual disesuaikan agar penonton terus terfokus pada pesan utama narasi.')}
          </p>
        </div>
      </div>

      {/* Real-time Scene Design & Safe Zone Audit Bar */}
      <div className="p-2.5 px-3.5 bg-[var(--secondary)]/60 border-b border-[var(--border)] flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            Audit Visual Scene:
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Hook Status */}
          <div className="flex items-center gap-1 bg-[var(--card)] px-2 py-0.5 rounded border border-[var(--border)] text-[10px]">
            <span className="text-[var(--muted-foreground)]">Hook:</span>
            <span className={`font-bold ${
              hookStatusText === 'visible' ? 'text-emerald-500' :
              hookStatusText === 'too small' ? 'text-amber-500' :
              hookStatusText === 'too close to face' ? 'text-rose-500' : 'text-[var(--muted-foreground)]'
            }`}>
              {hookStatusText === 'N/A' ? 'Standard' : hookStatusText}
            </span>
          </div>

          {/* Caption Status */}
          <div className="flex items-center gap-1 bg-[var(--card)] px-2 py-0.5 rounded border border-[var(--border)] text-[10px]">
            <span className="text-[var(--muted-foreground)]">Caption:</span>
            <span className={`font-bold ${
              captionStatusText === 'clean floating' ? 'text-emerald-500' :
              captionStatusText === 'too long' ? 'text-amber-500' : 'text-rose-500'
            }`}>
              {captionStatusText}
            </span>
          </div>

          {/* Face Safe Status */}
          <div className="flex items-center gap-1 bg-[var(--card)] px-2 py-0.5 rounded border border-[var(--border)] text-[10px]">
            <span className="text-[var(--muted-foreground)]">Face Safe:</span>
            <span className={`font-bold ${
              faceSafeText === 'safe' ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {faceSafeText === 'safe' ? 'Safe' : 'Risk'}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Tab Navigation: [Teks] [Visual] [Audio] */}
      <div className="flex items-center border-b border-[var(--border)] bg-[var(--secondary)]/30 px-3 pt-2 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveSubTab('text')}
          className={`flex-1 min-h-[38px] py-2 px-2.5 font-bold text-xs rounded-t-lg border-t border-x transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'text'
              ? 'bg-[var(--card)] border-[var(--border)] text-blue-500 font-bold -mb-px'
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--fg-app)]'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Caption</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('visual')}
          className={`flex-1 min-h-[38px] py-2 px-2.5 font-bold text-xs rounded-t-lg border-t border-x transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'visual'
              ? 'bg-[var(--card)] border-[var(--border)] text-blue-500 font-bold -mb-px'
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--fg-app)]'
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          <span>Visual & Motion</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('audio')}
          className={`flex-1 min-h-[38px] py-2 px-2.5 font-bold text-xs rounded-t-lg border-t border-x transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'audio'
              ? 'bg-[var(--card)] border-[var(--border)] text-blue-500 font-bold -mb-px'
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--fg-app)]'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Audio & SFX</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-3.5 sm:p-4 space-y-4 flex-1">
        {/* ============================================================ */}
        {/* TAB 1: TEKS & SUBTITLE */}
        {/* ============================================================ */}
        {activeSubTab === 'text' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Role Narasi */}
            <div className="space-y-1.5">
              <label className="alco-section-label">
                Scene Narrative Role:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleChange(role.id)}
                    className={`min-h-[36px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      scene.role === role.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-[var(--secondary)] border border-[var(--border)] text-[var(--fg-app)] hover:border-[var(--muted-foreground)]'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle Text Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="alco-section-label flex items-center gap-1">
                  <Type className="w-3 h-3 text-blue-500" /> Caption Subtitle:
                </label>
                {/* Caption Modes (Verbatim / Punchy / Summary) */}
                <div className="flex items-center gap-1 bg-[var(--secondary)] p-0.5 rounded-lg text-[11px]">
                  {(['verbatim', 'punchy', 'summary'] as CaptionMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleCaptionModeChange(mode)}
                      className={`min-h-[28px] px-2 py-0.5 rounded font-bold capitalize cursor-pointer transition-colors ${
                        scene.caption_mode === mode
                          ? 'bg-[var(--card)] text-blue-500 shadow-2xs font-bold'
                          : 'text-[var(--muted-foreground)] hover:text-[var(--fg-app)]'
                      }`}
                    >
                      {mode === 'verbatim' ? 'Full' : mode === 'punchy' ? 'Punchy' : 'Summary'}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={2}
                value={scene.caption}
                onChange={(e) => handleCaptionTextChange(e.target.value)}
                placeholder="Teks subtitle yang muncul di video..."
                className="alco-input w-full p-2.5 text-xs font-bold uppercase leading-relaxed resize-none"
              />
            </div>

            {/* Subtitle Preset Styles */}
            <div className="space-y-1.5">
              <label className="alco-section-label">
                Caption Preset Style:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {CAPTION_OPTIONS.map((cOpt) => (
                  <button
                    key={cOpt.id}
                    type="button"
                    onClick={() => handleCaptionStyleChange(cOpt.id)}
                    className={`min-h-[40px] p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      scene.caption_style === cOpt.id
                        ? 'bg-amber-500/10 text-[var(--fg-app)] border-amber-500/40 ring-1 ring-amber-500/30'
                        : 'bg-[var(--secondary)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[var(--fg-app)]">{cOpt.label}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{cOpt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Highlighted Words input */}
            <div className="space-y-1.5">
              <label className="alco-section-label flex items-center justify-between">
                <span>Keyword Highlight Words:</span>
                <span className="text-[10px] font-normal text-[var(--muted-foreground)] lowercase font-sans">pisahkan dengan koma</span>
              </label>
              <input
                type="text"
                value={(scene.highlight_words || []).join(', ')}
                onChange={(e) => handleHighlightWordsChange(e.target.value)}
                placeholder="CONTOH: PENTING, OMSET, CEPAT"
                className="alco-input w-full px-3 py-2 text-xs font-bold uppercase"
              />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: VISUAL & MOTION */}
        {/* ============================================================ */}
        {activeSubTab === 'visual' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* 6 Motion Presets Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="alco-section-label flex items-center gap-1">
                  <Move className="w-3 h-3 text-blue-500" /> Camera Motion:
                </label>
                <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.2 rounded">
                  Scale: {scene.motion_scale?.toFixed(2) || '1.15'}x
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {MOTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleMotionChange(opt.id)}
                    className={`min-h-[40px] p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      scene.motion === opt.id
                        ? 'border-blue-500 bg-blue-500/10 text-[var(--fg-app)] ring-1 ring-blue-500'
                        : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[var(--fg-app)]">{opt.label}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* B-Roll Format & Type */}
            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <label className="alco-section-label flex items-center gap-1">
                  <Layout className="w-3 h-3 text-blue-500" /> B-Roll Visual Format:
                </label>
                {scene.brollFormat && scene.brollFormat !== 'none' && (
                  <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/30">
                    Aktif
                  </span>
                )}
              </div>

              {/* brollFormat */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">Format Tampilan Visual:</span>
                <select
                  value={scene.brollFormat || 'none'}
                  onChange={(e) => updateSceneWithEditFlag({ brollFormat: e.target.value as BrollFormat })}
                  className="alco-input w-full text-xs font-semibold"
                >
                  {BROLL_FORMATS.map((bf) => (
                    <option key={bf.id} value={bf.id} className="bg-[var(--card)] text-[var(--fg-app)]">
                      {bf.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* brollType (Tujuan Narasi) */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">Tujuan Visual Narasi:</span>
                <select
                  value={scene.brollType || 'literal'}
                  onChange={(e) => updateSceneWithEditFlag({ brollType: e.target.value as BrollType })}
                  className="alco-input w-full text-xs font-semibold"
                >
                  {BROLL_TYPES.map((bt) => (
                    <option key={bt.id} value={bt.id} className="bg-[var(--card)] text-[var(--fg-app)]">
                      {bt.label}
                    </option>
                  ))}
                </select>
              </div>

              {scene.broll && (
                <div className="bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-purple-500 font-semibold truncate">
                    <Video className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{scene.broll.title || scene.broll.query}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSceneWithEditFlag({ broll: null, visual_intent: 'none', brollFormat: 'none' })}
                    className="alco-btn alco-btn-secondary text-xs h-7 px-2 text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus
                  </button>
                </div>
              )}
            </div>

            {/* Transition Selection */}
            <div className="space-y-1 pt-2 border-t border-[var(--border)]">
              <label className="alco-section-label">
                Scene Transition:
              </label>
              <select
                value={scene.transition}
                onChange={(e) => updateSceneWithEditFlag({ transition: e.target.value as any })}
                className="alco-input w-full text-xs font-semibold"
              >
                <option value="cut" className="bg-[var(--card)] text-[var(--fg-app)]">Hard Cut (Standard)</option>
                <option value="flash" className="bg-[var(--card)] text-[var(--fg-app)]">Impact White Flash</option>
                <option value="whip_pan" className="bg-[var(--card)] text-[var(--fg-app)]">Whip Pan</option>
                <option value="zoom_cut" className="bg-[var(--card)] text-[var(--fg-app)]">Zoom In Cut</option>
              </select>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: AUDIO & SFX */}
        {/* ============================================================ */}
        {activeSubTab === 'audio' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Active SFX Status & Control Panel */}
            <div className="bg-[var(--secondary)] rounded-xl border border-[var(--border)] p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-bold text-[var(--fg-app)] uppercase tracking-wider">
                    Sound Effect:
                  </span>
                </div>

                {(scene.sfxName || scene.sound_effect) && (scene.sfxName || scene.sound_effect) !== 'none' ? (
                  <button
                    type="button"
                    onClick={handlePlayPreview}
                    className="alco-btn alco-btn-primary text-xs h-8 px-2.5 py-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Dengar Suara</span>
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]">
                    Clean Voice (No SFX)
                  </span>
                )}
              </div>

              {/* Selection Reason Display */}
              <div className="bg-[var(--card)] p-2.5 rounded-lg border border-[var(--border)] text-xs">
                <span className="font-bold text-[var(--fg-app)] block mb-0.5 text-[11px]">SFX Logic Reason:</span>
                <p className="text-[var(--muted-foreground)] text-[11px] leading-relaxed">
                  {scene.sfxReason || scene.sfxLayerSkipReason || 'Pilihan otomatis AI editor untuk kejelasan vokal.'}
                </p>
              </div>

              {/* 3 Explicit SFX Control Buttons: Keep SFX | Disable SFX | Change SFX */}
              <div className="pt-2 border-t border-[var(--border)] flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleKeepSfx}
                  className={`flex-1 min-h-[34px] px-2 py-1 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    (scene.sfxName || scene.sound_effect || 'none') !== 'none'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-[var(--card)] text-[var(--fg-app)] border-[var(--border)] hover:border-[var(--muted-foreground)]'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>Keep</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisableSfx}
                  className={`flex-1 min-h-[34px] px-2 py-1 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    (scene.sfxName || scene.sound_effect || 'none') === 'none'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-[var(--card)] text-rose-500 border-[var(--border)] hover:bg-rose-500/10'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Disable</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('sfx-selector-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex-1 min-h-[34px] px-2 py-1 rounded-lg text-xs font-bold border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Catalog</span>
                </button>
              </div>

              {/* SFX Intensity Slider */}
              {(scene.sfxName || scene.sound_effect) && (scene.sfxName || scene.sound_effect) !== 'none' && (
                <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--muted-foreground)] text-[11px]">SFX Volume:</span>
                    <span className="font-mono font-bold text-blue-500 text-[11px]">
                      {Math.round((scene.sfxIntensity || 0.75) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={scene.sfxIntensity || 0.75}
                    onChange={(e) => updateSceneWithEditFlag({ sfxIntensity: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Categorized SFX Selector with Individual Preview Buttons */}
            <div id="sfx-selector-section" className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="alco-section-label">
                  SFX Library Catalog:
                </label>
                <button
                  type="button"
                  onClick={() => handleSoundEffectChange('none')}
                  className={`min-h-[28px] px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                    (scene.sfxName || scene.sound_effect || 'none') === 'none'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--muted-foreground)]'
                  }`}
                >
                  No SFX
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 alco-scrollbar">
                {SFX_CATEGORIES.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <h5 className="text-[10px] font-extrabold text-[var(--muted-foreground)] uppercase tracking-wider">
                      {cat.name}
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {cat.items.map((item) => {
                        const isSelected = (scene.sfxName || scene.sound_effect) === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`min-h-[38px] p-2 rounded-lg border flex items-center justify-between gap-1.5 transition-all cursor-pointer select-none ${
                              isSelected
                                ? 'bg-blue-500/10 border-blue-500 ring-1 ring-blue-500'
                                : 'bg-[var(--secondary)] border-[var(--border)] hover:border-[var(--muted-foreground)]'
                            }`}
                            onClick={() => handleSoundEffectChange(item.id as SoundEffectType)}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                {isSelected && <Check className="w-3 h-3 text-blue-500 stroke-[3]" />}
                                <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-blue-500' : 'text-[var(--fg-app)]'}`}>
                                  {item.label}
                                </span>
                              </div>
                              <p className="text-[9px] text-[var(--muted-foreground)] line-clamp-1">{item.desc}</p>
                            </div>

                            {/* Single SFX Preview Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playSoundEffect(item.id as SoundEffectType, 0.5);
                              }}
                              className="w-7 h-7 rounded bg-[var(--card)] hover:bg-blue-600 text-[var(--muted-foreground)] hover:text-white border border-[var(--border)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              title={`Dengar contoh suara ${item.label}`}
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Advanced Technical Details (Progressive Disclosure) */}
        <div className="pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => setShowAdvancedDetails((prev) => !prev)}
            className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--fg-app)] transition-colors cursor-pointer"
          >
            <span>Diagnostic & AI Camera Safeguard (Advanced)</span>
            {showAdvancedDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvancedDetails && (
            <div className="mt-2.5 space-y-2.5 p-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)] text-xs animate-fade-in">
              {scene.talking_head_framing && (
                <div className="space-y-1">
                  <div className="font-bold text-[var(--fg-app)] flex items-center gap-1.5 text-[11px]">
                    <UserCheck className="w-3 h-3 text-emerald-500" />
                    <span>Framing Wajah: {scene.talking_head_framing.protection_status}</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{scene.talking_head_framing.note}</p>
                </div>
              )}

              {scene.visual_correction && (
                <div className="space-y-1 pt-1.5 border-t border-[var(--border)]">
                  <div className="font-bold text-[var(--fg-app)] flex items-center gap-1.5 text-[11px]">
                    <Sun className="w-3 h-3 text-cyan-500" />
                    <span>Koreksi Pencahayaan: {scene.visual_correction.status}</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Kecerahan: {scene.visual_correction.brightness}% • Kontras: {scene.visual_correction.contrast}%
                  </p>
                </div>
              )}

              <div className="pt-1.5 border-t border-[var(--border)] flex justify-between text-[10px] text-[var(--muted-foreground)] font-mono">
                <span>Scene ID: {scene.id}</span>
                <span>Role: {scene.role}</span>
                <span>SFX: {scene.sfxIntent || 'none'}</span>
              </div>
            </div>
          )}
        </div>

        {/* AI Scene Regenerator Prompt */}
        <div className="pt-2.5 border-t border-[var(--border)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={customAiPrompt}
            onChange={(e) => setCustomAiPrompt(e.target.value)}
            placeholder="Instruksi AI khusus: Buat zoom lebih cepat / subtitle punchy..."
            className="alco-input flex-1 min-h-[38px] text-xs"
          />

          <button
            type="button"
            disabled={isRegenerating}
            onClick={handleRegenClick}
            className="alco-btn alco-btn-primary min-h-[38px] px-3 text-xs shrink-0"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Update AI Scene</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
