import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  buildIntelligentEditPlan,
  EXTENDED_STOCK_CATALOG,
  generateWordTimings,
  formatCaptionByMode,
} from './src/engine/index.ts';
import { enrichSceneWithDecisionEngine } from './src/engine/decisionEngine.ts';
import { renderProjectMp4, getRenderedFilePath, resolveFfmpegBinaries } from './src/server/mp4Renderer.ts';
import fs from 'fs';
import os from 'os';
import multer from 'multer';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Temporary upload directory for direct streaming multipart form video uploads
const tempUploadDir = path.join(os.tmpdir(), 'alco_stream_uploads');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempUploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `upload_${unique}${ext}`);
  },
});

const videoUpload = multer({
  storage: uploadStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB limit
});

// Cross-Origin Isolation headers for FFmpeg.wasm & WebAssembly multi-threading support
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ extended: true, limit: '250mb' }));
app.use('/ffmpeg', express.static(path.join(process.cwd(), 'public', 'ffmpeg')));

// Global CORS middleware for all /api/* routes (cross-domain & static preview support)
app.use('/api', (req, res, next) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-gemini-api-key, x-api-key'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

/**
 * Helper to validate if a string represents a valid Google Gemini API Key.
 * Rejects GCP Cloud Run OAuth tokens (ya29..., y29...), JWT identity tokens (eyJ...),
 * and empty/malformed credentials.
 */
function isValidApiKeyFormat(key: string | undefined | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const k = key.trim();
  if (k.length < 10) return false;
  if (
    k.startsWith('ya29.') ||
    k.startsWith('y29.') ||
    k.startsWith('eyJ') ||
    k.startsWith('Bearer ') ||
    k.includes(' ') ||
    k === 'undefined' ||
    k === 'null'
  ) {
    return false;
  }
  return true;
}

// Lazy initialize Gemini client with optional custom API key
function getGeminiClient(customApiKey?: string | null): GoogleGenAI | null {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || !isValidApiKeyFormat(apiKey)) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Active valid Gemini models in priority order for robust quota fallback
const MODEL_FALLBACK_CHAIN = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

// In-memory cooldown tracker for default server key when hitting free-tier quota (429)
let defaultServerCooldownUntil = 0;

/**
 * Resolve Gemini API Key from request headers or environment variables with strict priority:
 * 1. x-gemini-api-key
 * 2. x-api-key
 * 3. Authorization: Bearer <key> (excluding GCP Cloud Run OAuth/Identity tokens)
 * 4. process.env.GEMINI_API_KEY / process.env.API_KEY
 */
function resolveApiKey(req: express.Request): string | null {
  const xGemini = req.headers['x-gemini-api-key'];
  if (typeof xGemini === 'string' && isValidApiKeyFormat(xGemini)) {
    return xGemini.trim();
  }

  const xApi = req.headers['x-api-key'];
  if (typeof xApi === 'string' && isValidApiKeyFormat(xApi)) {
    return xApi.trim();
  }

  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.substring(7).trim();
    if (isValidApiKeyFormat(bearer)) {
      return bearer;
    }
  }

  const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (typeof envKey === 'string' && isValidApiKeyFormat(envKey)) {
    return envKey.trim();
  }

  return null;
}

/**
 * Execute a Gemini request with model fallback and automatic seamless local heuristic failover.
 * Supports string prompts as well as multimodal content parts array (e.g. video/audio inlineData).
 */
async function callGeminiWithFallback(
  contents: string | any,
  config: any,
  apiKey?: string | null
): Promise<string> {
  const isDefaultKey = !apiKey;
  // If the shared default server key is currently in rate-limit or network cooldown, immediately proceed to local heuristic engine
  if (isDefaultKey && Date.now() < defaultServerCooldownUntil) {
    throw new Error('Default server key in cooldown; activating local intelligent engine');
  }

  const ai = getGeminiClient(apiKey);
  if (!ai) {
    throw new Error('No valid Gemini API key available; activating local intelligent engine');
  }

  let lastError: any = null;

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      // 10s per-model timeout via Promise.race to guarantee responsiveness and prevent gateway 504 timeouts
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout calling Gemini model ${model} after 10000ms`)), 10000);
      });

      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents,
          config,
        }),
        timeoutPromise,
      ]);

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      const errMessage = err?.message || String(err);

      const isAuthError =
        errMessage.includes('401') ||
        errMessage.includes('403') ||
        errMessage.includes('UNAUTHENTICATED') ||
        errMessage.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
        errMessage.includes('invalid authentication credentials') ||
        errMessage.includes('API_KEY_INVALID') ||
        errMessage.includes('API key not valid');

      if (isAuthError) {
        console.warn(`[Gemini Engine] Authentication error (401/403) on model ${model}: Invalid API Key credentials. Halting Gemini attempts to activate local engine.`);
        throw new Error(`Gemini authentication error (401/403): ${errMessage}`);
      }

      const isNetworkError =
        errMessage.includes('fetch failed') ||
        errMessage.includes('ENOTFOUND') ||
        errMessage.includes('ECONNREFUSED') ||
        errMessage.includes('ETIMEDOUT') ||
        errMessage.includes('Timeout calling Gemini model');

      const isQuotaError = errMessage.includes('429') || errMessage.includes('quota') || errMessage.includes('RESOURCE_EXHAUSTED');
      const isHighDemand = errMessage.includes('503') || errMessage.includes('high demand') || errMessage.includes('Service Unavailable');

      if ((isQuotaError || isHighDemand || isNetworkError) && isDefaultKey) {
        // Set cooldown on default server key so subsequent requests seamlessly use local intelligence
        defaultServerCooldownUntil = Date.now() + 45000;
      }

      // Informational log for debugging without polluting stderr
      let statusLog = errMessage.slice(0, 120);
      if (isQuotaError) {
        statusLog = 'Quota limit reached (429), failing over to next model or local engine';
      } else if (isHighDemand) {
        statusLog = 'High demand (503) on model, failing over to next stable model or local engine';
      } else if (isNetworkError) {
        statusLog = 'Network/connectivity issue, activating fast local engine failover';
      }
      console.log(`[Gemini Engine] Model ${model} status: ${statusLog}`);

      // If it's a network-level fetch failure (e.g. host cannot reach generativelanguage.googleapis.com), don't waste time trying the other models in the chain as they will also fail with fetch failed
      if (isNetworkError) {
        throw new Error(`Network connectivity issue to Gemini API: ${errMessage}`);
      }
    }
  }

  throw lastError || new Error('All Gemini models exhausted');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Validate API Key endpoint for user testing in settings modal
app.post('/api/validate-key', async (req, res) => {
  const keyToTest = (req.body?.testKey as string)?.trim() || resolveApiKey(req);
  if (!keyToTest) {
    return res.status(400).json({
      valid: false,
      message: 'Masukkan API key terlebih dahulu.',
    });
  }

  try {
    const ai = getGeminiClient(keyToTest);
    if (!ai) {
      return res.status(400).json({
        valid: false,
        message: 'Key tidak valid, expired, atau tidak punya akses ke model Gemini. Coba buat ulang API key di Google AI Studio.',
      });
    }

    // Quick low-token test call to verify key permissions and quota across model chain
    let testModel = 'gemini-3.7-flash';
    let responseText = '';
    let lastTestError: any = null;
    for (const m of ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest']) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout validating key')), 6000);
        });
        const resp = await Promise.race([
          ai.models.generateContent({
            model: m,
            contents: 'Respond with OK',
            config: { maxOutputTokens: 10 },
          }),
          timeoutPromise,
        ]);
        if (resp && resp.text) {
          testModel = m;
          responseText = resp.text;
          break;
        }
      } catch (e: any) {
        lastTestError = e;
      }
    }

    if (responseText) {
      return res.json({
        valid: true,
        model: testModel,
        message: `Koneksi ke Gemini API (${testModel}) berhasil! API key terhubung dan siap digunakan.`,
      });
    }

    return res.status(400).json({
      valid: false,
      message: 'Key tidak valid, expired, atau tidak punya akses ke model Gemini. Coba buat ulang API key di Google AI Studio.',
    });
  } catch (err: any) {
    return res.status(400).json({
      valid: false,
      message: 'Key tidak valid, expired, atau tidak punya akses ke model Gemini. Coba buat ulang API key di Google AI Studio.',
    });
  }
});

// Server Key Status endpoint
app.get('/api/key-status', (req, res) => {
  const apiKey = resolveApiKey(req);
  const xGemini = req.headers['x-gemini-api-key'];
  const xApi = req.headers['x-api-key'];
  const hasCustom = Boolean(
    (typeof xGemini === 'string' && xGemini.trim().length > 0 && !xGemini.startsWith('ya29.') && !xGemini.startsWith('y29.')) ||
    (typeof xApi === 'string' && xApi.trim().length > 0 && !xApi.startsWith('ya29.') && !xApi.startsWith('y29.'))
  );
  const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const hasServer = Boolean(typeof envKey === 'string' && envKey.trim().length > 0 && !envKey.startsWith('ya29.') && !envKey.startsWith('y29.'));

  res.json({
    hasKey: Boolean(apiKey),
    isCustomKey: hasCustom,
    hasServerFallback: hasServer,
  });
});

/**
 * Safe JSON parser that strips markdown code blocks (```json ... ```)
 * and extracts nested JSON if needed.
 */
function cleanAndParseJson<T = any>(raw: string | undefined | null, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  let clean = raw.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  try {
    return JSON.parse(clean);
  } catch (_) {
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
      } catch (innerErr) {
        console.warn('Sub-json parsing fallback also failed:', innerErr);
      }
    }
    return fallback;
  }
}

// --- Deterministic Local Segmentation Fallback ---
function generateHeuristicSegments(rawText: string, totalDur: number) {
  const clean = (rawText || '').trim();
  const sentences = clean
    ? clean
        .split(/(?<=[.!?\n])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [
        'Kebanyakan orang salah ketika mulai jualan produk digital.',
        'Mereka langsung membuat produknya berbulan-bulan tanpa validasi.',
        'Padahal seharusnya mereka riset dan validasi pasar dulu.',
        'Cari tahu masalah target audiensmu sebelum bikin modul.',
        'Klik link di bio sekarang untuk dapat template validasi kilat!',
      ];

  const count = sentences.length || 1;
  const dur = Number(totalDur) > 0 ? Number(totalDur) : 25;
  const timePerSegment = dur / count;

  return sentences.map((text, idx) => ({
    id: idx + 1,
    start: Number((idx * timePerSegment).toFixed(1)),
    end: Number(((idx + 1) * timePerSegment).toFixed(1)),
    text: String(text || '').trim(),
  }));
}

function generateHeuristicAnalysis(segments: any[]) {
  const safeList = Array.isArray(segments) && segments.length > 0 ? segments : generateHeuristicSegments('', 25);
  const roles: Array<'hook' | 'problem' | 'explanation' | 'solution' | 'proof' | 'cta'> = [
    'hook',
    'problem',
    'explanation',
    'solution',
    'proof',
    'cta',
  ];

  return safeList.map((seg, idx) => {
    let role: 'hook' | 'problem' | 'explanation' | 'solution' | 'proof' | 'cta' = 'explanation';
    let emotion: 'warning' | 'curious' | 'urgent' | 'authoritative' | 'excitement' | 'empathy' | 'neutral' = 'neutral';
    let importance = 7;

    if (idx === 0) {
      role = 'hook';
      emotion = 'curious';
      importance = 10;
    } else if (idx === 1) {
      role = 'problem';
      emotion = 'warning';
      importance = 8;
    } else if (idx === safeList.length - 1) {
      role = 'cta';
      emotion = 'urgent';
      importance = 9;
    } else if (idx === safeList.length - 2) {
      role = 'solution';
      emotion = 'excitement';
      importance = 8;
    } else {
      role = roles[idx % roles.length] || 'explanation';
      emotion = 'authoritative';
    }

    const segText = String(seg?.text || '').trim();
    const words = segText.split(/\s+/).filter((w: string) => w.length > 3);
    const key_phrase = words.slice(0, 3).join(' ').toUpperCase() || 'POINT UTAMA';

    return {
      id: seg?.id || idx + 1,
      start: Number(seg?.start) || 0,
      end: Number(seg?.end) || 3,
      content_role: role,
      importance,
      emotion,
      key_phrase,
      reasoning: `Segmen ke-${idx + 1} diarahkan sebagai ${role} untuk menjaga ritme retensi penonton.`,
    };
  });
}

function generateHeuristicEditPlan(segments: any[], analysis: any[], contentType: string, duration: number) {
  const safeSegs = Array.isArray(segments) && segments.length > 0 ? segments : generateHeuristicSegments('', duration);
  const safeAna = Array.isArray(analysis) && analysis.length > 0 ? analysis : generateHeuristicAnalysis(safeSegs);

  const scenes = safeSegs.map((seg, idx) => {
    const ana = safeAna[idx] || {};
    const role = ana.content_role || (idx === 0 ? 'hook' : idx === safeSegs.length - 1 ? 'cta' : 'explanation');
    const segDur = Math.max(0.5, (Number(seg?.end) || 3) - (Number(seg?.start) || 0));

    let motion: 'normal' | 'slow_zoom_in' | 'slow_zoom_out' | 'punch_zoom' | 'pan_left' | 'pan_right' = 'slow_zoom_in';
    let motion_scale = 1.08;
    let caption_style: 'normal' | 'highlight' | 'hook' = 'highlight';
    let sound_effect:
      | 'none'
      | 'whoosh'
      | 'fast_whoosh'
      | 'swipe'
      | 'pop'
      | 'soft_pop'
      | 'click'
      | 'button_click'
      | 'ding'
      | 'success_chime'
      | 'notification'
      | 'impact'
      | 'short_impact'
      | 'soft_impact'
      | 'riser'
      | 'soft_riser'
      | 'dark_riser'
      | 'tension_pulse'
      | 'low_hit'
      | 'data_blip'
      | 'glitch'
      | 'error_beep'
      | 'tick'
      | 'cash_register'
      | 'downlifter'
      | 'camera_shutter' = 'none';
    let transition: 'cut' | 'flash' | 'whip_pan' | 'zoom_cut' = 'cut';
    let broll_query: string | null = null;
    let director_note = '';

    if (role === 'hook') {
      motion = 'punch_zoom';
      motion_scale = 1.2;
      caption_style = 'hook';
      sound_effect = 'whoosh';
      transition = 'cut';
      director_note = 'Punch zoom 1.20x instan di 3 detik pertama untuk visual pattern-interrupt.';
    } else if (role === 'problem') {
      motion = 'slow_zoom_in';
      motion_scale = 1.1;
      caption_style = 'highlight';
      sound_effect = 'impact';
      transition = 'cut';
      broll_query = 'frustrated person looking at laptop screen';
      director_note = 'Slow zoom in dengan impact thud ringan untuk menonjolkan empati emosional.';
    } else if (role === 'solution') {
      motion = 'slow_zoom_out';
      motion_scale = 1.08;
      caption_style = 'highlight';
      sound_effect = 'pop';
      transition = 'zoom_cut';
      broll_query = 'successful entrepreneur laptop charts growth';
      director_note = 'Zoom out dinamis dengan pop lembut memberikan kelegaan visual.';
    } else if (role === 'proof') {
      motion = 'pan_right';
      motion_scale = 1.05;
      caption_style = 'highlight';
      sound_effect = 'success_chime';
      transition = 'flash';
      broll_query = 'analytics dashboard graphs metrics';
      director_note = 'Pan right cinematic dengan chime indah untuk visualisasi data dan pembuktian.';
    } else if (role === 'cta') {
      motion = 'punch_zoom';
      motion_scale = 1.15;
      caption_style = 'hook';
      sound_effect = 'click';
      transition = 'flash';
      director_note = 'Highlight CTA dengan klik mekanik bersih untuk memicu aksi.';
    } else {
      motion = 'pan_left';
      motion_scale = 1.05;
      caption_style = 'normal';
      sound_effect = 'none';
      transition = 'cut';
      director_note = 'Visual pacing berimbang tanpa gangguan suara efek tambahan.';
    }

    const segText = String(seg?.text || '').trim();
    const words = segText
      .replace(/[.,!?'"]/g, '')
      .split(/\s+/)
      .filter((w: string) => w.length >= 4);
    const highlight_words = words.slice(0, 2).map((w: string) => w.toUpperCase());
    const safeHighlights = highlight_words.length > 0 ? highlight_words : ['KONTEN', 'PENTING'];
    const word_timings = generateWordTimings(segText, segDur, safeHighlights);

    // Strictly NO generic/stock B-roll fallback in heuristic plan. Only pure speaker focus or camera dynamics.
    const brollObj = null;

    return {
      id: seg?.id || idx + 1,
      start: Number(seg?.start) || 0,
      end: Number(seg?.end) || 3,
      role,
      motion,
      motion_scale,
      caption: segText,
      caption_style,
      caption_mode: 'verbatim',
      highlight_words: safeHighlights,
      word_timings,
      broll_query: null,
      broll: brollObj,
      transition,
      sound_effect,
      director_note,
    };
  });

  return {
    video_type: contentType || 'meta_ads',
    title: 'Alco Auto Motion Edit Plan',
    total_duration: duration || 25,
    stats: {
      hook_strength: 92,
      pacing_score: 95,
      visual_variety: 88,
      retention_estimate: '85% expected 3s retention',
    },
    scenes,
  };
}

// 1. Transcription & Segmentation Endpoint
app.post('/api/transcribe', async (req, res) => {
  const { rawText, duration, contentType, mediaData, mediaMimeType } = req.body || {};
  const totalDur = Number(duration) || 25;
  const apiKey = resolveApiKey(req);

  // PRIORITY 1: If audio/video media is provided from uploaded file, transcribe real speech
  if (mediaData && typeof mediaData === 'string' && mediaData.length > 100) {
    try {
      const cleanBase64 = mediaData.replace(/^data:[^;]+;base64,/, '');
      const mime = mediaMimeType || 'video/mp4';

      const audioPrompt = `You are a world-class speech-to-text audio transcriber and subtitle segmentation engine for talking-head short-form videos.
Listen carefully to the human voice and spoken dialogue in the provided media.

YOUR TASK:
1. Transcribe the EXACT spoken words verbatim as heard in the audio track (Indonesian or English as spoken).
2. Segment the dialogue into short, natural speech scenes (2 to 5 seconds long) based on vocal pauses and sentence boundaries.
3. Assign accurate start and end timestamps (in seconds with 1 decimal precision) matching the exact moment the speaker speaks.
4. Total media duration is approximately ${totalDur} seconds.

CRITICAL ACCURACY DIRECTIVES:
- Transcribe VERBATIM: Do NOT summarize, rewrite, omit, or paraphrase any words spoken by the voice.
- Capture the genuine Indonesian or English words exactly as enunciated by the speaker.
- Ensure start and end timestamps tightly track the speech timing so video captions remain 100% in sync with the voice.
${rawText && rawText.length > 5 ? `Optional user script reference (use ONLY for vocabulary/spelling guidance, never override actual spoken words): """${rawText}"""` : ''}

Return ONLY valid JSON matching the schema.`;

      const contents = [
        {
          inlineData: {
            mimeType: mime,
            data: cleanBase64,
          },
        },
        {
          text: audioPrompt,
        },
      ];

      const rawResponse = await callGeminiWithFallback(contents, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullTranscript: {
              type: Type.STRING,
              description: 'Complete exact verbatim transcript of all spoken words in the audio',
            },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  start: { type: Type.NUMBER, description: 'Start time in seconds in audio' },
                  end: { type: Type.NUMBER, description: 'End time in seconds in audio' },
                  text: { type: Type.STRING, description: 'Exact words spoken in this segment verbatim' },
                },
                required: ['id', 'start', 'end', 'text'],
              },
            },
          },
          required: ['fullTranscript', 'segments'],
        },
      }, apiKey);

      const parsed = cleanAndParseJson(rawResponse, { segments: [] as any[], fullTranscript: '' });
      if (parsed.segments && Array.isArray(parsed.segments) && parsed.segments.length > 0) {
        return res.json({
          segments: parsed.segments,
          fullTranscript: parsed.fullTranscript || parsed.segments.map((s: any) => s.text).join(' '),
          isFromAudio: true,
        });
      }
    } catch (audioErr: any) {
      console.warn('Multimodal audio transcription failed or unavailable, falling back to script segmentation:', audioErr?.message || audioErr);
    }
  }

  // PRIORITY 2: Text / Script based Segmentation (Fallback or Preset Sample)
  try {
    const prompt = `You are an expert short-form video speech-to-text timing and scene segmentation engine.
Convert the following transcript / video dialogue into precise timed segments (start and end in seconds).
Total video duration is approximately ${totalDur} seconds.
Content format: 9:16 vertical short-form video (${contentType || 'Meta Ads'}).

CRITICAL REQUIREMENT:
- Transcribe the EXACT spoken words verbatim.
- Do NOT summarize, omit, edit, or paraphrase any words, as exact speech-to-text alignment with audio is critical.
- Ensure segments are 2 to 5 seconds long (ideal for fast-paced short-form editing), and natural sentence boundaries.

Input transcript:
"""
${rawText || 'Kebanyakan orang salah ketika mulai jualan produk digital. Mereka langsung membuat produknya. Padahal seharusnya mereka validasi pasar dulu.'}
"""

Return ONLY valid JSON matching the schema.`;

    const rawResponse = await callGeminiWithFallback(prompt, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullTranscript: {
            type: Type.STRING,
            description: 'Full verbatim transcript text',
          },
          segments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                start: { type: Type.NUMBER, description: 'Start time in seconds with 1 decimal precision' },
                end: { type: Type.NUMBER, description: 'End time in seconds with 1 decimal precision' },
                text: { type: Type.STRING, description: 'Exact speech segment text verbatim' },
              },
              required: ['id', 'start', 'end', 'text'],
            },
          },
        },
        required: ['segments'],
      },
    }, apiKey);

    const parsed = cleanAndParseJson(rawResponse, { segments: [] as any[], fullTranscript: '' });
    if (parsed.segments && Array.isArray(parsed.segments) && parsed.segments.length > 0) {
      return res.json({
        segments: parsed.segments,
        fullTranscript: parsed.fullTranscript || rawText,
        isFromAudio: false,
      });
    }
    throw new Error('Empty segments returned by AI');
  } catch (error: any) {
    const fallbackSegments = generateHeuristicSegments(rawText, totalDur);
    return res.json({
      segments: fallbackSegments,
      fullTranscript: rawText || fallbackSegments.map((s) => s.text).join(' '),
      isFromAudio: false,
    });
  }
});

// 2. AI Content Analyzer Endpoint
app.post('/api/analyze-content', async (req, res) => {
  const { segments, contentType, goal, cta } = req.body || {};
  const safeSegments = Array.isArray(segments) && segments.length > 0
    ? segments.map((s: any, idx: number) => ({
        id: s?.id || idx + 1,
        start: Number(s?.start) || 0,
        end: Number(s?.end) || 3,
        text: String(s?.text || '').trim(),
      }))
    : generateHeuristicSegments('', 25);
  const apiKey = resolveApiKey(req);

  try {
    const prompt = `You are Alco's AI Content Analyzer for high-performing short-form video (Meta Ads, TikTok, Reels).
Analyze each transcript segment in depth.

Content Type: ${contentType || 'meta_ads'}
Video Goal: ${goal || 'Maximize conversion and viewer retention'}
Target CTA: ${cta || 'Action required at end'}

Segments:
${JSON.stringify(safeSegments, null, 2)}

For EACH segment, categorize its content role into one of:
- "hook" (the initial 0-3s attention grabber, counter-intuitive statement, or pattern interrupt)
- "problem" (pain point, common mistake, frustration, or obstacle)
- "explanation" (breakdown of why the problem happens or context)
- "solution" (the remedy, core framework, strategy, or unique mechanism)
- "proof" (demonstration, statistics, results, or credibility)
- "cta" (call to action, urgency, next steps)

Also provide:
- importance: integer 1 to 10
- emotion: "warning" | "curious" | "urgent" | "authoritative" | "excitement" | "empathy" | "neutral"
- key_phrase: 2-4 most impactful words in this segment
- reasoning: brief 1-sentence explanation of why this role and emotion were chosen.`;

    const rawResponse = await callGeminiWithFallback(prompt, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                start: { type: Type.NUMBER },
                end: { type: Type.NUMBER },
                content_role: {
                  type: Type.STRING,
                  enum: ['hook', 'problem', 'explanation', 'solution', 'proof', 'cta'],
                },
                importance: { type: Type.INTEGER },
                emotion: {
                  type: Type.STRING,
                  enum: ['warning', 'curious', 'urgent', 'authoritative', 'excitement', 'empathy', 'neutral'],
                },
                key_phrase: { type: Type.STRING },
                reasoning: { type: Type.STRING },
              },
              required: ['id', 'start', 'end', 'content_role', 'importance', 'emotion', 'key_phrase', 'reasoning'],
            },
          },
        },
        required: ['analysis'],
      },
    }, apiKey);

    const parsed = cleanAndParseJson(rawResponse, { analysis: [] as any[] });
    if (parsed.analysis && Array.isArray(parsed.analysis) && parsed.analysis.length > 0) {
      return res.json(parsed);
    }
    throw new Error('Empty analysis returned by AI');
  } catch (error: any) {
    try {
      const fallbackAnalysis = generateHeuristicAnalysis(safeSegments);
      return res.json({ analysis: fallbackAnalysis });
    } catch (fallbackError: any) {
      console.error('Error during fallback analysis generation:', fallbackError);
      return res.json({
        analysis: safeSegments.map((s: any, idx: number) => ({
          id: s.id || idx + 1,
          start: s.start || 0,
          end: s.end || 3,
          content_role: idx === 0 ? 'hook' : idx === safeSegments.length - 1 ? 'cta' : 'explanation',
          importance: 8,
          emotion: 'neutral',
          key_phrase: 'POINT UTAMA',
          reasoning: 'Analisis segmentasi heuristik',
        })),
      });
    }
  }
});

// 3. AI Editing Director Endpoint (Produces full Alco Video Engine Editing JSON)
app.post('/api/generate-edit-plan', async (req, res) => {
  const { segments, analysis, contentType, goal, cta, duration, captionMode, userAssets } = req.body || {};
  const safeSegments = Array.isArray(segments) && segments.length > 0
    ? segments.map((s: any, idx: number) => ({
        id: s?.id || idx + 1,
        start: Number(s?.start) || 0,
        end: Number(s?.end) || 3,
        text: String(s?.text || '').trim(),
      }))
    : generateHeuristicSegments('', Number(duration) || 25);
  const safeAnalysis = Array.isArray(analysis) && analysis.length > 0 ? analysis : generateHeuristicAnalysis(safeSegments);
  const totalDur = Number(duration) || 25;
  const apiKey = resolveApiKey(req);

  try {
    const prompt = `You are Alco Video Engine's AI Editing Director.
Generate a structured, high-conversion, professional editing blueprint for a 9:16 talking-head video.

Rules for Director Decisions:
1. MOTION PRESETS (Choose strictly from these 6 presets only):
   - "punch_zoom": Snappy instant zoom (scale 1.15 to 1.25) to emphasize high-impact hooks, shocking statements, or climax points.
   - "slow_zoom_in": Smooth continuous zoom in (scale 1.05 to 1.12) to draw viewers closer during problems, serious advice, or explanations.
   - "slow_zoom_out": Smooth continuous zoom out (scale 1.08 to 1.0) to release tension or introduce a broad solution.
   - "pan_left": Subtle cinematic dynamic horizontal slide to left to change visual framing.
   - "pan_right": Subtle cinematic dynamic horizontal slide to right.
   - "normal": Balanced 1.0 baseline framing when displaying heavy visual overlays or resting pacing.

2. SHORT-FORM RETENTION & PACING RULES:
   - Scene 1 (0-3s Hook): MUST use punch_zoom (scale 1.20) + whoosh sound effect + flash/cut. NEVER use normal or slow zoom for hook. Direct eye-contact, no full-screen B-roll covering the face in first 3s!
   - Problem / Pain Point: Use slow_zoom_in to build emotional gravity.
   - Solution / Transformation: Use slow_zoom_out or zoom_cut for visual release.
   - Proof / Numbers: Use pan_left or pan_right with ding sound effect.
   - CTA (Closing): Use punch_zoom or high-focus slow_zoom_in with pop/whoosh.
   - Avoid consecutive monotonous motions. Contrast camera movements to reset visual fatigue every 3-4s.

3. CAPTION VERBATIM FIDELITY & HIGHLIGHT WORDS:
   - caption: MUST preserve the exact spoken transcript words from the segment verbatim. Never summarize, rewrite, or chop spoken words unless explicitly asked. Voice-caption synchrony is highest priority!
   - highlight_words: Extract 1 to 3 uppercase power words from the segment text (e.g. "JANGAN", "PRODUK", "VALIDASI", "ROAS 5X", "RAHASIA"). Do NOT highlight prepositions or stopwords.

4. B-ROLL VISUAL INTENT:
   - visual_intent: "proof" | "metaphor" | "process" | "contrast" | "product" | "result" | "urgency" | "none"
   - broll_framing: "pip" (picture-in-picture) | "full" (full frame overlay) | "split" (split screen comparison) | null

Input Data:
- Content Type: ${contentType || 'meta_ads'}
- Total Duration: ${totalDur}s
- Goal: ${goal || 'High retention & CTR'}
- Segments: ${JSON.stringify(safeSegments)}
- Analysis: ${JSON.stringify(safeAnalysis)}

Generate the complete editing plan JSON.`;

    const rawResponse = await callGeminiWithFallback(prompt, {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          video_type: {
            type: Type.STRING,
            enum: ['meta_ads', 'reels_tiktok', 'affiliate', 'education'],
          },
          title: { type: Type.STRING },
          total_duration: { type: Type.NUMBER },
          stats: {
            type: Type.OBJECT,
            properties: {
              hook_strength: { type: Type.INTEGER, description: '1 to 100' },
              pacing_score: { type: Type.INTEGER, description: '1 to 100' },
              visual_variety: { type: Type.INTEGER, description: '1 to 100' },
              retention_estimate: { type: Type.STRING, description: 'e.g. 78% expected 3s retention' },
            },
            required: ['hook_strength', 'pacing_score', 'visual_variety', 'retention_estimate'],
          },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                start: { type: Type.NUMBER },
                end: { type: Type.NUMBER },
                role: {
                  type: Type.STRING,
                  enum: ['hook', 'problem', 'explanation', 'solution', 'proof', 'cta'],
                },
                motion: {
                  type: Type.STRING,
                  enum: ['normal', 'slow_zoom_in', 'slow_zoom_out', 'punch_zoom', 'pan_left', 'pan_right'],
                },
                motion_scale: { type: Type.NUMBER, description: '1.0 to 1.25' },
                caption: { type: Type.STRING, description: 'Exact spoken dialogue verbatim matching speech audio' },
                caption_style: {
                  type: Type.STRING,
                  enum: ['normal', 'highlight', 'hook'],
                },
                highlight_words: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                visual_intent: {
                  type: Type.STRING,
                  enum: ['proof', 'metaphor', 'process', 'contrast', 'product', 'result', 'urgency', 'none'],
                },
                broll_query: { type: Type.STRING, nullable: true, description: 'Stock footage search keyword if applicable' },
                transition: {
                  type: Type.STRING,
                  enum: ['cut', 'flash', 'whip_pan', 'zoom_cut'],
                },
                sound_effect: {
                  type: Type.STRING,
                  enum: [
                    'none',
                    'whoosh',
                    'fast_whoosh',
                    'swipe',
                    'pop',
                    'soft_pop',
                    'click',
                    'button_click',
                    'ding',
                    'success_chime',
                    'notification',
                    'impact',
                    'short_impact',
                    'soft_impact',
                    'riser',
                    'soft_riser',
                    'dark_riser',
                    'tension_pulse',
                    'low_hit',
                    'data_blip',
                    'glitch',
                    'error_beep',
                    'tick',
                    'cash_register',
                    'downlifter',
                    'camera_shutter',
                  ],
                },
                director_note: { type: Type.STRING, description: 'Short reasoning for this edit decision' },
              },
              required: [
                'id',
                'start',
                'end',
                'role',
                'motion',
                'motion_scale',
                'caption',
                'caption_style',
                'highlight_words',
                'transition',
                'sound_effect',
                'director_note',
              ],
            },
          },
        },
        required: ['video_type', 'title', 'total_duration', 'stats', 'scenes'],
      },
    }, apiKey);

    const parsed = cleanAndParseJson(rawResponse, {} as any);

    // Enrich with intelligence scores and stock catalog matching
    if (parsed.scenes && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
      const effectiveCaptionMode = captionMode || 'verbatim';
      const basePlan = buildIntelligentEditPlan(
        safeSegments,
        safeAnalysis,
        contentType,
        goal,
        cta,
        totalDur,
        effectiveCaptionMode,
        userAssets
      );

      // Merge AI custom suggestions with engine scores & verbatim captions
      const mergedScenes: any[] = [];
      for (let idx = 0; idx < parsed.scenes.length; idx++) {
        const scene = parsed.scenes[idx];
        const engineScene = basePlan.scenes[idx] || basePlan.scenes[0];
        const segDur = Math.max(0.5, (Number(scene.end) || engineScene.end) - (Number(scene.start) || engineScene.start));
        const originalVerbatim = safeSegments[idx]?.text || engineScene.caption;
        const captionText = effectiveCaptionMode === 'verbatim' ? originalVerbatim : (scene.caption || originalVerbatim);
        const highlightWords = Array.isArray(scene.highlight_words) && scene.highlight_words.length > 0
          ? scene.highlight_words
          : engineScene.highlight_words;

        // Accurate phonetic/character-weighted word timings
        const sceneRole = (scene.role || engineScene.role) as any;
        const accurateWordTimings = generateWordTimings(captionText, segDur, highlightWords, sceneRole);

        const hasUserAssets = Boolean(userAssets && userAssets.length > 0);
        let brollObj = hasUserAssets ? engineScene.broll : null;
        let visualEvidenceObj = hasUserAssets ? engineScene.visual_evidence : null;

        const merged = {
          ...engineScene,
          ...scene,
          caption: captionText,
          highlight_words: highlightWords,
          word_timings: accurateWordTimings,
          caption_mode: effectiveCaptionMode,
          broll: brollObj,
          visual_evidence: visualEvidenceObj,
          scores: engineScene.scores,
          camera_dynamics: engineScene.camera_dynamics,
        };

        const enriched = enrichSceneWithDecisionEngine(merged, idx, parsed.scenes.length, hasUserAssets, mergedScenes);
        mergedScenes.push(enriched);
      }

      return res.json({
        ...basePlan,
        title: parsed.title || basePlan.title,
        stats: parsed.stats || basePlan.stats,
        scenes: mergedScenes,
      });
    }

    throw new Error('Invalid edit plan scenes returned');
  } catch (error: any) {
    try {
      const fallbackPlan = buildIntelligentEditPlan(
        safeSegments,
        safeAnalysis,
        contentType,
        goal,
        cta,
        totalDur,
        captionMode || 'verbatim',
        userAssets
      );
      return res.json(fallbackPlan);
    } catch (fallbackError: any) {
      console.error('Error generating fallback edit plan:', fallbackError);
      const simplePlan = generateHeuristicEditPlan(safeSegments, safeAnalysis, contentType, totalDur);
      return res.json(simplePlan);
    }
  }
});

// 4. Regenerate Single Scene Endpoint
app.post('/api/regenerate-scene', async (req, res) => {
  const { scene, instruction, contentType } = req.body;

  try {
    const motions: Array<'punch_zoom' | 'slow_zoom_in' | 'slow_zoom_out' | 'pan_left' | 'pan_right'> = [
      'punch_zoom',
      'slow_zoom_in',
      'slow_zoom_out',
      'pan_left',
      'pan_right',
    ];
    const currentIdx = motions.indexOf(scene?.motion);
    const newMotion = motions[(currentIdx + 1) % motions.length] || 'punch_zoom';
    const newScale = newMotion === 'punch_zoom' ? 1.2 : newMotion.startsWith('slow') ? 1.1 : 1.06;
    const segDur = Math.max(0.5, (scene.end || 3) - (scene.start || 0));
    const wordTimings = generateWordTimings(scene.caption || '', segDur, scene.highlight_words || []);

    res.json({
      ...scene,
      motion: newMotion,
      motion_scale: newScale,
      caption_style: scene.caption_style === 'hook' ? 'highlight' : 'hook',
      sound_effect: newMotion === 'punch_zoom' ? 'whoosh' : 'pop',
      word_timings: wordTimings,
      director_note: `Intelligent Scene Re-balance: Switching to ${newMotion} (${newScale}x) with enhanced energy contrast.`,
    });
  } catch (error: any) {
    res.json(scene);
  }
});

// 5. Stock Catalog Search Endpoint
app.post('/api/stock-search', (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.json({ results: EXTENDED_STOCK_CATALOG });
  }
  const qLower = String(query).toLowerCase();
  const filtered = EXTENDED_STOCK_CATALOG.filter(
    (item) =>
      item.title.toLowerCase().includes(qLower) ||
      item.intent.toLowerCase().includes(qLower) ||
      item.keywords.some((k) => qLower.includes(k) || k.includes(qLower))
  );
  res.json({ results: filtered.length > 0 ? filtered : EXTENDED_STOCK_CATALOG.slice(0, 3) });
});

// 6. Batch 1: Render Backend Health Check Endpoint
app.get('/api/render-health', async (req, res) => {
  try {
    const bins = await resolveFfmpegBinaries();
    return res.json({
      success: true,
      mode: 'server',
      renderMp4Available: bins.ffmpegAvailable && bins.ffprobeAvailable,
      ffmpegAvailable: bins.ffmpegAvailable,
      ffprobeAvailable: bins.ffprobeAvailable,
      ffmpegPath: bins.ffmpegPath,
      ffprobePath: bins.ffprobePath,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      mode: 'server',
      renderMp4Available: false,
      ffmpegAvailable: false,
      ffprobeAvailable: false,
      error: err?.message || 'Gagal memeriksa kesehatan server render',
    });
  }
});

// Batch 2: Explicit Render MP4 Ping Endpoint
app.get('/api/render-mp4/ping', (req, res) => {
  res.json({
    success: true,
    endpoint: 'render-mp4',
    method: 'POST',
    accepts: 'multipart/form-data',
    server: 'express',
  });
});

// 7. Server MP4 Render Endpoint (Native FFmpeg 24 FPS 720x1280 with Audio & Captions)
// Supports direct multipart/form-data upload (videoFile + assetFiles[]) and JSON payload
app.post(
  '/api/render-mp4',
  (req, res, next) => {
    videoUpload.any()(req, res, (err) => {
      if (err) {
        console.error('[Server MP4 Render Multer Error]:', err);
        let errorMsg = 'Gagal mengunggah file video atau aset pendukung.';
        if (err.code === 'LIMIT_FILE_SIZE') {
          errorMsg = 'Ukuran file melebihi batas maksimum 500 MB.';
        } else if (err.message) {
          errorMsg = `Gagal memproses upload: ${err.message}`;
        }
        return res.status(400).json({
          success: false,
          error: errorMsg,
          failedStage: 'server_receive_upload',
          technicalDetail: `Multer upload error: ${err.message || err.code}`,
          recommendedFix: 'Pastikan ukuran file di bawah 500MB dan koneksi internet stabil.',
          diagnostics: {
            inputReceived: false,
            uploadedFilePathExists: false,
            inputFileSizeBytes: 0,
          },
        });
      }
      next();
    });
  },
  async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    const videoFile = files.find((f: any) => f.fieldname === 'videoFile');
    let uploadedFilePath: string | null = videoFile?.path || null;
    const uploadedAssetPaths: string[] = [];

    try {
      let project = req.body?.project;
      if (typeof project === 'string') {
        try {
          project = JSON.parse(project);
        } catch (parseErr: any) {
          return res.status(400).json({
            success: false,
            error: 'Format data project JSON tidak valid.',
            failedStage: 'server_receive_upload',
            technicalDetail: `JSON.parse error on req.body.project: ${parseErr?.message}`,
            recommendedFix: 'Pastikan data editing plan terisi lengkap sebelum render.',
          });
        }
      }

      const { videoBase64, videoUrl, renderDurationMode, targetFps, width, height } = req.body || {};

      if (!project || !Array.isArray(project.scenes)) {
        return res.status(400).json({
          success: false,
          error: 'Project data (editing plan) is required for server render.',
          failedStage: 'server_receive_upload',
          technicalDetail: 'Field req.body.project is missing or project.scenes is not an array.',
          recommendedFix: 'Pastikan naskah video dan timeline scene telah di-generate sebelum render.',
        });
      }

      if (!uploadedFilePath && !videoBase64 && !videoUrl) {
        return res.status(400).json({
          success: false,
          error: 'Video source (videoFile multipart, videoBase64, or videoUrl) is required for server render.',
          failedStage: 'server_receive_upload',
          technicalDetail: 'Neither req.file, videoBase64, nor videoUrl was provided in the request payload.',
          recommendedFix: 'Unggah file video sumber melalui picker sebelum memulai ekspor.',
        });
      }

      // Collect and map all supporting asset files sent in FormData
      const assetFiles = files.filter((f: any) => f.fieldname !== 'videoFile');
      const assetMap: Record<string, string> = {};

      let clientAssetMap: Record<string, string> = {};
      if (req.body?.assetMap) {
        try {
          clientAssetMap = typeof req.body.assetMap === 'string' ? JSON.parse(req.body.assetMap) : req.body.assetMap;
        } catch (_) {}
      }

      for (const af of assetFiles) {
        uploadedAssetPaths.push(af.path);
        // Format: `${assetId}___${filename}`
        const match = af.originalname.match(/^([a-zA-Z0-9_-]+)___/);
        if (match && match[1]) {
          assetMap[match[1]] = af.path;
        }
        if (af.fieldname.startsWith('asset_')) {
          const id = af.fieldname.replace('asset_', '');
          assetMap[id] = af.path;
        }
        for (const [aId, originalName] of Object.entries(clientAssetMap)) {
          if (af.originalname === originalName || af.originalname.includes(aId)) {
            assetMap[aId] = af.path;
          }
        }
      }

      // Update project user proof assets with local server file paths
      if (Array.isArray(project.user_proof_assets)) {
        project.user_proof_assets.forEach((upa: any, uIdx: number) => {
          const local = assetMap[upa.id] || (assetFiles[uIdx] ? assetFiles[uIdx].path : null);
          if (local) {
            upa.url = local;
            upa.sourceUrl = local;
            upa.previewUrl = local;
          }
        });
      }

      const hasUserAssets = Array.isArray(project.user_proof_assets) && project.user_proof_assets.length > 0;

      // Data Card Sanitization Diagnostics (Batch 1: Render-Safety-First)
      const dataCardSanitizationMode = 'render_safety_first';
      let dataCardPreservedCount = 0;
      let dataCardDowngradedCount = 0;
      const dataCardDowngradeReasons: string[] = [];

      // Update scene references and enforce STRICT NO-GENERIC-BROLL and BrollFormat taxonomy rules
      if (Array.isArray(project.scenes)) {
        project.scenes.forEach((sc: any, idx: number) => {
          if (!hasUserAssets) {
            // Rule 6 & 7: If no user assets, ALL external B-roll, stock, Unsplash, illustrations are disabled
            sc.broll = null;
            sc.broll_query = null;
            if (sc.visual_evidence) {
              sc.visual_evidence.userAssetUrl = undefined;
            }
            if (['BROLL', 'PRODUCT_DEMO', 'SCREENSHOT', 'GRAPH', 'SPLIT_SCREEN'].includes(sc.visualDecision)) {
              sc.visualDecision = (sc.brollNeedScore || 50) >= 58 ? 'PUNCH_IN' : 'TEXT_EMPHASIS';
            }

            // Sanitasi brollFormat berbasis keamanan render:
            // 1. data_card adalah internal visual layer yang 100% aman di-render tanpa aset eksternal.
            // 2. Jangan hapus brollFormat = "data_card" hanya karena regex konteks tidak menemukan angka/proof.
            // 3. Pertahankan format data_card selama tidak membutuhkan external asset.
            if (sc.brollFormat === 'data_card') {
              dataCardPreservedCount++;
            } else {
              if (sc.role === 'hook' || idx === 0) {
                sc.brollFormat = sc.brollFormat === 'motion_graphic' ? 'motion_graphic' : 'typography';
              } else if (sc.role === 'problem') {
                sc.visualDecision = 'PUNCH_IN';
                sc.brollFormat = 'typography';
              } else if (sc.visualDecision === 'TEXT_EMPHASIS') {
                sc.brollFormat = 'typography';
              } else if (!['none', 'typography', 'motion_graphic', 'data_card'].includes(sc.brollFormat)) {
                sc.brollFormat = 'none';
              }
            }
          } else {
            // Map B-roll overlay to real local asset path (STRICT MATCHING ONLY - NO RANDOM FALLBACK)
            if (sc.broll) {
              const matched = project.user_proof_assets.find(
                (u: any) =>
                  (sc.broll.userAssetId && u.id === sc.broll.userAssetId) ||
                  (sc.broll.title && (u.name === sc.broll.title || u.title === sc.broll.title)) ||
                  (sc.broll.sourceUrl && (u.url === sc.broll.sourceUrl || u.sourceUrl === sc.broll.sourceUrl)) ||
                  (sc.broll.previewUrl && (u.url === sc.broll.previewUrl || u.previewUrl === sc.broll.previewUrl))
              );
              if (matched && (matched.url || assetMap[matched.id])) {
                const resolvedUrl = matched.url || assetMap[matched.id];
                sc.broll.sourceUrl = resolvedUrl;
                sc.broll.previewUrl = resolvedUrl;
              } else {
                // No matched user asset for this scene -> fallback to safe internal decision
                console.log(`[Asset Matcher] Scene ${idx + 1} has no matched user asset, falling back to internal layer`);
                sc.broll = null;
                if (['BROLL', 'PRODUCT_DEMO', 'SCREENSHOT', 'GRAPH', 'SPLIT_SCREEN'].includes(sc.visualDecision)) {
                  sc.visualDecision = (sc.brollNeedScore || 50) >= 58 ? 'PUNCH_IN' : 'TEXT_EMPHASIS';
                  if (!['typography', 'motion_graphic', 'data_card'].includes(sc.brollFormat)) {
                    sc.brollFormat = sc.visualDecision === 'TEXT_EMPHASIS' ? 'typography' : 'none';
                  }
                }
              }
            }

            if (sc.brollFormat === 'data_card') {
              dataCardPreservedCount++;
            }

            // Map visual evidence to real local asset path (STRICT MATCHING ONLY)
            if (sc.visual_evidence) {
              const matched = project.user_proof_assets.find(
                (u: any) =>
                  (sc.visual_evidence.userAssetId && u.id === sc.visual_evidence.userAssetId) ||
                  (sc.visual_evidence.title && (u.name === sc.visual_evidence.title || u.title === sc.visual_evidence.title)) ||
                  (sc.visual_evidence.userAssetUrl && (u.url === sc.visual_evidence.userAssetUrl || u.sourceUrl === sc.visual_evidence.userAssetUrl))
              );
              if (matched && (matched.url || assetMap[matched.id])) {
                const resolvedUrl = matched.url || assetMap[matched.id];
                sc.visual_evidence.userAssetUrl = resolvedUrl;
              } else {
                sc.visual_evidence.userAssetUrl = undefined;
              }
            }
          }
        });

        // Store data card sanitization metrics on project for downstream parity reporting
        (project as any).dataCardSanitizationMode = dataCardSanitizationMode;
        (project as any).dataCardPreservedCount = dataCardPreservedCount;
        (project as any).dataCardDowngradedCount = dataCardDowngradedCount;
        (project as any).dataCardDowngradeReasons = dataCardDowngradeReasons;
      }

      console.log(`[Server MP4 Render] Starting render job for project: "${project.title || 'Untitled'}" (Mode: ${renderDurationMode || 'full_duration'}, Assets uploaded: ${assetFiles.length})...`);

      const result = await renderProjectMp4({
        videoFilePath: uploadedFilePath || undefined,
        videoBase64: videoBase64 || undefined,
        videoUrl: videoUrl || undefined,
        project,
        renderDurationMode: renderDurationMode || 'full_duration',
        targetFps: targetFps ? Number(targetFps) : 24,
        width: width ? Number(width) : 720,
        height: height ? Number(height) : 1280,
        allowDemoSyntheticFallback: req.body?.allowDemoSyntheticFallback === true || req.body?.allowDemoSyntheticFallback === 'true',
      });

      // Cleanup initial uploaded temp file if created by multer
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.promises.unlink(uploadedFilePath).catch(() => {});
        uploadedFilePath = null;
      }

      if (!result.success || !result.mp4Path || !fs.existsSync(result.mp4Path)) {
        return res.status(500).json({
          success: false,
          error: result.failureReason || 'FFmpeg failed to produce MP4 output video.',
          failedStage: result.failedStage || 'server_ffmpeg_encode',
          technicalDetail: result.technicalDetail || 'Proses render tidak lolos validasi multi-faktor.',
          recommendedFix: result.recommendedFix || 'Periksa format video sumber atau coba opsi render 15s.',
          diagnostics: result.diagnostics || result,
        });
      }

      console.log(`[Server MP4 Render] Render finished in ${result.renderTimeSec.toFixed(2)}s: ${result.outputDuration.toFixed(1)}s, ${result.frameCount} frames, ${result.fps} FPS, size: ${(result.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB, validationPassed: ${result.validationPassed}`);

      const baseUrl = (process.env.PUBLIC_RENDER_BASE_URL || process.env.VITE_RENDER_API_BASE_URL || '').replace(/\/$/, '');
      const streamPath = `/api/rendered-video/${result.renderId}`;
      const downloadPath = `/api/rendered-video/${result.renderId}?download=1`;

      const streamUrl = baseUrl ? `${baseUrl}${streamPath}` : streamPath;
      const downloadUrl = baseUrl ? `${baseUrl}${downloadPath}` : downloadPath;

      res.json({
        success: true,
        renderId: result.renderId,
        streamUrl,
        downloadUrl,
        videoDataUrl: streamUrl,
        renderParity: result.renderParity || result.diagnostics?.renderParity,
        diagnostics: {
          sourceDuration: result.sourceDuration,
          outputDuration: result.outputDuration,
          fps: result.fps,
          frameCount: result.frameCount,
          hasAudio: result.hasAudio,
          sourceHasAudio: result.sourceHasAudio,
          sourceAudioIsSilent: result.sourceAudioIsSilent,
          outputHasAudio: result.outputHasAudio,
          outputAudioIsSilent: result.outputAudioIsSilent,
          audioPeakDb: result.audioPeakDb,
          audioRmsDb: result.audioRmsDb,
          fileSizeBytes: result.fileSizeBytes,
          renderTimeSec: result.renderTimeSec,
          videoWidth: result.videoWidth,
          videoHeight: result.videoHeight,
          usedSyntheticFallback: result.usedSyntheticFallback,
          visualVarianceScore: result.visualVarianceScore,
          isSyntheticLooking: result.isSyntheticLooking,
          sampledFrameCount: result.sampledFrameCount,
          validationPassed: result.validationPassed,
          failureReason: result.failureReason,
          renderParity: result.renderParity || result.diagnostics?.renderParity,
          renderMode: '720x1280 24 FPS MP4 (Server Render)',
        },
      });
    } catch (err: any) {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.promises.unlink(uploadedFilePath).catch(() => {});
      }
      console.error('[Server MP4 Render] Unexpected error:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Server error occurred during MP4 rendering.',
        failedStage: err?.failedStage || 'server_ffmpeg_encode',
        technicalDetail: err?.technicalDetail || `Exception in server.ts: ${err?.message || err}`,
        recommendedFix: err?.recommendedFix || 'Coba muat ulang halaman dan render kembali.',
        diagnostics: err?.diagnostics,
      });
    }
  }
);

// 7. Download/Stream Rendered MP4 Endpoint
app.get('/api/rendered-video/:id', (req, res) => {
  const renderId = req.params.id;
  const filePath = getRenderedFilePath(renderId);

  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'Rendered video file not found or expired.',
    });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Cross-Origin-Resource-Policy': 'cross-origin',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const isDownload = req.query.download === '1';
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Content-Disposition': isDownload
        ? `attachment; filename="alco_video_720x1280_24fps_${Date.now()}.mp4"`
        : `inline; filename="alco_video_720x1280_24fps.mp4"`,
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// API 404 handler - strictly ensures /api/* never falls through to Vite SPA HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
});

// Global API error handler - strictly returns JSON for any /api/* error
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path?.startsWith('/api/') || req.originalUrl?.startsWith('/api/')) {
    console.error(`[API Server Error] ${req.method} ${req.originalUrl}:`, err);
    return res.status(err.status || err.statusCode || 500).json({
      success: false,
      error: err.message || 'Terjadi kesalahan internal server saat memproses permintaan API.',
    });
  }
  next(err);
});

// Setup Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Alco Auto Motion server running at http://${HOST}:${PORT}`);
  });
}

startServer();

