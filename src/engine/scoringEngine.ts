import { ContentRole, ContentType, SceneIntelligenceScore, TranscriptSegment } from '../types';

// High-impact trigger words in Indonesian & English
const HOOK_TRIGGERS = [
  'JANGAN', 'STOP', 'SALAH', 'RAHASIA', 'FATAL', 'BUANG', 'BAKAR UANG', '90%', '5X',
  'KENAPA', 'CARA', 'TERBONGKAR', 'WARNING', 'BOCORAN', 'HATI-HATI', 'TIDAK PERNAH',
  'RUGI', 'DON\'T', 'NEVER', 'SECRET', 'MISTAKE', 'STOP DOING', 'TERNYATA', 'KUNCINYA'
];

const PROBLEM_TRIGGERS = [
  'SALAH', 'BONCOS', 'BAKAR UANG', 'RUGI', 'PUSING', 'STUCK', 'GAGAL', 'SUSAH',
  'LELAH', 'BUANG WAKTU', 'BUDGET HABIS', 'TIDAK ADA HASIL', 'FRUSTRATED', 'HARD'
];

const CURIOSITY_TRIGGERS = [
  'TERNYATA', 'KUNCINYA', 'BUKAN', 'BEDANYA', 'BEFORE AFTER', 'RAHASIANYA', 'POLANYA',
  'APA ITU', 'KENAPA BISA', 'TRIK', 'HACK', 'SEBENARNYA'
];

const PROOF_TRIGGERS = [
  'BUKTI', 'HASIL', 'ROAS', 'OMSET', 'PERSEN', 'TESTIMONI', 'DATA', 'RISET',
  'CTR', 'CONVERSION', 'METRICS', 'GRAFIK', 'MELIHAT', 'TRANSFORMASI', 'JUTA', 'RIBU', 'TEMBUS'
];

const URGENCY_TRIGGERS = [
  'SEKARANG', 'KLIK', 'LINK DI BIO', 'TERBATAS', 'SEBELUM HABIS', 'HARI INI', 'PROMO',
  'DISKON', 'DAFTAR', 'GRATIS', 'BURUAN', 'DOWNLOAD', 'CHECKOUT', 'KERANJANG KUNING', 'NOW', 'AMANKAN'
];

/**
 * Evaluates multi-dimensional scene intelligence scores for a given segment
 * calibrated for high-performing vertical marketing video structure
 */
export function calculateSceneIntelligence(
  segment: TranscriptSegment,
  role: ContentRole,
  contentType: ContentType,
  index: number,
  totalScenes: number,
  previousScene?: { duration: number; motion: string; fatigue: number }
): SceneIntelligenceScore {
  const textUpper = (segment.text || '').toUpperCase();
  const duration = Math.max(0.5, segment.end - segment.start);
  const style = (contentType || 'meta_ads') as string;

  // 1. Hook Strength Calculation (0-100)
  let hookStrength = 45;
  if (index === 0 || role === 'hook') {
    hookStrength = 78;
    if (duration <= 3.2) hookStrength += 12; // Fast punchy hook bonus
    if (HOOK_TRIGGERS.some((kw) => textUpper.includes(kw))) hookStrength += 10;
    if (textUpper.includes('?') || textUpper.includes('!')) hookStrength += 5;
  } else {
    if (HOOK_TRIGGERS.some((kw) => textUpper.includes(kw))) hookStrength += 20;
    if (role === 'problem' || role === 'curiosity') hookStrength += 15;
  }
  hookStrength = Math.min(100, Math.max(20, Math.round(hookStrength)));

  // 2. Emotional Intensity (1-10)
  let emotionalIntensity = 5;
  if (role === 'hook') emotionalIntensity = 8;
  else if (role === 'problem') emotionalIntensity = 9;
  else if (role === 'curiosity') emotionalIntensity = 7;
  else if (role === 'cta') emotionalIntensity = 9;
  else if (role === 'solution') emotionalIntensity = 7;
  else if (role === 'proof') emotionalIntensity = 8;

  if (textUpper.includes('!')) emotionalIntensity = Math.min(10, emotionalIntensity + 1);

  // 3. Problem Agitation & Curiosity Tension (1-10)
  let problemAgitation = 2;
  let curiosityTension = 3;

  if (role === 'problem' || PROBLEM_TRIGGERS.some((kw) => textUpper.includes(kw))) {
    problemAgitation = 8;
    if (textUpper.includes('BAKAR UANG') || textUpper.includes('BONCOS') || textUpper.includes('RUGI')) {
      problemAgitation = 10;
    }
  }

  if (role === 'curiosity' || CURIOSITY_TRIGGERS.some((kw) => textUpper.includes(kw))) {
    curiosityTension = 9;
  }

  // 4. Urgency & CTA Pressure (1-10)
  let urgencyScore = 3;
  let ctaPressure = 2;

  if (role === 'cta' || index === totalScenes - 1) {
    urgencyScore = 9;
    ctaPressure = 9;
    if (URGENCY_TRIGGERS.some((kw) => textUpper.includes(kw))) {
      urgencyScore = 10;
      ctaPressure = 10;
    }
  } else if (URGENCY_TRIGGERS.some((kw) => textUpper.includes(kw))) {
    urgencyScore = 7;
    ctaPressure = 6;
  }

  // 5. Proof Strength (1-10)
  let proofStrength = 3;
  if (role === 'proof') proofStrength = 8;
  if (PROOF_TRIGGERS.some((kw) => textUpper.includes(kw))) {
    proofStrength = Math.min(10, proofStrength + 3);
  }
  if (/\d+%|\d+x|\d+\s*(juta|ribu|k|roas|ctr)/i.test(textUpper)) {
    proofStrength = Math.min(10, proofStrength + 2);
  }

  // 6. Clarity Score (1-10)
  const wordCount = segment.text.trim().split(/\s+/).length;
  const wordsPerSecond = wordCount / duration;
  let clarityScore = 8;
  if (wordsPerSecond > 3.8) clarityScore -= 2;
  if (wordsPerSecond < 1.5) clarityScore -= 1;
  if (wordCount > 15) clarityScore -= 2;

  // 7. Visual Fatigue Risk (0-100)
  let visualFatigueRisk = 20;
  if (duration > 4.2) visualFatigueRisk += 25;
  if (duration > 5.5) visualFatigueRisk += 30;
  if (previousScene && previousScene.fatigue > 60) {
    visualFatigueRisk += 20;
  }
  visualFatigueRisk = Math.min(100, Math.max(10, visualFatigueRisk));

  // 8. Pacing Need
  let pacingNeed: 'rapid' | 'moderate' | 'dramatic_pause' | 'punchy' = 'moderate';
  if (role === 'hook' || style === 'meta_ads' || style === 'fast_tiktok') {
    pacingNeed = 'punchy';
  } else if (role === 'curiosity' || role === 'problem') {
    pacingNeed = duration < 3.0 ? 'rapid' : 'punchy';
  } else if (role === 'proof' || role === 'cta') {
    pacingNeed = 'punchy';
  }

  return {
    hook_strength: hookStrength,
    emotional_intensity: emotionalIntensity,
    clarity_score: Math.max(1, Math.min(10, clarityScore)),
    urgency_score: urgencyScore,
    proof_strength: proofStrength,
    cta_pressure: ctaPressure,
    curiosity_tension: curiosityTension,
    problem_agitation: problemAgitation,
    visual_fatigue_risk: visualFatigueRisk,
    pacing_need: pacingNeed,
    marketing_role: role,
  };
}

/**
 * Computes overall project pacing profile and retention index
 */
export function calculateOverallPacingProfile(
  scenes: Array<{ start: number; end: number; motion: string; role: ContentRole; scores: SceneIntelligenceScore }>
) {
  if (scenes.length === 0) {
    return {
      avg_scene_duration: 3.2,
      pattern_interrupt_count: 4,
      retention_risk_points: [],
      pacing_grade: 'S' as const,
      overall_rhythm_description: 'High-Retention Marketing Flow: Fast pattern-interrupt hook & crisp CTA conversion loop.',
      hook_retention_index: 94,
    };
  }

  const totalDuration = scenes[scenes.length - 1].end;
  const avgSceneDur = Number((totalDuration / scenes.length).toFixed(1));
  
  let patternInterrupts = 0;
  const retentionRiskPoints: number[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const dur = s.end - s.start;

    // Pattern interrupts are punch zooms, whip pans, flash cuts, or sound transitions
    if (s.motion === 'punch_zoom' || s.scores.hook_strength > 80 || s.role === 'hook') {
      patternInterrupts++;
    }

    // Risk points: any scene longer than 4.5s or fatigue > 65
    if (dur > 4.5 || s.scores.visual_fatigue_risk > 65) {
      retentionRiskPoints.push(Number(s.start.toFixed(1)));
    }
  }

  const hookRetention = scenes[0]?.scores?.hook_strength || 88;

  let pacingGrade: 'S' | 'A+' | 'A' | 'B' = 'A+';
  if (avgSceneDur <= 3.8 && patternInterrupts >= Math.ceil(scenes.length * 0.4) && hookRetention >= 85) {
    pacingGrade = 'S';
  } else if (avgSceneDur <= 4.8 && patternInterrupts >= 2) {
    pacingGrade = 'A+';
  } else if (avgSceneDur <= 6.0) {
    pacingGrade = 'A';
  } else {
    pacingGrade = 'B';
  }

  return {
    avg_scene_duration: avgSceneDur,
    pattern_interrupt_count: patternInterrupts,
    retention_risk_points: retentionRiskPoints,
    pacing_grade: pacingGrade,
    overall_rhythm_description:
      pacingGrade === 'S'
        ? 'Elite Performance Marketing Rhythm: Direct hook retention, contrast tension, proof validation, and zero visual fatigue.'
        : pacingGrade === 'A+'
        ? 'High Energy Vertical Video: Balanced pacing, snappy visual transitions, and clear value proposition.'
        : 'Narrative Explainer: Smooth pacing with focused talking-head and contextual B-rolls.',
    hook_retention_index: hookRetention,
  };
}
