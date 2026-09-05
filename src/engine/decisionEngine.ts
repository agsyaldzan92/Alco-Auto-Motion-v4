import {
  AdRole,
  BrollType,
  BrollFormat,
  BrollTypeUsed,
  BrollSource,
  VisualDecision,
  ContentRole,
  SceneIntelligenceScore,
  SceneEditPlan,
  SoundEffectType,
  SFXPurpose,
  SFXIntent,
  CreativeRhythmProfile,
} from '../types';
import { SFX_PURPOSE_MAPPINGS, SFX_INTENT_MAP, SFX_CONFIGS } from '../utils/sharedMediaMapping';
import { sanitizeCaptionText } from '../utils/headlineSanitizer';
import { SFX_EDITING_CONFIG } from '../config/sfxEditingConfig';

/**
  * Mapping B-Roll types by Ad Role (10-stage marketing funnel)
  */
export const BROLL_BY_AD_ROLE: Record<AdRole, BrollType[]> = {
  hook: ['pattern_interrupt', 'problem', 'reaction', 'literal'],
  problem: ['problem', 'literal', 'data', 'reaction'],
  agitate: ['problem', 'reaction', 'comparison'],
  insight: ['data', 'metaphor', 'literal'],
  solution: ['product', 'ui', 'demo'],
  demo: ['demo', 'product', 'ui'],
  proof: ['proof', 'data', 'comparison'],
  benefit: ['outcome', 'comparison', 'metaphor'],
  offer: ['product', 'ui', 'comparison'],
  cta: ['product', 'ui'],
};

/**
  * Map legacy ContentRole or transcript context to precise AdRole
  */
export function mapContentRoleToAdRole(role: ContentRole, text: string = ''): AdRole {
  const tUpper = text.toUpperCase();
  if (role === 'hook') return 'hook';
  if (role === 'problem') {
    if (tUpper.includes('SALAH') || tUpper.includes('PARAH') || tUpper.includes('BAKAR UANG') || tUpper.includes('RUGI') || tUpper.includes('BONCOS')) {
      return 'agitate';
    }
    return 'problem';
  }
  if (role === 'curiosity') return 'insight';
  if (role === 'solution') {
    if (tUpper.includes('LANGKAH') || tUpper.includes('TUTORIAL') || tUpper.includes('DEMO') || tUpper.includes('CARA') || tUpper.includes('SIMULASI')) {
      return 'demo';
    }
    return 'solution';
  }
  if (role === 'proof') return 'proof';
  if (role === 'cta') {
    if (tUpper.includes('DISKON') || tUpper.includes('HARGA') || tUpper.includes('OFFER') || tUpper.includes('PROMO') || tUpper.includes('VOUCHER')) {
      return 'offer';
    }
    return 'cta';
  }
  if (tUpper.includes('HASIL') || tUpper.includes('UNTUNG') || tUpper.includes('MANFAAT') || tUpper.includes('DAMPAK')) {
    return 'benefit';
  }
  return 'insight';
}

export interface BrollNeedParams {
  text: string;
  adRole: AdRole;
  duration: number;
  emotional_intensity?: number;
  scores?: SceneIntelligenceScore;
  hasUserAsset?: boolean;
  staticDuration?: number;
  motionScale?: number;
}

export interface BrollNeedResult {
  score: number;
  reasons: string[];
  strongEmotion: boolean;
}

/**
  * Calculates B-Roll need score based on 7 contextual criteria:
  * 1. Concrete objects present (+20)
  * 2. Role is problem/agitate/demo/proof/solution (+20)
  * 3. Numbers/data present (+20)
  * 4. Product/solution mentioned (+20)
  * 5. Visual unchanged for too long / long duration (+15)
  * 6. Static shot framing (+15)
  * 7. Talent has strong emotion/expression (-30 to protect A-roll)
  */
export function calculateBrollNeed(params: BrollNeedParams): BrollNeedResult {
  let score = 30; // base score
  const reasons: string[] = [];
  const textUpper = (params.text || '').toUpperCase();

  // 1. Concrete objects mentioned (+20)
  const concreteObjectsRegex = /LAPTOP|HP|HANDPHONE|UANG|MONEY|BUDGET|DASHBOARD|GRAFIK|SCREEN|BUKU|PRODUK|APLIKASI|SOFTWARE|SEPATU|BAJU|BOX|KERANJANG|BARANG|ALAT|KAMERA/i;
  if (concreteObjectsRegex.test(textUpper)) {
    score += 20;
    reasons.push('Concrete objects mentioned in transcript (+20)');
  }

  // 2. Role is problem/agitate/demo/proof/solution (+20)
  if (['problem', 'agitate', 'demo', 'proof', 'solution'].includes(params.adRole)) {
    score += 20;
    reasons.push(`Ad role (${params.adRole}) benefits from visual proof/demonstration (+20)`);
  }

  // 3. Numbers/data present (+20)
  const numbersDataRegex = /\d+|%|ROAS|OMSET|CTR|CPA|JUTA|RIBU|RIBUAN|5X|10X|GRAFIK|METRIK/i;
  if (numbersDataRegex.test(textUpper)) {
    score += 20;
    reasons.push('Quantitative numbers/data detected (+20)');
  }

  // 4. Product/solution mentioned (+20)
  const productMentionRegex = /PRODUK|APLIKASI|SOFTWARE|COURSE|SOLUSI|TEMPLATE|MODUL|FITUR|BRAND|ALAT|SISTEM/i;
  if (productMentionRegex.test(textUpper)) {
    score += 20;
    reasons.push('Product/solution explicit mention (+20)');
  }

  // 5. Visual unchanged for too long / long segment (+15)
  if (params.duration >= 3.8 || (params.staticDuration && params.staticDuration >= 3.5)) {
    score += 15;
    reasons.push(`Static visual duration (${params.duration.toFixed(1)}s) >= 3.8s (+15)`);
  }

  // 6. Static shot framing (+15)
  if (!params.motionScale || params.motionScale <= 1.05) {
    score += 15;
    reasons.push('Static shot framing (+15)');
  }

  // 7. Talent has strong emotion/expression (-30 to protect A-roll)
  const strongEmotion = (params.emotional_intensity && params.emotional_intensity >= 8) ||
    /MARAH|SEDIH|KAGET|TERKEJUT|JUJUR|SENANG|BANGGA|PAHAM|SERIUS|RAHASIA|JUJUR YA/i.test(textUpper);

  if (strongEmotion) {
    score -= 30;
    reasons.push('Strong talent emotion/expression detected (protect A-roll, -30)');
  }

  score = Math.min(100, Math.max(0, score));

  return {
    score,
    reasons,
    strongEmotion: !!strongEmotion,
  };
}

/**
  * Determines the exact VisualDecision based on B-roll need score & asset availability:
  * - If NO user assets: ONLY KEEP_AROLL, PUNCH_IN, TEXT_EMPHASIS
  * - If user assets available & score >= 70: BROLL / PRODUCT_DEMO / SCREENSHOT / GRAPH / SPLIT_SCREEN
  * - If strongEmotion: protect A-roll (KEEP_AROLL or PUNCH_IN, never full B-roll overlay)
  */
export function determineVisualDecision(
  brollNeed: BrollNeedResult,
  brollType: BrollType,
  hasBrollAssetAvailable: boolean
): VisualDecision {
  const { score, strongEmotion } = brollNeed;

  // RULE 6: If NO user assets available, visualDecision can ONLY be KEEP_AROLL, PUNCH_IN, TEXT_EMPHASIS
  if (!hasBrollAssetAvailable) {
    if (strongEmotion) {
      return score >= 45 ? 'PUNCH_IN' : 'KEEP_AROLL';
    }
    if (score >= 58) return 'PUNCH_IN';
    if (score >= 45) return 'TEXT_EMPHASIS';
    return 'KEEP_AROLL';
  }

  if (strongEmotion) {
    if (score >= 45) return 'PUNCH_IN';
    return 'KEEP_AROLL';
  }

  if (score >= 70 && hasBrollAssetAvailable) {
    if (brollType === 'product' || brollType === 'demo') return 'PRODUCT_DEMO';
    if (brollType === 'ui' || brollType === 'proof') return 'SCREENSHOT';
    if (brollType === 'data') return 'GRAPH';
    if (brollType === 'comparison') return 'SPLIT_SCREEN';
    return 'BROLL';
  }

  if (score >= 45) {
    return score >= 58 ? 'PUNCH_IN' : 'TEXT_EMPHASIS';
  }

  return 'KEEP_AROLL';
}

/**
  * Selects B-Roll Type according to adRole and transcript keywords
  */
export function selectBrollTypeForAdRole(adRole: AdRole, text: string = '', hasUserAsset?: boolean): BrollType {
  const textUpper = text.toUpperCase();
  const options = BROLL_BY_AD_ROLE[adRole] || ['literal', 'problem'];

  if (hasUserAsset) {
    if (adRole === 'proof' || textUpper.includes('ROAS') || textUpper.includes('DASHBOARD')) return 'proof';
    if (adRole === 'solution' || adRole === 'demo') return 'product';
    if (adRole === 'problem') return 'ui';
  }

  if (textUpper.includes('ROAS') || textUpper.includes('OMSET') || textUpper.includes('%') || textUpper.includes('GRAFIK')) {
    if (options.includes('data')) return 'data';
    if (options.includes('proof')) return 'proof';
  }
  if (textUpper.includes('PRODUK') || textUpper.includes('BARANG') || textUpper.includes('KERANJANG')) {
    if (options.includes('product')) return 'product';
    if (options.includes('demo')) return 'demo';
  }
  if (textUpper.includes('BEDANYA') || textUpper.includes('BEFORE') || textUpper.includes('AFTER') || textUpper.includes('DULU')) {
    if (options.includes('comparison')) return 'comparison';
  }
  if (textUpper.includes('JANGAN') || textUpper.includes('STOP') || textUpper.includes('RUGI')) {
    if (options.includes('pattern_interrupt')) return 'pattern_interrupt';
    if (options.includes('problem')) return 'problem';
  }

  return options[0];
}

/**
  * Batch 3: Determines BrollFormat based on strict taxonomy rules
  * - If NO user assets: fallback strictly to internal visual layers:
  *   - typography for insight / offer
  *   - motion_graphic for problem / solution
  *   - data_card for proof / data
  *   - punch_in for strong emotion / talking-head emphasis
  * - If user assets exist: map to footage, image, screen_recording, data_card, ui_overlay
  */
export function determineBrollFormat(params: {
  adRole: AdRole;
  brollType: BrollType;
  visualDecision: VisualDecision;
  hasUserAsset: boolean;
  userAsset?: {
    type?: string;
    mediaType?: 'video' | 'image';
    url?: string;
  } | null;
  text?: string;
  index?: number;
  scores?: SceneIntelligenceScore;
  currentFormat?: BrollFormat;
}): BrollFormat {
  const { adRole, brollType, visualDecision, hasUserAsset, userAsset, index = 0, scores, currentFormat } = params;

  // Render safety rule: Preserve data_card if selected on the scene (safe internal visual layer)
  if (currentFormat === 'data_card') {
    return 'data_card';
  }

  // STRICT B-ROLL POLICY: If no authentic user assets, format can ONLY be internal layers or none
  if (!hasUserAsset || !userAsset) {
    if (adRole === 'proof' || brollType === 'data' || brollType === 'proof') {
      return 'data_card';
    }
    if (adRole === 'problem' || adRole === 'agitate') {
      return 'motion_graphic';
    }
    if (adRole === 'solution' || brollType === 'product') {
      return 'motion_graphic';
    }
    if (adRole === 'insight' || adRole === 'offer' || adRole === 'cta') {
      return 'typography';
    }
    if (adRole === 'hook' || index === 0) {
      return (scores?.hook_strength && scores.hook_strength >= 88) ? 'typography' : 'motion_graphic';
    }
    if (visualDecision === 'TEXT_EMPHASIS') {
      return 'typography';
    }
    if (visualDecision === 'PUNCH_IN') {
      return 'none';
    }
    return 'none';
  }

  // WITH AUTHENTIC USER ASSETS:
  const assetType = userAsset.type;
  const isVideo = userAsset.mediaType === 'video' || (userAsset.url && /\.(mp4|webm|mov)$/i.test(userAsset.url));

  // 1. aset type screen_recording => screen_recording
  if (assetType === 'screen_recording') {
    return 'screen_recording';
  }

  // 2. aset type product berupa video => footage
  if (assetType === 'product' && isVideo) {
    return 'footage';
  }

  // 3. scene demo + screen recording / video => screen_recording
  if ((adRole === 'demo' || brollType === 'demo') && (assetType === 'screen_recording' || isVideo)) {
    return 'screen_recording';
  }

  // 4. scene proof + screenshot/dashboard => data_card atau image
  if ((adRole === 'proof' || brollType === 'proof' || brollType === 'data') && (assetType === 'dashboard' || assetType === 'screenshot')) {
    return 'data_card';
  }

  // 5. aset type dashboard => data_card
  if (assetType === 'dashboard') {
    return 'data_card';
  }

  // 6. aset type logo / UI overlay => ui_overlay
  if (assetType === 'logo' || (assetType === 'screenshot' && (adRole === 'solution' || adRole === 'cta'))) {
    return 'ui_overlay';
  }

  // 7. aset type product, screenshot, before_after berupa gambar => image / data_card / ui_overlay
  if (assetType === 'product' || assetType === 'screenshot' || assetType === 'before_after') {
    return 'image';
  }

  if (isVideo) return 'footage';
  return 'image';
}

/**
 * SFX Purpose Engine Mappings
 * Maps high-level editorial purposes to synthesized sound effects
 */
export const SFX_PURPOSE_MAP: Record<SFXPurpose, SoundEffectType[]> = {
  none: ['none'],
  curiosity: ['soft_riser', 'riser', 'tension_pulse'],
  tension: ['dark_riser', 'low_hit', 'tension_pulse'],
  transition: ['whoosh', 'fast_whoosh', 'swipe'],
  visual_appear: ['pop', 'soft_pop'],
  ui_interaction: ['click', 'button_click'],
  emphasis: ['tick', 'short_impact', 'click'],
  impact: ['impact', 'short_impact', 'low_hit'],
  reveal: ['riser', 'impact', 'success_chime'],
  success: ['ding', 'success_chime', 'cash_register'],
  error: ['error_beep', 'glitch'],
  urgency: ['tick', 'tension_pulse'],
  closing: ['downlifter', 'soft_impact', 'success_chime'],
};

/**
 * Backward compatibility reverse-lookup for legacy sound effect names
 */
export const SFX_TO_PURPOSE_FALLBACK: Record<SoundEffectType, SFXPurpose> = {
  none: 'none',
  whoosh: 'transition',
  fast_whoosh: 'transition',
  swipe: 'transition',
  pop: 'visual_appear',
  soft_pop: 'visual_appear',
  click: 'ui_interaction',
  button_click: 'ui_interaction',
  ding: 'success',
  success_chime: 'success',
  notification: 'success',
  impact: 'impact',
  short_impact: 'impact',
  soft_impact: 'closing',
  riser: 'reveal',
  soft_riser: 'curiosity',
  dark_riser: 'tension',
  tension_pulse: 'tension',
  low_hit: 'tension',
  data_blip: 'emphasis',
  glitch: 'error',
  error_beep: 'error',
  tick: 'emphasis',
  cash_register: 'success',
  downlifter: 'closing',
  camera_shutter: 'visual_appear',
};

/**
 * AI Sound Director: Selects SFX purpose based on distinct editing events
 * SFX only triggers for genuine editing events, NOT just because a scene is new.
 */
/**
 * Batch 4: Selects distinct SFX Intent based on editing role & context
 */
export function selectSfxIntentForEditing(
  scene: Partial<SceneEditPlan>,
  context?: { index?: number; totalScenes?: number; hasUserAsset?: boolean }
): { intent: SFXIntent; name: SoundEffectType; intensity: number; reason: string } {
  const index = context?.index ?? scene.id ?? 0;
  const totalScenes = context?.totalScenes ?? 1;
  const role = (scene.adRole || scene.role || '').toLowerCase();
  const text = (scene.caption || scene.headline || '').trim();
  const textUpper = text.toUpperCase();
  const brollFmt = scene.brollFormat || 'none';
  const trans = scene.transition || 'cut';

  // 1. Hook opening pattern interrupt
  if (role === 'hook' || index === 0 || textUpper.startsWith('STOP') || textUpper.startsWith('JANGAN')) {
    const isCurious = text.includes('?') || textUpper.includes('KENAPA') || textUpper.includes('TAHUKAH');
    const name: SoundEffectType = isCurious ? 'soft_riser' : 'impact';
    return {
      intent: 'hook_interrupt',
      name,
      intensity: 0.65,
      reason: 'Hook pattern interrupt: high energy attention grabber',
    };
  }

  // 2. CTA / final offer push
  if (role === 'cta' || role === 'offer' || (totalScenes > 1 && index === totalScenes - 1)) {
    return {
      intent: 'cta_push',
      name: 'soft_impact',
      intensity: 0.55,
      reason: 'CTA conversion push: clean ending lock without clutter',
    };
  }

  // 3. Proof / Data reveal
  if (brollFmt === 'data_card' || role === 'proof' || /\b\d+(\.\d+)?(x|%|roas|omset|profit)\b/i.test(textUpper)) {
    const isMetric = textUpper.includes('ROAS') || textUpper.includes('OMSET') || textUpper.includes('%');
    const name: SoundEffectType = isMetric ? 'success_chime' : 'ding';
    return {
      intent: 'data_reveal',
      name,
      intensity: 0.50,
      reason: 'Data proof metrics reveal: tangible quantitative evidence chime',
    };
  }

  // 4. UI Click / Screen demo
  if (brollFmt === 'screen_recording' || brollFmt === 'ui_overlay' || scene.visualDecision === 'PRODUCT_DEMO') {
    return {
      intent: 'ui_click',
      name: 'button_click',
      intensity: 0.35,
      reason: 'UI interaction accent: realistic screen tap response',
    };
  }

  // 5. Problem / Agitation tension
  if (role === 'problem' || role === 'agitate' || textUpper.includes('MASALAH') || textUpper.includes('BONCOS') || textUpper.includes('SALAH')) {
    return {
      intent: 'tension',
      name: 'tension_pulse',
      intensity: 0.45,
      reason: 'Problem agitation: subtle tension pulse before solution reveal',
    };
  }

  // 6. Solution / Big win reveal
  if (role === 'solution' || role === 'benefit' || brollFmt === 'motion_graphic') {
    return {
      intent: 'success',
      name: 'ding',
      intensity: 0.40,
      reason: 'Solution breakthrough: clean positive chime',
    };
  }

  // 7. Dynamic transition cut
  if (trans === 'whip_pan' || trans === 'flash' || trans === 'zoom_cut') {
    return {
      intent: 'transition',
      name: trans === 'whip_pan' ? 'fast_whoosh' : 'whoosh',
      intensity: 0.40,
      reason: 'Camera transition swipe: smooth motion dynamic cue',
    };
  }

  // 8. Text emphasis
  if (brollFmt === 'typography' || scene.visualDecision === 'TEXT_EMPHASIS') {
    return {
      intent: 'punch_emphasis',
      name: 'tick',
      intensity: 0.30,
      reason: 'Kinetic typography snap: subtle text emphasis',
    };
  }

  // Default: clean narration
  return {
    intent: 'none',
    name: 'none',
    intensity: 0,
    reason: 'Clean voice narration: voice-dominant speech clarity',
  };
}

/**
 * Batch 4: Classify strict B-Roll taxonomy, relevance reason, and blocked random assets
 */
export function determineBrollRelevanceAndType(params: {
  adRole: AdRole;
  brollFormat: BrollFormat;
  hasUserAsset: boolean;
  userAsset?: any;
  text?: string;
  visualDecision?: VisualDecision;
}): {
  brollTypeUsed: BrollTypeUsed;
  brollSource: BrollSource;
  brollRelevanceReason: string;
  brollSkippedReason?: string;
  brollRandomAssetBlocked: boolean;
} {
  const { adRole, brollFormat, hasUserAsset, userAsset, text = '', visualDecision = 'KEEP_AROLL' } = params;

  // 1. Authentic User Assets
  if (hasUserAsset && userAsset) {
    if (userAsset.type === 'screen_recording' || brollFormat === 'screen_recording') {
      return {
        brollTypeUsed: 'screen_recording',
        brollSource: 'user_asset',
        brollRelevanceReason: `Authentic product workflow screen recording relevant for ${adRole} demonstration.`,
        brollRandomAssetBlocked: false,
      };
    }
    if (userAsset.type === 'screenshot' || userAsset.type === 'dashboard') {
      return {
        brollTypeUsed: 'screenshot_overlay',
        brollSource: 'user_asset',
        brollRelevanceReason: `Authentic proof screenshot dashboard verifying claims for ${adRole} scene.`,
        brollRandomAssetBlocked: false,
      };
    }
    if (userAsset.mediaType === 'video') {
      return {
        brollTypeUsed: 'user_asset_video',
        brollSource: 'user_asset',
        brollRelevanceReason: `User-provided video asset illustrating ${adRole}.`,
        brollRandomAssetBlocked: false,
      };
    }
    return {
      brollTypeUsed: 'user_asset_image',
      brollSource: 'user_asset',
      brollRelevanceReason: `User-provided product image relevant for ${adRole}.`,
      brollRandomAssetBlocked: false,
    };
  }

  // 2. Internal Safe Visual Layers (No external random stock)
  if (brollFormat === 'data_card') {
    return {
      brollTypeUsed: 'data_card_broll',
      brollSource: 'internal_data_card',
      brollRelevanceReason: `Internal high-precision data card displaying verified metrics for ${adRole} proof.`,
      brollRandomAssetBlocked: true,
    };
  }

  if (brollFormat === 'motion_graphic') {
    return {
      brollTypeUsed: 'motion_graphic_broll',
      brollSource: 'internal_motion',
      brollRelevanceReason: `Internal kinetic motion graphic clarifying core concept for ${adRole}.`,
      brollRandomAssetBlocked: true,
    };
  }

  if (brollFormat === 'typography') {
    return {
      brollTypeUsed: 'typography_broll',
      brollSource: 'internal_typography',
      brollRelevanceReason: `Internal kinetic typography highlighting power headline for ${adRole}.`,
      brollRandomAssetBlocked: true,
    };
  }

  // 3. No B-Roll (A-Roll Talking Head Preserved)
  return {
    brollTypeUsed: 'no_broll',
    brollSource: 'none',
    brollRelevanceReason: `Direct eye-contact talking-head framing preserved to maintain speaker authenticity.`,
    brollSkippedReason: visualDecision === 'PUNCH_IN'
      ? 'A-roll talking-head punch zoom applied instead of intrusive B-roll.'
      : 'Random stock/illustration blocked; speaker eye-contact preserved.',
    brollRandomAssetBlocked: true,
  };
}

/**
 * Batch 4: Assigns Creative Rhythm Profile per scene
 */
export function determineCreativeRhythmProfile(adRole: AdRole, index: number): CreativeRhythmProfile {
  if (adRole === 'hook' || index === 0) return 'punchy_hook';
  if (adRole === 'problem' || adRole === 'agitate') return 'tension_build';
  if (adRole === 'solution') return 'solution_clarity';
  if (adRole === 'proof') return 'proof_focus';
  if (adRole === 'cta' || adRole === 'offer') return 'cta_conversion';
  return 'balanced_flow';
}

/**
 * Batch 4: Generates per-scene editorial rationale explaining Motion, SFX, and B-roll decisions
 */
export function generateEditingRationale(params: {
  adRole: AdRole;
  rhythm: CreativeRhythmProfile;
  sfxIntent: SFXIntent;
  sfxName: SoundEffectType;
  brollTypeUsed: BrollTypeUsed;
  motionScale: number;
}): string {
  const { adRole, rhythm, sfxIntent, sfxName, brollTypeUsed, motionScale } = params;
  const sfxDesc = sfxName === 'none' ? 'Clean voice (no SFX)' : `SFX "${sfxName}" (${sfxIntent}, -14dB)`;
  const motionDesc = motionScale >= 1.15 ? `dynamic punch-in (${motionScale.toFixed(2)}x)` : `subtle motion (${motionScale.toFixed(2)}x)`;
  const brollDesc = brollTypeUsed === 'no_broll' ? '100% talking-head eye-contact' : `visual layer (${brollTypeUsed})`;

  return `[${adRole.toUpperCase()}] Rhythm: ${rhythm} | Motion: ${motionDesc} | SFX: ${sfxDesc} | Visual: ${brollDesc}`;
}

export function getSfxDensityLimit(style?: string): number {
  const s = (style || '').toLowerCase();
  if (s.includes('clean_creator') || s.includes('minimalist')) return 0.20;
  if (s.includes('education') || s.includes('educational')) return 0.25;
  if (s.includes('performance_ads') || s.includes('meta_ads') || s.includes('affiliate')) return 0.40;
  if (s.includes('fast_tiktok') || s.includes('reels') || s.includes('reels_tiktok')) return 0.55;
  return 0.35;
}

/**
 * AI Sound Director: Determines SFX Purpose based on concrete visual & dramaturgical editing events
 * Intensity Calibration:
 * - 0.25 - 0.40: subtle UI / text / visual_appear
 * - 0.40 - 0.60: transition
 * - 0.60 - 0.75: hook / reveal / impact / closing / urgency (cap at 0.75 max)
 */
export function selectSfxPurposeForScene(
  scene: Partial<SceneEditPlan>,
  context?: { index?: number; totalScenes?: number; hasUserAsset?: boolean }
): { purpose: SFXPurpose; intensity: number; reason: string } {
  const index = context?.index ?? scene.id ?? 0;
  const totalScenes = context?.totalScenes ?? 1;
  const role = (scene.adRole || scene.role || '').toLowerCase();
  const text = (scene.caption || scene.headline || '').trim();
  const textUpper = text.toUpperCase();
  const brollFmt = scene.brollFormat || 'none';
  const visualDec = scene.visualDecision || 'KEEP_AROLL';
  const trans = scene.transition || 'cut';
  const hasNumbersOrProof =
    /\b\d+(\.\d+)?(x|%|k|m|jt|rb|roas|ctr|cpa)?\b/i.test(text) ||
    textUpper.includes('ROAS') ||
    textUpper.includes('OMSET') ||
    textUpper.includes('PROFIT') ||
    textUpper.includes('BUKTI') ||
    textUpper.includes('HASIL');

  // Event 1: Hook punch / Pattern interrupt (First scene or Hook role)
  if (
    role === 'hook' ||
    index === 0 ||
    textUpper.startsWith('STOP') ||
    textUpper.startsWith('JANGAN') ||
    textUpper.includes('RAHASIA') ||
    textUpper.includes('KONTEN BOFU')
  ) {
    const isQuestionOrCuriosity =
      text.includes('?') ||
      textUpper.includes('KENAPA') ||
      textUpper.includes('BAGAIMANA') ||
      textUpper.includes('TAHUKAH');
    if (isQuestionOrCuriosity) {
      return {
        purpose: 'curiosity',
        intensity: 0.50,
        reason: 'Hook curiosity trigger: soft riser opening question',
      };
    }
    return {
      purpose: 'impact',
      intensity: 0.55,
      reason: 'Hook pattern interrupt: short impact opening punch',
    };
  }

  // Event 2: CTA / Final Offer Scene
  if (role === 'cta' || role === 'offer' || (totalScenes > 1 && index === totalScenes - 1)) {
    return {
      purpose: 'closing',
      intensity: 0.45,
      reason: 'CTA conversion action: soft impact / downlifter closing lock',
    };
  }

  // Event 3: Data Card / Proof / Metric appearance
  if (
    brollFmt === 'data_card' ||
    role === 'proof' ||
    (hasNumbersOrProof && (visualDec === 'GRAPH' || visualDec === 'BROLL' || brollFmt === 'motion_graphic'))
  ) {
    return {
      purpose: 'success',
      intensity: 0.45,
      reason: 'Data proof metrics event: data blip / ding quantitative evidence',
    };
  }

  // Event 4: UI Interaction / Screen Demo overlay (Subtle UI: 0.25 - 0.35)
  if (
    brollFmt === 'ui_overlay' ||
    brollFmt === 'screen_recording' ||
    visualDec === 'PRODUCT_DEMO' ||
    visualDec === 'SCREENSHOT'
  ) {
    return {
      purpose: 'ui_interaction',
      intensity: 0.35,
      reason: 'Product UI action event: button click screen interaction',
    };
  }

  // Event 5: Problem / Agitate / Error pain point (Subtle tension pulse, keeping voice dominant)
  if (
    role === 'problem' ||
    role === 'agitate' ||
    textUpper.includes('MASALAH') ||
    textUpper.includes('RUGI') ||
    textUpper.includes('BONCOS') ||
    textUpper.includes('SALAH') ||
    textUpper.includes('GAGAL')
  ) {
    if (textUpper.includes('ERROR') || textUpper.includes('SALAH') || textUpper.includes('GAGAL') || textUpper.includes('BONCOS')) {
      return {
        purpose: 'error',
        intensity: 0.40,
        reason: 'Pain point mistake / glitch trigger event',
      };
    }
    return {
      purpose: 'tension',
      intensity: 0.40,
      reason: 'Problem agitation: subtle low tension pulse',
    };
  }

  // Event 6: Visual Appear / Solution Reveal (Motion Graphic or B-Roll layer entry)
  if (
    brollFmt === 'motion_graphic' ||
    brollFmt === 'image' ||
    brollFmt === 'footage' ||
    visualDec === 'BROLL' ||
    visualDec === 'SPLIT_SCREEN'
  ) {
    if (role === 'insight' || role === 'solution' || role === 'benefit') {
      return {
        purpose: 'reveal',
        intensity: 0.70,
        reason: 'Solution reveal: visual asset and breakthrough explanation',
      };
    }
    return {
      purpose: 'visual_appear',
      intensity: 0.35,
      reason: 'Visual overlay entrance: secondary media pop-in',
    };
  }

  // Event 7: Text Emphasis / Typography headline badge (Subtle Text: 0.25 - 0.40)
  if (
    visualDec === 'TEXT_EMPHASIS' ||
    brollFmt === 'typography' ||
    (scene.highlight_words && scene.highlight_words.length > 0 && scene.caption_style === 'hook')
  ) {
    return {
      purpose: 'emphasis',
      intensity: 0.35,
      reason: 'Text emphasis event: kinetic typography highlight snap',
    };
  }

  // Event 8: Dynamic Camera Transition Cut (Transition: 0.40 - 0.60)
  if (trans === 'flash' || trans === 'whip_pan' || trans === 'zoom_cut') {
    return {
      purpose: 'transition',
      intensity: 0.50,
      reason: 'Dynamic transition swipe: visual camera cut accent',
    };
  }

  // Event 9: Urgency / Limited time trigger
  if (
    textUpper.includes('SEKARANG') ||
    textUpper.includes('BURUAN') ||
    textUpper.includes('TERBATAS') ||
    textUpper.includes('HARI INI')
  ) {
    return {
      purpose: 'urgency',
      intensity: 0.65,
      reason: 'Urgency trigger: FOMO and immediate action pulse',
    };
  }

  // Default: Clean narration with zero SFX distraction
  return {
    purpose: 'none',
    intensity: 0,
    reason: 'Clean voice narration: no distracting sound effect needed',
  };
}

/**
 * AI Sound Director: Selects the optimal SoundEffectType based on SFXPurpose & scene nuance
 */
export function selectSfxNameForPurpose(
  purpose: SFXPurpose,
  scene?: Partial<SceneEditPlan>,
  index: number = 0
): SoundEffectType {
  if (!purpose || purpose === 'none') return 'none';

  const text = (scene?.caption || scene?.headline || '').toUpperCase();
  const brollFmt = scene?.brollFormat || 'none';

  switch (purpose) {
    case 'curiosity': {
      if (text.includes('?')) return 'soft_riser';
      const options = SFX_PURPOSE_MAPPINGS.curiosity || ['soft_riser', 'riser', 'tension_pulse'];
      return options[index % options.length];
    }
    case 'tension': {
      if (text.includes('BAHAYA') || text.includes('FATAL') || text.includes('BONCOS')) return 'dark_riser';
      const options = SFX_PURPOSE_MAPPINGS.tension || ['dark_riser', 'low_hit', 'tension_pulse'];
      return options[index % options.length];
    }
    case 'transition': {
      const trans = scene?.transition;
      if (trans === 'whip_pan') return 'fast_whoosh';
      if (trans === 'flash') return 'whoosh';
      const options = SFX_PURPOSE_MAPPINGS.transition || ['whoosh', 'fast_whoosh', 'swipe'];
      return options[index % options.length];
    }
    case 'visual_appear': {
      const options = SFX_PURPOSE_MAPPINGS.visual_appear || ['pop', 'soft_pop'];
      return options[index % options.length];
    }
    case 'ui_interaction': {
      if (brollFmt === 'screen_recording') return 'button_click';
      const options = SFX_PURPOSE_MAPPINGS.ui_interaction || ['click', 'button_click'];
      return options[index % options.length];
    }
    case 'emphasis': {
      if (brollFmt === 'typography') return 'short_impact';
      const options = SFX_PURPOSE_MAPPINGS.emphasis || ['tick', 'short_impact', 'click'];
      return options[index % options.length];
    }
    case 'impact': {
      if (index === 0) return 'impact';
      const options = SFX_PURPOSE_MAPPINGS.impact || ['impact', 'short_impact', 'low_hit'];
      return options[index % options.length];
    }
    case 'reveal': {
      if (text.includes('HASIL') || text.includes('OMSET')) return 'success_chime';
      const options = SFX_PURPOSE_MAPPINGS.reveal || ['riser', 'impact', 'success_chime'];
      return options[index % options.length];
    }
    case 'success': {
      if (
        text.includes('ROAS') ||
        text.includes('OMSET') ||
        text.includes('CUAN') ||
        text.includes('PROFIT') ||
        text.includes('RP') ||
        text.includes('$')
      ) {
        return 'cash_register';
      }
      const options = SFX_PURPOSE_MAPPINGS.success || ['ding', 'success_chime', 'cash_register'];
      return options[index % options.length];
    }
    case 'error': {
      if (text.includes('ERROR') || text.includes('GLITCH')) return 'glitch';
      const options = SFX_PURPOSE_MAPPINGS.error || ['error_beep', 'glitch'];
      return options[index % options.length];
    }
    case 'urgency': {
      const options = SFX_PURPOSE_MAPPINGS.urgency || ['tick', 'tension_pulse'];
      return options[index % options.length];
    }
    case 'closing': {
      if (text.includes('KLIK') || text.includes('LINK') || text.includes('BIO')) return 'soft_impact';
      const options = SFX_PURPOSE_MAPPINGS.closing || ['downlifter', 'soft_impact', 'success_chime'];
      return options[index % options.length];
    }
    default:
      return 'none';
  }
}

/**
 * Backward compatibility helper for legacy ad role SFX intent
 */
export function selectSfxIntentForAdRole(adRole: AdRole, brollType: BrollType, text: string = '', index: number = 0): string {
  const purposeDecision = selectSfxPurposeForScene({ adRole, brollType, caption: text }, { index });
  return selectSfxNameForPurpose(purposeDecision.purpose, { adRole, brollType, caption: text }, index);
}

/**
 * Shared selection utility to select sound effect for a given scene.
 * This guarantees perfect parity between preview rendering and FFmpeg final rendering.
 */
export function selectSfxForScene(scene: SceneEditPlan, index: number): { effect: string; intent: string; intensity: number; reason: string } {
  const explicitSfx = (scene.sfxName || scene.sound_effect || '').trim();
  if (explicitSfx && explicitSfx !== 'auto' && explicitSfx !== '') {
    const purpose = scene.sfxPurpose || (explicitSfx === 'none' ? 'none' : 'emphasis');
    return {
      effect: explicitSfx,
      intent: purpose,
      intensity: scene.sfxIntensity ?? (explicitSfx === 'none' ? 0 : 0.75),
      reason: scene.sfxReason || `Assigned SFX: ${explicitSfx}`,
    };
  }

  const sfxDecision = selectSfxPurposeForScene(scene, { index });
  const sfxName = selectSfxNameForPurpose(sfxDecision.purpose, scene, index);
  return {
    effect: sfxName,
    intent: sfxDecision.purpose,
    intensity: sfxDecision.intensity,
    reason: sfxDecision.reason,
  };
}

/**
 * Batch 2: Generates punchy, marketing-oriented upper hook text (3-6 words max)
 * Extracts 3-6 core high-impact words from hook or headline, avoiding long conversational sentences.
 */
export function generatePunchyHookText(text: string = '', adRole: AdRole = 'hook', sceneIndex: number = 0): string {
  const words = text
    .toUpperCase()
    .replace(/[^A-Z0-9?! ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  if (words.length >= 3 && words.length <= 6) {
    return words.join(' ');
  }

  // Search for high-impact marketing keywords
  const highImpact = words.filter(w =>
    /\d+|%|BOFU|TOFU|MOFU|MACET|ROAS|OMSET|CPA|CTR|SOLUSI|RAHASIA|STOP|MASALAH|BUKAN|TRIK|SIMPAN|STRATEGI|HASIL|BUKTI|KLIK|COBA|JANGAN|RUGI/i.test(w)
  );
  if (highImpact.length >= 3 && highImpact.length <= 6) {
    return highImpact.join(' ');
  }

  if (adRole === 'hook' || sceneIndex === 0) return 'KONTEN BOFU MACET?';
  if (adRole === 'problem' || adRole === 'agitate') return 'INI MASALAHNYA';
  if (adRole === 'insight') return 'BUKAN KONTENMU';
  if (adRole === 'solution' || adRole === 'demo') return 'INI SOLUSINYA';
  if (adRole === 'proof') return 'LIHAT HASILNYA';
  if (adRole === 'cta' || adRole === 'offer') return 'SIMPAN STRATEGINYA';

  if (words.length >= 3) return words.slice(0, 5).join(' ');
  return 'KONTEN BOFU MACET?';
}

/**
 * Extracts 1-3 emphasis words for text highlight
 */
export function extractTextEmphasisWords(text: string = '', hookText: string = ''): string[] {
  const combined = (hookText + ' ' + text).toUpperCase();
  const words = combined.replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const priority = words.filter(w =>
    /\d+|%|BOFU|TOFU|MOFU|MACET|ROAS|OMSET|SOLUSI|RAHASIA|STOP|MASALAH|BUKAN|STRATEGI|HASIL|BUKTI/i.test(w)
  );
  if (priority.length > 0) return Array.from(new Set(priority)).slice(0, 3);
  return Array.from(new Set(words)).slice(0, 2);
}

/**
 * Full decision engine pass to enrich SceneEditPlan
 */
export function enrichSceneWithDecisionEngine(
  scene: SceneEditPlan,
  index: number,
  totalScenes: number,
  hasUserAsset?: boolean,
  allEnrichedScenesSoFar: SceneEditPlan[] = []
): SceneEditPlan {
  const adRole = mapContentRoleToAdRole(scene.role, scene.caption);
  const brollType = selectBrollTypeForAdRole(adRole, scene.caption, hasUserAsset);
  const hookText = generatePunchyHookText(scene.headline || scene.caption, adRole, index);
  const textEmphasisWords = extractTextEmphasisWords(scene.caption, hookText);

  const duration = scene.end - scene.start;
  const brollNeed = calculateBrollNeed({
    text: scene.caption,
    adRole,
    duration,
    emotional_intensity: scene.scores?.emotional_intensity,
    scores: scene.scores,
    hasUserAsset,
    motionScale: scene.motion_scale,
  });

  // STRICT RULE 2 & 3: B-roll assets are ONLY valid if user provided authentic assets
  const hasValidUserAsset = Boolean(
    hasUserAsset &&
      (scene.broll?.isUserAsset ||
        scene.visual_evidence?.isUserAsset ||
        scene.broll?.previewUrl ||
        scene.visual_evidence?.userAssetUrl)
  );

  // Rule 6: If !hasValidUserAsset, visualDecision is restricted to KEEP_AROLL, PUNCH_IN, TEXT_EMPHASIS
  let visualDecision = determineVisualDecision(brollNeed, brollType, hasValidUserAsset);

  // Rule 4: scene problem without asset => PUNCH_IN + typography
  if (!hasValidUserAsset && (adRole === 'problem' || adRole === 'agitate')) {
    visualDecision = 'PUNCH_IN';
  }

  // Determine user asset object if available
  const userAssetMeta = hasValidUserAsset
    ? {
        type: (scene.visual_evidence?.type === 'SCREEN_DEMO'
          ? 'screen_recording'
          : scene.broll?.mediaType === 'video'
          ? 'screen_recording'
          : scene.visual_evidence?.type === 'SCREEN_PROOF'
          ? 'dashboard'
          : 'screenshot') as any,
        mediaType:
          scene.broll?.mediaType ||
          (scene.broll?.sourceUrl && /\.(mp4|webm|mov)$/i.test(scene.broll.sourceUrl) ? 'video' : 'image'),
        url: scene.broll?.sourceUrl || scene.visual_evidence?.userAssetUrl,
      }
    : null;

  // Determine BrollFormat
  const brollFormat = scene.brollFormat === 'data_card'
    ? 'data_card'
    : determineBrollFormat({
        adRole,
        brollType,
        visualDecision,
        hasUserAsset: hasValidUserAsset,
        userAsset: userAssetMeta,
        text: scene.caption,
        index,
        scores: scene.scores,
        currentFormat: scene.brollFormat,
      });

  // SFX Intent & Purpose Engine (Batch 4):
  const sfxIntentResult = selectSfxIntentForEditing(
    {
      ...scene,
      adRole,
      visualDecision,
      brollFormat,
    },
    { index, totalScenes, hasUserAsset: hasValidUserAsset }
  );

  let selectedSfxIntent: SFXIntent = sfxIntentResult.intent;
  let sfxName: SoundEffectType = sfxIntentResult.name;
  let sfxIntensity = sfxIntentResult.intensity;
  let sfxReason = sfxIntentResult.reason;
  let sfxPurpose = scene.sfxPurpose || SFX_TO_PURPOSE_FALLBACK[sfxName] || 'emphasis';

  // Manual or legacy override support
  if (scene.sound_effect && scene.sound_effect !== 'none' && (scene.sound_effect as any) !== 'auto') {
    sfxName = scene.sound_effect;
    sfxPurpose = scene.sfxPurpose || SFX_TO_PURPOSE_FALLBACK[sfxName] || 'emphasis';
    sfxIntensity = Math.min(0.75, Math.max(0, scene.sfxIntensity ?? 0.65));
    sfxReason = scene.sfxReason || `Manual SFX choice: ${sfxName}`;
  }

  // SFX Cooldown Check (Min 2.0s between SFX triggers across scenes to prevent clutter - Batch 5)
  let sfxCooldownApplied = false;
  if (sfxName !== 'none' && allEnrichedScenesSoFar.length > 0) {
    const lastSfxScene = [...allEnrichedScenesSoFar].reverse().find(s => s.sound_effect && s.sound_effect !== 'none');
    if (lastSfxScene) {
      const timeSinceLastSfx = Math.abs(scene.start - lastSfxScene.start);
      if (timeSinceLastSfx < SFX_EDITING_CONFIG.minSfxGapSeconds && index > 0) {
        // Cooldown applied: keep speech clean
        sfxCooldownApplied = true;
        if (index !== totalScenes - 1 && adRole !== 'cta') {
          sfxName = 'none';
          selectedSfxIntent = 'none';
          sfxIntensity = 0;
          sfxReason = `SFX cooldown active (${timeSinceLastSfx.toFixed(1)}s < ${SFX_EDITING_CONFIG.minSfxGapSeconds}s gap): clean narration preserved to avoid clutter.`;
        }
      }
    }
  }

  // Voice safety check for dense speech rate
  const sceneDuration = Math.max(0.4, (scene.end || 0) - (scene.start || 0));
  const rawCaption = (scene.caption || '').trim();
  const captionWords = rawCaption ? rawCaption.split(/\s+/).filter(Boolean).length : 0;
  const wordsPerSecond = captionWords / sceneDuration;
  if (sfxName !== 'none' && wordsPerSecond > SFX_EDITING_CONFIG.voiceSafetyWordsPerSecondLimit && adRole !== 'hook' && index > 0 && adRole !== 'cta') {
    sfxName = 'none';
    selectedSfxIntent = 'none';
    sfxIntensity = 0;
    sfxReason = `Voice safety active (${wordsPerSecond.toFixed(1)} wps > ${SFX_EDITING_CONFIG.voiceSafetyWordsPerSecondLimit} wps): clean voice dominant speech preserved.`;
  }

  // Estimate safe peak dB (-18 dB to -10 dB target - Batch 5)
  const sfxPeakDb = sfxName === 'none'
    ? -99
    : Number((SFX_EDITING_CONFIG.targetSfxPeakDbMin + sfxIntensity * (SFX_EDITING_CONFIG.targetSfxPeakDbMax - SFX_EDITING_CONFIG.targetSfxPeakDbMin)).toFixed(1)); // -18 to -10 dB
  const sfxVoiceBalanceStatus: 'balanced' | 'voice_dominant' | 'unbalanced' =
    sfxName === 'none' ? 'voice_dominant' : (sfxPeakDb <= SFX_EDITING_CONFIG.targetSfxPeakDbMax && sfxPeakDb >= SFX_EDITING_CONFIG.targetSfxPeakDbMin ? 'balanced' : 'unbalanced');

  // Batch 4: B-roll Relevance & Classification
  const brollRelevance = determineBrollRelevanceAndType({
    adRole,
    brollFormat,
    hasUserAsset: hasValidUserAsset,
    userAsset: userAssetMeta,
    text: scene.caption,
    visualDecision,
  });

  // Batch 4: Creative Rhythm Profile
  const creativeRhythmProfile = determineCreativeRhythmProfile(adRole, index);

  // Batch 4: Editing Rationale
  const editingRationale = generateEditingRationale({
    adRole,
    rhythm: creativeRhythmProfile,
    sfxIntent: selectedSfxIntent,
    sfxName,
    brollTypeUsed: brollRelevance.brollTypeUsed,
    motionScale: scene.motion_scale || 1.0,
  });

  // Sanitize caption text lightly for speech display
  const sanitizedCaption = sanitizeCaptionText(scene.caption || '');

  // If decision is KEEP_AROLL, PUNCH_IN, or TEXT_EMPHASIS, clear any external overlays
  const isNoOverlayDecision = ['KEEP_AROLL', 'PUNCH_IN', 'TEXT_EMPHASIS'].includes(visualDecision);

  const baseScene: SceneEditPlan = {
    ...scene,
    caption: sanitizedCaption || scene.caption,
    adRole,
    brollNeedScore: brollNeed.score,
    brollNeedReasons: brollNeed.reasons,
    visualDecision,
    brollType,
    brollFormat,
    sfxIntent: `${sfxPurpose}:${sfxName}`,
    selectedSfxIntent,
    selectedSfxName: sfxName,
    sfxPurpose,
    sfxName,
    sfxIntensity,
    sfxReason,
    sfxCooldownApplied,
    sfxPeakDb,
    sfxVoiceBalanceStatus,
    sound_effect: sfxName,
    hookText,
    textEmphasisWords,
    brollTypeUsed: brollRelevance.brollTypeUsed,
    brollSource: brollRelevance.brollSource,
    brollRelevanceReason: brollRelevance.brollRelevanceReason,
    brollSkippedReason: brollRelevance.brollSkippedReason,
    brollRandomAssetBlocked: brollRelevance.brollRandomAssetBlocked,
    creativeRhythmProfile,
    editingRationale,
    broll: isNoOverlayDecision ? null : scene.broll,
    visual_evidence: isNoOverlayDecision ? null : scene.visual_evidence,
  };

  // Run layering pass
  const layeringResult = determineSfxLayers(baseScene, index, allEnrichedScenesSoFar, totalScenes);

  return {
    ...baseScene,
    sfxLayered: layeringResult.sfxLayered,
    sfxLayers: layeringResult.sfxLayers,
    sfxLayerSkipReason: layeringResult.sfxLayerSkipReason,
    sfxLayeredEligible: layeringResult.isEligible,
    sfxLayeredPattern: layeringResult.eligiblePattern,
  };
}

/**
 * AI Sound Director: Prioritizes and selects the best SFX layer(s) for a scene
 * based on editorial role & functional intent rather than naive slicing.
 * - For Hook (0-3s pattern interrupt): Allows up to hookMaxSfxLayers (2), e.g. soft_riser + short_impact
 * - For Non-Hook (standard scene): Strictly selects 1 best cue based on editorial function:
 *   * proof/data: data_blip or success_chime (never whoosh)
 *   * product/solution/reveal: success_chime or soft_impact
 *   * problem/agitate: tension_pulse or low_hit (subtle, non-gamey)
 *   * ui/demo: button_click or click
 *   * cta: soft_impact or downlifter
 */
export function selectBestSfxLayerForScene(
  layers: Array<{ purpose: SFXPurpose; name: SoundEffectType; offsetMs: number; intensity: number }>,
  scene: Partial<SceneEditPlan>,
  eligiblePattern?: string | null
): Array<{ purpose: SFXPurpose; name: SoundEffectType; offsetMs: number; intensity: number }> {
  if (!layers || layers.length === 0) return [];

  const role = String(scene.adRole || scene.role || '').toLowerCase();
  const pattern = String(eligiblePattern || '').toLowerCase();
  const isHook = pattern === 'hook' || role === 'hook';

  if (isHook) {
    // For hook, filter down to high-impact riser & impact layers up to hookMaxSfxLayers (2)
    const validHookLayers = layers.filter(l => ['soft_riser', 'short_impact', 'impact', 'riser', 'tension_pulse'].includes(l.name));
    if (validHookLayers.length > 0) {
      return validHookLayers.slice(0, SFX_EDITING_CONFIG.hookMaxSfxLayers);
    }
    // Safe hook fallback: soft_riser + short_impact if available
    const fallbackHook = layers.filter(l => ['soft_riser', 'short_impact'].includes(l.name));
    if (fallbackHook.length > 0) {
      return fallbackHook.slice(0, SFX_EDITING_CONFIG.hookMaxSfxLayers);
    }
    return [
      { purpose: 'curiosity' as SFXPurpose, name: 'soft_riser' as SoundEffectType, offsetMs: -400, intensity: 0.35 },
      { purpose: 'impact' as SFXPurpose, name: 'short_impact' as SoundEffectType, offsetMs: 0, intensity: 0.45 },
    ].slice(0, SFX_EDITING_CONFIG.hookMaxSfxLayers);
  }

  // Priority mapping by scene role / editorial purpose for standard single-layer scenes
  const priorityByRole: Record<string, SoundEffectType[]> = {
    proof: ['data_blip', 'success_chime', 'ding'],
    data: ['data_blip', 'success_chime', 'ding'],
    proof_data: ['data_blip', 'success_chime', 'ding'],
    demo: ['button_click', 'click'],
    ui: ['button_click', 'click'],
    ui_interaction: ['button_click', 'click'],
    solution: ['success_chime', 'soft_impact'],
    reveal_product: ['success_chime', 'soft_impact'],
    product: ['success_chime', 'soft_impact'],
    benefit: ['success_chime', 'soft_impact'],
    insight: ['success_chime', 'soft_impact'],
    problem: ['tension_pulse', 'low_hit'],
    agitate: ['tension_pulse', 'low_hit'],
    before_after: role === 'problem' || role === 'agitate'
      ? ['tension_pulse', 'low_hit']
      : ['short_impact', 'soft_impact', 'tension_pulse'],
    cta: ['soft_impact', 'downlifter', 'ding'],
    offer: ['soft_impact', 'downlifter', 'ding'],
  };

  const priorityList = priorityByRole[role] || priorityByRole[pattern];
  if (!priorityList) {
    // If no editorial role mapping found, prefer clean voice over random SFX
    return [];
  }

  // Find first layer matching the priority list in order of precedence
  for (const preferredName of priorityList) {
    const matchedLayer = layers.find(l => l.name === preferredName);
    if (matchedLayer) {
      return [matchedLayer];
    }
  }

  // Safe editorial fallback: return empty array for non-hook rather than picking random layer
  return [];
}

/**
 * High-Impact Layered SFX Director:
 * Evaluates whether a scene meets the criteria for layered sound effects
 * while maintaining voice safety and spacing constraints.
 */
export function determineSfxLayers(
  scene: Partial<SceneEditPlan>,
  index: number,
  allEnrichedScenesSoFar: SceneEditPlan[] = [],
  totalScenes?: number
): {
  sfxLayered: boolean;
  sfxLayers?: Array<{ purpose: SFXPurpose; name: SoundEffectType; offsetMs: number; intensity: number }>;
  sfxLayerSkipReason?: string;
  isEligible?: boolean;
  eligiblePattern?: string;
} {
  const captionUpper = (scene.caption || '').toUpperCase();
  const role = scene.role || 'explanation';
  const adRole = scene.adRole || 'insight';
  const brollFmt = scene.brollFormat || 'none';
  const brollType = scene.brollType || 'none';
  const start = scene.start || 0;
  const end = scene.end || 3;

  // 0. User disabled SFX check
  if (scene.sound_effect === 'none') {
    return {
      sfxLayered: false,
      sfxLayers: [],
      sfxLayerSkipReason: 'User disabled SFX for this scene',
      isEligible: false,
    };
  }

  // 1. Identify Eligibility Patterns based on User Prompt Batch 2 Rules
  let isEligible = false;
  let eligiblePattern: 'hook' | 'reveal_product' | 'before_after' | 'proof_data' | 'cta' | null = null;

  // Pattern 1: Hook scene with hook_strength >= 85
  const isHook = role === 'hook' || adRole === 'hook';
  const hookStr = scene.scores?.hook_strength ?? 0;
  if (isHook && hookStr >= 85) {
    isEligible = true;
    eligiblePattern = 'hook';
  }
  // Pattern 2: Reveal produk / hasil besar
  else if (
    brollType === 'product' ||
    /REVEAL|MEMPERKENALKAN|PRODUCT|PRODUK|INI\s+DIA|KENALIN|HASIL\s+BESAR|OMZET|OMSET|PROFIT|PENDAPATAN|UNTUNG|CTR|ROAS|CPA/i.test(captionUpper)
  ) {
    isEligible = true;
    eligiblePattern = 'reveal_product';
  }
  // Pattern 3: Before-after / transformation kuat
  else if (/BEFORE-AFTER|BEFORE\s+AFTER|TRANSFORMASI|PERUBAHAN|TRANSFORM|PERBANDINGAN/i.test(captionUpper)) {
    isEligible = true;
    eligiblePattern = 'before_after';
  }
  // Pattern 4: Proof/data with important numbers
  else if (
    (role === 'proof' || adRole === 'proof' || brollType === 'data' || brollFmt === 'data_card') &&
    /\d+/.test(captionUpper)
  ) {
    isEligible = true;
    eligiblePattern = 'proof_data';
  }
  // Pattern 5: CTA utama di akhir video
  else if (
    (role === 'cta' || adRole === 'cta' || adRole === 'offer') &&
    (totalScenes !== undefined ? index >= totalScenes - 2 : true)
  ) {
    isEligible = true;
    eligiblePattern = 'cta';
  }

  if (!isEligible) {
    return {
      sfxLayered: false,
      sfxLayerSkipReason: 'Scene content is not a high-impact moment (narasi/insight biasa atau problem ringan)',
      isEligible: false,
    };
  }

  // 2. Check Voice/Dialogue Density Limit (using shared SFX_EDITING_CONFIG.voiceSafetyWordsPerSecondLimit)
  const duration = Math.max(0.1, end - start);
  const words = (scene.caption || '').trim().split(/\s+/).filter(Boolean).length;
  const wps = words / duration;
  const charSec = (scene.caption || '').length / duration;
  const isVoiceDense = wps > SFX_EDITING_CONFIG.voiceSafetyWordsPerSecondLimit || charSec > 19;

  // Protect speech clarity: suppress SFX on dense dialogue scenes unless it is a critical hook or CTA
  if (isVoiceDense && eligiblePattern !== 'hook' && eligiblePattern !== 'cta') {
    return {
      sfxLayered: false,
      sfxLayerSkipReason: `Voice density safety skip: WPS ${wps.toFixed(1)} > ${SFX_EDITING_CONFIG.voiceSafetyWordsPerSecondLimit} (dense dialogue protection)`,
      isEligible: true,
      eligiblePattern: eligiblePattern || undefined,
    };
  }

  // 3. Pacing Limits
  // A. Maksimal 1 layered SFX per 8 detik
  const recentLayeredScene = allEnrichedScenesSoFar.find(
    (sc) => sc.sfxLayered && Math.abs(start - sc.start) < 8
  );
  if (recentLayeredScene) {
    return {
      sfxLayered: false,
      sfxLayerSkipReason: `Pacing limit: Another layered SFX moment was already applied within 8.0s (at ${recentLayeredScene.start.toFixed(1)}s)`,
      isEligible: true,
      eligiblePattern: eligiblePattern || undefined,
    };
  }

  // B. Maksimal 2 layered SFX per video (within 24-30s video)
  const alreadyAppliedCount = allEnrichedScenesSoFar.filter(sc => sc.sfxLayered).length;
  if (alreadyAppliedCount >= 2) {
    return {
      sfxLayered: false,
      sfxLayerSkipReason: `Video limit: Maximum of 2 layered SFX events already reached for this video`,
      isEligible: true,
      eligiblePattern: eligiblePattern || undefined,
    };
  }

  // 4. Generate candidate layers per pattern
  let candidateLayers: Array<{ purpose: SFXPurpose; name: SoundEffectType; offsetMs: number; intensity: number }> = [];

  switch (eligiblePattern) {
    case 'hook':
      // Hook 0-3s pattern interrupt: soft riser leading into short impact (Max 2 layers)
      candidateLayers = [
        { purpose: 'curiosity', name: 'soft_riser', offsetMs: -400, intensity: 0.35 },
        { purpose: 'impact', name: 'short_impact', offsetMs: 0, intensity: 0.45 },
      ];
      break;
    case 'reveal_product':
      // Solution / Product reveal: soft curiosity cue + success chime
      candidateLayers = [
        { purpose: 'curiosity', name: 'soft_riser', offsetMs: -300, intensity: 0.35 },
        { purpose: 'success', name: 'success_chime', offsetMs: 0, intensity: 0.40 },
      ];
      break;
    case 'before_after':
      // Transformation: tension pulse into impact
      candidateLayers = [
        { purpose: 'tension', name: 'tension_pulse', offsetMs: -250, intensity: 0.35 },
        { purpose: 'impact', name: 'short_impact', offsetMs: 0, intensity: 0.40 },
      ];
      break;
    case 'proof_data':
      // Proof metrics: clean data blip or success chime
      candidateLayers = [
        { purpose: 'emphasis', name: 'data_blip', offsetMs: 0, intensity: 0.35 },
        { purpose: 'success', name: 'success_chime', offsetMs: 250, intensity: 0.35 },
      ];
      break;
    case 'cta':
      // Final conversion: clean soft impact closing or downlifter
      candidateLayers = [
        { purpose: 'closing', name: 'soft_impact', offsetMs: 0, intensity: 0.40 },
      ];
      break;
    default:
      candidateLayers = [
        { purpose: 'impact', name: 'short_impact', offsetMs: 0, intensity: 0.40 },
      ];
      break;
  }

  // Select best layers using priority function based on scene role rather than raw slicing
  const selectedLayers = selectBestSfxLayerForScene(candidateLayers, scene, eligiblePattern);

  if (!selectedLayers || selectedLayers.length === 0) {
    return {
      sfxLayered: false,
      sfxLayers: [],
      sfxLayerSkipReason: 'No editorially matched SFX found, clean voice preferred',
      isEligible: true,
      eligiblePattern: eligiblePattern || undefined,
    };
  }

  return {
    sfxLayered: true,
    sfxLayers: selectedLayers,
    isEligible: true,
    eligiblePattern: eligiblePattern || undefined,
  };
}
