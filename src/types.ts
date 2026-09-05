export type ContentType =
  | 'clean_creator'
  | 'fast_tiktok'
  | 'meta_ads'
  | 'educational'
  | 'storytelling'
  | 'affiliate'
  | 'reels_tiktok'
  | 'education';

export type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU' | 'META_ADS';

export type ContentRole =
  | 'hook'
  | 'problem'
  | 'curiosity'
  | 'explanation'
  | 'solution'
  | 'proof'
  | 'cta'
  | 'continuation';

export type MotionPreset =
  | 'normal'
  | 'slow_zoom_in'
  | 'slow_zoom_out'
  | 'punch_zoom'
  | 'pan_left'
  | 'pan_right';

export type CaptionPreset = 'normal' | 'highlight' | 'hook';

export type CaptionGrammarType = 'HOOK_HEADLINE' | 'CAPTION_STANDARD' | 'KEYWORD_EMPHASIS';

export type CaptionDisplayMode = 'clean_floating' | 'hook_headline' | 'proof_badge' | 'cta_emphasis';

export type HookTextStyle = 'clean_creator' | 'fast_tiktok' | 'meta_ads' | 'educational' | 'premium_authority';
export type HookTextLayout = 'center_top_impact' | 'left_editorial' | 'split_emphasis' | 'stacked_punch';

export type CaptionMode = 'verbatim' | 'punchy' | 'summary';

export type EvidenceType =
  | 'SCREEN_DEMO'
  | 'SCREEN_PROOF'
  | 'SPLIT_COMPARE'
  | 'CALLOUT_POINTER'
  | 'OFFER_CARD'
  | 'CTA_CARD'
  | 'NONE';

export interface UserProofAsset {
  id: string;
  name: string;
  url: string; // Blob URL or http image URL
  type: 'dashboard' | 'product' | 'screenshot' | 'logo' | 'screen_recording' | 'before_after';
  label?: string;
  file?: File;
}

export interface VisualEvidenceCard {
  type: EvidenceType;
  title: string;
  metricValue?: string;
  subtitle?: string;
  badgeTag?: string;
  comparisonLabels?: { before: string; after: string };
  calloutPoint?: string;
  userAssetUrl?: string;
  userAssetType?: 'dashboard' | 'product' | 'screenshot' | 'logo' | 'screen_recording' | 'before_after';
  isUserAsset?: boolean;
}

export type VisualIntent =
  | 'proof'
  | 'metaphor'
  | 'process'
  | 'contrast'
  | 'product'
  | 'result'
  | 'urgency'
  | 'none';

export type TransitionType = 'cut' | 'flash' | 'whip_pan' | 'zoom_cut';

export type SoundEffectType =
  | 'none'
  | 'whoosh'
  | 'fast_whoosh'
  | 'swipe'
  | 'pop'
  | 'soft_pop'
  | 'click'
  | 'button_click'
  | 'ding'
  | 'success_chime'
  | 'notification'
  | 'impact'
  | 'short_impact'
  | 'soft_impact'
  | 'riser'
  | 'soft_riser'
  | 'dark_riser'
  | 'tension_pulse'
  | 'low_hit'
  | 'data_blip'
  | 'glitch'
  | 'error_beep'
  | 'tick'
  | 'cash_register'
  | 'downlifter'
  | 'camera_shutter';

export type SFXPurpose =
  | 'none'
  | 'curiosity'
  | 'tension'
  | 'transition'
  | 'visual_appear'
  | 'ui_interaction'
  | 'emphasis'
  | 'impact'
  | 'reveal'
  | 'success'
  | 'error'
  | 'urgency'
  | 'closing';

export type SFXIntent =
  | 'hook_interrupt'
  | 'punch_emphasis'
  | 'transition'
  | 'data_reveal'
  | 'proof_pop'
  | 'ui_click'
  | 'success'
  | 'cta_push'
  | 'tension'
  | 'soft_reset'
  | 'none';

export type BrollTypeUsed =
  | 'user_asset_image'
  | 'user_asset_video'
  | 'screen_recording'
  | 'screenshot_overlay'
  | 'typography_broll'
  | 'motion_graphic_broll'
  | 'data_card_broll'
  | 'no_broll';

export type BrollSource =
  | 'user_asset'
  | 'internal_typography'
  | 'internal_motion'
  | 'internal_data_card'
  | 'none';

export type CreativeRhythmProfile =
  | 'punchy_hook'
  | 'tension_build'
  | 'solution_clarity'
  | 'proof_focus'
  | 'cta_conversion'
  | 'balanced_flow';

export type MarketingCategory = 'problem' | 'benefit_result' | 'offer_mechanism' | 'urgency_cta' | 'general';

export interface WordTiming {
  word: string;
  startOffset: number; // relative to scene start
  endOffset: number;   // relative to scene start
  isHighlight: boolean;
  marketingCategory?: MarketingCategory;
}

export interface SceneIntelligenceScore {
  hook_strength: number;      // 1 - 100
  emotional_intensity: number;// 1 - 10
  clarity_score: number;       // 1 - 10
  urgency_score: number;       // 1 - 10
  proof_strength: number;      // 1 - 10
  cta_pressure: number;        // 1 - 10
  curiosity_tension?: number;  // 1 - 10
  problem_agitation?: number;  // 1 - 10
  visual_fatigue_risk: number; // 0 - 100
  pacing_need: 'rapid' | 'moderate' | 'dramatic_pause' | 'punchy';
  marketing_role?: ContentRole;
}

export interface TranscriptSegment {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface ContentAnalysisItem {
  id: number;
  start: number;
  end: number;
  content_role: ContentRole;
  importance: number; // 1 - 10
  emotion: 'warning' | 'curious' | 'urgent' | 'authoritative' | 'excitement' | 'empathy' | 'neutral';
  key_phrase: string;
  reasoning: string;
  scores?: SceneIntelligenceScore;
}

export interface BRollItem {
  query: string;
  title?: string;
  sourceUrl?: string;
  previewUrl?: string;
  mediaType?: 'video' | 'image';
  visual_intent?: VisualIntent;
  overlay_style?: 'full' | 'pip' | 'split';
  opacity?: number;
  startOffset?: number;
  duration?: number;
  badgeTag?: string;
  entryTransition?: 'fade' | 'zoom_in' | 'slide_left';
  isUserAsset?: boolean;
}

export interface CameraDynamics {
  zoomSpeed: 'instant' | 'linear' | 'ease_in_out';
  intensity: 'subtle' | 'moderate' | 'high' | 'punch';
  focalPoint: 'center' | 'speaker_eyes' | 'lower_third';
}

export interface VisualCorrectionProfile {
  scene_type: 'talking_head' | 'screen_demo' | 'broll_overlay' | 'natural_balanced';
  brightness: number; // e.g., 100 to 106 (%)
  contrast: number;   // e.g., 100 to 110 (%)
  saturate: number;   // e.g., 100 to 106 (%)
  css_filter: string; // e.g. "brightness(1.05) contrast(1.05) saturate(1.03)"
  status: 'FACE_CLARITY_ENHANCED' | 'SCREEN_TEXT_CRISP' | 'CINEMATIC_OVERLAY_ENHANCED' | 'NATURAL_OPTIMIZED';
  text_legibility_boost: boolean;
  note: string;
}

export interface TalkingHeadFraming {
  is_talking_head: boolean;
  confidence: number; // 0.0 to 1.0
  face_center: { x: number; y: number }; // e.g. { x: 50, y: 34 }
  eyeline_y_percent: number; // Upper 1/3 rule (ideal: 33%)
  headroom_percent: number; // Headroom buffer (ideal: 12-15%)
  smart_reframe_scale: number; // Scaled to prevent face cutoffs (1.05x - 1.22x)
  crop_shift_offset: { x: number; y: number }; // Calibrated offset to keep eyes centered
  framing_mode: 'close_up_impact' | 'medium_talking_head' | 'wide_talking_head' | 'broll_overlay' | 'safe_fallback';
  protection_status: 'EYELINE_LOCKED' | 'FACE_SAFEGUARDED' | 'SAFE_FALLBACK';
  note: string;
}

export interface EditingRhythm {
  rhythm_preset:
    | 'SPECIAL_HOOK_0_3S'
    | 'TENSE_PAIN_BUILD'
    | 'STEADY_EXPLANATION'
    | 'PROUD_PROOF'
    | 'CONVERSION_CTA'
    | 'FAST_TIKTOK_HYPER'
    | 'META_ADS_ROAS'
    | 'AFFILIATE_SHOWCASE'
    | 'EDUCATIONAL_AUTHORITY'
    | 'STORYTELLING_CINEMATIC'
    | 'CLEAN_CREATOR_STEADY';
  cut_cadence_ms: number;
  crop_offset: { x: number; y: number };
  pattern_interrupt_type: 'PUNCH_ZOOM_SLAM' | 'CROP_SHIFT' | 'TOP_HEADLINE_FLASH' | 'PROOF_OVERLAY_CARD' | 'CTA_PULSE' | 'NONE';
  hook_stage_dynamic?: {
    stage1DurationSec: number;
    stage1Scale: number;
    stage1CropOffset: { x: number; y: number };
    stage2Scale: number;
    stage2CropOffset: { x: number; y: number };
  };
  description: string;
}

export type AdRole =
  | 'hook'
  | 'problem'
  | 'agitate'
  | 'insight'
  | 'solution'
  | 'demo'
  | 'proof'
  | 'benefit'
  | 'offer'
  | 'cta';

export type BrollType =
  | 'literal'
  | 'problem'
  | 'product'
  | 'demo'
  | 'proof'
  | 'outcome'
  | 'ui'
  | 'data'
  | 'comparison'
  | 'metaphor'
  | 'context'
  | 'reaction'
  | 'pattern_interrupt';

export type BrollFormat =
  | 'none'
  | 'footage'
  | 'image'
  | 'screen_recording'
  | 'motion_graphic'
  | 'typography'
  | 'data_card'
  | 'ui_overlay';

export type VisualDecision =
  | 'KEEP_AROLL'
  | 'PUNCH_IN'
  | 'BROLL'
  | 'PRODUCT_DEMO'
  | 'SCREENSHOT'
  | 'GRAPH'
  | 'TEXT_EMPHASIS'
  | 'SPLIT_SCREEN';

export interface SceneEditPlan {
  id: number;
  start: number;
  end: number;
  role: ContentRole;
  adRole?: AdRole;
  brollNeedScore?: number;
  brollNeedReasons?: string[];
  visualDecision?: VisualDecision;
  brollType?: BrollType;
  brollFormat?: BrollFormat;
  sfxIntent?: string;
  hookText?: string;
  hook_style?: HookTextStyle;
  hook_layout?: HookTextLayout;
  textEmphasisWords?: string[];
  motion: MotionPreset;
  motion_scale: number; // e.g. 1.0, 1.08, 1.18, 1.25
  caption: string;
  caption_style: CaptionPreset;
  caption_grammar: CaptionGrammarType;
  caption_mode: CaptionMode;
  caption_display_mode?: CaptionDisplayMode;
  highlight_words: string[];
  word_timings?: WordTiming[];
  broll: BRollItem | null;
  visual_evidence?: VisualEvidenceCard | null;
  visual_intent: VisualIntent;
  transition: TransitionType;
  sound_effect: SoundEffectType;
  sfxPurpose?: SFXPurpose;
  sfxName?: SoundEffectType;
  sfxIntensity?: number;
  sfxReason?: string;
  sfxLayered?: boolean;
  sfxLayers?: Array<{ purpose: SFXPurpose; name: SoundEffectType; offsetMs: number; intensity: number }>;
  sfxLayerSkipReason?: string;
  sfxLayeredEligible?: boolean;
  sfxLayeredPattern?: string;
  director_note?: string;
  scores: SceneIntelligenceScore;
  camera_dynamics: CameraDynamics;
  editing_rhythm?: EditingRhythm;
  talking_head_framing?: TalkingHeadFraming;
  visual_correction?: VisualCorrectionProfile;
  headline?: string;
  key_phrase?: string;
  is_manually_edited?: boolean;
  // Batch 4 Creative Editing & Quality fields
  creativeRhythmProfile?: CreativeRhythmProfile | string;
  selectedSfxIntent?: SFXIntent | string;
  selectedSfxName?: SoundEffectType;
  sfxCooldownApplied?: boolean;
  sfxPeakDb?: number;
  sfxVoiceBalanceStatus?: 'balanced' | 'voice_dominant' | 'unbalanced';
  brollTypeUsed?: BrollTypeUsed;
  brollSource?: BrollSource;
  brollRelevanceReason?: string;
  brollSkippedReason?: string;
  brollRandomAssetBlocked?: boolean;
  editingRationale?: string;
}

export interface StylePresetProfile {
  id: ContentType;
  name: string;
  tagline: string;
  funnelStage: FunnelStage;
  pacingSummary: string;
  motionGrammar: string;
  brollDensity: 'selective' | 'high' | 'strategic';
  captionStyle: string;
  hookRule: string;
  badgeColor: string;
}

export interface CreativeRecommendation {
  id: string;
  sceneId?: number;
  category: 'hook' | 'readability' | 'proof' | 'cta' | 'fatigue' | 'safe_zone' | 'sfx' | 'broll' | 'rhythm';
  severity: 'high' | 'medium' | 'low' | 'passed';
  title: string;
  description: string;
  actionableFix: string;
}

export interface CreativeAuditResult {
  overallScore: number;
  grade: 'S' | 'A+' | 'A' | 'B' | 'C';
  passed?: boolean;
  breakdown?: {
    penalties: string[];
    bonuses: string[];
    baseScore: number;
  };
  categoryScores: {
    hookStrength: number;
    captionReadability: number;
    proofPresence: number;
    ctaClarity: number;
    fatigueRiskControl: number;
    safeZoneCompliance: number;
    sfxQuality?: number;
    brollRelevance?: number;
    rhythmQuality?: number;
    captionPolish?: number;
  };
  sfxQualityScore?: number;
  brollRelevanceScore?: number;
  rhythmQualityScore?: number;
  captionPolishScore?: number;
  creativeEditingScore?: number;
  recommendations: CreativeRecommendation[];
}

export interface PacingProfile {
  avg_scene_duration: number;
  pattern_interrupt_count: number;
  retention_risk_points: number[];
  pacing_grade: 'S' | 'A+' | 'A' | 'B';
  overall_rhythm_description: string;
  hook_retention_index: number;
}

export interface AlcoEditingProject {
  video_type: ContentType;
  funnel_stage: FunnelStage;
  title: string;
  target_goal?: string;
  cta_text?: string;
  total_duration: number;
  raw_video_url?: string;
  transcript: TranscriptSegment[];
  analysis: ContentAnalysisItem[];
  scenes: SceneEditPlan[];
  user_proof_assets?: UserProofAsset[];
  pacing_profile?: PacingProfile;
  creative_audit?: CreativeAuditResult;
  talking_head_summary?: {
    dominant: boolean;
    confidence: number;
    ratio_percent: number;
    primary_framing_mode: string;
    eyeline_lock_active: boolean;
  };
  visual_quality_summary?: {
    overall_grade: 'OPTIMAL' | 'ENHANCED_FACE_CLARITY' | 'SCREEN_TEXT_OPTIMIZED';
    face_clarity_boost_applied: boolean;
    screen_text_crisp_applied: boolean;
    lighting_note: string;
  };
  stats?: {
    hook_strength: number; // 1-100
    pacing_score: number;  // 1-100
    visual_variety: number; // 1-100
    retention_estimate: string;
  };
  output_audit?: OutputQualityAuditResult;
}

export interface RenderFrameTelemetry {
  sampledFramesCount: number;
  scalesHistory: number[];
  videoCoverageRatios: number[];
  sceneChangesDetected: number;
  captionYPositions: number[];
  faceOcclusionViolations: number;
  sfxTriggeredCount: number;
  durationRendered: number;
  actualDurationSeconds?: number;
  fileSizeBytes?: number;
  frameDropRatio?: number;
  playbackHealthy?: boolean;
  targetFrameCount?: number;
  actualRenderedFrames?: number;
  duplicateFrameRisk?: number;
  averageFrameRenderMs?: number;
  maxFrameRenderMs?: number;
  droppedFrameCount?: number;
  effectiveFps?: number;
  encodedFrameCount?: number;
  effectiveEncodedFps?: number;
  maxEncodedFrameGapMs?: number;
  hasValidMetadataFps?: boolean;
  encodedWidth?: number;
  encodedHeight?: number;
}

export interface OutputQualityCheckItem {
  id: string;
  label: string;
  passed: boolean;
  score: number;
  details: string;
  impact: 'CRITICAL' | 'WARNING' | 'INFO';
}

export interface OutputQualityAuditResult {
  passed: boolean;
  status: 'CERTIFIED_READY' | 'VALIDATION_FAILED';
  qualityScore: number; // 0 - 100
  metrics: {
    mainVideoCoveragePercent: number; // e.g. 98%
    motionDynamicsScore: number;     // e.g. 94%
    sceneVarietyScore: number;       // e.g. 92%
    captionSafeZoneScore: number;    // e.g. 100%
    editCadenceScore: number;        // e.g. 95%
    playbackHealthScore?: number;    // e.g. 98%
    encodedFps?: number;
    encodedFrames?: number;
    targetFrames?: number;
    maxFrameGapMs?: number;
    sourceDuration?: number;
    outputDuration?: number;
    sourceAudioStatus?: 'detected' | 'not detected';
    outputAudioStatus?: 'detected' | 'missing' | 'unknown';
    renderMode?: 'Full Duration' | 'Test 15s';
    usedSyntheticFallback?: boolean;
    outputAudioIsSilent?: boolean;
    audioPeakDb?: number;
    audioRmsDb?: number;
    visualVarianceScore?: number;
    isSyntheticLooking?: boolean;
    sampledFrameCount?: number;
  };
  checks: OutputQualityCheckItem[];
  failureReasons: string[];
  suggestedFixes: string[];
  isPosterLike: boolean;
  isTooStatic: boolean;
  isMainVideoTooSmall: boolean;
  isCaptionOccluding: boolean;
  isPlaybackCorrupt?: boolean;
}

export interface SampleVideoOption {
  id: string;
  title: string;
  duration: number;
  contentType: ContentType;
  description: string;
  videoUrl: string;
  thumbnail: string;
  rawTranscript: string;
  goal: string;
  cta: string;
  prebuiltSegments: TranscriptSegment[];
  defaultUserAssets?: UserProofAsset[];
}

export type ProcessingStepId =
  | 'init'
  | 'segmentation'
  | 'content_analysis'
  | 'edit_plan'
  | 'finalizing';

export interface ProcessingStepInfo {
  id: ProcessingStepId;
  title: string;
  subtitle: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number; // 0 - 100
  durationMs?: number;
  details?: string;
  badge?: string;
}

export interface ProcessingLogEntry {
  id: string;
  timestamp: number;
  relativeTime: string;
  stepId: ProcessingStepId;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'metric';
}

export interface ProcessingState {
  isProcessing: boolean;
  currentStepId: ProcessingStepId;
  overallProgress: number; // 0 - 100
  startTime: number | null;
  elapsedMs: number;
  estimatedRemainingMs: number;
  steps: ProcessingStepInfo[];
  logs: ProcessingLogEntry[];
  error: string | null;
  failedStepId?: ProcessingStepId;
}

export type RenderFailedStage =
  | 'client_prepare_source'
  | 'client_send_upload'
  | 'server_receive_upload'
  | 'server_probe_input'
  | 'server_ffmpeg_missing'
  | 'server_ffprobe_missing'
  | 'server_ffmpeg_encode'
  | 'server_probe_output'
  | 'server_audio_validate'
  | 'server_visual_validate'
  | 'server_response_parse'
  | 'client_preview_output'
  | 'final_download_validation'
  | 'final_export_readiness_audit';

export interface RenderParityDiagnostics {
  sourceMatched: boolean;
  motion: 'planned' | 'attempted' | 'applied' | 'visible' | 'failed';
  broll: 'planned' | 'attempted' | 'applied' | 'visible' | 'failed';
  sfx: 'planned' | 'attempted' | 'applied' | 'audible' | 'failed';
  captions: 'planned' | 'applied' | 'visible' | 'failed';
  talkingHead: 'planned' | 'applied' | 'safe' | 'failed';
  motionApplied?: boolean;
  motionFilterGraphUsed?: boolean;
  motionFallbackUsed?: boolean;
  motionFallbackReason?: string;
  ffmpegFullGraphError?: string;
  brollApplied?: boolean;
  brollOverlayApplied?: boolean;
  brollOverlayCount?: number;
  sourceSceneChangeDetected?: boolean;
  visualEvidenceApplied?: boolean;
  sfxApplied?: boolean;
  sfxPlannedCount?: number;
  sfxMixedCount?: number;
  sfxMixGraphApplied?: boolean;
  sfxAudioAnalysisStatus?: 'success' | 'failed';
  sfxPeakDb?: number;
  sfxActuallyAudible?: boolean;
  sfxFailureReason?: string;
  audioAnalysisStatus?: 'success' | 'failed';
  audioAnalysisError?: string;
  audioTimelineMode?: 'scene_trim_concat';
  audioSegmentsCount?: number;
  videoSegmentsCount?: number;
  audioVideoTimelineMatched?: boolean;
  audioTimelineDuration?: number;
  videoTimelineDuration?: number;
  audioDuration?: number;
  videoDuration?: number;
  audioVideoDurationDeltaMs?: number;
  sceneCoverageStart?: number;
  sceneCoverageEnd?: number;
  sceneCoverageGapCount?: number;
  lastSceneExtended?: boolean;
  // Scene Duration Reconciliation Diagnostics
  sourceDuration?: number;
  originalPlannedDuration?: number;
  reconciledPlannedDuration?: number;
  addedFallbackSceneCount?: number;
  gapFilledRanges?: Array<{ start: number; end: number; duration: number }>;
  finalTargetDuration?: number;
  reconciliationApplied?: boolean;
  captionStyleMatched?: boolean;
  brollReason?: string;
  sfxDetails?: string;
  sfxSelectedByIntent?: string;
  sfxReason?: string;
  sfxDensity?: string;
  sfxVoiceSafeMix?: boolean;
  motionDetails?: string;
  visualDecisionPerScene?: string;
  brollNeedScorePerScene?: string;
  brollDecisionReasons?: string;
  selectedBrollType?: string;
  selectedSfxIntent?: string;
  strongEmotionProtectedScenes?: string;
  userAssetCount?: number;
  brollMode?: 'user_asset_only' | 'disabled_no_asset' | 'demo_stock_only';
  sceneVisualDecision?: string;
  brollBlockedReason?: string;
  assetUsedPerScene?: string;
  brollFormatPerScene?: string;
  externalAssetUsed?: 'yes' | 'no';
  internalVisualLayerUsed?: 'typography' | 'motion_graphic' | 'data_card' | 'none';
  blockedGenericBroll?: 'yes' | 'no';
  blockedReason?: string;
  // SFX Decision Engine Diagnostics (Batch 3)
  plannedSfxCount?: number;
  renderedSfxCount?: number;
  audibleSfxCount?: number;
  audibleSfxStatus?: 'audible' | 'silent' | 'unknown';
  sfxDensityTarget?: number | string;
  sfxDensityActual?: number | string;
  sfxPurposePerScene?: string;
  selectedSfxPerScene?: string;
  skippedSfxReasons?: string[];
  sfxLayersApplied?: string;
  sfxLayerSkipReasons?: string[];
  layeredSfxEligibleScenes?: string[];
  layeredSfxAppliedCount?: number;
  sfxLayerIntensitySummary?: string;
  sfxAudibilityMethod?: string;
  sfxAudibilityConfidence?: number | string;
  // Hook Typography Diagnostics
  hookTypographyRendered?: boolean;
  hookText?: string;
  hookSafeZone?: 'top_safe' | 'mid_safe' | 'face_protected';
  hookBlockedByFace?: boolean;
  hookHeadlineVisible?: boolean;
  hookHeadlineText?: string;
  hookFontFamily?: string;
  hookFontResolved?: boolean;
  hookFontSize?: number;
  hookLayout?: string;
  editorGuideVisible?: boolean;
  previewFinalHookParity?: boolean;
  previewHookFontSize?: number;
  finalHookFontSize?: number;
  previewHookScaleRatio?: number;
  finalHookScaleRatio?: number;
  hookSizeDeltaPercent?: number;
  previewFinalHookSizeMatched?: boolean;
  premiumSpacingApplied?: boolean;
  browserConfigHasNoServerImports?: boolean;
  actualHookStyleUsed?: HookTextStyle | string;
  visualAuditMethod?: string;
  captionBoxAuditReason?: string;
  configImportAuditReason?: string;
  visualAuditConfidence?: number | string;
  // Visual Polish Audit Diagnostics
  hookLooksTooSmall?: boolean;
  captionLooksTooLong?: boolean;
  longCaptionChunks?: string[];
  captionBoxTooHeavy?: boolean;
  hookCaptionCollision?: boolean;
  finalVisualPolishScore?: number;
  recommendedDesignFix?: string;
  // B-roll Policy Diagnostics
  brollFormatSelected?: string;
  userAssetMatched?: boolean;
  fallbackInternalLayerUsed?: 'none' | 'typography' | 'motion_graphic' | 'data_card' | 'punch_in';
  // Render Parity Audit
  previewInternalLayerCount?: number;
  finalInternalLayerCount?: number;
  requiredTypographyCount?: number;
  renderedTypographyCount?: number;
  requiredMotionGraphicCount?: number;
  renderedMotionGraphicCount?: number;
  requiredDataCardCount?: number;
  renderedDataCardCount?: number;
  internalLayerParityPassed?: boolean;
  externalBrollParityPassed?: boolean;
  usedFallbackGraph?: boolean;
  typographyRenderedInFinal?: 'rendered' | 'missing' | 'not_required';
  motionGraphicRenderedInFinal?: 'rendered' | 'missing' | 'not_required';
  dataCardRenderedInFinal?: 'rendered' | 'missing' | 'not_required';
  // Data Card Sanitization Diagnostics (Batch 1)
  dataCardSanitizationMode?: 'render_safety_first' | 'context_guessing' | string;
  dataCardPreservedCount?: number;
  dataCardDowngradedCount?: number;
  dataCardDowngradeReasons?: string[];
  // Shared Media Mapping Diagnostics (Batch 2)
  sharedMappingVersion?: string;
  previewFinalSfxConfigMatched?: boolean;
  previewFinalLayerConfigMatched?: boolean;
  previewFinalParityStatus?: 'passed' | 'failed';
  parityFailureReasons?: string[];
  previewRendererMode?: string;
  finalRendererMode?: string;
  previewFinalSfxMatched?: boolean;
  previewFinalSfxMatchReason?: string;
  previewSfxNames?: string[];
  finalSfxNames?: string[];
  previewSfxTiming?: string[];
  finalSfxTiming?: string[];
  previewFinalInternalLayerMatched?: boolean;
  // Final MP4 Frame Sampling & Real Overlay Visual QA (Batch 3)
  finalFrameAuditPassed?: boolean;
  hookVisibleInSampledFrames?: boolean;
  captionVisibleInSampledFrames?: boolean;
  brollVisibleInSampledFrames?: boolean;
  // Task 5 Audit Diagnostics
  hookTextSanitized?: boolean;
  previewFinalHookMatched?: boolean;
  previewFinalHookLayoutMatched?: boolean;
  faceOverlayCollisionDetected?: boolean;
  talkingHeadParityMatched?: boolean;
  visualChangeDetected?: boolean;
  overlayRiskDetected?: boolean;
  finalVisualQAReason?: string;
  sampledFrameTimestamps?: number[];
  finalFrameAuditMethod?: string;
  sampledFrameCount?: number;
  averageFrameDifference?: number;
  minFrameDifference?: number;
  visualChangeDetectedByPixelDiff?: boolean;
  staticFrameRisk?: boolean;
  talkingHeadScaleStart?: number;
  talkingHeadScaleEnd?: number;
  talkingHeadEyelineTarget?: number;
  talkingHeadCropY?: number;
  talkingHeadMotionProfile?: string;
  previewFinalTalkingHeadMatched?: boolean;
  visualQAConfidenceReason?: string;
  // Batch 3 Fix — Accurate Pixel-Diff & Talking-Head Parity Diagnostics
  rawFrameBufferCount?: number;
  expectedRawFrameBufferCount?: number;
  frameSamplingFailed?: boolean;
  frameSamplingFailureReason?: string;
  previewTalkingHeadProfile?: string;
  finalTalkingHeadProfile?: string;
  talkingHeadParityDelta?: number | string;
  talkingHeadParityReason?: string;
  // Batch 4 Quality Editing Diagnostics
  selectedSfxName?: string;
  sfxCooldownApplied?: boolean | string;
  sfxVoiceBalanceStatus?: 'balanced' | 'voice_dominant' | 'unbalanced';
  brollTypeUsed?: string;
  brollSource?: string;
  brollRelevanceReason?: string;
  brollSkippedReason?: string;
  brollRandomAssetBlocked?: boolean;
  sfxQualityScore?: number;
  brollRelevanceScore?: number;
  rhythmQualityScore?: number;
  captionPolishScore?: number;
  creativeEditingScore?: number;
  sfxIntentMapVerified?: boolean;
  brollRelevanceAuditPassed?: boolean;
  captionSanitizationVerified?: boolean;
  creativeAuditScore?: number;
  editingRationaleSummary?: string;
  perSceneCreativeRhythm?: string;
  perSceneEditingRationale?: string;
  // Batch 5 SFX Parity, Voice Balance, and Quality Gate Diagnostics
  plannedSfxTimeline?: string[];
  renderedSfxTimeline?: string[];
  sfxTimelineMatched?: boolean;
  sfxDroppedByRenderer?: boolean;
  sfxDropReason?: string;
  sfxCooldownConfigUsed?: number;
  sfxVoiceSafetyConfigUsed?: number;
  sfxPeakTargetRange?: string;
  sfxPeakWithinTarget?: boolean;
  sfxClippingRisk?: boolean;
  voicePeakDb?: number;
  sfxBusPeakDb?: number;
  finalMixPeakDb?: number;
  candidateSfxCount?: number;
  approvedSfxCount?: number;
  intentionallySkippedSfxCount?: number;
  candidateSfxTimeline?: string[];
  approvedSfxTimeline?: string[];
  intentionallySkippedSfx?: string[];
  skippedByDensityQuota?: number;
  skippedByVoiceSafety?: number;
  skippedByCleanNarration?: number;
  skippedByContinuationScene?: number;
  skippedByCooldown?: number;
  sfxCandidateCount?: number;
  sfxApprovedCount?: number;
  sfxVoiceBalanceReason?: string;
  creativeGrade?: 'S' | 'A+' | 'A' | 'B' | 'C';
  creativeGatePassed?: boolean;
  creativeScoreBreakdown?: {
    penalties?: string[];
    bonuses?: string[];
    baseScore?: number;
  };
  // Duplicate Upper Text & Meta Ads Safe Zone Audit (Batch 6)
  duplicateUpperText?: boolean;
  duplicateUpperTextStatus?: 'PASS' | 'FAIL';
  duplicateUpperTextReason?: string;
  upperTextCountPerScene?: string;
  metaAdsSafeZonePassed?: boolean;
  metaAdsSafeZoneStatus?: 'PASS' | 'FAIL';
  metaAdsSafeZoneReason?: string;
  hookYPosition?: string;
  captionYPosition?: string;
}

export interface RenderDiagnosticInfo {
  failedStage?: RenderFailedStage;
  error?: string;
  technicalDetail?: string;
  recommendedFix?: string;
  httpStatus?: number;
  httpContentType?: string;
  responsePreview?: string;
  responseJsonValid?: boolean;
  success?: boolean;
  renderId?: string;
  downloadUrl?: string;
  fileSizeBytes?: number;
  diagnostics?: Record<string, any>;
  renderParity?: RenderParityDiagnostics;
}

