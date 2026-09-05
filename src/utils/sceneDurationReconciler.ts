import { SceneEditPlan } from '../types';

export interface SceneReconciliationResult {
  reconciledScenes: SceneEditPlan[];
  sourceDuration: number;
  originalPlannedDuration: number;
  reconciledPlannedDuration: number;
  addedFallbackSceneCount: number;
  gapFilledRanges: Array<{ start: number; end: number; duration: number }>;
  finalTargetDuration: number;
}

/**
 * Reconciles scene editing plans to match the full duration of the source video.
 *
 * Rules:
 * 1. Sort scenes strictly by start time.
 * 2. Clamp start/end times within [0, sourceDuration].
 * 3. Fill initial gap (0 to firstScene.start) if firstScene starts > 0.05s.
 * 4. Fill inter-scene gaps (cur.end to nxt.start) with clean KEEP_AROLL continuation scenes.
 * 5. Resolve scene overlaps by adjusting boundary without negative or zero durations.
 * 6. Fill trailing gap (lastEnd to sourceDuration) with clean KEEP_AROLL continuation scene.
 * 7. Fallback scenes must NOT contain B-roll, sound effects (sound_effect = 'none'),
 *    nor artificial labels/captions.
 * 8. Minimum scene duration is 0.5 seconds.
 */
export function reconcileScenesToSourceDuration(
  scenes: SceneEditPlan[] | undefined | null,
  sourceDuration: number
): SceneReconciliationResult {
  const safeSourceDuration = Math.max(0.5, Number(sourceDuration) || 0);

  const rawList: SceneEditPlan[] = (scenes || []).map((s, idx) => ({
    ...s,
    id: typeof s.id === 'number' ? s.id : idx,
    start: Number(s.start) || 0,
    end: Number(s.end) || 0,
  }));

  // Calculate original planned duration
  let originalPlannedDuration = 0;
  if (rawList.length > 0) {
    const minStart = Math.min(...rawList.map(s => s.start));
    const maxEnd = Math.max(...rawList.map(s => s.end));
    originalPlannedDuration = Math.max(0, maxEnd - minStart);
  }

  // 1. Sort scenes by start time ascending
  rawList.sort((a, b) => a.start - b.start);

  const sanitizedScenes: SceneEditPlan[] = [];
  const MIN_SCENE_DURATION = 0.5;

  // 2. Initial clamp and cleanup of individual scenes
  for (let i = 0; i < rawList.length; i++) {
    const sc = { ...rawList[i] };
    sc.start = Math.max(0, Math.min(safeSourceDuration, sc.start));
    sc.end = Math.max(sc.start, Math.min(safeSourceDuration, sc.end));

    if (sc.end - sc.start >= 0.05) {
      sanitizedScenes.push(sc);
    }
  }

  const resultScenes: SceneEditPlan[] = [];
  const gapFilledRanges: Array<{ start: number; end: number; duration: number }> = [];
  let addedFallbackSceneCount = 0;
  let nextFallbackId = 1000;

  const createFallbackScene = (start: number, end: number): SceneEditPlan => {
    addedFallbackSceneCount++;
    const fallbackStart = Math.round(start * 1000) / 1000;
    const fallbackEnd = Math.round(end * 1000) / 1000;
    gapFilledRanges.push({
      start: fallbackStart,
      end: fallbackEnd,
      duration: Math.round((fallbackEnd - fallbackStart) * 1000) / 1000,
    });

    return {
      id: nextFallbackId++,
      start: fallbackStart,
      end: fallbackEnd,
      role: 'continuation',
      adRole: 'continuation',
      visualDecision: 'KEEP_AROLL',
      visual_intent: 'TALKING_HEAD_IMPACT',
      brollFormat: 'none',
      broll: null,
      sound_effect: 'none',
      caption: '',
      caption_style: 'normal',
      caption_grammar: 'CAPTION_STANDARD',
      caption_mode: 'verbatim',
      highlight_words: [],
      motion: 'normal',
      motion_scale: 1.12,
      talking_head_framing: {
        is_talking_head: true,
        smart_reframe_scale: 1.12,
        crop_shift_offset: { x: 0, y: -2.5 },
        framing_mode: 'medium_talking_head',
        protection_status: 'EYELINE_LOCKED',
        note: 'Fallback A-Roll continuation scene.',
      },
      scores: { hook_strength: 7, clarity: 8, pacing: 8, overall: 8 },
      camera_dynamics: { intensity: 1 },
    } as unknown as SceneEditPlan;
  };

  if (sanitizedScenes.length === 0) {
    // If no scenes, create a single fallback covering 0 to safeSourceDuration
    const fullScene = createFallbackScene(0, safeSourceDuration);
    fullScene.role = 'hook';
    fullScene.adRole = 'hook';
    resultScenes.push(fullScene);
  } else {
    // 3. Check leading gap (0 to first scene start)
    const first = sanitizedScenes[0];
    if (first.start > 0.05) {
      if (first.start < MIN_SCENE_DURATION) {
        // If gap is smaller than minimum duration, expand the first scene to 0
        first.start = 0;
      } else {
        resultScenes.push(createFallbackScene(0, first.start));
      }
    } else {
      first.start = 0;
    }

    // 4. Iterate and bridge inter-scene gaps / resolve overlaps
    let cursor = first.start;

    for (let i = 0; i < sanitizedScenes.length; i++) {
      const cur = sanitizedScenes[i];

      // If cur.start is ahead of cursor with significant gap
      if (cur.start > cursor + 0.05) {
        const gapDuration = cur.start - cursor;
        if (gapDuration >= MIN_SCENE_DURATION) {
          resultScenes.push(createFallbackScene(cursor, cur.start));
          cursor = cur.start;
        } else {
          // If gap is tiny (<0.5s), merge into previous scene if exists, or snap cur.start to cursor
          if (resultScenes.length > 0) {
            resultScenes[resultScenes.length - 1].end = cur.start;
          } else {
            cur.start = cursor;
          }
          cursor = cur.start;
        }
      } else if (cur.start < cursor) {
        // Overlap: adjust cur.start to cursor
        cur.start = cursor;
      }

      // Ensure cur has valid duration
      if (cur.end < cur.start + MIN_SCENE_DURATION) {
        cur.end = Math.min(safeSourceDuration, cur.start + MIN_SCENE_DURATION);
      }

      resultScenes.push(cur);
      cursor = cur.end;
    }

    // 5. Check trailing gap (cursor to safeSourceDuration)
    if (cursor < safeSourceDuration - 0.05) {
      const trailingGap = safeSourceDuration - cursor;
      if (trailingGap >= MIN_SCENE_DURATION) {
        resultScenes.push(createFallbackScene(cursor, safeSourceDuration));
      } else {
        // If trailing gap is small (<0.5s), extend the last scene to safeSourceDuration
        if (resultScenes.length > 0) {
          resultScenes[resultScenes.length - 1].end = safeSourceDuration;
        }
      }
    } else if (cursor > safeSourceDuration) {
      // Clamp the last scene's end to safeSourceDuration
      if (resultScenes.length > 0) {
        resultScenes[resultScenes.length - 1].end = safeSourceDuration;
      }
    }
  }

  // Final sanity pass: ensure continuous contiguous timeline from 0 to safeSourceDuration
  for (let i = 0; i < resultScenes.length; i++) {
    resultScenes[i].start = Math.max(0, Math.min(safeSourceDuration, resultScenes[i].start));
    resultScenes[i].end = Math.max(resultScenes[i].start, Math.min(safeSourceDuration, resultScenes[i].end));

    if (i === 0) {
      resultScenes[i].start = 0;
    }
    if (i > 0) {
      // Contiguous alignment
      resultScenes[i].start = resultScenes[i - 1].end;
    }
  }

  if (resultScenes.length > 0) {
    resultScenes[resultScenes.length - 1].end = safeSourceDuration;
  }

  let reconciledPlannedDuration = 0;
  if (resultScenes.length > 0) {
    const minStart = resultScenes[0].start;
    const maxEnd = resultScenes[resultScenes.length - 1].end;
    reconciledPlannedDuration = Math.max(0, maxEnd - minStart);
  }

  return {
    reconciledScenes: resultScenes,
    sourceDuration: safeSourceDuration,
    originalPlannedDuration: Math.round(originalPlannedDuration * 1000) / 1000,
    reconciledPlannedDuration: Math.round(reconciledPlannedDuration * 1000) / 1000,
    addedFallbackSceneCount,
    gapFilledRanges,
    finalTargetDuration: safeSourceDuration,
  };
}
