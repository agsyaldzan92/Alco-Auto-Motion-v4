/**
 * Video Prober Engine
 * Performs post-render decoding and probing on the resulting video Blob
 * using HTMLVideoElement and requestVideoFrameCallback / frame timestamp analysis.
 * Verifies actual encoded frame count, effective FPS, max frame gap, and resolution.
 */

export interface EncodedVideoProbeResult {
  encodedFrameCount: number;
  effectiveEncodedFps: number;
  maxEncodedFrameGapMs: number;
  duration: number;
  width: number;
  height: number;
  hasValidMetadataFps: boolean;
  isFrameRateValid: boolean;
  hasAudioTrack: boolean;
  audioStatus: 'detected' | 'missing' | 'unknown';
  failureReason?: string;
}

export type VideoProbeResult = EncodedVideoProbeResult;

/**
 * Probes whether a video blob contains playable audio channels using Web Audio API decoding
 */
export async function probeBlobAudioDirectly(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 512) return false;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return false;
    const ctx = new AudioContextClass();
    const slice = blob.slice(0, Math.min(blob.size, 1.5 * 1024 * 1024));
    const arrayBuffer = await slice.arrayBuffer();

    const audioBuffer = await new Promise<AudioBuffer | null>((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }, 1000);

      ctx.decodeAudioData(
        arrayBuffer.slice(0),
        (decoded) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(decoded);
          }
        },
        () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(null);
          }
        }
      );
    });

    if (ctx.state !== 'closed') {
      try {
        await ctx.close();
      } catch (_) {}
    }

    if (audioBuffer && audioBuffer.numberOfChannels > 0 && audioBuffer.duration > 0) {
      return true;
    }
  } catch (_) {}
  return false;
}

export async function probeEncodedVideoBlob(
  blob: Blob,
  targetFps: number = 24,
  expectedDuration: number = 15,
  requireAudio: boolean = false
): Promise<EncodedVideoProbeResult> {
  // Pre-probe audio buffer directly from blob
  const directAudioDetected = await probeBlobAudioDirectly(blob);

  return new Promise((resolve) => {
    if (!blob || blob.size < 1024) {
      resolve({
        encodedFrameCount: 0,
        effectiveEncodedFps: 0,
        maxEncodedFrameGapMs: 9999,
        duration: 0,
        width: 0,
        height: 0,
        hasValidMetadataFps: false,
        isFrameRateValid: false,
        hasAudioTrack: false,
        audioStatus: 'missing',
        failureReason: 'File video kosong atau terlalu kecil (< 1 KB).',
      });
      return;
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const objectUrl = URL.createObjectURL(blob);
    video.src = objectUrl;

    const timestamps: number[] = [];
    let rfcId = 0;
    let isFinished = false;

    const cleanup = () => {
      if (isFinished) return;
      isFinished = true;
      video.pause();
      if ('cancelVideoFrameCallback' in video && rfcId) {
        try {
          (video as any).cancelVideoFrameCallback(rfcId);
        } catch (_) {}
      }
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    // Timeout safety net (12 seconds)
    const timeout = setTimeout(() => {
      if (isFinished) return;
      finishProbing();
    }, 12000);

    const finishProbing = () => {
      clearTimeout(timeout);

      const dur = video.duration && !isNaN(video.duration) && isFinite(video.duration)
        ? video.duration
        : expectedDuration;

      const finalCount = timestamps.length;
      const fps = dur > 0 && finalCount > 0 ? finalCount / dur : 0;

      let maxGap = 0;
      for (let i = 1; i < timestamps.length; i++) {
        const gap = (timestamps[i] - timestamps[i - 1]) * 1000;
        if (gap > maxGap) {
          maxGap = gap;
        }
      }

      // If only 1 frame or 0 timestamps were detected via rVFC, compute fallback gap
      if (finalCount <= 1 && dur > 0) {
        maxGap = dur * 1000;
      }

      // Accurate audio track detection: DO NOT assume true based only on webm/mp4 mime
      let hasAudioTrack = directAudioDetected;
      if (!hasAudioTrack) {
        if ((video as any).audioTracks && (video as any).audioTracks.length > 0) {
          hasAudioTrack = true;
        } else if ((video as any).webkitAudioDecodedByteCount !== undefined && (video as any).webkitAudioDecodedByteCount > 0) {
          hasAudioTrack = true;
        } else if ((video as any).mozHasAudio === true) {
          hasAudioTrack = true;
        }
      }

      const audioStatus: 'detected' | 'missing' | 'unknown' = hasAudioTrack
        ? 'detected'
        : 'missing';

      const minRequiredFps = targetFps <= 20 ? 19 : (targetFps <= 24 ? 22 : 28);
      const targetFrameCount = Math.round(dur * targetFps);
      const isFrameCountOk = finalCount >= Math.floor(0.95 * targetFrameCount);
      const isFpsOk = fps >= minRequiredFps;
      const isGapOk = maxGap <= 150;
      const hasValidMetadataFps = fps >= 1;
      const isDurationOk = dur >= expectedDuration * 0.95;
      const isAudioOk = !requireAudio || hasAudioTrack;

      const isFrameRateValid = isFrameCountOk && isFpsOk && isGapOk && hasValidMetadataFps && isDurationOk && isAudioOk;

      let failureReason: string | undefined;
      if (!hasValidMetadataFps) {
        failureReason = 'Metadata FPS bernilai 0 / invalid.';
      } else if (!isDurationOk) {
        failureReason = `Durasi video terpotong (${dur.toFixed(1)}s dari target ${expectedDuration.toFixed(1)}s). Minimal 95% durasi penuh.`;
      } else if (!isFpsOk) {
        if (fps < 19) {
          failureReason = `Effective encoded FPS rendah (${fps.toFixed(1)} FPS). Device/browser tidak mampu render stabil. Gunakan Server MP4 Render.`;
        } else {
          failureReason = `Effective encoded FPS rendah (${fps.toFixed(1)} FPS dari target ${targetFps} FPS).`;
        }
      } else if (!isFrameCountOk) {
        failureReason = `Encoded frames kurang (${finalCount} frame dari target ${targetFrameCount}). Device/browser drop frame.`;
      } else if (!isGapOk) {
        failureReason = `Terdeteksi gap timestamp frame besar (${maxGap} ms > limit 150 ms).`;
      } else if (requireAudio && !hasAudioTrack) {
        failureReason = 'Audio asli tidak ikut masuk ke output video.';
      }

      cleanup();

      resolve({
        encodedFrameCount: finalCount,
        effectiveEncodedFps: Math.round(fps * 10) / 10,
        maxEncodedFrameGapMs: Math.round(maxGap),
        duration: Math.round(dur * 10) / 10,
        width: video.videoWidth || 720,
        height: video.videoHeight || 1280,
        hasValidMetadataFps,
        isFrameRateValid,
        hasAudioTrack,
        audioStatus,
        failureReason,
      });
    };

    video.onloadedmetadata = () => {
      const dur = video.duration;
      if (!dur || isNaN(dur) || !isFinite(dur) || dur <= 0) {
        finishProbing();
        return;
      }

      if ('requestVideoFrameCallback' in video) {
        const onFrame = (_now: number, metadata: any) => {
          if (isFinished) return;
          if (metadata && typeof metadata.mediaTime === 'number') {
            timestamps.push(metadata.mediaTime);
          }
          if (!video.ended && video.currentTime < dur - 0.05) {
            rfcId = (video as any).requestVideoFrameCallback(onFrame);
          } else {
            finishProbing();
          }
        };

        video.onended = () => {
          finishProbing();
        };

        video.playbackRate = 2.0; // Fast 2x probe
        try {
          rfcId = (video as any).requestVideoFrameCallback(onFrame);
          video.play().catch(() => {
            // Fallback to 1x muted play
            video.playbackRate = 1.0;
            video.play().catch(() => {
              finishProbing();
            });
          });
        } catch (_) {
          finishProbing();
        }
      } else {
        // Fallback if rVFC not available in browser
        finishProbing();
      }
    };

    video.onerror = () => {
      finishProbing();
    };
  });
}
