import { HookTextLayout, HookTextStyle, SceneEditPlan } from '../types';
import { HOOK_TEXT_STYLE_CONFIG, HookStyleConfigItem } from '../config/hookTextStyleConfig';

// Blacklist of internal tags/labels that must NEVER appear as public video headlines
const INTERNAL_LABEL_BLACKLIST = new Set([
  'hook',
  '0-3s visual hook',
  '0-3s hook',
  '0-3s_hook',
  '0-3s_visual_hook',
  '0-3s',
  'problem',
  'problem scene',
  'pain point',
  'pain point build',
  'pain_point',
  'pain_point_build',
  'proof',
  'proof scene',
  'verified proof',
  'verified_proof',
  'cta',
  'cta scene',
  'cta push',
  'cta_push',
  'demo',
  'screen demo',
  'screen_demo',
  'screen proof',
  'screen_proof',
  'solution',
  'solution relief',
  'solution_relief',
  'broll',
  'b-roll',
  'motion',
  'typography',
  'data_card',
  'data card',
  'motion_graphic',
  'motion graphic',
  'motion emphasis',
  'motion_emphasis',
  'key point',
  'key_point',
  'visual focus',
  'visual_focus',
  'literal',
  'metaphoric',
  'data proof',
  'data_proof',
  'metric evidence',
  'metric_evidence',
  'system workflow',
  'system_workflow',
  'scene',
  'scenes',
  'scene 1',
  'scene 2',
  'scene 3',
  'scene 4',
  'scene 5',
  'scene 6',
  'scene 7',
  'scene 8',
  'scene 9',
  'scene 10',
  'offer',
  'agitate',
  'insight',
  'explanation',
  'social_proof',
  'social proof',
  'metric_proof',
  'metric proof',
  'before_after',
  'before after',
  'offer_card',
  'cta_card',
  'pattern_interrupt',
  'punch_zoom',
  'crop_shift',
  'undefined',
  'null',
  'none',
  'editorial',
  'talking_head',
  'talking head',
  'editor guide',
  'editor_guide',
  'broll_type',
  'sfx_intent',
  'rhythm_preset',
  'ad role',
  'ad_role',
  'marketing role',
  'marketing_role',
  'role',
  'hoofff',
  'hoooff',
  'hoof',
  'hoff',
  'huft',
]);

// Hallucination words and filler noises to clean from speech transcripts & headlines
const HALLUCINATION_REGEX = /\b(h+o+o*f+t*|u+g+h+|u+f+f+|a+a+h+|h+a+h+a+|u+m+m+|u+h+h+|e+r+r+|h+m+m+|h+u+f+t+|o+o+p+s+)\b/gi;

/**
 * Robust Caption & Transcript Sanitizer
 * - Strips AI hallucinations (e.g. "Hoofff", "Ughhh", "Aaaah")
 * - Strips internal labels & scene numbers (e.g. "[Hook]", "[0-3s]", "Scene 1", "B-roll:", "Pain Point Build", "Verified Proof")
 * - Strips emojis and excessive punctuation
 * - Preserves verbatim spoken transcript meaning and flow
 */
export function sanitizeCaptionText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text
    // 1. Remove bracketed & parenthesized tags
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    // 2. Remove scene labels & numbers (e.g. "Scene 1", "Scene 10", "scene 2:")
    .replace(/\bscene\s*\d+\b/gi, ' ')
    .replace(/\bscene\b/gi, ' ')
    // 3. Remove role prefixes with colons anywhere (e.g. "Hook:", "Problem:", "CTA:", "B-roll:", "Role:", "AdRole:")
    .replace(/\b(hook|problem|solution|proof|cta|demo|b-?roll|ad-?role|ad\s*role|role|marketing-?role|marketing\s*role|0-3s(\s*visual\s*hook|\s*hook)?|pain\s*point(\s*build)?|verified\s*proof|cta\s*push|solution\s*relief)\s*:\s*/gi, ' ')
    // 4. Remove standalone technical role tags anywhere in text
    .replace(/\b(0-3s\s*visual\s*hook|0-3s\s*hook|0-3s|pain\s*point\s*build|pain\s*point|verified\s*proof|solution\s*relief|cta\s*push|system\s*workflow|data\s*card|motion\s*graphic|b-?roll|broll|adrole|ad\s*role|marketing\s*role)\b/gi, ' ')
    // 5. Remove hallucination noise tokens
    .replace(HALLUCINATION_REGEX, ' ')
    // 6. Remove emojis
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ')
    // 7. Remove weird punctuation strings
    .replace(/[_*#\\/|~`^]/g, ' ')
    .replace(/([.,?!])\1{2,}/g, '$1')
    // 8. Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Natural fallback headlines per content role/intent
 * Creator-style hooks strictly 3-4 words for high Reels/TikTok engagement
 */
const NATURAL_FALLBACKS: Record<string, string> = {
  hook: 'KONTENMU BELUM NENDANG',
  problem: 'SUSAH BIKIN KONTEN',
  agitate: 'SUSAH BIKIN KONTEN',
  proof: 'LIHAT HASILNYA NYATA',
  social_proof: 'LIHAT HASILNYA NYATA',
  metric_proof: 'LIHAT HASILNYA NYATA',
  solution: 'COBA CARA INI',
  insight: 'COBA CARA INI',
  cta: 'KLIK SEKARANG HARI INI',
  offer: 'KLIK SEKARANG HARI INI',
};

/**
 * Resolve Hook Text Style mapping based on scene intent, role, or explicit choice
 */
export function resolveHookStyle(scene: Partial<SceneEditPlan> | any): HookTextStyle {
  if (scene?.hook_style) return scene.hook_style;
  const role = (scene?.adRole || scene?.role || 'hook').toLowerCase();
  const rhythm = scene?.editing_rhythm?.rhythm_preset;

  if (rhythm === 'SPECIAL_HOOK_0_3S' || role === 'hook') {
    return 'clean_creator';
  }
  if (role === 'problem' || role === 'agitate') {
    return 'fast_tiktok';
  }
  if (role === 'proof' || role === 'social_proof' || role === 'metric_proof') {
    return 'meta_ads';
  }
  if (role === 'solution' || role === 'insight') {
    return 'educational';
  }
  if (role === 'cta' || role === 'offer') {
    return 'premium_authority';
  }

  return 'clean_creator';
}

/**
 * Resolve Hook Text Layout preset based on scene intent or explicit choice
 */
export function resolveHookLayout(scene: Partial<SceneEditPlan> | any): HookTextLayout {
  const layout = scene?.hook_layout || scene?.hookLayout;
  if (layout) {
    if (layout === 'split_impact' || layout === 'split_emphasis') return 'split_emphasis';
    if (layout === 'left_editorial') return 'left_editorial';
    if (layout === 'stacked_punch') return 'stacked_punch';
    if (layout === 'center_top_impact') return 'center_top_impact';
  }
  const style = resolveHookStyle(scene);
  const role = (scene?.adRole || scene?.role || 'hook').toLowerCase();

  if (style === 'premium_authority') return 'left_editorial';
  if (style === 'fast_tiktok') return 'stacked_punch';
  if (role === 'proof' || role === 'problem') return 'split_emphasis';

  return 'center_top_impact';
}

/**
 * Get styling configuration for Hook Text from central config
 */
export function getHookFontConfig(style: HookTextStyle): HookStyleConfigItem {
  return HOOK_TEXT_STYLE_CONFIG[style] || HOOK_TEXT_STYLE_CONFIG.clean_creator;
}

/**
 * Compresses and sanitizes any candidate text into strictly 3-5 punchy uppercase words for top hook headline.
 * - Strips all scene numbers, internal labels, typos (Hoofff, etc.), and role keywords
 * - Guarantees strictly 3-5 uppercase words returned
 * - Falls back to role-appropriate marketing headline if candidate is invalid
 */
export function compressHookHeadline(rawText: string, fallbackRole: string = 'hook'): string {
  const role = (fallbackRole || 'hook').toLowerCase();
  if (!rawText || typeof rawText !== 'string') {
    return NATURAL_FALLBACKS[role] || NATURAL_FALLBACKS.hook;
  }

  const cleanedWords = rawWordsSanitize(rawText);
  return ensureThreeToFiveWords(cleanedWords, role);
}

/**
 * Guarantees output is strictly 3-5 uppercase words.
 * Expands 1-2 word results naturally according to role.
 * Condenses >5 word results intelligently while preserving Indonesian context.
 */
function ensureThreeToFiveWords(words: string[], role: string): string {
  const fallback = NATURAL_FALLBACKS[role] || NATURAL_FALLBACKS.hook;

  if (!words || words.length === 0) {
    return fallback;
  }

  // Handle 1 or 2 words expansion based on role
  if (words.length === 1) {
    const w0 = words[0].toUpperCase();
    if (role === 'hook') return `${w0} SEKARANG INI`;
    if (role === 'problem' || role === 'agitate') return `${w0} SETIAP HARI`;
    if (role === 'proof' || role === 'social_proof' || role === 'metric_proof') return `${w0} HASILNYA NYATA`;
    if (role === 'cta' || role === 'offer') return `${w0} SEKARANG HARI INI`;
    return `${w0} CARA INI`;
  }

  if (words.length === 2) {
    const w0 = words[0].toUpperCase();
    const w1 = words[1].toUpperCase();
    if (role === 'hook') return `${w0} ${w1} SEKARANG`;
    if (role === 'problem' || role === 'agitate') return `${w0} ${w1} SETIAP HARI`;
    if (role === 'proof' || role === 'social_proof' || role === 'metric_proof') return `${w0} ${w1} HASILNYA NYATA`;
    if (role === 'cta' || role === 'offer') return `${w0} ${w1} HARI INI`;
    return `${w0} ${w1} INI`;
  }

  // Exactly 3 to 5 words
  if (words.length >= 3 && words.length <= 5) {
    return words.map(w => w.toUpperCase()).join(' ');
  }

  // >5 words: Condense to 3-5 words without over-erasing Indonesian context
  const WEAK_FILLERS = new Set([
    'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'dengan', 'untuk', 'pada', 'adalah',
    'karena', 'jika', 'kalau', 'maka',
    'the', 'and', 'or', 'but', 'if', 'because', 'as', 'at', 'by', 'for', 'with', 'about', 'to', 'from', 'in', 'on', 'out',
  ]);

  const nonFillerWords = words.filter(w => !WEAK_FILLERS.has(w.toLowerCase().replace(/[^a-z]/g, '')));

  if (nonFillerWords.length >= 3 && nonFillerWords.length <= 5) {
    return nonFillerWords.map(w => w.toUpperCase()).join(' ');
  }

  if (nonFillerWords.length > 5) {
    const isHighImpact = (w: string) =>
      /\d+|%|roas|omset|cpa|ctr|bofu|tofu|mofu|macet|bukan|rugi|rahasia|trik|solusi|hasil|bukti|stop|jangan|coba|klik|naik|turun|profit|penting|kunci|bakar|boncos|konten|otomatis|bikin|susah|mudah/i.test(w);

    const impactWords = nonFillerWords.filter(isHighImpact);
    if (impactWords.length >= 3 && impactWords.length <= 5) {
      return impactWords.map(w => w.toUpperCase()).join(' ');
    }
    return nonFillerWords.slice(0, 4).map(w => w.toUpperCase()).join(' ');
  }

  return words.slice(0, 4).map(w => w.toUpperCase()).join(' ');
}

/**
 * Clean and sanitize candidate text string into clean array of words
 */
function rawWordsSanitize(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  let cleaned = text
    // 1. Remove bracketed & parenthesized tags
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    // 2. Remove scene labels & numbers (e.g. "Scene 1", "Scene 10", "scene 2:")
    .replace(/\bscene\s*\d+\b/gi, ' ')
    .replace(/\bscene\b/gi, ' ')
    // 3. Remove role prefixes with colons anywhere (e.g. "Hook:", "Problem:", "CTA:", "B-roll:", "Role:", "AdRole:")
    .replace(/\b(hook|problem|solution|proof|cta|demo|b-?roll|ad-?role|ad\s*role|role|marketing-?role|marketing\s*role|0-3s(\s*visual\s*hook|\s*hook)?|pain\s*point(\s*build)?|verified\s*proof|cta\s*push|solution\s*relief)\s*:\s*/gi, ' ')
    // 4. Remove standalone technical role tags anywhere in text
    .replace(/\b(0-3s\s*visual\s*hook|0-3s\s*hook|0-3s|pain\s*point\s*build|pain\s*point|verified\s*proof|solution\s*relief|cta\s*push|system\s*workflow|data\s*card|motion\s*graphic|b-?roll|broll|adrole|ad\s*role|marketing\s*role)\b/gi, ' ')
    // 5. Remove hallucination noise tokens
    .replace(HALLUCINATION_REGEX, ' ')
    // 6. Clean non-alphanumeric symbols except key punctuation
    .replace(/[\[\]{}()<>●•*#_\\/|~`^"':;]/g, ' ')
    .replace(/[^a-zA-Z0-9\s?!%.,-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const rawWords = cleaned.split(/\s+/).filter(Boolean);

  const normalizedCandidate = cleaned.toLowerCase().trim();
  if (INTERNAL_LABEL_BLACKLIST.has(normalizedCandidate)) {
    return [];
  }

  return rawWords.filter(w => {
    const norm = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      norm.length > 0 &&
      !INTERNAL_LABEL_BLACKLIST.has(norm) &&
      !INTERNAL_LABEL_BLACKLIST.has(w.toLowerCase()) &&
      !/^(scene|hook|problem|solution|proof|cta|broll|adrole|role)$/i.test(norm)
    );
  });
}

/**
 * Sanitizes and generates public upper hook headline for a scene.
 * Guarantees:
 * - NEVER outputs raw internal tags (hook, problem, proof, cta, brollType, etc.)
 * - Returns strictly 3-5 punchy uppercase words suitable for TikTok/Reels/Shorts
 * - Uses compressHookHeadline() to condense long text automatically
 * - Falls back to natural creator headlines
 */
export function getPublicHeadline(scene: Partial<SceneEditPlan> | any): string {
  if (!scene) return NATURAL_FALLBACKS.hook;

  const role = (scene.adRole || scene.role || 'hook').toLowerCase();

  // 1. Try scene.headline
  if (scene.headline && typeof scene.headline === 'string' && scene.headline.trim()) {
    const res = compressHookHeadline(scene.headline, role);
    if (res && res !== NATURAL_FALLBACKS[role] && res !== NATURAL_FALLBACKS.hook) return res;
  }

  // 2. Try scene.key_phrase
  if (scene.key_phrase && typeof scene.key_phrase === 'string' && scene.key_phrase.trim()) {
    const res = compressHookHeadline(scene.key_phrase, role);
    if (res && res !== NATURAL_FALLBACKS[role] && res !== NATURAL_FALLBACKS.hook) return res;
  }

  // 3. Try scene.hookText
  if (scene.hookText && typeof scene.hookText === 'string' && scene.hookText.trim()) {
    const res = compressHookHeadline(scene.hookText, role);
    if (res && res !== NATURAL_FALLBACKS[role] && res !== NATURAL_FALLBACKS.hook) return res;
  }

  // 4. Try highlight_words
  if (Array.isArray(scene.highlight_words) && scene.highlight_words.length >= 2) {
    const res = compressHookHeadline(scene.highlight_words.join(' '), role);
    if (res && res !== NATURAL_FALLBACKS[role] && res !== NATURAL_FALLBACKS.hook) return res;
  }

  // 5. Try caption extraction
  if (scene.caption && typeof scene.caption === 'string' && scene.caption.trim()) {
    const res = compressHookHeadline(scene.caption, role);
    if (res && res !== NATURAL_FALLBACKS[role] && res !== NATURAL_FALLBACKS.hook) return res;
  }

  // 6. Natural fallback based on role
  return NATURAL_FALLBACKS[role] || NATURAL_FALLBACKS.hook;
}

/**
 * Determines if Upper Headline should be rendered for this scene
 */
export function shouldRenderUpperHeadline(scene: Partial<SceneEditPlan> | any): boolean {
  if (!scene) return false;
  const headline = getPublicHeadline(scene);
  return Boolean(headline && headline.trim().length > 0);
}

/**
 * Determines if internal visual layer (e.g. typography, motion graphic, data card)
 * should render given whether an upper headline is already active.
 * Enforces SINGLE UPPER TEXT LAYER rule: if upper headline is present,
 * internal visual layers must NOT render in upper zone.
 */
export function shouldRenderInternalLayer(
  formatName: string,
  hasUpperHeadline: boolean
): boolean {
  const isUpperZoneFormat = ['typography', 'motion_graphic', 'data_card'].includes(formatName);
  if (isUpperZoneFormat && hasUpperHeadline) {
    return false; // Prevent double text in upper area
  }
  return true;
}

/**
 * Returns formatted ASS dialogue text with layout support and exactly 1 key word highlighted
 */
export function formatPublicAssHeadline(scene: Partial<SceneEditPlan> | any): string {
  const headline = getPublicHeadline(scene);
  const words = headline.split(' ').filter(Boolean);

  if (words.length === 0) return '';

  const style = resolveHookStyle(scene);
  const layout = resolveHookLayout(scene);
  const fontConfig = getHookFontConfig(style);

  let highlightIdx = words.findIndex(w =>
    /\d+|%|ROAS|OMSET|CPA|CTR|MACET|PENYEBABNYA|BEDANYA|NENDANG|RAHASIA|HASIL|BUKTI|CARA|JANGAN|RUGI|SOLUSI|BONCOS|BAKAR|PROFIT/i.test(w)
  );

  if (highlightIdx < 0) {
    highlightIdx = words.length > 2 ? 1 : words.length - 1;
  }

  const colorTag = `{\\c${fontConfig.highlightColorHex}}`;

  if (layout === 'split_emphasis') {
    const topWord = words[highlightIdx] || words[0];
    const remainingWords = words.filter((_, i) => i !== highlightIdx).join(' ');
    if (remainingWords) {
      return `{\\fsp-1}{\\fscx130\\fscy130}${colorTag}{\\b1}${topWord}{\\b0}{\\c&H00FFFFFF&}\\N{\\fscx95\\fscy95}${remainingWords}`;
    }
  }

  if (layout === 'left_editorial') {
    const formattedWords = words.map((w, i) => {
      if (i === highlightIdx) {
        return `{\\fscx112\\fscy112}${colorTag}{\\b1}${w}{\\b0}{\\c&H00FFFFFF&}{\\fscx100\\fscy100}`;
      }
      return w;
    });
    return `{\\an7\\pos(60,110)}{\\fsp-1}${formattedWords.join(' ')}`;
  }

  // Default: center_top_impact
  const formattedWords = words.map((w, i) => {
    if (i === highlightIdx) {
      return `{\\fscx112\\fscy112\\fsp-1}${colorTag}{\\b1}${w}{\\b0}{\\c&H00FFFFFF&}{\\fscx100\\fscy100\\fsp-1}`;
    }
    return w;
  });

  return `{\\fsp-1}${formattedWords.join(' ')}`;
}

