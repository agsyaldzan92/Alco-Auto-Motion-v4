import React, { useState } from 'react';
import {
  SceneEditPlan,
  MotionPreset,
  CaptionPreset,
  CaptionDisplayMode,
  CaptionMode,
  ContentRole,
  SoundEffectType,
  SFXPurpose,
  VisualIntent,
  BrollType,
  BrollFormat,
} from '../types';
import { EXTENDED_STOCK_CATALOG } from '../engine/stockCatalog';
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
  Flame,
  ShieldAlert,
  Sliders,
  Play,
  Layers,
  Zap,
  UserCheck,
  Eye,
  ShieldCheck,
  Sun,
  Layout,
  FileEdit,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  VolumeX,
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
  { id: 'hook', label: 'Hook (0-3s)', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'problem', label: 'Problem', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'curiosity', label: 'Curiosity', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'solution', label: 'Solution', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'proof', label: 'Proof / Data', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'cta', label: 'CTA / Penutup', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
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
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-xs">
        <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
        <p className="text-sm font-semibold text-slate-700">Pilih salah satu scene di timeline</p>
        <p className="text-xs text-slate-400 mt-1">Anda dapat menyetel teks subtitle, efek visual, dan sound effect per-scene.</p>
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
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col transition-all">
      {/* Top Header with Scene Title, Timing & Manual Edit Badge */}
      <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              #{sceneIndex + 1}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Scene {sceneIndex + 1} Editor
            </h3>

            {/* Manual Edit Indicator */}
            {scene.is_manually_edited ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                <FileEdit className="w-3 h-3 text-amber-400" /> Diedit Manual
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Rekomendasi AI Aktif
              </span>
            )}
          </div>

          <p className="text-xs font-mono text-indigo-300 mt-1">
            Waktu: {scene.start.toFixed(1)}s – {scene.end.toFixed(1)}s (Durasi: {(scene.end - scene.start).toFixed(1)}s)
          </p>
        </div>

        {/* Reset to AI Button if manually edited */}
        {scene.is_manually_edited && (
          <button
            type="button"
            onClick={handleResetToAiDefaults}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="Kembalikan semua pengaturan scene ini ke keputusan awal AI"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset ke AI</span>
          </button>
        )}
      </div>

      {/* AI Decision Explanation Box (Why AI made this edit) */}
      <div className="bg-indigo-50/70 border-b border-indigo-100 p-4 sm:p-5 flex items-start gap-3 text-xs">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-slate-900">Mengapa AI memilih edit ini?</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${activeRoleObj.color}`}>
              {activeRoleObj.label}
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            {scene.director_note ||
              (scene.role === 'hook'
                ? 'Bagian hook 0–3 detik dirancang dengan zoom tegas & teks tebal untuk mencegah penonton men-scroll.'
                : 'Pacing dan visual disesuaikan agar penonton terus terfokus pada pesan utama narasi.')}
          </p>
        </div>
      </div>

      {/* Real-time Scene Design & Safe Zone Audit Bar */}
      <div className="bg-slate-900 text-white p-3 sm:p-3.5 px-4 sm:px-5 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-extrabold tracking-wide uppercase text-slate-200">
            Audit Visual Scene #{sceneIndex + 1}:
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Hook Status */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 font-semibold">Hook:</span>
            <span className={`font-bold ${
              hookStatusText === 'visible' ? 'text-emerald-400' :
              hookStatusText === 'too small' ? 'text-amber-400' :
              hookStatusText === 'too close to face' ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {hookStatusText === 'N/A' ? 'Standard' : hookStatusText}
            </span>
          </div>

          {/* Caption Status */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 font-semibold">Caption:</span>
            <span className={`font-bold ${
              captionStatusText === 'clean floating' ? 'text-emerald-400' :
              captionStatusText === 'too long' ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {captionStatusText}
            </span>
          </div>

          {/* Face Safe Status */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 font-semibold">Wajah:</span>
            <span className={`font-bold ${
              faceSafeText === 'safe' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {faceSafeText === 'safe' ? 'Safe Zone' : 'Risk Collision'}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Tab Navigation: [Teks] [Visual] [Audio] */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 pt-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('text')}
          className={`flex-1 min-h-[44px] py-2.5 px-3 font-bold text-xs sm:text-sm rounded-t-xl border-t border-x transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'text'
              ? 'bg-white border-slate-200 text-indigo-700 shadow-2xs font-extrabold border-b-2 border-b-white'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Teks & Subtitle</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('visual')}
          className={`flex-1 min-h-[44px] py-2.5 px-3 font-bold text-xs sm:text-sm rounded-t-xl border-t border-x transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'visual'
              ? 'bg-white border-slate-200 text-indigo-700 shadow-2xs font-extrabold border-b-2 border-b-white'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Visual & B-Roll</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('audio')}
          className={`flex-1 min-h-[44px] py-2.5 px-3 font-bold text-xs sm:text-sm rounded-t-xl border-t border-x transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'audio'
              ? 'bg-white border-slate-200 text-indigo-700 shadow-2xs font-extrabold border-b-2 border-b-white'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>Audio & SFX</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5 sm:p-6 space-y-6 flex-1">
        {/* ============================================================ */}
        {/* TAB 1: TEKS & SUBTITLE */}
        {/* ============================================================ */}
        {activeSubTab === 'text' && (
          <div className="space-y-5 animate-fade-in">
            {/* Role Narasi */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Peran Narasi Scene:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleChange(role.id)}
                    className={`min-h-[40px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      scene.role === role.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle Text Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-indigo-600" /> Teks Subtitle di Layar:
                </label>
                {/* Caption Modes (Verbatim / Punchy / Summary) */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                  {(['verbatim', 'punchy', 'summary'] as CaptionMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleCaptionModeChange(mode)}
                      className={`min-h-[32px] px-2.5 py-1 rounded-lg font-bold capitalize cursor-pointer transition-colors ${
                        scene.caption_mode === mode
                          ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode === 'verbatim' ? 'Lengkap' : mode === 'punchy' ? 'Ringkas' : 'Rangkuman'}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={2}
                value={scene.caption}
                onChange={(e) => handleCaptionTextChange(e.target.value)}
                placeholder="Teks subtitle yang muncul di video..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase leading-relaxed"
              />
            </div>

            {/* Subtitle Preset Styles */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Gaya Tampilan Subtitle:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {CAPTION_OPTIONS.map((cOpt) => (
                  <button
                    key={cOpt.id}
                    type="button"
                    onClick={() => handleCaptionStyleChange(cOpt.id)}
                    className={`min-h-[44px] p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      scene.caption_style === cOpt.id
                        ? 'bg-amber-50 text-amber-900 border-amber-400 shadow-xs ring-1 ring-amber-400/40'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{cOpt.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{cOpt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Highlighted Words input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Kata Kunci Penekanan (Warna Kontras):</span>
                <span className="text-[11px] font-normal text-slate-500 font-sans">Pisahkan dengan koma</span>
              </label>
              <input
                type="text"
                value={(scene.highlight_words || []).join(', ')}
                onChange={(e) => handleHighlightWordsChange(e.target.value)}
                placeholder="CONTOH: PENTING, OMZET, CEPAT"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-amber-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
              />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: VISUAL & B-ROLL */}
        {/* ============================================================ */}
        {activeSubTab === 'visual' && (
          <div className="space-y-5 animate-fade-in">
            {/* 6 Motion Presets Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-indigo-600" />
                  Gerakan Kamera Dinamis (Camera Motion):
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Skala: {scene.motion_scale?.toFixed(2) || '1.15'}x
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MOTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleMotionChange(opt.id)}
                    className={`min-h-[44px] p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      scene.motion === opt.id
                        ? 'border-indigo-500 bg-indigo-50/70 text-slate-900 shadow-xs ring-2 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* B-Roll Format & Type */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-indigo-600" /> Format & Lapisan Visual B-Roll:
                </label>
                {scene.brollFormat && scene.brollFormat !== 'none' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    Aktif
                  </span>
                )}
              </div>

              {/* brollFormat */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Format Tampilan Visual:</span>
                <select
                  value={scene.brollFormat || 'none'}
                  onChange={(e) => updateSceneWithEditFlag({ brollFormat: e.target.value as BrollFormat })}
                  className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {BROLL_FORMATS.map((bf) => (
                    <option key={bf.id} value={bf.id}>
                      {bf.label} — {bf.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* brollType (Tujuan Narasi) */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Tujuan Visual Narasi (Tipe B-Roll):</span>
                <select
                  value={scene.brollType || 'literal'}
                  onChange={(e) => updateSceneWithEditFlag({ brollType: e.target.value as BrollType })}
                  className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {BROLL_TYPES.map((bt) => (
                    <option key={bt.id} value={bt.id}>
                      {bt.label} — {bt.desc}
                    </option>
                  ))}
                </select>
              </div>

              {scene.broll && (
                <div className="bg-purple-50/80 border border-purple-200 p-3 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-purple-900 font-semibold truncate">
                    <Video className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate">{scene.broll.title || scene.broll.query}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSceneWithEditFlag({ broll: null, visual_intent: 'none', brollFormat: 'none' })}
                    className="min-h-[36px] px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus B-Roll
                  </button>
                </div>
              )}
            </div>

            {/* Transition Selection */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Transisi ke Scene Berikutnya:
              </label>
              <select
                value={scene.transition}
                onChange={(e) => updateSceneWithEditFlag({ transition: e.target.value as any })}
                className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="cut">Hard Cut (Paling Rapi & Standar)</option>
                <option value="flash">Impact White Flash</option>
                <option value="whip_pan">Whip Pan (Geser Cepat)</option>
                <option value="zoom_cut">Zoom In Cut</option>
              </select>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: AUDIO & SFX */}
        {/* ============================================================ */}
        {activeSubTab === 'audio' && (
          <div className="space-y-5 animate-fade-in">
            {/* Active SFX Status & Control Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Sound Effect Scene Ini:
                  </span>
                </div>

                {(scene.sfxName || scene.sound_effect) && (scene.sfxName || scene.sound_effect) !== 'none' ? (
                  <button
                    type="button"
                    onClick={handlePlayPreview}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Dengar Suara Ini</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300">
                    Suara bersih dipilih agar voice tetap jelas
                  </span>
                )}
              </div>

              {/* Selection Reason Display */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">Alasan Pemilihan SFX:</span>
                <p className="text-slate-600 font-medium leading-relaxed">
                  {scene.sfxReason || scene.sfxLayerSkipReason || 'Pilihan otomatis AI editor untuk kejelasan vokal.'}
                </p>
              </div>

              {/* 3 Explicit SFX Control Buttons: Keep SFX | Disable SFX | Change SFX */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleKeepSfx}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    (scene.sfxName || scene.sound_effect || 'none') !== 'none'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Keep SFX</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisableSfx}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    (scene.sfxName || scene.sound_effect || 'none') === 'none'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disable SFX</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('sfx-selector-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Change SFX</span>
                </button>
              </div>

              {/* SFX Intensity Slider */}
              {(scene.sfxName || scene.sound_effect) && (scene.sfxName || scene.sound_effect) !== 'none' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Volume Efek Suara:</span>
                    <span className="font-mono font-bold text-indigo-600">
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
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Categorized SFX Selector with Individual Preview Buttons */}
            <div id="sfx-selector-section" className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pilih Efek Suara (Klik ▶ untuk mendengarkan contoh):
                </label>
                <button
                  type="button"
                  onClick={() => handleSoundEffectChange('none')}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    (scene.sfxName || scene.sound_effect || 'none') === 'none'
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Tanpa SFX (Clean Voice)
                </button>
              </div>

              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {SFX_CATEGORIES.map((cat) => (
                  <div key={cat.name} className="space-y-1.5">
                    <h5 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      {cat.name}
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cat.items.map((item) => {
                        const isSelected = (scene.sfxName || scene.sound_effect) === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`min-h-[44px] p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 shadow-xs ring-2 ring-indigo-500'
                                : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                            }`}
                            onClick={() => handleSoundEffectChange(item.id as SoundEffectType)}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />}
                                <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                                  {item.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-1">{item.desc}</p>
                            </div>

                            {/* Single SFX Preview Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playSoundEffect(item.id as SoundEffectType, 0.5);
                              }}
                              className="min-h-[36px] min-w-[36px] p-2 rounded-xl bg-white hover:bg-indigo-600 text-slate-700 hover:text-white border border-slate-200 hover:border-indigo-600 shadow-2xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              title={`Dengar contoh suara ${item.label}`}
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
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
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvancedDetails((prev) => !prev)}
            className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <span>Detail Diagnostik & Analisis Kamera (Advanced)</span>
            {showAdvancedDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvancedDetails && (
            <div className="mt-3 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs animate-fade-in">
              {scene.talking_head_framing && (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Framing Wajah: {scene.talking_head_framing.protection_status}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{scene.talking_head_framing.note}</p>
                </div>
              )}

              {scene.visual_correction && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Koreksi Pencahayaan: {scene.visual_correction.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Kecerahan: {scene.visual_correction.brightness}% • Kontras: {scene.visual_correction.contrast}%
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Scene ID: {scene.id}</span>
                <span>Role: {scene.role}</span>
                <span>SFX Intent: {scene.sfxIntent || 'none'}</span>
              </div>
            </div>
          )}
        </div>

        {/* AI Scene Regenerator Prompt */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            value={customAiPrompt}
            onChange={(e) => setCustomAiPrompt(e.target.value)}
            placeholder="Instruksi AI khusus: Buat zoom lebih cepat / ganti subtitle lebih punchy..."
            className="flex-1 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />

          <button
            type="button"
            disabled={isRegenerating}
            onClick={handleRegenClick}
            className="min-h-[44px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Memperbarui...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Perbarui Scene dengan AI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
