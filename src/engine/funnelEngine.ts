import { ContentType, FunnelStage, ContentRole, MotionPreset, CaptionGrammarType, TransitionType, SoundEffectType } from '../types';

export interface FunnelEditingProfile {
  funnelStage: FunnelStage;
  label: string;
  marketingFocus: string;
  recommendedMaxSceneDuration: number;
  patternInterruptFrequencySec: number;
  defaultMotionPreset: MotionPreset;
  defaultCaptionGrammar: CaptionGrammarType;
  primarySoundEffect: SoundEffectType;
  requiresProofEvidence: boolean;
  requiresCtaCard: boolean;
}

/**
 * Maps ContentType (preset) to appropriate Marketing Funnel Stage
 */
export function mapContentTypeToFunnelStage(contentType: ContentType): FunnelStage {
  switch (contentType) {
    case 'meta_ads':
      return 'META_ADS';
    case 'affiliate':
      return 'BOFU';
    case 'educational':
    case 'education':
    case 'storytelling':
      return 'MOFU';
    case 'fast_tiktok':
    case 'reels_tiktok':
    case 'clean_creator':
    default:
      return 'TOFU';
  }
}

/**
 * Returns specific editing grammar profile per Funnel Stage
 */
export function getFunnelEditingProfile(funnelStage: FunnelStage): FunnelEditingProfile {
  switch (funnelStage) {
    case 'TOFU':
      return {
        funnelStage: 'TOFU',
        label: 'TOFU - Hook & Pattern Interrupt',
        marketingFocus: 'Mass awareness, 0-3s hook retention, curiosity open loops & creator-native feel.',
        recommendedMaxSceneDuration: 2.5,
        patternInterruptFrequencySec: 2.0,
        defaultMotionPreset: 'punch_zoom',
        defaultCaptionGrammar: 'KEYWORD_EMPHASIS',
        primarySoundEffect: 'whoosh',
        requiresProofEvidence: false,
        requiresCtaCard: false,
      };

    case 'MOFU':
      return {
        funnelStage: 'MOFU',
        label: 'MOFU - Solution Clarity & Demo',
        marketingFocus: 'Consideration, step-by-step workflow, methodology demo & concept breakdown.',
        recommendedMaxSceneDuration: 3.5,
        patternInterruptFrequencySec: 3.0,
        defaultMotionPreset: 'slow_zoom_in',
        defaultCaptionGrammar: 'CAPTION_STANDARD',
        primarySoundEffect: 'pop',
        requiresProofEvidence: true,
        requiresCtaCard: false,
      };

    case 'BOFU':
      return {
        funnelStage: 'BOFU',
        label: 'BOFU - Conversion Trust & Offer',
        marketingFocus: 'Bottom-funnel conversion, unassailable proof metrics, discount offer card & CTA.',
        recommendedMaxSceneDuration: 3.0,
        patternInterruptFrequencySec: 2.2,
        defaultMotionPreset: 'punch_zoom',
        defaultCaptionGrammar: 'KEYWORD_EMPHASIS',
        primarySoundEffect: 'ding',
        requiresProofEvidence: true,
        requiresCtaCard: true,
      };

    case 'META_ADS':
    default:
      return {
        funnelStage: 'META_ADS',
        label: 'Meta Ads Direct Response',
        marketingFocus: '6-Stage Funnel (Hook -> Problem -> Curiosity -> Solution -> Proof -> CTA) for maximum ROAS.',
        recommendedMaxSceneDuration: 2.2,
        patternInterruptFrequencySec: 1.8,
        defaultMotionPreset: 'punch_zoom',
        defaultCaptionGrammar: 'HOOK_HEADLINE',
        primarySoundEffect: 'whoosh',
        requiresProofEvidence: true,
        requiresCtaCard: true,
      };
  }
}

/**
 * Determines exact Caption Grammar Type based on scene role and funnel stage
 */
export function selectCaptionGrammar(role: ContentRole, funnelStage: FunnelStage, index: number): CaptionGrammarType {
  if (index === 0 || role === 'hook') {
    return 'HOOK_HEADLINE';
  }
  if (role === 'problem' || role === 'cta' || role === 'proof' || funnelStage === 'META_ADS' || funnelStage === 'TOFU') {
    return 'KEYWORD_EMPHASIS';
  }
  return 'CAPTION_STANDARD';
}
