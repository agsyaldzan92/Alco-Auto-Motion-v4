/**
 * Talking Head Motion & Framing Configuration
 * Shared configuration for PreviewPlayer and mp4Renderer to guarantee 100% visual parity.
 */

export interface TalkingHeadMotionProfile {
  scaleStart: number;
  scaleEnd: number;
  maxScale: number;
  minScale: number;
  settleScale?: number;
  cropXStart: number;
  cropXEnd: number;
  cropY: number; // Y-crop offset percentage (e.g. -4.0 for upper-third eyeline alignment)
  eyelineTargetPercent: number; // 33% = standard upper-third rule
  transitionMs: number;
  motionName: string;
}

export type TalkingHeadProfileRole = 'hook' | 'explanation' | 'solution' | 'proof' | 'cta' | 'default';

export const TALKING_HEAD_MOTION_CONFIG: Record<TalkingHeadProfileRole, TalkingHeadMotionProfile> = {
  hook: {
    scaleStart: 1.18,
    scaleEnd: 1.28,
    settleScale: 1.20,
    maxScale: 1.28,
    minScale: 1.08,
    cropXStart: 0.5,
    cropXEnd: -0.5,
    cropY: -4.0, // Upper-third eyeline, safe forehead/chin bounds
    eyelineTargetPercent: 33,
    transitionMs: 180,
    motionName: 'punch_in_settle',
  },
  explanation: {
    scaleStart: 1.10,
    scaleEnd: 1.16,
    maxScale: 1.18,
    minScale: 1.08,
    cropXStart: 0.0,
    cropXEnd: 0.0,
    cropY: -3.5,
    eyelineTargetPercent: 33,
    transitionMs: 250,
    motionName: 'slow_zoom_in',
  },
  solution: {
    scaleStart: 1.10,
    scaleEnd: 1.16,
    maxScale: 1.18,
    minScale: 1.08,
    cropXStart: 0.0,
    cropXEnd: 0.0,
    cropY: -3.5,
    eyelineTargetPercent: 33,
    transitionMs: 250,
    motionName: 'slow_zoom_in',
  },
  proof: {
    scaleStart: 1.12,
    scaleEnd: 1.16,
    maxScale: 1.18,
    minScale: 1.08,
    cropXStart: -2.0,
    cropXEnd: 2.0,
    cropY: -3.5,
    eyelineTargetPercent: 33,
    transitionMs: 250,
    motionName: 'subtle_pan_crop',
  },
  cta: {
    scaleStart: 1.12,
    scaleEnd: 1.16,
    maxScale: 1.20,
    minScale: 1.08,
    cropXStart: -1.5,
    cropXEnd: 1.5,
    cropY: -3.5,
    eyelineTargetPercent: 33,
    transitionMs: 250,
    motionName: 'punch_crop',
  },
  default: {
    scaleStart: 1.10,
    scaleEnd: 1.14,
    maxScale: 1.16,
    minScale: 1.08,
    cropXStart: 0.0,
    cropXEnd: 0.0,
    cropY: -3.5,
    eyelineTargetPercent: 33,
    transitionMs: 250,
    motionName: 'gentle_zoom',
  },
};

/**
 * Clamps scale strictly between 1.08 and 1.28
 */
export function clampScale(scale: number): number {
  return Math.min(1.28, Math.max(1.08, scale));
}

/**
 * Resolves the appropriate Talking Head Motion profile for a given scene
 */
export function resolveTalkingHeadMotionProfile(
  roleOrScene?: string | any,
  adRole?: string,
  isTalkingHead: boolean = true,
  sceneIndex: number = 0
): TalkingHeadMotionProfile & { profileKey: TalkingHeadProfileRole } {
  let roleStr = typeof roleOrScene === 'string' ? roleOrScene : roleOrScene?.role || '';
  let adRoleStr = adRole || (typeof roleOrScene === 'object' ? roleOrScene?.adRole : '');
  let isTH = isTalkingHead;

  let sceneObj: any = typeof roleOrScene === 'object' ? roleOrScene : null;

  if (sceneObj) {
    if (sceneObj.talking_head_framing?.is_talking_head !== undefined) {
      isTH = sceneObj.talking_head_framing.is_talking_head !== false;
    }
  }

  if (!isTH) {
    return {
      ...TALKING_HEAD_MOTION_CONFIG.default,
      scaleStart: 1.0,
      scaleEnd: 1.05,
      maxScale: 1.08,
      minScale: 1.0,
      cropY: 0,
      eyelineTargetPercent: 50,
      motionName: 'broll_fallback',
      profileKey: 'default',
    };
  }

  const normalizedRole = (roleStr || '').toLowerCase();
  const normalizedAdRole = (adRoleStr || '').toLowerCase();

  let baseProfile: TalkingHeadMotionProfile & { profileKey: TalkingHeadProfileRole };

  if (sceneIndex === 0 || normalizedRole === 'hook' || normalizedAdRole === 'hook') {
    baseProfile = { ...TALKING_HEAD_MOTION_CONFIG.hook, profileKey: 'hook' };
  } else if (normalizedRole === 'problem' || normalizedAdRole === 'problem') {
    baseProfile = {
      ...TALKING_HEAD_MOTION_CONFIG.explanation,
      scaleStart: 1.12,
      scaleEnd: 1.18,
      motionName: 'problem_focus',
      profileKey: 'explanation',
    };
  } else if (normalizedRole === 'solution' || normalizedAdRole === 'solution') {
    baseProfile = { ...TALKING_HEAD_MOTION_CONFIG.solution, profileKey: 'solution' };
  } else if (normalizedRole === 'explanation' || normalizedAdRole === 'explanation') {
    baseProfile = { ...TALKING_HEAD_MOTION_CONFIG.explanation, profileKey: 'explanation' };
  } else if (
    normalizedRole === 'proof' ||
    normalizedAdRole === 'proof' ||
    normalizedRole === 'social_proof' ||
    normalizedRole === 'metric_proof'
  ) {
    baseProfile = { ...TALKING_HEAD_MOTION_CONFIG.proof, profileKey: 'proof' };
  } else if (normalizedRole === 'cta' || normalizedAdRole === 'cta' || normalizedAdRole === 'offer') {
    baseProfile = { ...TALKING_HEAD_MOTION_CONFIG.cta, profileKey: 'cta' };
  } else {
    baseProfile = { ...TALKING_HEAD_MOTION_CONFIG.default, profileKey: 'default' };
  }

  // Apply scene-level overrides if sceneObj is available
  if (sceneObj) {
    const scaleOverride =
      sceneObj.talking_head_framing?.smart_reframe_scale ??
      sceneObj.motion_scale ??
      sceneObj.punch_zoom;

    if (typeof scaleOverride === 'number' && scaleOverride > 1.0) {
      const clampedScale = clampScale(scaleOverride);
      baseProfile.scaleStart = clampedScale;
      baseProfile.scaleEnd = clampScale(clampedScale + 0.08);
      baseProfile.settleScale = clampScale(clampedScale + 0.02);
      baseProfile.maxScale = clampScale(clampedScale + 0.12);
    }

    const eyelineOverride = sceneObj.talking_head_framing?.eyeline_y_percent;
    if (typeof eyelineOverride === 'number' && eyelineOverride > 0) {
      baseProfile.eyelineTargetPercent = eyelineOverride;
      baseProfile.cropY = -3.5 * (33 / Math.max(1, eyelineOverride));
    }

    const motionTypeOverride = sceneObj.motion_type || sceneObj.motion || sceneObj.talking_head_framing?.framing_mode;
    if (motionTypeOverride && typeof motionTypeOverride === 'string') {
      baseProfile.motionName = motionTypeOverride;
    }
  }

  return baseProfile;
}
