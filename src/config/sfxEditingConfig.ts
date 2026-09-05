/**
 * Shared SFX Editing & Rendering Configuration
 * Ensures 100% parity between Decision Engine (planning) and MP4 Renderer (FFmpeg execution)
 */

export interface SfxEditingConfig {
  /** Minimum time gap in seconds between consecutive SFX triggers to prevent auditory clutter */
  minSfxGapSeconds: number;
  /** Maximum number of SFX triggers allowed across an entire short-form video */
  maxSfxPerShortVideo: number;
  /** Maximum SFX triggers allowed in a single scene */
  maxSfxPerScene: number;
  /** Maximum SFX layers allowed in hook scene (e.g. riser + impact) */
  hookMaxSfxLayers: number;
  /** Word speaking rate threshold (words/sec) above which non-hook SFX is suppressed for speech clarity */
  voiceSafetyWordsPerSecondLimit: number;
  /** Target minimum peak dB for rendered sound effect stem */
  targetSfxPeakDbMin: number;
  /** Target maximum peak dB for rendered sound effect stem (preventing clipping and voice masking) */
  targetSfxPeakDbMax: number;
  /** Target voice dominant dB margin */
  voiceDominantMarginDb: number;
}

export const SFX_EDITING_CONFIG: SfxEditingConfig = {
  minSfxGapSeconds: 2.0,
  maxSfxPerShortVideo: 6,
  maxSfxPerScene: 1,
  hookMaxSfxLayers: 2,
  voiceSafetyWordsPerSecondLimit: 3.2,
  targetSfxPeakDbMin: -18,
  targetSfxPeakDbMax: -10,
  voiceDominantMarginDb: 6,
};
