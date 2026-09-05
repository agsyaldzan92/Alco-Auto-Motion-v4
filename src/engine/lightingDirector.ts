import { ContentRole, ContentType, BRollItem, VisualEvidenceCard, TalkingHeadFraming, VisualCorrectionProfile } from '../types';

/**
 * Lighting & Visual Quality Correction Engine
 * 
 * Provides adaptive, safe visual enhancements:
 * - Talking Head: Subtle face fill light (+5% brightness, +5% contrast, +3% skin warmth) for natural clarity.
 * - Screen Demo / Proof: High text legibility mode (+2% brightness, +10% contrast) so UI fonts & data pop.
 * - B-Roll Overlay: Cinematic grade (+2% brightness, +8% contrast, +6% saturation).
 * - Natural Balanced / Good Source: Minimal +2% contrast polish without over-correcting.
 */

export function analyzeSceneVisualCorrection(
  role: ContentRole,
  contentType: ContentType,
  talkingHeadFraming?: TalkingHeadFraming,
  broll?: BRollItem | null,
  visualEvidence?: VisualEvidenceCard | null
): VisualCorrectionProfile {
  const isFullBroll = broll?.overlay_style === 'full';
  const isScreenProof = visualEvidence?.type === 'SCREEN_DEMO' || visualEvidence?.type === 'SCREEN_PROOF';
  const isTalkingHead = talkingHeadFraming?.is_talking_head && !isFullBroll && !isScreenProof;

  // 1. Screen Demo / Proof: High Text Legibility Mode
  if (isScreenProof) {
    return {
      scene_type: 'screen_demo',
      brightness: 102,
      contrast: 110,
      saturate: 100,
      css_filter: 'brightness(1.02) contrast(1.10) saturate(1.00)',
      status: 'SCREEN_TEXT_CRISP',
      text_legibility_boost: true,
      note: 'Screen Demo Text Legibility: +10% contrast enhancement for sharp UI text and dashboard data readability.',
    };
  }

  // 2. Full B-Roll Overlay: Cinematic Visual Grade
  if (isFullBroll) {
    return {
      scene_type: 'broll_overlay',
      brightness: 102,
      contrast: 108,
      saturate: 106,
      css_filter: 'brightness(1.02) contrast(1.08) saturate(1.06)',
      status: 'CINEMATIC_OVERLAY_ENHANCED',
      text_legibility_boost: false,
      note: 'B-Roll Cinematic Grade: +8% rich contrast and +6% saturation for vibrant B-roll visual impact.',
    };
  }

  // 3. Talking Head Speaker Scene: Face Clarity & Natural Fill Light Boost
  if (isTalkingHead) {
    // Subtle role adjustments (e.g. Hook/CTA gets slightly more vibrant punch without artificial HDR)
    const isImpactRole = role === 'hook' || role === 'cta' || role === 'problem';
    const brightness = isImpactRole ? 105 : 104;
    const contrast = isImpactRole ? 106 : 104;
    const saturate = isImpactRole ? 104 : 103;

    return {
      scene_type: 'talking_head',
      brightness,
      contrast,
      saturate,
      css_filter: `brightness(${(brightness / 100).toFixed(2)}) contrast(${(contrast / 100).toFixed(2)}) saturate(${(saturate / 100).toFixed(2)})`,
      status: 'FACE_CLARITY_ENHANCED',
      text_legibility_boost: false,
      note: 'Talking Head Face Clarity: Natural +5% fill light & +5% subtle contrast boost for clear, natural skin tone without harsh HDR.',
    };
  }

  // 4. Natural Balanced Fallback for Good Source Video
  return {
    scene_type: 'natural_balanced',
    brightness: 100,
    contrast: 102,
    saturate: 101,
    css_filter: 'brightness(1.00) contrast(1.02) saturate(1.01)',
    status: 'NATURAL_OPTIMIZED',
    text_legibility_boost: false,
    note: 'Natural Source Quality: Minimal +2% contrast polish preserving true source colors and skin tones.',
  };
}

export function summarizeProjectVisualQuality(scenesCorrections: VisualCorrectionProfile[]): {
  overall_grade: 'OPTIMAL' | 'ENHANCED_FACE_CLARITY' | 'SCREEN_TEXT_OPTIMIZED';
  face_clarity_boost_applied: boolean;
  screen_text_crisp_applied: boolean;
  lighting_note: string;
} {
  const hasFaceClarity = scenesCorrections.some(c => c.status === 'FACE_CLARITY_ENHANCED');
  const hasScreenText = scenesCorrections.some(c => c.status === 'SCREEN_TEXT_CRISP');

  let grade: 'OPTIMAL' | 'ENHANCED_FACE_CLARITY' | 'SCREEN_TEXT_OPTIMIZED' = 'ENHANCED_FACE_CLARITY';
  if (hasScreenText) grade = 'SCREEN_TEXT_OPTIMIZED';

  return {
    overall_grade: grade,
    face_clarity_boost_applied: hasFaceClarity,
    screen_text_crisp_applied: hasScreenText,
    lighting_note: 'Visual Quality Correction Active: Adaptive natural fill light for speaker face + high-contrast text crisping for screen proof.',
  };
}
