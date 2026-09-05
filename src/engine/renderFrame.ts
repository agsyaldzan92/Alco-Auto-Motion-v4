import { AlcoEditingProject, SceneEditPlan } from '../types';
import { getActiveCaptionChunk, determineCaptionDisplayMode } from './captionEngine';
import { sanitizeCaptionText } from '../utils/headlineSanitizer';

export interface PreloadedAssets {
  brollImages?: Record<string, HTMLImageElement>;
  evidenceImages?: Record<string, HTMLImageElement>;
}

export function drawCoverVideo(
  ctx: CanvasRenderingContext2D,
  imgOrVideo: CanvasImageSource,
  srcW: number,
  srcH: number,
  destW: number = 720,
  destH: number = 1280
) {
  if (!srcW || !srcH) {
    ctx.drawImage(imgOrVideo, 0, 0, destW, destH);
    return;
  }
  const srcAspect = srcW / srcH;
  const destAspect = destW / destH;

  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;

  if (srcAspect > destAspect) {
    drawH = destH;
    drawW = destH * srcAspect;
    drawX = (destW - drawW) / 2;
    drawY = 0;
  } else {
    drawW = destW;
    drawH = destW / srcAspect;
    drawX = 0;
    drawY = (destH - drawH) / 2;
  }

  ctx.drawImage(imgOrVideo, drawX, drawY, drawW, drawH);
}

export function drawStudioVisualizerOnCanvas(ctx: CanvasRenderingContext2D, t: number, isSpeaking: boolean) {
  const grad = ctx.createLinearGradient(0, 0, 0, 1280);
  grad.addColorStop(0, '#090d16');
  grad.addColorStop(0.35, '#1e1b4b');
  grad.addColorStop(0.7, '#0f172a');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 720, 1280);

  // Presenter circle
  ctx.save();
  ctx.translate(360, 520);
  ctx.beginPath();
  ctx.arc(0, 0, 80, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#6366f1';
  ctx.stroke();

  // Talking Head Icon
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 16px "Montserrat", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TALKING HEAD', 0, 10);
  ctx.restore();

  // Audio spectrum lines
  ctx.save();
  ctx.translate(360, 680);
  const waveCount = 12;
  const spacing = 16;
  const startX = -((waveCount * spacing) / 2);
  for (let i = 0; i < waveCount; i++) {
    const waveH = isSpeaking ? 16 + Math.sin(t * 10 + i * 0.6) * 24 : 6;
    ctx.fillStyle = i % 2 === 0 ? '#818cf8' : '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(startX + i * spacing, -waveH / 2, 8, waveH, [4]);
    ctx.fill();
  }
  ctx.restore();
}

export function getCameraTransform(scene: SceneEditPlan, currentTime: number) {
  const sceneStart = scene.start;
  const sceneEnd = scene.end;
  const sceneDur = Math.max(0.1, sceneEnd - sceneStart);
  const sceneElapsed = Math.max(0, currentTime - sceneStart);
  const progress = Math.min(1, Math.max(0, sceneElapsed / sceneDur));

  const role = scene.role;
  const motion = scene.motion;
  const thFraming = scene.talking_head_framing;

  const isTH = thFraming?.is_talking_head && thFraming.protection_status !== 'SAFE_FALLBACK';
  const baseScale = isTH ? Math.max(1.14, thFraming.smart_reframe_scale) : Math.max(1.16, scene.motion_scale || 1.18);
  const crop = isTH ? thFraming.crop_shift_offset : (scene.editing_rhythm?.crop_offset || { x: 0, y: 0 });

  const cutImpactDuration = 0.18;
  const cutImpactIntensity = 0.07;
  let cutPop = 0;
  if (sceneElapsed < cutImpactDuration) {
    const popProgress = sceneElapsed / cutImpactDuration;
    cutPop = cutImpactIntensity * (1 - Math.pow(popProgress, 2));
  }

  if (role === 'hook' || scene.editing_rhythm?.rhythm_preset === 'SPECIAL_HOOK_0_3S') {
    const isStage1 = sceneElapsed < 1.2;
    const hookScale = (isStage1 ? (isTH ? 1.26 : 1.32) : (isTH ? 1.16 : 1.22)) + cutPop;
    const cropX = isStage1 ? (isTH ? 1.5 : 3.5) : (isTH ? -1.0 : -2.0);
    const cropY = isStage1 ? (isTH ? -2.8 : -3.0) : (isTH ? -1.8 : 1.5);
    return { scale: hookScale, x: cropX, y: cropY };
  }

  switch (motion) {
    case 'punch_zoom':
      return { scale: Math.max(1.20, baseScale) + cutPop, x: crop.x, y: crop.y };
    case 'slow_zoom_in':
      return { scale: 1.04 + (Math.max(1.20, baseScale) - 1.04) * progress + cutPop, x: crop.x, y: crop.y };
    case 'slow_zoom_out':
      return { scale: Math.max(1.20, baseScale) - (Math.max(1.20, baseScale) - 1.04) * progress + cutPop, x: crop.x, y: crop.y };
    case 'pan_left':
      return { scale: Math.max(1.14, baseScale) + cutPop, x: (isTH ? 1.5 - 3 * progress : 3 - 6 * progress) + crop.x, y: crop.y };
    case 'pan_right':
      return { scale: Math.max(1.14, baseScale) + cutPop, x: (isTH ? -1.5 + 3 * progress : -3 + 6 * progress) + crop.x, y: crop.y };
    default:
      return { scale: (isTH ? baseScale : 1.06 + Math.sin(progress * Math.PI) * 0.06) + cutPop, x: crop.x, y: crop.y };
  }
}

/**
 * Renders dynamic short video captions with active karaoke word highlight in lower-third safe zone
 * Parameters: max 2 lines, 2-3 words per line, no giant black boxes
 */
export function drawCaptionsOnCanvas(
  ctx: CanvasRenderingContext2D,
  scene: SceneEditPlan,
  currentTime: number,
  project: AlcoEditingProject,
  sceneIndex: number,
  isSafeMode: boolean = false
) {
  if (!scene.caption) return;

  const sceneStart = scene.start;
  const sceneEnd = scene.end;
  const sceneDur = Math.max(0.1, sceneEnd - sceneStart);
  const sceneElapsed = Math.max(0, currentTime - sceneStart);

  const cleanCap = sanitizeCaptionText(scene.caption || '');
  const text = cleanCap.toUpperCase();
  const grammar = scene.caption_grammar || 'KEYWORD_EMPHASIS';
  const role = scene.role || 'explanation';
  const displayMode = scene.caption_display_mode || determineCaptionDisplayMode(role, grammar, scene.visual_evidence?.type, sceneIndex);

  const { activeChunk, activeWordIdx } = getActiveCaptionChunk(
    text,
    scene.word_timings,
    sceneElapsed,
    sceneDur,
    displayMode
  );

  const wrappedLines = activeChunk.wrappedLines;
  if (!wrappedLines || wrappedLines.length === 0) return;

  ctx.save();

  let fontName = '"Montserrat", "Plus Jakarta Sans", sans-serif';
  if (project.video_type === 'fast_tiktok' || project.video_type === 'reels_tiktok') {
    fontName = '"Bebas Neue", "Montserrat", sans-serif';
  } else if (project.video_type === 'clean_creator') {
    fontName = '"Plus Jakarta Sans", sans-serif';
  } else if (project.video_type === 'educational' || project.video_type === 'education') {
    fontName = '"Outfit", "Montserrat", sans-serif';
  }

  let fontSize = 34;
  let customPosY = (scene as any).captionPositionY ?? (scene as any).caption_position_y;
  let baseY = typeof customPosY === 'number' && customPosY > 0 ? Math.round((customPosY / 100) * 1280) : 1040;
  let lineHeight = 48;

  if (displayMode === 'hook_headline') {
    fontName = '"Bebas Neue", "Montserrat", sans-serif';
    fontSize = 42;
    baseY = 1020;
    lineHeight = 52;
  } else if (displayMode === 'proof_badge') {
    fontSize = 30;
    baseY = 1040;
    lineHeight = 44;
  } else if (displayMode === 'cta_emphasis') {
    fontName = '"Syne", "Montserrat", sans-serif';
    fontSize = 34;
    baseY = 1030;
    lineHeight = 48;
  }

  const totalBlockHeight = wrappedLines.length * lineHeight;
  const startBlockY = baseY - totalBlockHeight / 2;

  ctx.font = `900 ${fontSize}px ${fontName}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  wrappedLines.forEach((lineObj) => {
    const lineY = startBlockY + lineObj.lineIndex * lineHeight;
    const spaceW = ctx.measureText(' ').width;

    let totalLineW = 0;
    const wordWidths = lineObj.words.map((w) => {
      const wW = ctx.measureText(w.word).width;
      totalLineW += wW + spaceW;
      return wW;
    });
    if (wordWidths.length > 0) totalLineW -= spaceW;

    let wordX = 360 - totalLineW / 2;

    lineObj.words.forEach((wObj, wIdx) => {
      const wWidth = wordWidths[wIdx];
      const isCurrentlySpoken = wObj.globalIndex === activeWordIdx;
      const wt = scene.word_timings?.[wObj.globalIndex];
      const isHighlight = Boolean(wt?.isHighlight);

      if (isCurrentlySpoken) {
        const pillColor = displayMode === 'proof_badge' ? '#22d3ee' : '#fbbf24';
        ctx.fillStyle = pillColor;
        if (!isSafeMode) {
          ctx.shadowColor = displayMode === 'proof_badge' ? 'rgba(34, 211, 238, 0.9)' : 'rgba(251, 191, 36, 0.9)';
          ctx.shadowBlur = 14;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.roundRect(wordX - 6, lineY - fontSize * 0.65, wWidth + 12, fontSize * 1.25, [8]);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#020617';
        ctx.fillText(wObj.word, wordX, lineY);
      } else {
        if (!isSafeMode) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = isSafeMode ? 4 : 6;
        ctx.lineJoin = 'round';

        let textColor = '#ffffff';
        if (isHighlight) {
          const cat = wt?.marketingCategory || 'general';
          const isMetricNumber = /\d+|%|X|RP|USD|JUTA|OMSET|ROAS/i.test(wObj.word);
          if (cat === 'problem') textColor = '#f43f5e';
          else if (cat === 'benefit_result' || isMetricNumber) textColor = '#fbbf24';
          else if (cat === 'urgency_cta') textColor = '#67e8f9';
          else if (cat === 'offer_mechanism') textColor = '#34d399';
          else textColor = '#fbbf24';
        }

        ctx.fillStyle = textColor;
        ctx.strokeText(wObj.word, wordX, lineY);
        ctx.fillText(wObj.word, wordX, lineY);
      }

      wordX += wWidth + spaceW;
    });
  });

  ctx.restore();
}

/**
 * Renders B-Roll overlay sticker (top right, non-obstructive PIP)
 */
export function drawBrollOverlay(
  ctx: CanvasRenderingContext2D,
  scene: SceneEditPlan,
  preloadedImages?: Record<string, HTMLImageElement>,
  isSafeMode: boolean = false
) {
  if (!scene.broll || isSafeMode) return; // In safe mode, skip heavy B-Roll image to prevent lag
  const brollImg = preloadedImages?.[scene.id];
  if (!brollImg || !brollImg.complete || !brollImg.naturalWidth) return;

  const pipW = 210;
  const pipH = 120;
  const pipX = 475;
  const pipY = 65;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(pipX, pipY, pipW, pipH, [14]);
  ctx.fill();
  ctx.stroke();

  ctx.clip();
  drawCoverVideo(ctx, brollImg, brollImg.naturalWidth, brollImg.naturalHeight, pipW, pipH);
  ctx.restore();

  // B-Roll Label tag
  ctx.save();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.roundRect(pipX, pipY, 80, 20, [14, 0, 10, 0]);
  ctx.fill();
  ctx.fillStyle = '#020617';
  ctx.font = '900 9px "Montserrat", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rawIntent = (scene.broll.visual_intent || '').toLowerCase();
  const safeLabel = (rawIntent.includes('broll') || rawIntent.includes('b-roll') || !rawIntent) ? 'VISUAL DETIL' : scene.broll.visual_intent.toUpperCase();
  ctx.fillText(safeLabel, pipX + 40, pipY + 10);
  ctx.restore();
}

/**
 * Renders Visual Evidence cards (proof badge, demo card, comparison, offer, CTA)
 */
export function drawVisualEvidenceOverlay(
  ctx: CanvasRenderingContext2D,
  scene: SceneEditPlan,
  preloadedImages?: Record<string, HTMLImageElement>,
  isSafeMode: boolean = false
) {
  if (!scene.visual_evidence) return;
  const ev = scene.visual_evidence;
  const evImg = preloadedImages?.[scene.id];

  ctx.save();

  if (ev.type === 'SCREEN_PROOF') {
    const cardW = 340;
    const cardH = 88;
    const cardX = 35;
    const cardY = 65;

    if (!isSafeMode) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 14;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = '900 10px "Montserrat", sans-serif';
    ctx.fillText(ev.badgeTag || 'VERIFIED PROOF', cardX + 16, cardY + 24);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 11px "Montserrat", sans-serif';
    ctx.fillText(ev.title ? (ev.title.length > 24 ? ev.title.slice(0, 24) + '...' : ev.title) : '', cardX + 16, cardY + 44);

    ctx.fillStyle = '#34d399';
    ctx.font = '900 20px "Montserrat", sans-serif';
    ctx.fillText(ev.metricValue || '5.4x ROAS', cardX + 16, cardY + 70);

    if (!isSafeMode && evImg && evImg.complete && evImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX + cardW - 76, cardY + 10, 64, 68, [10]);
      ctx.clip();
      drawCoverVideo(ctx, evImg, evImg.naturalWidth, evImg.naturalHeight, 64, 68);
      ctx.restore();
    }
  } else if (ev.type === 'SCREEN_DEMO') {
    const cardW = 340;
    const cardH = 88;
    const cardX = 35;
    const cardY = 65;

    if (!isSafeMode) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 14;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#22d3ee';
    ctx.font = '900 10px "Montserrat", sans-serif';
    ctx.fillText(ev.badgeTag || 'LIVE DEMO', cardX + 16, cardY + 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Montserrat", sans-serif';
    ctx.fillText(ev.title ? (ev.title.length > 22 ? ev.title.slice(0, 22) + '...' : ev.title) : 'SYSTEM DEMO', cardX + 16, cardY + 46);

    if (ev.calloutPoint) {
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 11px "Montserrat", sans-serif';
      ctx.fillText(`⚡ ${ev.calloutPoint}`, cardX + 16, cardY + 68);
    }

    if (!isSafeMode && evImg && evImg.complete && evImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX + cardW - 76, cardY + 10, 64, 68, [10]);
      ctx.clip();
      drawCoverVideo(ctx, evImg, evImg.naturalWidth, evImg.naturalHeight, 64, 68);
      ctx.restore();
    }
  } else if (ev.type === 'SPLIT_COMPARE' && ev.comparisonLabels) {
    const cardW = 440;
    const cardH = 85;
    const cardX = 140;
    const cardY = 65;

    if (!isSafeMode) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 14;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fda4af';
    ctx.font = '900 9px "Montserrat", sans-serif';
    ctx.fillText('SEBELUM', cardX + 16, cardY + 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Montserrat", sans-serif';
    ctx.fillText(ev.comparisonLabels.before.slice(0, 18), cardX + 16, cardY + 48);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 210, cardY + 12);
    ctx.lineTo(cardX + 210, cardY + 73);
    ctx.stroke();

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '900 9px "Montserrat", sans-serif';
    ctx.fillText('SESUDAH ALCO', cardX + 225, cardY + 24);
    ctx.fillStyle = '#34d399';
    ctx.font = '900 12px "Montserrat", sans-serif';
    ctx.fillText(ev.comparisonLabels.after.slice(0, 18), cardX + 225, cardY + 48);
  } else if (ev.type === 'OFFER_CARD') {
    const cardW = 360;
    const cardH = 85;
    const cardX = 180;
    const cardY = 65;

    if (!isSafeMode) {
      ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
      ctx.shadowBlur = 16;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#020617';
    ctx.textAlign = 'center';
    ctx.font = '900 12px "Montserrat", sans-serif';
    ctx.fillText(ev.title || 'LIMITED OFFER', cardX + cardW / 2, cardY + 26);

    ctx.font = '900 22px "Montserrat", sans-serif';
    ctx.fillText(ev.metricValue || 'SAVE 40% TODAY', cardX + cardW / 2, cardY + 54);

    ctx.font = 'bold 9px "Montserrat", sans-serif';
    ctx.fillText(ev.subtitle || 'Direct Creative Performance Access', cardX + cardW / 2, cardY + 73);
  } else if (ev.type === 'CTA_CARD') {
    const cardW = 380;
    const cardH = 85;
    const cardX = 170;
    const cardY = 65;

    if (!isSafeMode) {
      ctx.shadowColor = 'rgba(79, 70, 229, 0.6)';
      ctx.shadowBlur = 16;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = 'rgba(79, 70, 229, 0.95)';
    ctx.strokeStyle = '#c7d2fe';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, [16]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '900 12px "Montserrat", sans-serif';
    ctx.fillText(ev.title || 'KLIK LINK DI BIO', cardX + cardW / 2, cardY + 28);

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.roundRect(cardX + cardW / 2 - 110, cardY + 42, 220, 30, [15]);
    ctx.fill();

    ctx.fillStyle = '#020617';
    ctx.font = '900 10px "Montserrat", sans-serif';
    ctx.fillText('AMBIL SEKARANG 👉', cardX + cardW / 2, cardY + 61);
  }

  ctx.restore();
}

/**
 * Main render function for deterministic frame rendering equivalent to the live preview
 */
export function renderFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  project: AlcoEditingProject,
  video: HTMLVideoElement | null,
  currentTime: number,
  preloadedAssets?: PreloadedAssets,
  targetW: number = 720,
  targetH: number = 1280,
  isSafeMode: boolean = false
) {
  const sceneIdx = project.scenes.findIndex((s) => currentTime >= s.start && currentTime < s.end);
  const activeIdx = sceneIdx !== -1 ? sceneIdx : 0;
  const scene = project.scenes[activeIdx] || project.scenes[0];

  const scaleRatio = targetW / 720;

  // 1. Clear background
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, targetW, targetH);

  ctx.save();
  ctx.scale(scaleRatio, scaleRatio);

  // 2. Apply Camera Transform
  const transform = getCameraTransform(scene, currentTime);

  ctx.save();
  ctx.translate(360, 640);
  ctx.scale(transform.scale, transform.scale);
  ctx.translate(transform.x * 7.2, transform.y * 12.8);
  ctx.translate(-360, -640);

  // Apply visual correction filter
  if (scene?.visual_correction?.css_filter && !isSafeMode) {
    ctx.filter = scene.visual_correction.css_filter;
  }

  // Draw Content (Video or Visualizer fallback)
  if (video && video.videoWidth > 0 && !video.error) {
    drawCoverVideo(ctx, video, video.videoWidth, video.videoHeight, 720, 1280);
  } else {
    drawStudioVisualizerOnCanvas(ctx, currentTime, true);
  }

  ctx.filter = 'none';
  ctx.restore();

  // 3. Scene Transition Flash if applicable
  const sceneElapsed = currentTime - (scene?.start || 0);
  if (scene?.transition === 'flash' && sceneElapsed < 0.18) {
    const flashAlpha = (1 - sceneElapsed / 0.18) * 0.45;
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
    ctx.fillRect(0, 0, 720, 1280);
  }

  // 4. Draw B-Roll Overlay (skipped in Safe Mode)
  drawBrollOverlay(ctx, scene, preloadedAssets?.brollImages, isSafeMode);

  // 5. Draw Visual Evidence Overlay Cards (zero shadowBlur in Safe Mode)
  drawVisualEvidenceOverlay(ctx, scene, preloadedAssets?.evidenceImages, isSafeMode);

  // 6. Draw Dynamic Captions with Active Highlight (zero shadowBlur in Safe Mode)
  drawCaptionsOnCanvas(ctx, scene, currentTime, project, activeIdx, isSafeMode);

  ctx.restore();
}
