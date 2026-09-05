import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Film,
  FileText,
  Target,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Video,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Image as ImageIcon,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
  Key,
} from 'lucide-react';
import { ContentType, SampleVideoOption, ProcessingState, UserProofAsset } from '../types';
import { SAMPLE_VIDEOS } from '../data/sampleVideos';
import { ApiKeyOnboardingCard } from './ApiKeyOnboardingCard';
import { hasCustomApiKey, subscribeApiKeyChanges } from '../services/apiKeyService';

interface InputTabProps {
  contentType: ContentType;
  setContentType: (type: ContentType) => void;
  rawScript: string;
  setRawScript: (script: string) => void;
  videoGoal: string;
  setVideoGoal: (goal: string) => void;
  ctaText: string;
  setCtaText: (cta: string) => void;
  videoUrl: string;
  videoFile: File | null;
  uploadedFile: File | null;
  uploadedUrl: string | null;
  selectedSampleId: string;
  onSelectSample: (sample: SampleVideoOption) => void;
  onUploadCustomFile: (file: File) => void;
  onRestoreUploadedFile: () => void;
  videoDuration: number;
  setVideoDuration: (dur: number) => void;
  videoMeta: { width: number; height: number; aspect: string } | null;
  setVideoMeta: (meta: { width: number; height: number; aspect: string } | null) => void;
  userAssets?: UserProofAsset[];
  onAddUserAsset?: (asset: Omit<UserProofAsset, 'id'>) => void;
  onRemoveUserAsset?: (id: string) => void;
  onStartAnalysis: (sampleOverride?: SampleVideoOption) => void;
  processingState: ProcessingState;
  onOpenApiKeyModal: () => void;
}

export const InputTab: React.FC<InputTabProps> = ({
  contentType,
  setContentType,
  rawScript,
  setRawScript,
  videoGoal,
  setVideoGoal,
  ctaText,
  setCtaText,
  videoUrl,
  videoFile,
  uploadedFile,
  uploadedUrl,
  selectedSampleId,
  onSelectSample,
  onUploadCustomFile,
  onRestoreUploadedFile,
  videoDuration,
  setVideoDuration,
  videoMeta,
  setVideoMeta,
  userAssets = [],
  onAddUserAsset,
  onRemoveUserAsset,
  onStartAnalysis,
  processingState,
  onOpenApiKeyModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [activeTestingPhase, setActiveTestingPhase] = useState<number>(4);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [hasKey, setHasKey] = useState<boolean>(() => hasCustomApiKey());

  useEffect(() => {
    const checkKey = () => setHasKey(hasCustomApiKey());
    checkKey();
    return subscribeApiKeyChanges(checkKey);
  }, []);

  // State for new user supporting asset input
  const [newAssetTitle, setNewAssetTitle] = useState<string>('');
  const [newAssetType, setNewAssetType] = useState<UserProofAsset['type']>('screenshot');
  const [newAssetUrl, setNewAssetUrl] = useState<string>('');
  const [newAssetFile, setNewAssetFile] = useState<File | null>(null);
  const [newAssetFileName, setNewAssetFileName] = useState<string>('');

  const isProcessing = processingState.isProcessing;
  const activeStep = processingState.steps.find((s) => s.status === 'running') || processingState.steps[0];

  // Derived presentation metrics for script
  const wordCount = rawScript.trim() ? rawScript.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = rawScript.length;

  const handleFileUpload = (file: File) => {
    onUploadCustomFile(file);
  };

  const handleAssetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setNewAssetFile(file);
      setNewAssetUrl(blobUrl);
      setNewAssetFileName(file.name);
      if (!newAssetTitle) {
        setNewAssetTitle(file.name.split('.')[0]);
      }
    }
  };

  const handleAddAsset = () => {
    const trimmedUrl = newAssetUrl.trim();
    const isValidUrl =
      trimmedUrl.startsWith('http://') ||
      trimmedUrl.startsWith('https://') ||
      trimmedUrl.startsWith('data:') ||
      trimmedUrl.startsWith('blob:');

    if (!newAssetFile && !isValidUrl) {
      alert('Harap pilih file gambar/video atau masukkan URL yang valid (http:// atau https://).');
      return;
    }

    const title = newAssetTitle.trim() || (newAssetFile ? newAssetFile.name.split('.')[0] : 'Aset Pendukung');
    const finalUrl = newAssetFile ? URL.createObjectURL(newAssetFile) : trimmedUrl;

    if (onAddUserAsset) {
      onAddUserAsset({
        name: title,
        title,
        type: newAssetType,
        url: finalUrl,
        label: title,
        file: newAssetFile || undefined,
      } as any);
    }

    setNewAssetTitle('');
    setNewAssetUrl('');
    setNewAssetFileName('');
    setNewAssetFile(null);
    if (assetFileInputRef.current) {
      assetFileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Non-intrusive Gemini API Key Banner */}
      <ApiKeyOnboardingCard onOpenModal={onOpenApiKeyModal} />

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
        <div>
          <span className="alco-section-label">INPUT WORKSPACE</span>
          <h2 className="text-lg font-bold text-[var(--fg-app)] tracking-tight">Source Video & Campaign Setup</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Upload custom talking-head video or select a demo sample to begin AI motion analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Video</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectSample(SAMPLE_VIDEOS[0]);
              if (!hasKey) {
                onOpenApiKeyModal();
                return;
              }
              onStartAnalysis(SAMPLE_VIDEOS[0]);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-[var(--fg-app)] text-xs font-semibold flex items-center gap-1.5 hover:bg-[var(--muted)] transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Try 1-Click Demo</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: SOURCE VIDEO */}
      <section className="alco-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-app)]">1. Source Video Selection</h3>
          </div>
          {videoDuration > 0 && (
            <span className="alco-status-success">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {videoDuration}s Video Loaded
            </span>
          )}
        </div>

        {/* Restore Uploaded Video Banner */}
        {uploadedFile && selectedSampleId !== 'custom' && (
          <div className="alco-panel flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Video className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-[var(--fg-app)]">Custom Upload Available: </span>
                <span className="text-[var(--muted-foreground)] truncate">{uploadedFile.name} ({(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onRestoreUploadedFile}
              className="px-2.5 py-1 rounded bg-blue-600 text-white font-semibold text-xs shrink-0 hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Use Custom Video</span>
            </button>
          </div>
        )}

        {/* Upload Dropzone & Preset Samples Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Custom Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(e.dataTransfer.types.includes('Files'));
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`lg:col-span-5 border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px] ${
              selectedSampleId === 'custom' && uploadedFile
                ? 'border-emerald-500/80 bg-emerald-500/5'
                : isDragOver
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-[var(--border)] hover:border-[var(--muted-foreground)] bg-[var(--secondary)]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-blue-500 shadow-xs">
                {selectedSampleId === 'custom' && uploadedFile ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--fg-app)]">
                  {selectedSampleId === 'custom' && uploadedFile
                    ? `✓ ${uploadedFile.name}`
                    : 'Click or Drag MP4 Video Here'}
                </p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                  {selectedSampleId === 'custom' && uploadedFile
                    ? `${(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB • Click to replace`
                    : '9:16 Vertical Talking-Head (10s – 60s)'}
                </p>
              </div>
            </div>
          </div>

          {/* Sample Video Selector Grid */}
          <div className="lg:col-span-7 space-y-2">
            <span className="alco-section-label block">OR SELECT A DEMO SAMPLE:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_VIDEOS.map((sample) => {
                const isSelected = selectedSampleId === sample.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => onSelectSample(sample)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-medium shadow-xs'
                        : 'bg-[var(--secondary)] border-[var(--border)] text-[var(--fg-app)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-blue-100' : 'text-blue-500'}`}>
                        {sample.contentType.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] ${isSelected ? 'text-blue-200' : 'text-[var(--muted-foreground)]'}`}>
                        {sample.duration}s
                      </span>
                    </div>
                    <p className="line-clamp-2 leading-tight font-medium text-[11px]">
                      {sample.title}
                    </p>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white absolute bottom-1.5 right-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Video Specs Banner */}
        {videoMeta && (
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[var(--secondary)] border border-[var(--border)] text-xs">
            <div>
              <span className="alco-section-label text-[9px] block">DURATION</span>
              <span className="font-semibold text-[var(--fg-app)]">{videoDuration} Seconds</span>
            </div>
            <div>
              <span className="alco-section-label text-[9px] block">RESOLUTION</span>
              <span className="font-semibold text-[var(--fg-app)]">{videoMeta.width} × {videoMeta.height}</span>
            </div>
            <div>
              <span className="alco-section-label text-[9px] block">ASPECT RATIO</span>
              <span className="font-semibold text-blue-500">{videoMeta.aspect}</span>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2 & 3: RESPONSIVE WORKSPACE GRID (SCRIPT + CONTENT STRATEGY) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: SCRIPT / TRANSCRIPT EDITOR (7 Cols) */}
        <div className="lg:col-span-7 alco-card space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-app)]">2. Script & Transcript</h3>
              </div>
              {videoFile ? (
                <span className="alco-status-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Verbatim Audio Transcription Active
                </span>
              ) : (
                <span className="text-[10px] text-[var(--muted-foreground)] font-mono bg-[var(--secondary)] px-2 py-0.5 rounded border border-[var(--border)]">
                  Preset Reference Script
                </span>
              )}
            </div>

            {videoFile && (
              <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                <strong>Audio Extraction Note:</strong> Engine transcribes speech directly from video audio tracks. Use the input below to fine-tune or supply script hints.
              </p>
            )}

            <textarea
              value={rawScript}
              onChange={(e) => setRawScript(e.target.value)}
              placeholder={videoFile ? "Transkrip suara otomatis diekstrak dari video..." : "Paste script or spoken text transcript here..."}
              rows={8}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--fg-app)] focus:outline-none focus:border-[var(--primary)] font-mono leading-relaxed resize-none alco-scrollbar"
            />
          </div>

          {/* Script Word/Char Count derived footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)]">
            <span className="font-mono">
              Words: <strong className="text-[var(--fg-app)]">{wordCount}</strong> | Chars: <strong className="text-[var(--fg-app)]">{charCount}</strong>
            </span>
            <span className="text-blue-500 font-medium">Ready for AI Scene Mapping</span>
          </div>
        </div>

        {/* RIGHT COLUMN: CONTENT STRATEGY & OBJECTIVES (5 Cols) */}
        <div className="lg:col-span-5 alco-card space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-app)]">3. Content Strategy</h3>
          </div>

          {/* Editing Grammar / Content Type Selection */}
          <div className="space-y-1.5">
            <label className="alco-section-label block">Editing Grammar Preset</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'meta_ads', label: 'Meta Ads', sub: 'Direct Response Funnel' },
                { id: 'fast_tiktok', label: 'Fast TikTok/Reels', sub: '1.25x Punch & Cuts' },
                { id: 'clean_creator', label: 'Clean Creator', sub: 'Authentic 1.1x Push-in' },
                { id: 'educational', label: 'Educational', sub: 'Authority Concept Map' },
                { id: 'storytelling', label: 'Storytelling', sub: 'Cinematic Narrative' },
                { id: 'affiliate', label: 'Affiliate Showcase', sub: 'Product Feature Focus' },
              ].map((item) => {
                const isSelected =
                  contentType === item.id ||
                  (item.id === 'fast_tiktok' && contentType === 'reels_tiktok') ||
                  (item.id === 'educational' && contentType === 'education');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setContentType(item.id as ContentType)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-[var(--secondary)] border-[var(--border)] text-[var(--fg-app)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{item.label}</div>
                    <div className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-[var(--muted-foreground)]'}`}>
                      {item.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Video Goal */}
          <div className="space-y-1">
            <label className="alco-section-label flex items-center gap-1">
              <span>Video Goal</span>
              <span className="text-[10px] text-[var(--muted-foreground)] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={videoGoal}
              onChange={(e) => setVideoGoal(e.target.value)}
              placeholder="e.g. Validate product demand before manufacturing"
              className="alco-control w-full text-xs"
            />
          </div>

          {/* CTA Text */}
          <div className="space-y-1">
            <label className="alco-section-label flex items-center gap-1">
              <span>Call To Action (CTA)</span>
              <span className="text-[10px] text-[var(--muted-foreground)] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="e.g. Tap link in bio to claim 20% discount"
              className="alco-control w-full text-xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: SUPPORTING / PROOF ASSETS */}
      <section className="alco-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-app)]">
              4. Supporting Assets & Proof Media
            </h3>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--secondary)] border border-[var(--border)] text-[var(--fg-app)]">
            {userAssets.length} Assets Attached
          </span>
        </div>

        {/* ALCO Principle Callout */}
        <div className="alco-panel text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--fg-app)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Strict B-Roll Principle: No Random Generic Stock Footage</span>
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            ALCO Auto Motion strictly uses real user-supplied proof assets (screenshots, analytics dashboards, product photos, before/after images) for B-roll overlays to maximize conversion authenticity.
          </p>
        </div>

        {/* Add Asset Form */}
        <div className="p-3 bg-[var(--secondary)] rounded-lg border border-[var(--border)] space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="alco-section-label text-[10px]">Asset Title / Label</label>
              <input
                type="text"
                value={newAssetTitle}
                onChange={(e) => setNewAssetTitle(e.target.value)}
                placeholder="e.g. ROAS 5.4x Dashboard / Product Photo"
                className="alco-control w-full text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="alco-section-label text-[10px]">Asset Category</label>
              <select
                value={newAssetType}
                onChange={(e) => setNewAssetType(e.target.value as any)}
                className="alco-control w-full text-xs"
              >
                <option value="screenshot">Screenshot ROAS / Proof</option>
                <option value="dashboard">Analytics Dashboard</option>
                <option value="product">Product Photo / Video</option>
                <option value="logo">Brand Logo / Icon</option>
                <option value="screen_recording">Screen Recording</option>
                <option value="before_after">Before / After Image</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="file"
              ref={assetFileInputRef}
              onChange={handleAssetFileChange}
              accept="image/*,video/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => assetFileInputRef.current?.click()}
              className="w-full sm:w-auto px-3 h-9 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--fg-app)] text-xs font-medium hover:bg-[var(--muted)] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>{newAssetFileName ? `✓ ${newAssetFileName.slice(0, 16)}...` : 'Select File'}</span>
            </button>

            <input
              type="text"
              value={newAssetUrl}
              onChange={(e) => setNewAssetUrl(e.target.value)}
              placeholder="Or paste image/video URL..."
              className="alco-control w-full text-xs flex-1"
            />

            <button
              type="button"
              onClick={handleAddAsset}
              disabled={!newAssetTitle && !newAssetUrl && !newAssetFileName}
              className="w-full sm:w-auto px-4 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center justify-center gap-1 shrink-0 cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Asset</span>
            </button>
          </div>
        </div>

        {/* Attached Asset Grid / Empty State */}
        {userAssets.length === 0 ? (
          <div className="text-center py-4 border border-dashed border-[var(--border)] rounded-lg text-xs text-[var(--muted-foreground)]">
            No supporting proof assets attached yet. Video will be rendered in pure A-roll Talking-Head mode.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {userAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between gap-2 p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded bg-[var(--secondary)] border border-[var(--border)] shrink-0 overflow-hidden flex items-center justify-center">
                    {asset.url ? (
                      <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-[var(--fg-app)] truncate text-xs">{asset.title}</div>
                    <span className="text-[9px] font-mono text-blue-500 uppercase">
                      {asset.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {onRemoveUserAsset && (
                  <button
                    type="button"
                    onClick={() => onRemoveUserAsset(asset.id)}
                    className="p-1 text-[var(--muted-foreground)] hover:text-red-500 hover:bg-[var(--secondary)] rounded transition-colors cursor-pointer shrink-0"
                    title="Remove asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Advanced Diagnostic Accordion */}
        <div className="pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--fg-app)] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Advanced Diagnostics (Testing Phase Level)</span>
            </span>
            {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvancedOptions && (
            <div className="p-3 bg-[var(--secondary)] border border-[var(--border)] rounded-lg mt-2 space-y-2">
              <span className="alco-section-label text-[10px]">Testing Phase Override</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { phase: 1, title: 'Phase 1: AI Director', sub: 'JSON edit decisions' },
                  { phase: 2, title: 'Phase 2: Zoom + Subtitles', sub: 'Punch motion zoom' },
                  { phase: 3, title: 'Phase 3: + Proof B-Roll', sub: 'Asset overlays' },
                  { phase: 4, title: 'Phase 4: Full Auto Preview', sub: 'Complete rendering' },
                ].map((item) => (
                  <button
                    key={item.phase}
                    type="button"
                    onClick={() => setActiveTestingPhase(item.phase)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      activeTestingPhase === item.phase
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : 'bg-[var(--card)] border-[var(--border)] text-[var(--fg-app)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">{item.title}</div>
                    <div className={`text-[10px] ${activeTestingPhase === item.phase ? 'text-blue-100' : 'text-[var(--muted-foreground)]'}`}>
                      {item.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 5: PRIMARY ACTION CTA */}
      <div className="space-y-3 pt-2">
        <button
          id="btn-analyze-video"
          type="button"
          disabled={isProcessing}
          onClick={() => {
            if (!hasKey) {
              onOpenApiKeyModal();
              return;
            }
            onStartAnalysis();
          }}
          className={`w-full py-3.5 px-6 rounded-lg font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
            !hasKey
              ? 'bg-[var(--secondary)] border border-amber-500/50 text-amber-500 hover:bg-[var(--muted)]'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
          }`}
        >
          {!hasKey ? (
            <>
              <Key className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Connect Free Gemini API Key to Begin</span>
            </>
          ) : isProcessing ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>
                {activeStep?.title || 'Processing AI Motion Analysis...'} ({Math.round(processingState.overallProgress)}%)
              </span>
            </div>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>ANALYZE WITH AI</span>
            </>
          )}
        </button>

        {!hasKey && (
          <p className="text-center text-[11px] text-amber-500 font-medium flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>AI analysis requires a connected API key.</span>
          </p>
        )}

        {/* Inline Progress Bar Strip if processing */}
        {isProcessing && (
          <div className="alco-panel space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--fg-app)] font-medium flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                {activeStep?.subtitle || 'Menganalisis pacing video...'}
              </span>
              <span className="text-blue-500 font-mono text-[11px] font-bold">
                {Math.round(processingState.overallProgress)}%
              </span>
            </div>
            <div className="w-full bg-[var(--card)] rounded-full h-1.5 overflow-hidden border border-[var(--border)]">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, processingState.overallProgress))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

