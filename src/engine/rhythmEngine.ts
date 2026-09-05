import { ContentRole, ContentType, EditingRhythm, SceneIntelligenceScore } from '../types';

/**
 * AI Creative Performance Editing Rhythm Engine
 * Calculates multi-stage cut cadence, crop shifts, and pattern-interrupt rules per style & marketing scene
 */
export function calculateEditingRhythm(
  role: ContentRole,
  scores: SceneIntelligenceScore,
  index: number,
  totalScenes: number,
  contentType: ContentType,
  segmentDuration: number
): EditingRhythm {
  const style = (contentType || 'meta_ads') as string;
  const isFastTikTok = style === 'fast_tiktok' || style === 'reels_tiktok';
  const isMetaAds = style === 'meta_ads';
  const isAffiliate = style === 'affiliate';
  const isCleanCreator = style === 'clean_creator';
  const isEducational = style === 'educational' || style === 'education';
  const isStorytelling = style === 'storytelling';

  // =========================================================================
  // 1. SPECIAL 0-3 SECONDS HOOK RHYTHM
  // High-impact pattern interrupt window with multi-stage dynamics
  // =========================================================================
  if (index === 0 || role === 'hook') {
    const stage1Dur = isFastTikTok ? 0.9 : isMetaAds ? 1.0 : isStorytelling ? 1.5 : 1.2;
    const s1Scale = isFastTikTok ? 1.32 : isMetaAds ? 1.28 : isAffiliate ? 1.25 : isCleanCreator ? 1.15 : 1.20;

    return {
      rhythm_preset: 'SPECIAL_HOOK_0_3S',
      cut_cadence_ms: Math.round((isFastTikTok ? 1000 : isMetaAds ? 1200 : 1500)),
      crop_offset: { x: isFastTikTok ? 4.0 : 2.5, y: -2.5 },
      pattern_interrupt_type: isStorytelling ? 'CROP_SHIFT' : 'PUNCH_ZOOM_SLAM',
      hook_stage_dynamic: {
        stage1DurationSec: stage1Dur,
        stage1Scale: s1Scale,
        stage1CropOffset: { x: 4.0, y: -3.5 },
        stage2Scale: s1Scale - 0.10,
        stage2CropOffset: { x: -2.0, y: 1.5 },
      },
      description: `0-3s Hook Strategy (${style.toUpperCase()}): Immediate ${s1Scale}x punch-zoom slam + pattern-interrupt forces 3s scroll stop.`,
    };
  }

  // =========================================================================
  // 2. FAST TIKTOK / REELS: Hyper-Fast Cadence (1.0s - 1.8s)
  // Continuous micro-punches & rapid crop shifts
  // =========================================================================
  if (isFastTikTok) {
    const cadence = Math.min(1800, Math.max(1000, Math.round(segmentDuration * 1000 * 0.6)));
    const alternateX = index % 2 === 0 ? 3.0 : -3.0;
    return {
      rhythm_preset: 'FAST_TIKTOK_HYPER',
      cut_cadence_ms: cadence,
      crop_offset: { x: alternateX, y: index % 3 === 0 ? 2.0 : -2.0 },
      pattern_interrupt_type: index % 2 === 0 ? 'PUNCH_ZOOM_SLAM' : 'CROP_SHIFT',
      description: `Fast TikTok Rhythm: Rapid ${cadence}ms cut cadence with aggressive crop shift prevents viewer scroll fatigue.`,
    };
  }

  // =========================================================================
  // 3. META ADS & BOFU: High-ROAS Conversion Cadence (1.5s - 2.2s)
  // Agitation -> Proof -> High-Pressure CTA
  // =========================================================================
  if (isMetaAds) {
    if (role === 'problem') {
      return {
        rhythm_preset: 'TENSE_PAIN_BUILD',
        cut_cadence_ms: 2200,
        crop_offset: { x: -2.5, y: 1.5 },
        pattern_interrupt_type: 'CROP_SHIFT',
        description: 'Meta Ads Pain Agitation: 2.2s tense cadence anchors audience frustration before revealing solution.',
      };
    }
    if (role === 'proof') {
      return {
        rhythm_preset: 'PROUD_PROOF',
        cut_cadence_ms: 1800,
        crop_offset: { x: 3.0, y: 0 },
        pattern_interrupt_type: 'PROOF_OVERLAY_CARD',
        description: 'Meta Ads Proof Cadence: 1.8s verified metrics spotlight maximizes buyer confidence.',
      };
    }
    if (role === 'cta') {
      return {
        rhythm_preset: 'CONVERSION_CTA',
        cut_cadence_ms: 1500,
        crop_offset: { x: 0, y: -2.5 },
        pattern_interrupt_type: 'CTA_PULSE',
        description: 'Meta Ads Direct Action: 1.5s high-pressure CTA pulse commands instant click-through.',
      };
    }
    return {
      rhythm_preset: 'META_ADS_ROAS',
      cut_cadence_ms: 2000,
      crop_offset: { x: 2.0, y: -1.5 },
      pattern_interrupt_type: 'CROP_SHIFT',
      description: 'Meta Ads Funnel Beat: 2.0s conversion cadence drives high retention & CTR.',
    };
  }

  // =========================================================================
  // 4. AFFILIATE / SHOWCASE: Product In-Use Cadence (1.8s - 2.5s)
  // Feature Callouts & Discount Cards
  // =========================================================================
  if (isAffiliate) {
    if (role === 'proof' || role === 'solution') {
      return {
        rhythm_preset: 'AFFILIATE_SHOWCASE',
        cut_cadence_ms: 2000,
        crop_offset: { x: 2.5, y: -1.0 },
        pattern_interrupt_type: 'PROOF_OVERLAY_CARD',
        description: 'Affiliate Showcase: 2.0s product feature beat highlights key usage & verified results.',
      };
    }
    if (role === 'cta') {
      return {
        rhythm_preset: 'CONVERSION_CTA',
        cut_cadence_ms: 1800,
        crop_offset: { x: 0, y: -2.0 },
        pattern_interrupt_type: 'CTA_PULSE',
        description: 'Affiliate Offer Push: 1.8s shop callout triggers impulse checkout action.',
      };
    }
  }

  // =========================================================================
  // 5. EDUCATIONAL / AUTHORITY: Structured Concept Cadence (2.5s - 3.8s)
  // Clear step-by-step breakdown & process maps
  // =========================================================================
  if (isEducational) {
    const cadence = Math.min(3800, Math.max(2500, Math.round(segmentDuration * 1000)));
    return {
      rhythm_preset: 'EDUCATIONAL_AUTHORITY',
      cut_cadence_ms: cadence,
      crop_offset: { x: index % 2 === 0 ? 1.5 : -1.5, y: 1.0 },
      pattern_interrupt_type: role === 'solution' ? 'PROOF_OVERLAY_CARD' : 'NONE',
      description: `Educational Cadence: Steady ${cadence}ms step-by-step pace allows full audience comprehension & authority build.`,
    };
  }

  // =========================================================================
  // 6. STORYTELLING / CINEMATIC: Emotional Arc Cadence (3.2s - 4.5s)
  // Deep connection, dramatic pauses, atmospheric flow
  // =========================================================================
  if (isStorytelling) {
    const cadence = Math.min(4500, Math.max(3200, Math.round(segmentDuration * 1000)));
    return {
      rhythm_preset: 'STORYTELLING_CINEMATIC',
      cut_cadence_ms: cadence,
      crop_offset: { x: index % 2 === 0 ? 1.0 : -1.0, y: -1.0 },
      pattern_interrupt_type: 'NONE',
      description: `Cinematic Arc: Calm ${cadence}ms cadence fosters emotional depth & narrative immersion.`,
    };
  }

  // =========================================================================
  // 7. CLEAN CREATOR: Authentic Human Flow (2.8s - 3.8s)
  // Personal talking-head focus with minimal visual clutter
  // =========================================================================
  if (isCleanCreator) {
    const cadence = Math.min(3800, Math.max(2800, Math.round(segmentDuration * 1000)));
    return {
      rhythm_preset: 'CLEAN_CREATOR_STEADY',
      cut_cadence_ms: cadence,
      crop_offset: { x: index % 2 === 0 ? 1.0 : -1.0, y: 0.5 },
      pattern_interrupt_type: 'NONE',
      description: `Clean Creator Flow: Natural ${cadence}ms conversational beat maintains authentic human connection.`,
    };
  }

  // Fallback Explanation Rhythm
  const alternateX = index % 2 === 0 ? 1.5 : -1.5;
  return {
    rhythm_preset: 'STEADY_EXPLANATION',
    cut_cadence_ms: Math.min(3500, Math.max(2200, Math.round(segmentDuration * 1000))),
    crop_offset: { x: alternateX, y: 1.0 },
    pattern_interrupt_type: 'NONE',
    description: 'Conversational Cadence: Stable 3.0s rhythm maintains viewer comprehension & eye-contact.',
  };
}
