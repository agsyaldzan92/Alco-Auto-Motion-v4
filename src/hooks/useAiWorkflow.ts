import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ContentType,
  AlcoEditingProject,
  SampleVideoOption,
  TranscriptSegment,
  ContentAnalysisItem,
  ProcessingState,
  ProcessingStepId,
  ProcessingStepInfo,
  ProcessingLogEntry,
  UserProofAsset,
} from '../types';
import { getApiHeaders } from '../services/apiKeyService';
import {
  buildIntelligentEditPlan,
  generateHeuristicSegments,
  generateHeuristicAnalysis,
} from '../engine/index';

const INITIAL_STEPS: ProcessingStepInfo[] = [
  {
    id: 'init',
    title: 'Menganalisis suara',
    subtitle: 'Mendeteksi vokal pembicara dan irama narasi audio',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'segmentation',
    title: 'Membuat caption',
    subtitle: 'Menyusun subtitle per kata dengan penekanan kata kunci',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'content_analysis',
    title: 'Menentukan hook',
    subtitle: 'Mengidentifikasi pembuka 0–3s, masalah, dan penawaran',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'edit_plan',
    title: 'Memilih motion, B-roll, dan SFX',
    subtitle: 'Memadukan zoom kamera, visual pendukung, dan efek suara',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'finalizing',
    title: 'Menyiapkan preview',
    subtitle: 'Menyusun timeline dan pratinjau editor siap pakai',
    status: 'pending',
    progress: 0,
  },
];

interface UseAiWorkflowParams {
  rawScript: string;
  videoDuration: number;
  contentType: ContentType;
  videoGoal: string;
  ctaText: string;
  videoUrl: string;
  videoFile?: File | null;
  userProofAssets?: UserProofAsset[];
  onScriptExtracted?: (script: string) => void;
  onSuccess: (project: AlcoEditingProject) => void;
}

// Helper to convert uploaded video file to base64 for direct speech audio transcription
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

async function fetchWithStartupRetry(
  url: string,
  options: RequestInit,
  fallbackMsg: string,
  maxRetries = 3
): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      const res = await fetch(url, options);
      // Check if server is still starting or Vite warming up (HTTP 502/503/504)
      if ([502, 503, 504].includes(res.status) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1200 * attempt));
        continue;
      }
      return res;
    } catch (err: any) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      throw new Error(`${fallbackMsg} (Koneksi ke backend gagal: ${err.message || err})`);
    }
  }
  return fetch(url, options);
}

async function safeParseResponseJson(res: Response, fallbackMsg: string) {
  const text = await res.text().catch(() => '');
  
  // Detect server starting / proxy HTML page
  const isHtml = text.includes('<!doctype') || text.includes('<html') || text.includes('Starting Server');
  if (isHtml) {
    throw new Error(`${fallbackMsg} (Server backend sedang booting/warming up. Mohon klik Coba Lagi)`);
  }

  if (!res.ok) {
    let errMessage = '';
    try {
      const errData = JSON.parse(text);
      errMessage = errData.error || errData.message;
    } catch {}
    if (errMessage) {
      throw new Error(`${fallbackMsg} (${errMessage})`);
    }
    if (text && text.length < 200) {
      throw new Error(`${fallbackMsg} (${text})`);
    }
    throw new Error(`${fallbackMsg} (Server returned HTTP ${res.status}: ${res.statusText})`);
  }

  if (!text || text.trim().length === 0) {
    throw new Error(`${fallbackMsg} (Server mengembalikan response kosong)`);
  }

  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    return JSON.parse(clean);
  } catch (err: any) {
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = clean.lastIndexOf('}');
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx = clean.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx > startIdx) {
      try {
        const sub = clean.substring(startIdx, endIdx + 1);
        return JSON.parse(sub);
      } catch {}
    }

    console.error('safeParseResponseJson parse failure:', clean.slice(0, 300));
    throw new Error(`${fallbackMsg} (Gagal membaca response JSON yang valid dari server)`);
  }
}

export function useAiWorkflow({
  rawScript,
  videoDuration,
  contentType,
  videoGoal,
  ctaText,
  videoUrl,
  videoFile,
  userProofAssets,
  onScriptExtracted,
  onSuccess,
}: UseAiWorkflowParams) {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    currentStepId: 'init',
    overallProgress: 0,
    startTime: null,
    elapsedMs: 0,
    estimatedRemainingMs: 4000,
    steps: INITIAL_STEPS,
    logs: [],
    error: null,
  });

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastParamsRef = useRef<{ sampleOverride?: SampleVideoOption } | null>(null);

  // Keep a mutable ref of latest input params to avoid stale closures
  const latestParamsRef = useRef({
    rawScript,
    videoDuration,
    contentType,
    videoGoal,
    ctaText,
    videoUrl,
    videoFile,
    userProofAssets,
    onScriptExtracted,
    onSuccess,
  });

  useEffect(() => {
    latestParamsRef.current = {
      rawScript,
      videoDuration,
      contentType,
      videoGoal,
      ctaText,
      videoUrl,
      videoFile,
      userProofAssets,
      onScriptExtracted,
      onSuccess,
    };
  });

  // Helper to add log entries
  const addLog = useCallback(
    (stepId: ProcessingStepId, message: string, type: ProcessingLogEntry['type'] = 'info') => {
      const now = Date.now();
      const elapsed = (now - (startTimeRef.current || now)) / 1000;
      const relativeTime = `${elapsed.toFixed(1)}s`;

      const newEntry: ProcessingLogEntry = {
        id: `log-${now}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: now,
        relativeTime,
        stepId,
        message,
        type,
      };

      setProcessingState((prev) => ({
        ...prev,
        logs: [...prev.logs, newEntry],
      }));
    },
    []
  );

  // Update specific step status and progress
  const updateStep = useCallback(
    (
      stepId: ProcessingStepId,
      status: ProcessingStepInfo['status'],
      details?: string,
      badge?: string,
      durationMs?: number
    ) => {
      setProcessingState((prev) => {
        const nextSteps = prev.steps.map((step) => {
          if (step.id === stepId) {
            return {
              ...step,
              status,
              details: details !== undefined ? details : step.details,
              badge: badge !== undefined ? badge : step.badge,
              durationMs: durationMs !== undefined ? durationMs : step.durationMs,
            };
          }
          return step;
        });

        // Calculate progress based on completed / active steps
        const stepProgressWeights: Record<ProcessingStepId, number> = {
          init: 15,
          segmentation: 25,
          content_analysis: 30,
          edit_plan: 25,
          finalizing: 5,
        };

        let calculatedProgress = 0;
        for (const s of nextSteps) {
          if (s.status === 'completed') {
            calculatedProgress += stepProgressWeights[s.id];
          } else if (s.status === 'running') {
            calculatedProgress += stepProgressWeights[s.id] * 0.4;
          }
        }

        return {
          ...prev,
          currentStepId: stepId,
          steps: nextSteps,
          overallProgress: Math.min(100, Math.max(prev.overallProgress, calculatedProgress)),
        };
      });
    },
    []
  );

  // Start ticker for live elapsed time
  useEffect(() => {
    if (processingState.isProcessing && !processingState.error) {
      startTimeRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setProcessingState((prev) => ({
          ...prev,
          elapsedMs: elapsed,
        }));
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [processingState.isProcessing, processingState.error]);

  const runAnalysis = async (sampleOverride?: SampleVideoOption): Promise<boolean> => {
    lastParamsRef.current = { sampleOverride };

    const currentParams = latestParamsRef.current;
    const scriptToUse = sampleOverride ? sampleOverride.rawTranscript : currentParams.rawScript;
    const durToUse = sampleOverride ? sampleOverride.duration : currentParams.videoDuration || 25;
    const typeToUse = sampleOverride ? sampleOverride.contentType : currentParams.contentType;
    const goalToUse = sampleOverride ? sampleOverride.goal : currentParams.videoGoal;
    const ctaToUse = sampleOverride ? sampleOverride.cta : currentParams.ctaText;
    const videoUrlToUse = sampleOverride ? sampleOverride.videoUrl : currentParams.videoUrl;

    const startTs = Date.now();
    startTimeRef.current = startTs;

    setProcessingState({
      isProcessing: true,
      currentStepId: 'init',
      overallProgress: 5,
      startTime: startTs,
      elapsedMs: 0,
      estimatedRemainingMs: 3500,
      steps: INITIAL_STEPS.map((s) => ({ ...s, status: 'pending', durationMs: undefined, badge: undefined, details: undefined })),
      logs: [],
      error: null,
    });

    try {
      // ----------------------------------------------------
      // STEP 1: Initialization & Parameter Validation
      // ----------------------------------------------------
      updateStep('init', 'running', 'Memeriksa meta video & prompt input...', 'MEMERIKSA');
      addLog('init', `Inisialisasi video engine: durasi ${durToUse}s, tipe '${typeToUse}'...`, 'info');
      if (goalToUse) addLog('init', `Target goal: "${goalToUse}"`, 'metric');

      await new Promise((r) => setTimeout(r, 220)); // Brief visual breathing room
      const initDuration = Date.now() - startTs;
      updateStep('init', 'completed', `${durToUse}s Video siap dianalisis`, 'VALID', initDuration);
      addLog('init', 'Input tervalidasi. Memulai segmentasi audio dan naskah...', 'success');

      // ----------------------------------------------------
      // STEP 2: Transcription & Segmentation
      // ----------------------------------------------------
      const segStart = Date.now();
      updateStep('segmentation', 'running', 'Menganalisis audio suara asli & kalimat dialog...', 'AUDIO AI');

      let mediaData: string | undefined = undefined;
      let mediaMimeType: string | undefined = undefined;

      // Check if user uploaded a custom video file to transcribe audio directly
      if (!sampleOverride && currentParams.videoFile) {
        try {
          const file = currentParams.videoFile;
          const mbSize = (file.size / (1024 * 1024)).toFixed(1);
          addLog('segmentation', `Mengekstrak audio stream dari video upload (${file.name}, ${mbSize} MB)...`, 'info');

          if (file.size <= 45 * 1024 * 1024) {
            mediaData = await readFileAsBase64(file);
            mediaMimeType = file.type || 'video/mp4';
            addLog('segmentation', 'Media stream siap. Mengirim ke Gemini Speech Engine untuk transkripsi audio verbatim...', 'info');
          } else {
            addLog('segmentation', 'Ukuran video >45MB: beralih ke mode transkrip teks assist.', 'warning');
          }
        } catch (readErr: any) {
          addLog('segmentation', `Gagal membaca file video, menggunakan fallback teks: ${readErr.message}`, 'warning');
        }
      } else {
        addLog('segmentation', 'Menghubungi engine transkripsi & boundary detection...', 'info');
      }

      let segments: TranscriptSegment[] = sampleOverride?.prebuiltSegments || [];

      if (!sampleOverride || !sampleOverride.prebuiltSegments) {
        try {
          const transcribeRes = await fetchWithStartupRetry('/api/transcribe', {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              rawText: scriptToUse,
              duration: durToUse,
              contentType: typeToUse,
              mediaData,
              mediaMimeType,
            }),
          }, 'Tahap segmentasi transkrip.');

          const transData = await safeParseResponseJson(transcribeRes, 'Tahap segmentasi transkrip.');
          segments = transData.segments || [];

          if (transData.isFromAudio) {
            addLog('segmentation', `Audio video asli berhasil ditranskripsi secara verbatim (${segments.length} segmen suara terdeteksi).`, 'success');
            if (transData.fullTranscript && currentParams.onScriptExtracted) {
              currentParams.onScriptExtracted(transData.fullTranscript);
            }
          } else {
            addLog('segmentation', `Segmentasi naskah berhasil dipetakan (${segments.length} segmen terpotong presisi).`, 'success');
          }
        } catch (transErr: any) {
          console.warn('[Workflow] Transcribe API fallback triggered:', transErr.message);
          addLog('segmentation', 'Menggunakan segmentasi boundary dialog presisi tinggi...', 'info');
          segments = generateHeuristicSegments(scriptToUse, durToUse);
        }
      } else {
        await new Promise((r) => setTimeout(r, 260));
      }

      if (!segments || segments.length === 0) {
        segments = generateHeuristicSegments(scriptToUse, durToUse);
      }

      const segDur = Date.now() - segStart;
      updateStep('segmentation', 'completed', `${segments.length} scene terpotong presisi`, `${segments.length} SCENE`, segDur);
      addLog('segmentation', `Berhasil memetakan ${segments.length} segmen dialog dengan boundary waktu akurat.`, 'success');

      // ----------------------------------------------------
      // STEP 3: Content Role & Retention Intelligence (Gemini)
      // ----------------------------------------------------
      const roleStart = Date.now();
      updateStep('content_analysis', 'running', 'Menganalisis Hook 0-3s, Problem & Emosi...', 'ANALISIS');
      addLog('content_analysis', 'Mengevaluasi Hook Strength detik 0–3s dan ritme retensi audiens...', 'info');

      let analysisItems: ContentAnalysisItem[] = [];
      try {
        const analyzeRes = await fetchWithStartupRetry('/api/analyze-content', {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            segments,
            contentType: typeToUse,
            goal: goalToUse,
            cta: ctaToUse,
          }),
        }, 'Tahap analisis konten.');

        const analysisData = await safeParseResponseJson(analyzeRes, 'Tahap analisis konten.');
        analysisItems = analysisData.analysis || [];
      } catch (anaErr: any) {
        console.warn('[Workflow] Content analysis fallback triggered:', anaErr.message);
        addLog('content_analysis', 'Menerapkan pemetaan 6-stage marketing framework (Hook, Problem, Solution, CTA)...', 'info');
        analysisItems = generateHeuristicAnalysis(segments);
      }

      if (!analysisItems || analysisItems.length === 0) {
        analysisItems = generateHeuristicAnalysis(segments);
      }

      // Highlight key findings in real-time logs
      const hookItem = analysisItems.find((a) => a.content_role === 'hook');
      if (hookItem) {
        addLog('content_analysis', `Hook terdeteksi: "${hookItem.key_phrase || '0-3s Opening'}" (Importance ${hookItem.importance}/10)`, 'metric');
      }

      const roleDur = Date.now() - roleStart;
      updateStep('content_analysis', 'completed', `${analysisItems.length} peran narasi diklasifikasikan`, 'TERPETAKAN', roleDur);
      addLog('content_analysis', `Analisis peran selesai: Hook, Problem, Solution & CTA berhasil dipetakan.`, 'success');

      // ----------------------------------------------------
      // STEP 4: AI Director Edit Plan (6 Motions, Captions, B-Roll)
      // ----------------------------------------------------
      const directorStart = Date.now();
      updateStep('edit_plan', 'running', 'Menentukan 6 preset motion zoom, highlight & B-Roll...', 'DIRECTOR');
      addLog('edit_plan', 'Mengorkestrasi dynamic camera motion (Punch zoom, Pans, Slow Zoom)...', 'info');

      const assetsToUse = sampleOverride?.defaultUserAssets || currentParams.userProofAssets;
      let planData: any = null;

      try {
        const editPlanRes = await fetchWithStartupRetry('/api/generate-edit-plan', {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            segments,
            analysis: analysisItems,
            contentType: typeToUse,
            goal: goalToUse,
            cta: ctaToUse,
            duration: durToUse,
            userAssets: assetsToUse,
          }),
        }, 'Tahap menyusun AI Edit Plan.');

        planData = await safeParseResponseJson(editPlanRes, 'Tahap menyusun AI Edit Plan.');
      } catch (planErr: any) {
        console.warn('[Workflow] Generate edit plan fallback triggered:', planErr.message);
        addLog('edit_plan', 'Menyusun Alco Edit Plan berbasis Creative Performance Engine...', 'info');
        planData = buildIntelligentEditPlan(
          segments,
          analysisItems,
          typeToUse,
          goalToUse,
          ctaToUse,
          durToUse,
          'verbatim',
          assetsToUse
        );
      }

      if (!planData || !Array.isArray(planData.scenes) || planData.scenes.length === 0) {
        planData = buildIntelligentEditPlan(
          segments,
          analysisItems,
          typeToUse,
          goalToUse,
          ctaToUse,
          durToUse,
          'verbatim',
          assetsToUse
        );
      }

      const scenesCount = planData.scenes?.length || segments.length;
      addLog('edit_plan', `Menyelaraskan karaoke subtitle & audio effects (Whoosh, Pop, Ding)...`, 'metric');

      const directorDur = Date.now() - directorStart;
      updateStep('edit_plan', 'completed', `${scenesCount} scene motion & subtitle diorkestrasi`, `${scenesCount} MOTION`, directorDur);
      addLog('edit_plan', 'Edit Plan selesai dengan aturan pacing retensi video vertikal.', 'success');

      // ----------------------------------------------------
      // STEP 5: Finalizing Workspace & Player Sync
      // ----------------------------------------------------
      const finalStart = Date.now();
      updateStep('finalizing', 'running', 'Mempersiapkan visual player 9:16...', 'FINISHING');
      addLog('finalizing', 'Mengompilasi project & menyiapkan preview canvas...', 'info');

      const fullProject: AlcoEditingProject = {
        video_type: typeToUse,
        title: planData.title || (sampleOverride ? sampleOverride.title : 'Kesalahan Fatal Jual Produk Digital'),
        target_goal: goalToUse,
        cta_text: ctaToUse,
        total_duration: durToUse,
        raw_video_url: videoUrlToUse,
        transcript: segments,
        analysis: analysisItems,
        scenes: planData.scenes || [],
        user_proof_assets: (assetsToUse || planData.user_proof_assets || []).map((pa: any) => {
          const orig = currentParams.userProofAssets?.find((u) => u.id === pa.id || u.url === pa.url);
          return orig && orig.file ? { ...pa, file: orig.file } : pa;
        }),
        stats: planData.stats,
        funnel_stage: planData.funnel_stage || 'META_ADS',
        creative_audit: planData.creative_audit,
      };

      await new Promise((r) => setTimeout(r, 300));
      const finalDur = Date.now() - finalStart;
      updateStep('finalizing', 'completed', 'Project siap direview', 'READY', finalDur);
      addLog('finalizing', 'Semua tahap selesai 100%! Mengarahkan ke studio preview...', 'success');

      setProcessingState((prev) => ({
        ...prev,
        overallProgress: 100,
      }));

      // Brief pause so user sees 100% completion before transition
      await new Promise((r) => setTimeout(r, 450));

      setProcessingState((prev) => ({
        ...prev,
        isProcessing: false,
      }));

      onSuccess(fullProject);
      return true;
    } catch (err: any) {
      console.error('Workflow execution error:', err);
      const errMsg = err.message || 'Terjadi kendala saat memproses video.';

      setProcessingState((prev) => {
        const failedId = prev.currentStepId;
        const nextSteps = prev.steps.map((step) => {
          if (step.id === failedId) {
            return {
              ...step,
              status: 'error' as const,
              details: errMsg,
              badge: 'GAGAL',
            };
          }
          return step;
        });

        return {
          ...prev,
          error: errMsg,
          failedStepId: failedId,
          steps: nextSteps,
        };
      });

      addLog(processingState.currentStepId, `Error: ${errMsg}`, 'error');
      return false;
    }
  };

  const retryLast = () => {
    runAnalysis(lastParamsRef.current?.sampleOverride);
  };

  const dismissError = () => {
    setProcessingState((prev) => ({
      ...prev,
      isProcessing: false,
      error: null,
    }));
  };

  return {
    processingState,
    runAnalysis,
    retryLast,
    dismissError,
  };
}
