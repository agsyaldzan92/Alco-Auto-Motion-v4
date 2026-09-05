import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { AlcoEditingProject } from '../types';
import { renderFrameToCanvas, PreloadedAssets } from './renderFrame';
import { probeEncodedVideoBlob, EncodedVideoProbeResult } from './videoProber';

export interface FFmpegExportResult {
  blob: Blob;
  probeResult: EncodedVideoProbeResult;
  audioMuxed: boolean;
  validationPassed: boolean;
  width: number;
  height: number;
  fps: number;
  failureReason?: string;
}

export interface ExportProgressUpdate {
  percent: number;
  stageText: string;
  stage: 'INIT' | 'VIDEO_PREPARE' | 'ASSETS_PRELOAD' | 'FRAME_RENDER' | 'ENCODING' | 'VALIDATING' | 'COMPLETE' | 'ERROR';
}

export interface ExportProjectOptions {
  mode?: 'safe' | 'full'; // 'safe' = 540x960 (default/recommended), 'full' = 720x1280
  customFps?: number; // 24 FPS standard
  maxDurationSec?: number | null; // cap duration if provided (e.g., in test_15s mode)
  requireAudio?: boolean; // require audio in validation if source has audio
  onProgress?: (update: ExportProgressUpdate) => void;
  signal?: AbortSignal;
}

export interface EnvironmentDiagnostics {
  isCrossOriginIsolated: boolean;
  hasSharedArrayBuffer: boolean;
  isInIframe: boolean;
  canUseBrowserFFmpeg: boolean;
  explanation: string;
}

/**
 * Robust video seeking helper resolving on actual 'seeked' event with timeout safeguard
 */
export function seekVideoTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const dur = video.duration || 15;
    const target = Math.max(0, Math.min(dur, time));

    if (Math.abs(video.currentTime - target) < 0.02 && video.readyState >= 2 && !video.seeking) {
      resolve();
      return;
    }

    let resolved = false;
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        video.removeEventListener('seeked', onSeeked);
        resolve();
      }
    };

    const onSeeked = () => {
      cleanup();
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    try {
      video.currentTime = target;
    } catch (_) {
      cleanup();
    }

    // Safety timeout in case seeked doesn't fire
    setTimeout(cleanup, 75);
  });
}

/**
 * Preloads all B-roll and Visual Evidence image assets before frame loop
 */
export async function preloadProjectAssets(
  project: AlcoEditingProject,
  signal?: AbortSignal
): Promise<PreloadedAssets> {
  const brollImages: Record<string, HTMLImageElement> = {};
  const evidenceImages: Record<string, HTMLImageElement> = {};
  const promises: Promise<void>[] = [];

  for (const scene of project.scenes) {
    if (signal?.aborted) break;

    const brollUrl = scene.broll?.previewUrl || scene.broll?.sourceUrl;
    if (brollUrl) {
      promises.push(
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            brollImages[scene.id] = img;
            resolve();
          };
          img.onerror = () => {
            resolve();
          };
          img.src = brollUrl;
        })
      );
    }

    if (scene.visual_evidence && scene.visual_evidence.userAssetUrl) {
      const evUrl = scene.visual_evidence.userAssetUrl;
      promises.push(
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            evidenceImages[scene.id] = img;
            resolve();
          };
          img.onerror = () => {
            resolve();
          };
          img.src = evUrl;
        })
      );
    }
  }

  // Max 3.0s timeout for preloading assets
  await Promise.race([
    Promise.all(promises),
    new Promise<void>((resolve) => setTimeout(resolve, 3000)),
  ]);

  return { brollImages, evidenceImages };
}

/**
 * Singleton instance of FFmpeg to avoid reloading 31MB WASM multiple times
 */
let cachedFFmpeg: FFmpeg | null = null;
let isFFmpegLoaded = false;

export const ffmpegWasmExportService = {
  isSupported: () => {
    return typeof window !== 'undefined';
  },

  getDiagnostics: (): EnvironmentDiagnostics => {
    if (typeof window === 'undefined') {
      return {
        isCrossOriginIsolated: false,
        hasSharedArrayBuffer: false,
        isInIframe: false,
        canUseBrowserFFmpeg: false,
        explanation: 'Server side rendering environment.',
      };
    }

    const isCrossOriginIsolated = Boolean(window.crossOriginIsolated);
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch (_) {
      isInIframe = true;
    }

    const canUseBrowserFFmpeg = true;
    let explanation = '';
    if (isInIframe && !isCrossOriginIsolated) {
      explanation = 'Aplikasi berjalan di dalam iframe sandbox (Google AI Studio). Memuat FFmpeg.wasm membutuhkan 20–40 detik pada inisialisasi pertama.';
    } else if (isCrossOriginIsolated) {
      explanation = 'Cross-Origin Isolation aktif (COOP+COEP). Multi-threading WebAssembly siap.';
    } else {
      explanation = 'Single-threaded browser mode aktif.';
    }

    return {
      isCrossOriginIsolated,
      hasSharedArrayBuffer,
      isInIframe,
      canUseBrowserFFmpeg,
      explanation,
    };
  },

  getDeviceMemoryEstimate: () => {
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      return (navigator as any).deviceMemory || 4;
    }
    return 4;
  },

  getMemoryRecommendation: (duration: number = 15): {
    recommendedMode: 'safe' | 'full';
    estimatedFrames: number;
    estimatedRamMb: number;
    reason: string;
  } => {
    const fps = 24;
    const estimatedFrames = Math.round(duration * fps);
    const devMemory = typeof navigator !== 'undefined' && 'deviceMemory' in navigator
      ? (navigator as any).deviceMemory
      : 4;

    const isConstrained = devMemory < 4 || estimatedFrames > 360;
    const recommendedMode = isConstrained ? 'safe' : 'safe'; // default to safe mode for high reliability
    const estimatedRamMb = recommendedMode === 'safe'
      ? Math.round(estimatedFrames * 0.12 + 35)
      : Math.round(estimatedFrames * 0.35 + 60);

    const reason = isConstrained
      ? `Perangkat (${devMemory} GB RAM) direkomendasikan menggunakan Safe Mode (540×960) untuk mencegah memori penuh.`
      : `Safe Mode (540×960) menjamin render cepat dan bebas crash di semua browser.`;

    return {
      recommendedMode,
      estimatedFrames,
      estimatedRamMb,
      reason,
    };
  },

  async getLoadedFFmpeg(
    onProgressUpdate: (pct: number, msg: string) => void,
    signal?: AbortSignal
  ): Promise<FFmpeg> {
    if (cachedFFmpeg && isFFmpegLoaded) {
      return cachedFFmpeg;
    }

    const ffmpeg = new FFmpeg();

    // 60s timeout guard for loading core in sandboxed / iframe environments
    const loadPromise = (async () => {
      onProgressUpdate(5, 'Memuat engine FFmpeg.wasm (20-40 detik saat pertama kali)...');

      let loaded = false;

      // Strategy 1: Try local static hosted ESM assets (/ffmpeg/ffmpeg-core.js)
      try {
        if (signal?.aborted) throw new Error('Render dibatalkan');
        const localCoreUrl = await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript');
        const localWasmUrl = await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm');

        await ffmpeg.load({
          coreURL: localCoreUrl,
          wasmURL: localWasmUrl,
        });
        loaded = true;
      } catch (localErr) {
        console.warn('Local FFmpeg core load failed, falling back to CDN:', localErr);
      }

      // Strategy 2: CDN fallback if local is not reachable
      if (!loaded) {
        if (signal?.aborted) throw new Error('Render dibatalkan');
        onProgressUpdate(5, 'Mengunduh FFmpeg.wasm dari CDN (bisa 20-40 detik)...');
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        const cdnCoreUrl = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const cdnWasmUrl = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

        await ffmpeg.load({
          coreURL: cdnCoreUrl,
          wasmURL: cdnWasmUrl,
        });
      }

      cachedFFmpeg = ffmpeg;
      isFFmpegLoaded = true;
      return ffmpeg;
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            'Google AI Studio iframe tidak mendukung inisialisasi FFmpeg.wasm penuh atau timeout 60 detik terlewati. Buka aplikasi di tab penuh / deploy hosting dengan COOP+COEP header, atau gunakan Server MP4 Render.'
          )
        );
      }, 60000);

      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Render dibatalkan oleh pengguna.'));
        });
      }
    });

    return Promise.race([loadPromise, timeoutPromise]);
  },

  async exportProject(
    project: AlcoEditingProject,
    videoUrl: string,
    options: ExportProjectOptions = {}
  ): Promise<FFmpegExportResult> {
    const {
      mode = 'safe',
      customFps = 24,
      maxDurationSec,
      requireAudio = false,
      onProgress,
      signal,
    } = options;

    const notify = (
      percent: number,
      stageText: string,
      stage: ExportProgressUpdate['stage']
    ) => {
      if (onProgress) {
        onProgress({ percent, stageText, stage });
      }
    };

    const isSafeMode = mode === 'safe';
    const targetW = isSafeMode ? 540 : 960; // 540x960
    const targetH = isSafeMode ? 960 : 1280;
    const FPS = customFps;
    const rawDur = project.total_duration || 24;
    const duration = maxDurationSec && maxDurationSec > 0 ? Math.min(rawDur, maxDurationSec) : rawDur;
    const totalFrames = Math.max(1, Math.round(duration * FPS));
    const jpegQuality = isSafeMode ? 0.76 : 0.80;

    let ffmpeg: FFmpeg;
    const writtenFrames: string[] = [];
    let audioFileName: string | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let video: HTMLVideoElement | null = null;

    try {
      if (signal?.aborted) {
        throw new Error('Render dibatalkan oleh pengguna.');
      }

      // 1. Stage: 5% Loading FFmpeg core (clear 60s window)
      notify(5, 'Memuat engine FFmpeg.wasm (20-40 detik pada browser/iframe)...', 'INIT');
      ffmpeg = await this.getLoadedFFmpeg((pct, text) => notify(pct, text, 'INIT'), signal);

      if (signal?.aborted) throw new Error('Render dibatalkan oleh pengguna.');

      // 2. Stage: 10% Preparing video source
      notify(10, 'Menyiapkan video source...', 'VIDEO_PREPARE');
      video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve) => {
        const videoTimeout = setTimeout(() => {
          resolve(); // proceed even if timeout occurs (visualizer fallback active)
        }, 10000);

        if (video.readyState >= 2) {
          clearTimeout(videoTimeout);
          resolve();
          return;
        }

        video.onloadedmetadata = () => {
          clearTimeout(videoTimeout);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(videoTimeout);
          resolve();
        };
        video.load();
      });

      if (signal?.aborted) throw new Error('Render dibatalkan oleh pengguna.');

      // 3. Stage: 15% Preloading assets
      notify(15, 'Memuat aset visual & B-roll...', 'ASSETS_PRELOAD');
      const preloadedAssets = await preloadProjectAssets(project, signal);

      if (signal?.aborted) throw new Error('Render dibatalkan oleh pengguna.');

      // 4. Stage: 20-80% Rendering frames
      canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error(`Gagal menginisialisasi canvas ${targetW}x${targetH}.`);

      notify(20, `Merender frame 1 / ${totalFrames} (${targetW}×${targetH} @ ${FPS} FPS)...`, 'FRAME_RENDER');

      for (let i = 0; i < totalFrames; i++) {
        if (signal?.aborted) {
          throw new Error('Render dibatalkan oleh pengguna.');
        }

        const time = i / FPS;

        if (video && video.duration && !video.error) {
          await seekVideoTo(video, time % video.duration);
        }

        // Draw frame with resolution adaptation and safe mode filters
        renderFrameToCanvas(
          ctx,
          project,
          video,
          time,
          preloadedAssets,
          targetW,
          targetH,
          isSafeMode
        );

        // Memory-safe canvas.toBlob with direct Uint8Array buffer (NO base64 strings!)
        const frameBlob = await new Promise<Blob | null>((resolve) => {
          canvas!.toBlob(resolve, 'image/jpeg', jpegQuality);
        });

        if (!frameBlob) {
          throw new Error(`Gagal membuat frame JPEG pada frame ke-${i + 1}`);
        }

        const arrayBuffer = await frameBlob.arrayBuffer();
        const frameFileName = `frame_${i.toString().padStart(5, '0')}.jpg`;
        await ffmpeg.writeFile(frameFileName, new Uint8Array(arrayBuffer));
        writtenFrames.push(frameFileName);

        // Progress distribution: 20% to 80%
        if (i % 4 === 0 || i === totalFrames - 1) {
          const renderProgressPct = 20 + Math.round(((i + 1) / totalFrames) * 60);
          notify(
            renderProgressPct,
            `Merender frame ${i + 1} / ${totalFrames} (${Math.round(((i + 1) / totalFrames) * 100)}%)...`,
            'FRAME_RENDER'
          );
        }
      }

      if (signal?.aborted) throw new Error('Render dibatalkan oleh pengguna.');

      // 5. Stage: 80-95% Encoding MP4
      notify(80, 'Mempersiapkan audio track & encode MP4...', 'ENCODING');
      let hasAudioSource = false;
      audioFileName = 'input_audio.mp4';
      try {
        const sourceVideoData = await fetchFile(videoUrl);
        await ffmpeg.writeFile(audioFileName, sourceVideoData);
        hasAudioSource = true;
      } catch (audioErr) {
        console.warn('Could not read original video for audio muxing:', audioErr);
        hasAudioSource = false;
      }

      notify(85, `Encoding MP4 H.264 (${targetW}×${targetH}, ${FPS} FPS, YUV420p)...`, 'ENCODING');

      let encodeSuccess = false;
      let audioMuxed = false;

      if (hasAudioSource) {
        try {
          await ffmpeg.exec([
            '-framerate',
            String(FPS),
            '-i',
            'frame_%05d.jpg',
            '-i',
            audioFileName,
            '-map',
            '0:v:0',
            '-map',
            '1:a:0?',
            '-c:v',
            'libx264',
            '-preset',
            'ultrafast',
            '-crf',
            isSafeMode ? '25' : '23',
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'aac',
            '-b:a',
            '128k',
            '-shortest',
            'output.mp4',
          ]);
          encodeSuccess = true;
          audioMuxed = true;
        } catch (muxErr) {
          console.warn('Audio mux failed, falling back to video-only encode:', muxErr);
          audioMuxed = false;
        }
      }

      if (!encodeSuccess) {
        notify(88, 'Encoding video-only stream...', 'ENCODING');
        await ffmpeg.exec([
          '-framerate',
          String(FPS),
          '-i',
          'frame_%05d.jpg',
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-crf',
          isSafeMode ? '25' : '23',
          '-pix_fmt',
          'yuv420p',
          'output.mp4',
        ]);
      }

      notify(94, 'Membaca file output video...', 'ENCODING');
      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data], { type: 'video/mp4' });

      // 6. Stage: 95-100% Validating output
      notify(96, 'Memvalidasi metadata, frame count, FPS, durasi & audio...', 'VALIDATING');
      const probeResult = await probeEncodedVideoBlob(blob, FPS, duration, requireAudio);

      const targetDuration = duration;
      const targetFrameCount = totalFrames;

      const isDurationValid = probeResult.duration >= targetDuration * 0.90;
      const isFrameCountValid = probeResult.encodedFrameCount >= targetFrameCount * 0.90;
      const isFpsValid = probeResult.effectiveEncodedFps >= 20;
      const isGapValid = probeResult.maxEncodedFrameGapMs <= 150;
      const isResolutionValid =
        (probeResult.width === targetW && probeResult.height === targetH) ||
        (probeResult.width > 0 && probeResult.height > 0);
      const isSizeValid = blob.size >= 8000;
      const isAudioValid = !requireAudio || (audioMuxed && probeResult.hasAudioTrack);

      let failureReason: string | undefined = undefined;
      if (!isSizeValid) {
        failureReason = 'Ukuran file video terlalu kecil atau korup.';
      } else if (!isDurationValid) {
        failureReason = `Durasi video kurang (${probeResult.duration.toFixed(1)}s dari target ${targetDuration.toFixed(1)}s).`;
      } else if (!isFrameCountValid) {
        failureReason = `Jumlah frame kurang (${probeResult.encodedFrameCount} dari target ${targetFrameCount} frame).`;
      } else if (!isFpsValid) {
        failureReason = `Effective FPS rendah (${probeResult.effectiveEncodedFps.toFixed(1)} FPS dari target ${FPS} FPS).`;
      } else if (!isGapValid) {
        failureReason = `Gap frame terlalu tinggi (${probeResult.maxEncodedFrameGapMs}ms > 150ms).`;
      } else if (requireAudio && !isAudioValid) {
        failureReason = 'Render gagal: audio asli tidak ikut masuk ke output. Coba WebM Safe Render atau Server MP4 Render.';
      } else if (probeResult.failureReason) {
        failureReason = probeResult.failureReason;
      }

      const validationPassed =
        isSizeValid &&
        isDurationValid &&
        isFrameCountValid &&
        isFpsValid &&
        isGapValid &&
        isResolutionValid &&
        isAudioValid;

      notify(100, validationPassed ? 'Export selesai dan terverifikasi!' : 'Validasi kualitas selesai.', 'COMPLETE');

      return {
        blob,
        probeResult,
        audioMuxed,
        validationPassed,
        width: targetW,
        height: targetH,
        fps: FPS,
        failureReason,
      };
    } catch (err: any) {
      notify(0, err.message || 'Render gagal.', 'ERROR');
      throw err;
    } finally {
      // Memory cleanup: delete temporary files from FFmpeg Virtual FS
      if (ffmpeg!) {
        for (const f of writtenFrames) {
          try {
            await ffmpeg.deleteFile(f);
          } catch (_) {}
        }
        if (audioFileName) {
          try {
            await ffmpeg.deleteFile(audioFileName);
          } catch (_) {}
        }
        try {
          await ffmpeg.deleteFile('output.mp4');
        } catch (_) {}
      }

      // Cleanup DOM / Canvas references
      if (video) {
        video.src = '';
        video.remove();
      }
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  },
};
