import { MotionPreset, ContentRole, TransitionType, SoundEffectType, CameraDynamics, SceneIntelligenceScore, ContentType, EditingIntensity } from '../types';

export interface MotionDecisionResult {
  motion: MotionPreset;
  motion_scale: number;
  transition: TransitionType;
  sound_effect: SoundEffectType;
  camera_dynamics: CameraDynamics;
  directorNote: string;
  cooldownApplied?: boolean;
  isStaticFraming?: boolean;
}

/**
 * AI Creative Performance Motion Director (Step 9.1 Quality Improvement)
 * Generates tailored camera kinematics, pacing cooldown, and natural breathing room.
 * Ensures 30-50% active motion budget and prevents consecutive repetitive presets.
 */
export function decideSceneMotion(
  role: ContentRole,
  scores: SceneIntelligenceScore,
  index: number,
  totalScenes: number,
  contentType: ContentType,
  previousMotion?: MotionPreset,
  nextRole?: ContentRole,
  sceneText?: string,
  editingIntensity?: EditingIntensity,
  previousMotionScale?: number,
  hasVisualLayerActive?: boolean
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

  // Check if previous scene had aggressive or punch motion
  const previousWasAggressive = previousMotion === 'punch_zoom' || (previousMotionScale !== undefined && previousMotionScale >= 1.15);

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
  // RULE 2: MOTION COOLDOWN AFTER HIGH PUNCH / AGGRESSIVE SHOT
  // Prevents viewer motion sickness: after an aggressive punch, provide natural breathing room
  // =========================================================================
  if (previousWasAggressive && index > 0 && role !== 'cta' && index !== totalScenes - 1) {
    const cooldownMotion: MotionPreset = 'normal';
    return {
      motion: cooldownMotion,
      motion_scale: 1.0,
      transition: 'cut',
      sound_effect: 'none',
      camera_dynamics: {
        zoomSpeed: 'linear',
        intensity: 'subtle',
        focalPoint: 'speaker_eyes',
      },
      cooldownApplied: true,
      isStaticFraming: true,
      directorNote: 'Motion Cooldown: Resting static camera framing after punch shot to maintain human visual comfort.',
    };
  }

  // =========================================================================
  // RULE 3: VISUAL LAYER ACTIVE (B-roll, Data Card, UI Overlay)
  // When high-density visual evidence is displayed, keep camera steady
  // =========================================================================
  if (hasVisualLayerActive) {
    const visualSteadyMotion: MotionPreset = previousMotion === 'normal' ? 'slow_zoom_in' : 'normal';
    const visualScale = visualSteadyMotion === 'normal' ? 1.0 : 1.04;
    return {
      motion: visualSteadyMotion,
      motion_scale: visualScale,
      transition: 'cut',
      sound_effect: 'none',
      camera_dynamics: {
        zoomSpeed: 'linear',
        intensity: 'subtle',
        focalPoint: 'center',
      },
      isStaticFraming: visualSteadyMotion === 'normal',
      directorNote: 'Visual Evidence Context: Stable camera grounding spotlighting active visual overlay and preventing motion collision.',
    };
  }

  // =========================================================================
  // RULE 4: CALL TO ACTION (CTA / Closing)
  // Direct, decisive closing re-frame without mechanical repetition
  // =========================================================================
  if (index === totalScenes - 1 || role === 'cta') {
    if (previousMotion === 'punch_zoom') {
      return {
        motion: 'slow_zoom_in',
        motion_scale: 1.12,
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

    const ctaScale = isFastTikTok ? 1.18 : 1.14;
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
  // RULE 5: LOW EDITING INTENSITY / CALM EXPLANATION / BACKGROUND STORY
  // Natural static camera shot to let the content breathe (target 30-50% active motion)
  // =========================================================================
  if (editingIntensity === 'LOW' || (role === 'explanation' && !isUrgent && !hasNumbersOrMetrics && index % 2 === 1)) {
    return {
      motion: 'normal',
      motion_scale: 1.0,
      transition: 'cut',
      sound_effect: 'none',
      camera_dynamics: {
        zoomSpeed: 'linear',
        intensity: 'subtle',
        focalPoint: 'speaker_eyes',
      },
      isStaticFraming: true,
      directorNote: 'Natural Breathing Room: Crisp static camera framing preserving direct speaker authenticity without over-editing.',
    };
  }

  // =========================================================================
  // RULE 6: CALM / EDUCATIONAL / STORYTELLING CONTEXT
  // Smooth, subtle motion to avoid mechanical feel or visual fatigue
  // =========================================================================
  if (isCalmEducational && (role === 'explanation' || role === 'solution')) {
    const motionChoice: MotionPreset = previousMotion === 'slow_zoom_in' ? 'normal' : 'slow_zoom_in';
    return {
      motion: motionChoice,
      motion_scale: motionChoice === 'normal' ? 1.0 : 1.05,
      transition: 'cut',
      sound_effect: 'none',
      camera_dynamics: {
        zoomSpeed: 'ease_in_out',
        intensity: 'subtle',
        focalPoint: 'speaker_eyes',
      },
      isStaticFraming: motionChoice === 'normal',
      directorNote: `Contextual Calm Flow (${style.toUpperCase()}): ${motionChoice === 'normal' ? '1.0x static natural' : 'Smooth 1.05x subtle zoom'} maintains human speaker cadence.`,
    };
  }

  // =========================================================================
  // RULE 7: QUESTION / CURIOSITY CONTEXT
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
  // RULE 8: PROOF & METRICS / NUMBERS IN SPEECH
  // Steady framing tailored for reading numbers and verified proof
  // =========================================================================
  if (hasNumbersOrMetrics || role === 'proof' || scores.proof_strength >= 7) {
    const proofMotion: MotionPreset = previousMotion === 'slow_zoom_in' ? 'pan_left' : 'slow_zoom_in';
    return {
      motion: proofMotion,
      motion_scale: 1.06,
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
  // RULE 9: PROBLEM / PAIN AGITATION
  // Controlled push-in to build emotional gravity
  // =========================================================================
  if (role === 'problem' || isUrgent) {
    const problemScale = isUrgent ? 1.12 : 1.08;
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
  // RULE 10: SOLUTION / BREAKTHROUGH
  // Zoom-out relief to signify resolution
  // =========================================================================
  if (role === 'solution') {
    return {
      motion: 'slow_zoom_out',
      motion_scale: 1.07,
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
  // RULE 11: HUMANIZED DYNAMICS & PREVENT PRESET REPETITION
  // Includes 'normal' in available motions to balance pacing naturally
  // =========================================================================
  const availableMotions: MotionPreset[] = ['normal', 'slow_zoom_in', 'pan_left', 'pan_right', 'slow_zoom_out'];
  const filtered = availableMotions.filter(m => m !== previousMotion);
  const selectedMotion = filtered[index % filtered.length] || 'normal';

  return {
    motion: selectedMotion,
    motion_scale: selectedMotion === 'normal' ? 1.0 : isFastTikTok ? 1.08 : 1.05,
    transition: 'cut',
    sound_effect: 'none',
    camera_dynamics: {
      zoomSpeed: 'linear',
      intensity: 'subtle',
      focalPoint: 'center',
    },
    isStaticFraming: selectedMotion === 'normal',
    directorNote: `Natural Editing Flow: Humanized camera pacing (${selectedMotion}) keeps video rhythm fresh and prevents over-editing.`,
  };
}
