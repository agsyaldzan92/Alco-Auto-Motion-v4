import { MotionPreset, ContentRole, TransitionType, SoundEffectType, CameraDynamics, SceneIntelligenceScore, ContentType } from '../types';

export interface MotionDecisionResult {
  motion: MotionPreset;
  motion_scale: number;
  transition: TransitionType;
  sound_effect: SoundEffectType;
  camera_dynamics: CameraDynamics;
  directorNote: string;
}

/**
 * AI Creative Performance Motion Director
 * Generates tailored camera kinematics and rhythm according to marketing role and editing grammar style
 */
export function decideSceneMotion(
  role: ContentRole,
  scores: SceneIntelligenceScore,
  index: number,
  totalScenes: number,
  contentType: ContentType,
  previousMotion?: MotionPreset,
  nextRole?: ContentRole,
  sceneText?: string
): MotionDecisionResult {
  const style = (contentType || 'meta_ads') as string;
  const isFastTikTok = style === 'fast_tiktok' || style === 'reels_tiktok';
  const isCleanCreator = style === 'clean_creator';
  const isMetaAds = style === 'meta_ads';
  const isAffiliate = style === 'affiliate';
  const isEducational = style === 'educational' || style === 'education';
  const isStorytelling = style === 'storytelling';

  const cleanText = (sceneText || '').trim().toLowerCase();
  const hasNumbersOrMetrics = /\d+%|\d+\s*(rupiah|jt|juta|ribu|rb|k|usd|\$|persen)/.test(cleanText);
  const isQuestion = cleanText.includes('?') || cleanText.startsWith('kenapa') || cleanText.startsWith('bagaimana') || cleanText.startsWith('mengapa') || cleanText.startsWith('tahu gak');
  const isCalmEducational = isEducational || isStorytelling || isCleanCreator;
  const isUrgent = cleanText.includes('sekarang') || cleanText.includes('stop') || cleanText.includes('bahaya') || cleanText.includes('terbukti') || cleanText.includes('rahasia');

  // =========================================================================
  // RULE 1: HOOK (0-3s Window)
  // High pattern interrupt for hook, calibrated by video archetype
  // =========================================================================
  if (index === 0 || role === 'hook') {
    const hookScale = isFastTikTok ? 1.25 : isMetaAds ? 1.22 : isCalmEducational ? 1.12 : 1.18;
    const transition: TransitionType = isFastTikTok || isMetaAds ? 'flash' : 'cut';
    const sfx: SoundEffectType = isCleanCreator || isStorytelling ? 'none' : 'whoosh';

    return {
      motion: 'punch_zoom',
      motion_scale: hookScale,
      transition,
      sound_effect: sfx,
      camera_dynamics: {
        zoomSpeed: 'instant',
        intensity: isFastTikTok ? 'punch' : 'high',
        focalPoint: 'speaker_eyes',
      },
      directorNote: `Hook Dynamic (${style.toUpperCase()}): ${hookScale}x punch zoom & ${transition} transition to capture immediate scroll attention.`,
    };
  }

  // =========================================================================
  // RULE 2: CALL TO ACTION (CTA / Closing)
  // Direct, decisive closing re-frame without mechanical repetition
  // =========================================================================
  if (index === totalScenes - 1 || role === 'cta') {
    if (previousMotion === 'punch_zoom') {
      return {
        motion: 'slow_zoom_in',
        motion_scale: 1.14,
        transition: 'zoom_cut',
        sound_effect: isCleanCreator ? 'none' : 'ding',
        camera_dynamics: {
          zoomSpeed: 'linear',
          intensity: 'high',
          focalPoint: 'speaker_eyes',
        },
        directorNote: 'Contextual CTA: Smooth zoom-in focus locks audience eye-contact into final action call.',
      };
    }

    const ctaScale = isFastTikTok ? 1.20 : 1.15;
    return {
      motion: 'punch_zoom',
      motion_scale: ctaScale,
      transition: isCleanCreator ? 'cut' : 'flash',
      sound_effect: isCleanCreator ? 'none' : 'pop',
      camera_dynamics: {
        zoomSpeed: 'instant',
        intensity: 'punch',
        focalPoint: 'center',
      },
      directorNote: 'Contextual CTA: Decisive re-frame pushes final conversion instruction before video loop.',
    };
  }

  // =========================================================================
  // RULE 3: CALM / EDUCATIONAL / STORYTELLING CONTEXT
  // Smooth, subtle motion to avoid mechanical feel or visual fatigue
  // =========================================================================
  if (isCalmEducational && (role === 'explanation' || role === 'solution')) {
    const motionChoice: MotionPreset = previousMotion === 'slow_zoom_in' ? 'pan_right' : 'slow_zoom_in';
    return {
      motion: motionChoice,
      motion_scale: 1.05,
      transition: 'cut',
      sound_effect: 'none',
      camera_dynamics: {
        zoomSpeed: 'ease_in_out',
        intensity: 'subtle',
        focalPoint: 'speaker_eyes',
      },
      directorNote: `Contextual Calm Flow (${style.toUpperCase()}): Smooth 1.05x ${motionChoice} maintains natural human speaker cadence.`,
    };
  }

  // =========================================================================
  // RULE 4: QUESTION / CURIOSITY CONTEXT
  // Reframing pan to match inquisitive speech tone
  // =========================================================================
  if (isQuestion || role === 'curiosity') {
    const panDirection: MotionPreset = previousMotion === 'pan_left' ? 'pan_right' : 'pan_left';
    return {
      motion: panDirection,
      motion_scale: 1.06,
      transition: 'cut',
      sound_effect: isFastTikTok ? 'whoosh' : 'none',
      camera_dynamics: {
        zoomSpeed: 'linear',
        intensity: 'subtle',
        focalPoint: 'center',
      },
      directorNote: 'Inquisitive Motion: Lateral pan re-framing reinforces speech question & curiosity hook.',
    };
  }

  // =========================================================================
  // RULE 5: PROOF & METRICS / NUMBERS IN SPEECH
  // Steady framing tailored for reading numbers and verified proof
  // =========================================================================
  if (hasNumbersOrMetrics || role === 'proof' || scores.proof_strength >= 7) {
    const proofMotion: MotionPreset = previousMotion === 'pan_right' ? 'pan_left' : 'slow_zoom_in';
    return {
      motion: proofMotion,
      motion_scale: 1.07,
      transition: isFastTikTok ? 'whip_pan' : 'cut',
      sound_effect: isCleanCreator ? 'none' : 'ding',
      camera_dynamics: {
        zoomSpeed: 'ease_in_out',
        intensity: 'subtle',
        focalPoint: 'lower_third',
      },
      directorNote: 'Data & Proof Context: Decisive, steady framing spotlighting metric figures & evidence overlays.',
    };
  }

  // =========================================================================
  // RULE 6: PROBLEM / PAIN AGITATION
  // Controlled push-in to build emotional gravity
  // =========================================================================
  if (role === 'problem' || isUrgent) {
    const problemScale = isUrgent ? 1.14 : 1.10;
    return {
      motion: 'slow_zoom_in',
      motion_scale: problemScale,
      transition: 'cut',
      sound_effect: 'none',
      camera_dynamics: {
        zoomSpeed: 'ease_in_out',
        intensity: 'moderate',
        focalPoint: 'speaker_eyes',
      },
      directorNote: 'Pain Agitation: Gradual push-in builds focus as problem point is articulated.',
    };
  }

  // =========================================================================
  // RULE 7: SOLUTION / BREAKTHROUGH
  // Zoom-out relief to signify resolution
  // =========================================================================
  if (role === 'solution') {
    return {
      motion: 'slow_zoom_out',
      motion_scale: 1.08,
      transition: isFastTikTok ? 'zoom_cut' : 'cut',
      sound_effect: isCleanCreator ? 'none' : 'pop',
      camera_dynamics: {
        zoomSpeed: 'linear',
        intensity: 'moderate',
        focalPoint: 'center',
      },
      directorNote: 'Solution Reveal: Gentle zoom-out provides visual resolution and clarity.',
    };
  }

  // =========================================================================
  // RULE 8: HUMANIZED DYNAMICS & PREVENT PRESET REPETITION
  // Alternates camera movement gracefully to eliminate template feel
  // =========================================================================
  const availableMotions: MotionPreset[] = ['slow_zoom_in', 'pan_left', 'pan_right', 'slow_zoom_out'];
  const filtered = availableMotions.filter(m => m !== previousMotion);
  const selectedMotion = filtered[index % filtered.length] || 'slow_zoom_in';

  return {
    motion: selectedMotion,
    motion_scale: isFastTikTok ? 1.10 : 1.06,
    transition: 'cut',
    sound_effect: 'none',
    camera_dynamics: {
      zoomSpeed: 'linear',
      intensity: 'subtle',
      focalPoint: 'center',
    },
    directorNote: `Natural Editing Flow: Humanized camera movement (${selectedMotion}) keeps video rhythm fresh without formulaic presets.`,
  };
}
