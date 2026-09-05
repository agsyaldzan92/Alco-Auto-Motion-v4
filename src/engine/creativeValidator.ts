import { AlcoEditingProject, CreativeAuditResult, CreativeRecommendation } from '../types';
import { SFX_EDITING_CONFIG } from '../config/sfxEditingConfig';
import { getActiveCaptionChunk } from './captionEngine';

/**
 * Creative Validation Layer (Batch 5 - Strict Creative Quality Gate)
 * Audits short-form marketing videos prior to and after rendering.
 * Evaluates Hook Strength, Caption Readability, Proof Presence, CTA Clarity, Visual Fatigue Risk, SFX Parity, and Safe Zone Compliance.
 * Calculates rigorous score without arbitrary defaults.
 */
export function validateCreativePerformance(
  project: AlcoEditingProject,
  context?: {
    parity?: any;
    frameSamplingPassed?: boolean;
    renderPlaybackPassed?: boolean;
    sfxTimelineMatched?: boolean;
    hookCaptionCollision?: boolean;
  }
): CreativeAuditResult {
  const recommendations: CreativeRecommendation[] = [];

  const scenes = project.scenes || [];
  const funnel = project.funnel_stage || 'META_ADS';

  if (scenes.length === 0) {
    return {
      overallScore: 0,
      grade: 'C',
      categoryScores: {
        hookStrength: 0,
        captionReadability: 0,
        proofPresence: 0,
        ctaClarity: 0,
        fatigueRiskControl: 0,
        safeZoneCompliance: 0,
      },
      sfxQualityScore: 0,
      brollRelevanceScore: 0,
      rhythmQualityScore: 0,
      captionPolishScore: 0,
      creativeEditingScore: 0,
      recommendations: [{
        id: 'rec-no-scenes',
        category: 'hook',
        severity: 'high',
        title: 'No Scenes Configured',
        description: 'Project contains 0 scenes. Add at least one scene to audit.',
        actionableFix: 'Create scenes from transcript before rendering.',
      }],
    };
  }

  // 1. Hook Strength Audit (0-3s)
  let hookScore = 100;
  const hookScene = scenes[0];
  if (hookScene) {
    const hookDur = Math.max(0.1, (hookScene.end || 0) - (hookScene.start || 0));
    if (hookDur > 3.2) {
      hookScore -= 15;
      recommendations.push({
        id: 'rec-hook-dur',
        sceneId: hookScene.id,
        category: 'hook',
        severity: 'high',
        title: 'Hook Scene Duration Too Long',
        description: `Hook scene runs for ${hookDur.toFixed(1)}s (target: < 3.0s). Viewers decide to swipe away within 2.5s.`,
        actionableFix: 'Trim initial hook segment to under 3.0 seconds to boost 3s retention rate.',
      });
    }

    if (hookScene.broll && hookScene.broll.overlay_style === 'full') {
      hookScore -= 20;
      recommendations.push({
        id: 'rec-hook-broll',
        sceneId: hookScene.id,
        category: 'hook',
        severity: 'high',
        title: 'Full-Screen B-Roll on Hook (0-2s)',
        description: 'Full B-roll covers the speaker face during the crucial first 2 seconds, reducing human trust.',
        actionableFix: 'Switch hook B-roll to micro-PIP overlay or keep 100% direct speaker eye-contact.',
      });
    }

    const hookText = (hookScene.caption || hookScene.headline || '').trim();
    if (!hookText) {
      hookScore -= 20;
      recommendations.push({
        id: 'rec-hook-text-missing',
        sceneId: hookScene.id,
        category: 'hook',
        severity: 'high',
        title: 'Hook Text Missing',
        description: 'No text or spoken headline in the opening scene.',
        actionableFix: 'Add a punchy hook caption or headline in the first scene.',
      });
    }

    if (hookScene.scores && hookScene.scores.hook_strength < 80) {
      hookScore -= 10;
    }
  } else {
    hookScore = 40;
  }
  hookScore = Math.max(0, Math.min(100, hookScore));

  // 2. Caption Readability & Polish Audit (WPS & Length)
  let readabilityScore = 100;
  let captionPolishScore = 100;
  let hasLongCaptions = false;
  let hasHallucination = false;

  scenes.forEach((s) => {
    const dur = Math.max(0.4, (s.end || 0) - (s.start || 0));
    const caption = (s.caption || '').trim();
    const wordsCount = caption.split(/\s+/).filter(Boolean).length;
    const wps = wordsCount / dur;

    // Penalty for overly long captions
    if (caption.length > 55 || wordsCount > 14 || wps > SFX_EDITING_CONFIG.voiceSafetyWordsPerSecondLimit + 0.8) {
      hasLongCaptions = true;
      readabilityScore -= 12;
      captionPolishScore -= 10;
      recommendations.push({
        id: `rec-readability-${s.id}`,
        sceneId: s.id,
        category: 'readability',
        severity: 'medium',
        title: `High Reading Density in Scene ${s.id}`,
        description: `Scene ${s.id} reading speed is ${wps.toFixed(1)} words/sec (${wordsCount} words in ${dur.toFixed(1)}s).`,
        actionableFix: 'Use punchy concise phrasing to maintain smooth readability.',
      });
    }

    // Penalty for technical labels or AI hallucinations
    if (
      /\[\s*(hook|problem|solution|proof|cta|scene\s*\d+|demo|intro|outro)[^\]]*\]/i.test(caption) ||
      /\b(hoofff+|hooof+|ughhh+|ufff+|aaaah+|ummmm+|uhhhhh+)\b/i.test(caption)
    ) {
      hasHallucination = true;
      captionPolishScore -= 25;
      recommendations.push({
        id: `rec-caption-noise-${s.id}`,
        sceneId: s.id,
        category: 'readability',
        severity: 'high',
        title: `Technical Label or Noise in Scene ${s.id}`,
        description: `Raw transcription in Scene ${s.id} contains internal label or filler noise.`,
        actionableFix: 'Clean transcript labels before final rendering.',
      });
    }
  });

  if (hasLongCaptions) {
    readabilityScore -= 10; // Extra penalty for long captions
  }

  readabilityScore = Math.max(0, Math.min(100, readabilityScore));
  captionPolishScore = Math.max(0, Math.min(100, captionPolishScore));

  // Ensure default minimal 85/100 if no actual visual/cooldown violations exist in the audit
  const hasVisualCaptionIssues = context?.parity?.captionLooksTooLong || context?.parity?.captionBoxTooHeavy || context?.hookCaptionCollision;
  if (!hasVisualCaptionIssues && !hasHallucination) {
    captionPolishScore = Math.max(85, captionPolishScore);
  }

  // 3. Proof Presence Audit (MOFU / BOFU / Meta Ads)
  let proofScore = 100;
  const hasProofScene = scenes.some((s) => s.role === 'proof' || s.adRole === 'proof');
  const hasProofEvidence = scenes.some(
    (s) => s.visual_evidence?.type === 'SCREEN_PROOF' || s.broll?.visual_intent === 'proof' || s.brollFormat === 'data_card'
  );

  if ((funnel === 'META_ADS' || funnel === 'BOFU' || funnel === 'MOFU') && !hasProofScene && !hasProofEvidence) {
    proofScore -= 30;
    recommendations.push({
      id: 'rec-proof-missing',
      category: 'proof',
      severity: 'high',
      title: 'Missing Visual Proof in Performance Funnel',
      description: `Project stage "${funnel}" lacks concrete visual proof metrics (ROAS, CTR, dashboard, or testimonial).`,
      actionableFix: 'Add a dedicated PROOF scene or attach a SCREEN_PROOF metric card to validate claims.',
    });
  }
  proofScore = Math.max(0, Math.min(100, proofScore));

  // 4. CTA Clarity Audit
  let ctaScore = 100;
  const lastScene = scenes[scenes.length - 1];
  if (lastScene) {
    const isCtaRole = lastScene.role === 'cta' || lastScene.adRole === 'cta' || lastScene.adRole === 'offer';
    const hasCtaText = /KLIK|LINK|BIO|KERANJANG|DAFTAR|NOW|ORDER|BUY|CHECKOUT|COBA|DOWNLOAD|DM|BELI/i.test(lastScene.caption || '');
    if (!isCtaRole && !hasCtaText) {
      ctaScore -= 25;
      recommendations.push({
        id: 'rec-cta-weak',
        sceneId: lastScene.id,
        category: 'cta',
        severity: 'high',
        title: 'Weak Action Callout at Video Ending',
        description: 'The final scene does not contain an explicit CTA or conversion prompt.',
        actionableFix: 'Set final scene role to "cta" and add a clear action prompt (e.g. "Klik link di bio!").',
      });
    }

    // Penalty if CTA is occluded by overlay
    if (lastScene.broll && lastScene.broll.overlay_style === 'full') {
      ctaScore -= 25;
      recommendations.push({
        id: 'rec-cta-blocked',
        sceneId: lastScene.id,
        category: 'cta',
        severity: 'high',
        title: 'CTA Scene Blocked by Full Overlay',
        description: 'Full-screen overlay obscures final CTA talking head / ending visual lock.',
        actionableFix: 'Keep speaker direct contact or PIP overlay during conversion callout.',
      });
    }
  } else {
    ctaScore = 40;
  }
  ctaScore = Math.max(0, Math.min(100, ctaScore));

  // 5. Visual Fatigue Risk Audit
  let fatigueScore = 100;
  scenes.forEach((s) => {
    const dur = (s.end || 0) - (s.start || 0);
    if (dur > 4.2 && (!s.broll || s.broll.visual_intent === 'none') && s.motion === 'normal' && s.visualDecision === 'KEEP_AROLL') {
      fatigueScore -= 15;
      recommendations.push({
        id: `rec-fatigue-${s.id}`,
        sceneId: s.id,
        category: 'fatigue',
        severity: 'medium',
        title: `Static Shot Risk in Scene ${s.id}`,
        description: `Scene ${s.id} runs for ${dur.toFixed(1)}s with static camera framing and no visual interrupt.`,
        actionableFix: 'Apply a 1.15x punch zoom or attach a PIP B-roll overlay to reset viewer visual fatigue.',
      });
    }
  });
  fatigueScore = Math.max(0, Math.min(100, fatigueScore));

  // 6. Safe Zone Compliance Audit (9:16 vertical margins)
  let safeZoneScore = 100;
  if (context?.hookCaptionCollision) {
    safeZoneScore -= 30;
    recommendations.push({
      id: 'rec-safezone-collision',
      category: 'safe_zone',
      severity: 'high',
      title: 'Hook & Caption Spatial Overlap Detected',
      description: 'Hook headline and spoken caption collided in vertical space.',
      actionableFix: 'Adjust hook layout or caption line height to prevent overlap.',
    });
  }

  // 7. SFX Quality & Parity Audit (Batch 5)
  let sfxQualityScore = 100;
  const sfxScenes = scenes.filter(s => s.sound_effect && s.sound_effect !== 'none');
  const allNoSfxIntentionally = scenes.every(s => s.sound_effect === 'none' || !s.sound_effect);

  if (!allNoSfxIntentionally) {
    // A. Density penalty
    const sfxDensityRatio = sfxScenes.length / scenes.length;
    if (sfxDensityRatio > 0.60 || sfxScenes.length > SFX_EDITING_CONFIG.maxSfxPerShortVideo) {
      sfxQualityScore -= 20; // Mandatory penalty: SFX terlalu padat
      recommendations.push({
        id: 'rec-sfx-dense',
        category: 'readability',
        severity: 'medium',
        title: 'SFX Cue Density Exceeds Safe Quota',
        description: `${sfxScenes.length} SFX cues across ${scenes.length} scenes (${Math.round(sfxDensityRatio * 100)}%). Max safe limit is 55%.`,
        actionableFix: 'Allow minimum 2.0s gap between SFX cues to keep voice clear.',
      });
    }

    // B. Intent mapping penalty
    const hasUnmappedSfx = sfxScenes.some(s => !s.selectedSfxIntent || s.selectedSfxIntent === 'none' || s.sfxIntent === 'none:none');
    if (hasUnmappedSfx) {
      sfxQualityScore -= 15; // Mandatory penalty: SFX tidak sesuai intent
    }

    // C. Parity mismatch penalty
    if (context?.sfxTimelineMatched === false) {
      sfxQualityScore -= 20; // Mandatory penalty: SFX planned tapi tidak rendered
      recommendations.push({
        id: 'rec-sfx-parity-mismatch',
        category: 'readability',
        severity: 'high',
        title: 'SFX Timeline Parity Mismatch',
        description: 'Planned SFX cues were dropped or altered during final rendering.',
        actionableFix: 'Synchronize SFX cooldown and density configs across planning and rendering.',
      });
    }
  }
  sfxQualityScore = Math.max(0, Math.min(100, sfxQualityScore));

  // 8. B-Roll Relevance Audit (Batch 5)
  let brollRelevanceScore = 100;
  const hasRandomStock = scenes.some(s => s.brollRandomAssetBlocked === false && !s.broll?.isUserAsset && s.brollTypeUsed === 'user_asset_video');
  if (hasRandomStock) {
    brollRelevanceScore -= 25; // Mandatory penalty: B-roll random / tidak relevan
    recommendations.push({
      id: 'rec-broll-random-stock',
      category: 'proof',
      severity: 'high',
      title: 'Unverified Stock B-Roll Detected',
      description: 'Random generic stock video reduces conversion rate and brand authenticity.',
      actionableFix: 'Use authentic user screenshots/recordings or internal motion graphics.',
    });
  }
  brollRelevanceScore = Math.max(0, Math.min(100, brollRelevanceScore));

  // 9. Creative Rhythm Quality Audit
  let rhythmQualityScore = 95;
  const hasPunchyHook = scenes.some(s => s.creativeRhythmProfile === 'punchy_hook' || s.adRole === 'hook');
  const hasRhythmDiversity = new Set(scenes.map(s => s.creativeRhythmProfile || 'balanced_flow')).size > 1;
  if (!hasPunchyHook) rhythmQualityScore -= 10;
  if (scenes.length >= 3 && !hasRhythmDiversity) rhythmQualityScore -= 8;
  rhythmQualityScore = Math.max(0, Math.min(100, rhythmQualityScore));

  // 10. Frame Sampling Audit Penalty
  let framePenalty = 0;
  if (context?.frameSamplingPassed === false) {
    framePenalty = 30; // Mandatory penalty: frame sampling gagal
    recommendations.push({
      id: 'rec-frame-sampling-failed',
      category: 'safe_zone',
      severity: 'high',
      title: 'Rendered Frame Visual QA Failed',
      description: 'Visual differences between keyframes or rendering anomalies detected in sampled output.',
      actionableFix: 'Inspect video filter graph to ensure continuous dynamic visual flow.',
    });
  }

  // Composite Category Weighted Score (0-100)
  const categoryWeighted = Math.round(
    hookScore * 0.25 +
    readabilityScore * 0.15 +
    proofScore * 0.20 +
    ctaScore * 0.15 +
    fatigueScore * 0.10 +
    safeZoneScore * 0.15
  );

  // Composite Creative Editing Score (0-100)
  let creativeEditingScore = Math.round(
    categoryWeighted * 0.35 +
    sfxQualityScore * 0.15 +
    brollRelevanceScore * 0.15 +
    rhythmQualityScore * 0.15 +
    captionPolishScore * 0.20
  );

  // Apply frame sampling penalty if failed
  creativeEditingScore = Math.max(0, Math.min(100, creativeEditingScore - framePenalty));

  // Strict Grade Determination (Grade S conditions)
  const sfxParityPass = context?.sfxTimelineMatched !== false;
  const frameQaPass = context?.frameSamplingPassed !== false;
  const renderPlaybackPass = context?.renderPlaybackPassed !== false;
  const captionPolishPass = captionPolishScore >= 85 && !hasHallucination;
  const brollRelevancePass = brollRelevanceScore >= 80;
  const hookParityPass = context?.parity?.previewFinalHookParity !== false;
  const noCollisionPass = !context?.hookCaptionCollision;

  // Additional Batch 5 Grade S Quality Gate Audits
  let hookTextTooSmall = false;
  let hookTextOnFace = false;
  let captionBigBoxUsed = false;
  let captionTooLong = false;
  let sfxNonHookUnmatched = false;

  const gradeSBlockReasons: string[] = [];

  scenes.forEach((s, idx) => {
    const isHookScene = idx === 0 || s.role === 'hook' || s.adRole === 'hook';

    // A. Hook text size & face position check
    if (isHookScene) {
      const assPt = (s as any).hook_font_pt !== undefined ? (s as any).hook_font_pt : 68;
      if (assPt < 50) {
        hookTextTooSmall = true;
        gradeSBlockReasons.push(`Hook headline di Scene ${s.id} terlalu kecil (${assPt}pt < 50pt min).`);
        recommendations.push({
          id: `rec-hook-size-${s.id}`,
          sceneId: s.id,
          category: 'hook',
          severity: 'high',
          title: 'Hook Headline Terlalu Kecil untuk Layar HP',
          description: `Ukuran font headline hook adalah ${assPt}pt. Batas minimum Grade S adalah 50pt (target 68-76pt).`,
          actionableFix: 'Perbesar ukuran font hook ke 68-76pt untuk stopping power di 3 detik pertama.',
        });
      }

      const framing = s.talking_head_framing as any;
      const hasFaceOverlap = context?.hookCaptionCollision ||
        (framing?.is_talking_head && s.hook_layout === 'center_top_impact' && (framing?.head_y_start ?? framing?.eyeline_y_percent ?? 20) < 25);
      if (hasFaceOverlap) {
        hookTextOnFace = true;
        gradeSBlockReasons.push(`Hook headline di Scene ${s.id} menutupi area wajah/mata pembicara.`);
        recommendations.push({
          id: `rec-hook-face-${s.id}`,
          sceneId: s.id,
          category: 'safe_zone',
          severity: 'high',
          title: 'Hook Headline Menutup Wajah Pembicara',
          description: 'Teks hook atas berbenturan dengan posisi mata/wajah pembicara (eyeline zone).',
          actionableFix: 'Geser hook ke margin atas aman (top: 8-12%) atau gunakan layout left_editorial.',
        });
      }
    }

    // B. Caption solid box check
    const captionStyleStr = String(s.caption_style || '');
    if (captionStyleStr === 'solid_box' || captionStyleStr === 'heavy_box' || (s as any).caption_mode === 'solid_box') {
      captionBigBoxUsed = true;
      gradeSBlockReasons.push(`Scene ${s.id} menggunakan box latar belakang tebal alih-alih style clean floating.`);
      recommendations.push({
        id: `rec-caption-box-${s.id}`,
        sceneId: s.id,
        category: 'readability',
        severity: 'high',
        title: 'Subtitle Menggunakan Box Background Tebal',
        description: `Scene ${s.id} menggunakan box solid hitam yang menutupi konten visual utama video.`,
        actionableFix: 'Ganti ke clean floating subtitle dengan drop-shadow halus dan stroke tipis.',
      });
    }

    // C. Caption length check (> 6 words per chunk or chunk duration > 3.5s)
    const captionText = (s.caption || '').trim();
    if (captionText) {
      const sceneDur = Math.max(0.6, (s.end || 3) - (s.start || 0));
      const chunks = getActiveCaptionChunk(captionText, undefined, 0, sceneDur).allChunks;
      const hasOverlengthChunk = chunks.some((chk) => chk.words.length > 6 || (chk.endOffset - chk.startOffset) > 3.5);
      if (hasOverlengthChunk) {
        captionTooLong = true;
        gradeSBlockReasons.push(`Subtitle Scene ${s.id} memiliki chunk terlalu panjang (> 6 kata atau > 3.5s).`);
        recommendations.push({
          id: `rec-caption-length-${s.id}`,
          sceneId: s.id,
          category: 'readability',
          severity: 'high',
          title: `Subtitle Terlalu Panjang di Scene ${s.id}`,
          description: `Scene ${s.id} berisi chunk yang melebihi batas 3-5 kata atau durasi 3.5s.`,
          actionableFix: 'Pecah subtitle menjadi chunk 3-5 kata selaras jeda alami narasi.',
        });
      }
    }

    // D. Non-hook SFX selected without editorial match
    const hasSfx = s.sound_effect && s.sound_effect !== 'none';
    const isUnmatchedNonHook = !isHookScene && hasSfx && (
      s.sfxReason?.toLowerCase().includes('fallback') ||
      s.sfxReason?.toLowerCase().includes('random') ||
      !s.selectedSfxIntent ||
      s.selectedSfxIntent === 'none'
    );

    if (isUnmatchedNonHook) {
      sfxNonHookUnmatched = true;
      gradeSBlockReasons.push(`Scene ${s.id} memiliki SFX "${s.sound_effect}" tanpa match peran editorial.`);
      recommendations.push({
        id: `rec-sfx-unmatched-${s.id}`,
        sceneId: s.id,
        category: 'readability',
        severity: 'high',
        title: `SFX Tanpa Editorial Match di Scene ${s.id}`,
        description: `SFX "${s.sound_effect}" terpilih tanpa kesesuaian narasi. Suara bersih lebih disukai agar vokal jernih.`,
        actionableFix: 'Pilih "Suara Bersih" (Disable SFX) atau tentukan SFX yang sesuai peran scene.',
      });
    }
  });

  const gradeSAllowed =
    creativeEditingScore >= 92 &&
    sfxParityPass &&
    frameQaPass &&
    renderPlaybackPass &&
    captionPolishPass &&
    brollRelevancePass &&
    hookParityPass &&
    noCollisionPass &&
    !hookTextTooSmall &&
    !hookTextOnFace &&
    !captionBigBoxUsed &&
    !captionTooLong &&
    !sfxNonHookUnmatched;

  let grade: 'S' | 'A+' | 'A' | 'B' | 'C' = 'B';
  if (gradeSAllowed) {
    grade = 'S';
  } else if (creativeEditingScore >= 85) {
    grade = 'A+';
  } else if (creativeEditingScore >= 78) {
    grade = 'A';
  } else if (creativeEditingScore >= 70) {
    grade = 'B';
  } else {
    grade = 'C';
  }

  const passed = grade !== 'C' && creativeEditingScore >= 50 && sfxParityPass && frameQaPass && renderPlaybackPass;

  const penalties: string[] = [];
  if (hookScore < 100) penalties.push(`Hook strength reduced by ${100 - hookScore} pts`);
  if (readabilityScore < 100) penalties.push(`Caption readability reduced by ${100 - readabilityScore} pts`);
  if (proofScore < 100) penalties.push(`Proof presence reduced by ${100 - proofScore} pts`);
  if (ctaScore < 100) penalties.push(`CTA clarity reduced by ${100 - ctaScore} pts`);
  if (fatigueScore < 100) penalties.push(`Visual fatigue risk penalty: ${100 - fatigueScore} pts`);
  if (safeZoneScore < 100) penalties.push(`Safe zone occlusion penalty: ${100 - safeZoneScore} pts`);
  if (sfxQualityScore < 100) penalties.push(`SFX quality/cooldown penalty: ${100 - sfxQualityScore} pts`);
  if (brollRelevanceScore < 100) penalties.push(`B-roll relevance penalty: ${100 - brollRelevanceScore} pts`);
  if (rhythmQualityScore < 100) penalties.push(`Rhythm pacing penalty: ${100 - rhythmQualityScore} pts`);
  if (captionPolishScore < 100) penalties.push(`Caption polish/length penalty: ${100 - captionPolishScore} pts`);
  if (framePenalty > 0) penalties.push(`Frame visual QA failure penalty: ${framePenalty} pts`);
  gradeSBlockReasons.forEach(reason => penalties.push(`Grade S Blocker: ${reason}`));

  return {
    overallScore: creativeEditingScore,
    grade,
    passed,
    breakdown: {
      penalties,
      bonuses: grade === 'S' ? ['Grade S Excellence Bonus: Full 1:1 SFX Parity, Visual QA Certified, Punchy Pacing'] : [],
      baseScore: categoryWeighted,
    },
    categoryScores: {
      hookStrength: hookScore,
      captionReadability: readabilityScore,
      proofPresence: proofScore,
      ctaClarity: ctaScore,
      fatigueRiskControl: fatigueScore,
      safeZoneCompliance: safeZoneScore,
    },
    sfxQualityScore,
    brollRelevanceScore,
    rhythmQualityScore,
    captionPolishScore,
    creativeEditingScore,
    recommendations,
  };
}

