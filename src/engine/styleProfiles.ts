import { ContentType, FunnelStage } from '../types';

export interface StylePresetProfileDetailed {
  id: ContentType;
  name: string;
  tagline: string;
  funnelStage: FunnelStage;
  badgeColor: string;
  pacing: {
    cadenceRangeMs: string;
    description: string;
    speedTag: string;
  };
  captionStyle: {
    fontFamily: string;
    casing: 'uppercase' | 'titlecase' | 'verbatim';
    highlightPillColors: string;
    placement: string;
    badgeFormat: string;
  };
  motionIntensity: {
    preset: string;
    hookScale: number;
    ctaScale: number;
    sfxType: string;
    description: string;
  };
  brollBehavior: {
    density: string;
    framingDefault: 'pip' | 'full' | 'split';
    description: string;
  };
  proofVisual: {
    primaryType: string;
    badgeStyle: string;
    description: string;
  };
  ctaTreatment: {
    actionType: string;
    sfx: string;
    pulseStyle: string;
    description: string;
  };
}

export const STYLE_PRESET_PROFILES: Record<string, StylePresetProfileDetailed> = {
  meta_ads: {
    id: 'meta_ads',
    name: 'Meta Ads Direct Response',
    tagline: 'Hook-Problem-Proof-CTA 6-Stage Funnel for Maximum ROAS & Conversion',
    funnelStage: 'META_ADS',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    pacing: {
      cadenceRangeMs: '1500ms - 2200ms',
      description: 'High-ROAS snappy conversion beat. 0-3s hook slam, tense problem agitation, verified proof spotlight, and high-pressure CTA.',
      speedTag: 'High Conversion',
    },
    captionStyle: {
      fontFamily: '"Montserrat", sans-serif',
      casing: 'uppercase',
      highlightPillColors: 'Gold (#fbbf24) & Crimson (#f43f5e)',
      placement: 'Center-Bottom with Top Funnel Stage Badge',
      badgeFormat: '🔥 HOOK | 🚨 PAIN | 📊 PROOF | 🚀 CTA',
    },
    motionIntensity: {
      preset: 'Aggressive Punch & Zoom Cut',
      hookScale: 1.28,
      ctaScale: 1.22,
      sfxType: 'Whoosh & Ding SFX',
      description: '1.28x punch zoom hook slam, continuous slow push-in on pain points, dynamic zoom-out release on solution.',
    },
    brollBehavior: {
      density: 'Strategic High Density',
      framingDefault: 'pip',
      description: 'Triggers on Problem (Money Burn/Frustration), Solution (Workflow), and Proof (Verified Analytics Dashboard).',
    },
    proofVisual: {
      primaryType: 'SCREEN_PROOF & VERIFIED DASHBOARD',
      badgeStyle: 'Cyan Neon Border with Verified ROAS Metrics',
      description: 'Unassailable proof metrics (e.g. 5.4x ROAS, Rp 142M+ revenue) spotlighted with high-contrast data cards.',
    },
    ctaTreatment: {
      actionType: 'Urgent Conversion Offer',
      sfx: 'Ding & Whoosh',
      pulseStyle: 'Pulsing Indigo/Gold Conversion Card',
      description: 'Pulsing offer card ("SAVE 40% TODAY - TAP LINK IN BIO NOW") commanding immediate action.',
    },
  },

  fast_tiktok: {
    id: 'fast_tiktok',
    name: 'Fast TikTok / Reels',
    tagline: 'Hyper-Fast Pattern Interrupts & High-Octane Motion for Viral Retention',
    funnelStage: 'TOFU',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    pacing: {
      cadenceRangeMs: '1000ms - 1800ms',
      description: 'Hyper-fast cut cadence every 1.2s to prevent scroll drop-off and crush retention fatigue.',
      speedTag: 'Hyper Rapid',
    },
    captionStyle: {
      fontFamily: '"Bebas Neue", sans-serif',
      casing: 'uppercase',
      highlightPillColors: 'Neon Yellow (#fbbf24) & Cyan (#22d3ee)',
      placement: 'Center-Bottom Karaoke Pill Focus',
      badgeFormat: '⚡ FAST TIKTOK VIRAL',
    },
    motionIntensity: {
      preset: 'Hyper Punch Zoom & Flash Cuts',
      hookScale: 1.32,
      ctaScale: 1.25,
      sfxType: 'Whoosh & Pop SFX',
      description: '1.32x aggressive punch zoom slam, micro crop shifts every scene, and high-speed flash cuts.',
    },
    brollBehavior: {
      density: 'High Density (Every 1.5s)',
      framingDefault: 'pip',
      description: 'Rapid micro PIP overlays popping at 0.2s startOffset to maintain constant visual stimulation.',
    },
    proofVisual: {
      primaryType: 'SPLIT_COMPARE & METRIC BADGE',
      badgeStyle: 'High-Speed Split Comparison',
      description: 'Fast before-vs-after visual contrast to highlight immediate benefit.',
    },
    ctaTreatment: {
      actionType: 'Fast Action Punch',
      sfx: 'Whoosh',
      pulseStyle: 'Flash Cut CTA Banner',
      description: 'Snappy closing punch ("CLICK LINK DI BIO BEFORE IT GONE!").',
    },
  },

  clean_creator: {
    id: 'clean_creator',
    name: 'Clean Creator',
    tagline: 'Authentic Talking-Head Focus with Natural Camera Push-In and Human Rapport',
    funnelStage: 'TOFU',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    pacing: {
      cadenceRangeMs: '2800ms - 3800ms',
      description: 'Relaxed, conversational pace maintaining authentic human connection and trust.',
      speedTag: 'Natural Human',
    },
    captionStyle: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      casing: 'titlecase',
      highlightPillColors: 'Soft Amber (#fef08a) on Dark Navy Container',
      placement: 'Centered Rounded Container (rgba(15,23,42,0.85))',
      badgeFormat: '💬 TALKING HEAD CREATOR',
    },
    motionIntensity: {
      preset: 'Gentle Push-In & Natural Slide',
      hookScale: 1.15,
      ctaScale: 1.10,
      sfxType: 'None (Natural Audio)',
      description: 'Subtle 1.15x hook push-in, gentle pan slides, zero artificial sound effects to preserve authenticity.',
    },
    brollBehavior: {
      density: 'Selective (15%)',
      framingDefault: 'pip',
      description: 'Keeps 85% direct human eye-contact. B-roll PIPs trigger only on explicit user proof assets or core metaphors.',
    },
    proofVisual: {
      primaryType: 'AUTHENTIC USER ASSET BADGE',
      badgeStyle: 'Subtle Slate Verified Callout',
      description: 'Minimalist social proof badge or clean screenshot overlay.',
    },
    ctaTreatment: {
      actionType: 'Warm Personal Invitation',
      sfx: 'None',
      pulseStyle: 'Clean Text Conversation Prompt',
      description: 'Personal invitation ("Tulis pendapatmu di kolom komentar").',
    },
  },

  educational: {
    id: 'educational',
    name: 'Educational / Authority',
    tagline: 'Structured Concept Breakdown with Diagrams, Process Maps & Step-by-Step Flow',
    funnelStage: 'MOFU',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    pacing: {
      cadenceRangeMs: '2800ms - 4000ms',
      description: 'Clear, structured step pace allowing full audience comprehension and authority establishment.',
      speedTag: 'Structured Authority',
    },
    captionStyle: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      casing: 'uppercase',
      highlightPillColors: 'Sky Blue (#38bdf8) & Emerald (#34d399)',
      placement: 'Lower-Third Structured Container',
      badgeFormat: '💡 KEY CONCEPT | 📌 STEP BREAKDOWN',
    },
    motionIntensity: {
      preset: 'Steady Zoom & Lateral Pan',
      hookScale: 1.20,
      ctaScale: 1.12,
      sfxType: 'Pop & Soft Tone SFX',
      description: '1.20x hook zoom, steady 1.10x push-in on core concepts, lateral pan when presenting diagrams.',
    },
    brollBehavior: {
      density: 'Concept Diagrams & Process Maps',
      framingDefault: 'pip',
      description: 'High density for step workflows, market validation screenshots, and system breakdown charts.',
    },
    proofVisual: {
      primaryType: 'SCREEN_DEMO & PROCESS MAP',
      badgeStyle: 'Structured Step Diagram Card',
      description: 'Clear methodology demonstration and step-by-step workflow callouts.',
    },
    ctaTreatment: {
      actionType: 'Value Save & Follow Callout',
      sfx: 'Pop',
      pulseStyle: 'Bookmark & Save Prompt Card',
      description: 'High-value closing instruction ("Simpan video ini & follow untuk part 2!").',
    },
  },

  storytelling: {
    id: 'storytelling',
    name: 'Storytelling / Cinematic',
    tagline: 'Emotional Narrative Arc with Atmospheric Metaphor Overlays & Deep Immersion',
    funnelStage: 'MOFU',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    pacing: {
      cadenceRangeMs: '3200ms - 4500ms',
      description: 'Calm cinematic cadence fostering emotional depth, reflection, and narrative immersion.',
      speedTag: 'Cinematic Flow',
    },
    captionStyle: {
      fontFamily: '"Playfair Display", serif',
      casing: 'titlecase',
      highlightPillColors: 'Warm Cream (#fef08a) & Gold',
      placement: 'Center-Bottom Elegant Minimal Container',
      badgeFormat: '✨ CINEMATIC NARRATIVE',
    },
    motionIntensity: {
      preset: 'Slow Cinematic Push & Drift',
      hookScale: 1.18,
      ctaScale: 1.10,
      sfxType: 'None (Atmospheric Ambient)',
      description: 'Slow 1.18x cinematic push, ultra-smooth drift, allowing dramatic pauses to build emotional resonance.',
    },
    brollBehavior: {
      density: 'Cinematic Metaphor',
      framingDefault: 'full',
      description: 'Full-screen atmospheric metaphor B-roll with soft 0.85 opacity and subtle fade transitions.',
    },
    proofVisual: {
      primaryType: 'STORY MILESTONE & QUOTE',
      badgeStyle: 'Subtle Gold Narrative Callout',
      description: 'Minimalist quote card or narrative transformation milestone.',
    },
    ctaTreatment: {
      actionType: 'Reflective Closing',
      sfx: 'None',
      pulseStyle: 'Subtle Gold Fade Card',
      description: 'Thoughtful closing prompt ("Bagaimana pendapatmu? Share jika ini bermanfaat.").',
    },
  },

  affiliate: {
    id: 'affiliate',
    name: 'Affiliate / Showcase',
    tagline: 'Product In-Use Demonstration with Feature Callouts, Discount Badges & Shop Cues',
    funnelStage: 'BOFU',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    pacing: {
      cadenceRangeMs: '1800ms - 2500ms',
      description: 'Snappy product showcase cadence driving buyer curiosity and immediate purchase decision.',
      speedTag: 'Sales Showcase',
    },
    captionStyle: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      casing: 'uppercase',
      highlightPillColors: 'Emerald (#34d399) & Amber (#fbbf24)',
      placement: 'Center-Bottom with Shop Offer Tag',
      badgeFormat: '🛒 PRODUCT SHOWCASE | 🏷️ SPECIAL OFFER',
    },
    motionIntensity: {
      preset: 'Product Punch Zoom & Showcase Pan',
      hookScale: 1.25,
      ctaScale: 1.20,
      sfxType: 'Ding & Camera Shutter SFX',
      description: '1.25x hook zoom slam, punch zoom on product close-up, shutter SFX on feature reveals.',
    },
    brollBehavior: {
      density: 'Product-Centric High Density',
      framingDefault: 'pip',
      description: 'Prioritizes physical product photos, in-use video demos, before-after results, and shop UI.',
    },
    proofVisual: {
      primaryType: 'OFFER_CARD & RATING BADGE',
      badgeStyle: 'Verified Shop Rating Card',
      description: 'Verified rating card (4.9/5 stars) and discount code overlay ("SAVE 40% NOW").',
    },
    ctaTreatment: {
      actionType: 'Shop & Order Callout',
      sfx: 'Ding',
      pulseStyle: 'Pulsing Yellow Shop Button',
      description: 'Direct shop command ("Klik Keranjang Kuning di bawah & ambil promo sekarang!").',
    },
  },
};

/**
 * Helper to retrieve detailed style preset profile
 */
export function getStyleProfile(contentType: ContentType): StylePresetProfileDetailed {
  const key = (contentType || 'meta_ads') as string;
  if (key === 'reels_tiktok') return STYLE_PRESET_PROFILES.fast_tiktok;
  if (key === 'education') return STYLE_PRESET_PROFILES.educational;
  return STYLE_PRESET_PROFILES[key] || STYLE_PRESET_PROFILES.meta_ads;
}
