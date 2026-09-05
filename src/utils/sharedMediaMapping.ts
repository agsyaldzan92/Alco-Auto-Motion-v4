import { SoundEffectType, SFXPurpose, SFXIntent } from '../types';

export const SHARED_MAPPING_VERSION = '2.0.0';

export interface SFXConfig {
  type: SoundEffectType;
  defaultIntensity: number;
  durationMs: number;
  category: 'impact' | 'whoosh' | 'pop_click' | 'chime_ding' | 'riser' | 'other';
}

export const SFX_CONFIGS: Record<SoundEffectType, SFXConfig> = {
  none: { type: 'none', defaultIntensity: 0, durationMs: 0, category: 'other' },
  whoosh: { type: 'whoosh', defaultIntensity: 0.35, durationMs: 250, category: 'whoosh' },
  fast_whoosh: { type: 'fast_whoosh', defaultIntensity: 0.35, durationMs: 140, category: 'whoosh' },
  swipe: { type: 'swipe', defaultIntensity: 0.35, durationMs: 120, category: 'whoosh' },
  pop: { type: 'pop', defaultIntensity: 0.40, durationMs: 80, category: 'pop_click' },
  soft_pop: { type: 'soft_pop', defaultIntensity: 0.40, durationMs: 60, category: 'pop_click' },
  click: { type: 'click', defaultIntensity: 0.30, durationMs: 30, category: 'pop_click' },
  button_click: { type: 'button_click', defaultIntensity: 0.35, durationMs: 30, category: 'pop_click' },
  ding: { type: 'ding', defaultIntensity: 0.40, durationMs: 350, category: 'chime_ding' },
  success_chime: { type: 'success_chime', defaultIntensity: 0.45, durationMs: 400, category: 'chime_ding' },
  notification: { type: 'notification', defaultIntensity: 0.40, durationMs: 250, category: 'chime_ding' },
  impact: { type: 'impact', defaultIntensity: 0.50, durationMs: 300, category: 'impact' },
  short_impact: { type: 'short_impact', defaultIntensity: 0.50, durationMs: 160, category: 'impact' },
  soft_impact: { type: 'soft_impact', defaultIntensity: 0.45, durationMs: 200, category: 'impact' },
  riser: { type: 'riser', defaultIntensity: 0.40, durationMs: 350, category: 'riser' },
  soft_riser: { type: 'soft_riser', defaultIntensity: 0.40, durationMs: 280, category: 'riser' },
  dark_riser: { type: 'dark_riser', defaultIntensity: 0.40, durationMs: 340, category: 'riser' },
  tension_pulse: { type: 'tension_pulse', defaultIntensity: 0.40, durationMs: 280, category: 'riser' },
  low_hit: { type: 'low_hit', defaultIntensity: 0.45, durationMs: 180, category: 'impact' },
  data_blip: { type: 'data_blip', defaultIntensity: 0.35, durationMs: 40, category: 'pop_click' },
  glitch: { type: 'glitch', defaultIntensity: 0.40, durationMs: 60, category: 'other' },
  error_beep: { type: 'error_beep', defaultIntensity: 0.40, durationMs: 80, category: 'other' },
  tick: { type: 'tick', defaultIntensity: 0.30, durationMs: 20, category: 'pop_click' },
  cash_register: { type: 'cash_register', defaultIntensity: 0.45, durationMs: 350, category: 'chime_ding' },
  downlifter: { type: 'downlifter', defaultIntensity: 0.40, durationMs: 300, category: 'riser' },
  camera_shutter: { type: 'camera_shutter', defaultIntensity: 0.35, durationMs: 40, category: 'other' },
};

/**
 * Batch 4: Strict Editing Intent-to-SFX Map
 * Maps editing purpose directly to clean, subtle sound effects that never overpower spoken voice.
 */
export const SFX_INTENT_MAP: Record<SFXIntent, SoundEffectType[]> = {
  hook_interrupt: ['impact', 'short_impact', 'soft_riser'],
  punch_emphasis: ['short_impact', 'tick', 'pop'],
  transition: ['whoosh', 'fast_whoosh', 'swipe'],
  data_reveal: ['data_blip', 'success_chime', 'ding'],
  proof_pop: ['pop', 'soft_pop', 'success_chime', 'ding'],
  ui_click: ['click', 'button_click'],
  success: ['ding', 'success_chime', 'cash_register'],
  cta_push: ['soft_impact', 'downlifter', 'ding'],
  tension: ['dark_riser', 'tension_pulse', 'low_hit'],
  soft_reset: ['soft_pop', 'swipe', 'downlifter'],
  none: ['none'],
};

// Purpose map matching selection in decisionEngine.ts
export const SFX_PURPOSE_MAPPINGS: Record<SFXPurpose, SoundEffectType[]> = {
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

// Helper/shared mapping for internal visual layers
export interface InternalLayerConfig {
  format: 'typography' | 'motion_graphic' | 'data_card';
  title: string;
  themeColor: string; // e.g. '#f59e0b', '#22d3ee', '#34d399'
  assStyleName: string; // matches ASS styles
  defaultDurationSec: number;
}

export const INTERNAL_LAYER_CONFIGS: Record<'typography' | 'motion_graphic' | 'data_card', InternalLayerConfig> = {
  typography: {
    format: 'typography',
    title: 'Typography Accent',
    themeColor: '#f59e0b', // amber-400
    assStyleName: 'TypographyLayer',
    defaultDurationSec: 1.2,
  },
  motion_graphic: {
    format: 'motion_graphic',
    title: 'Motion Graphic',
    themeColor: '#22d3ee', // cyan-400
    assStyleName: 'MotionGraphicLayer',
    defaultDurationSec: 1.5,
  },
  data_card: {
    format: 'data_card',
    title: 'Data Proof Card',
    themeColor: '#34d399', // emerald-400
    assStyleName: 'DataCardLayer',
    defaultDurationSec: 1.5,
  },
};

// Timing synchronization helper
export function getLayerTiming(sceneStart: number, sceneEnd: number, format: 'typography' | 'motion_graphic' | 'data_card') {
  return {
    start: sceneStart,
    end: Math.max(sceneEnd, sceneStart + 0.8), // Minimum 0.8s hold
  };
}
