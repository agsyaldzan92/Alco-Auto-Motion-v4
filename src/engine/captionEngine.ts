import { CaptionMode, CaptionPreset, WordTiming, MarketingCategory, ContentRole, CaptionGrammarType } from '../types';

// Stopwords in Indonesian and English that should NEVER be highlighted
const STOPWORDS = new Set([
  'YANG', 'DAN', 'DI', 'KE', 'DARI', 'INI', 'ITU', 'DENGAN', 'UNTUK', 'PADA', 'ADALAH',
  'SEBAGAI', 'KARENA', 'JIKA', 'KALAU', 'MAKA', 'BISA', 'AKAN', 'SUDAH', 'TELAH',
  'SAYA', 'KAMU', 'MEREKA', 'KITA', 'KAMI', 'DIA', 'KAU', 'MU', 'NYA', 'KU',
  'THE', 'AND', 'OR', 'BUT', 'IF', 'BECAUSE', 'AS', 'AT', 'BY', 'FOR', 'WITH',
  'ABOUT', 'AGAINST', 'BETWEEN', 'INTO', 'THROUGH', 'DURING', 'BEFORE', 'AFTER',
  'ABOVE', 'BELOW', 'TO', 'FROM', 'UP', 'DOWN', 'IN', 'OUT', 'ON', 'OFF', 'OVER',
  'UNDER', 'AGAIN', 'FURTHER', 'THEN', 'ONCE', 'HERE', 'THERE', 'WHEN', 'WHERE',
  'WHY', 'HOW', 'ALL', 'ANY', 'BOTH', 'EACH', 'FEW', 'MORE', 'MOST', 'OTHER',
  'SOME', 'SUCH', 'NO', 'NOR', 'NOT', 'ONLY', 'OWN', 'SAME', 'SO', 'THAN',
  'TOO', 'VERY', 'S', 'T', 'CAN', 'WILL', 'JUST', 'DON', 'SHOULD', 'NOW'
]);

// Semantic category maps for high-performance visual anchors in marketing short videos
const PROBLEM_WORDS = new Set([
  'JANGAN', 'STOP', 'SALAH', 'FATAL', 'BUANG', 'BAKAR', 'RUGI', 'BONCOS', 'PUSING',
  'STUCK', 'GAGAL', 'SUSAH', 'LELAH', 'RIBET', 'LAMA', 'HANCUR', 'MISTAKE', "DON'T", 'NEVER',
  'JELEK', 'DULU', 'SUSAHNYA', 'MAHAL', 'DROP'
]);

const BENEFIT_RESULT_WORDS = new Set([
  'ROAS', '5X', '10X', '2X', '3X', '90%', '100%', 'OMSET', 'JUTA', 'RIBU', 'MELESAT',
  'HASIL', 'BUKTI', 'CLOSING', 'PROFIT', 'BERHASIL', 'WIN', 'TEMBUS', 'CONVERSION',
  'NAIK', 'UNTUNG', 'MELEJIOT', 'LAKU', 'AUTO'
]);

const OFFER_MECHANISM_WORDS = new Set([
  'RAHASIA', 'VALIDASI', 'RISET', 'PRODUK', 'MODUL', 'OFFER', 'SOLUSINYA', 'SOLUSI', 'TEMPLATE',
  'BLUEPRINT', 'FRAMEWORK', 'KUNCINYA', 'TERNYATA', 'METODE', 'RUMUS', 'SISTEM', 'ALCO',
  'FORMULA', 'OTOMATIS', 'PRAKTIS', 'KILAT', 'TRIK'
]);

const URGENCY_CTA_WORDS = new Set([
  'KLIK', 'LINK', 'BIO', 'KERANJANG', 'KUNING', 'DISKON', '40%', '50%', 'GRATIS', 'BURUAN',
  'CEPAT', 'KILAT', 'SEKARANG', 'DAFTAR', 'CHECKOUT', 'NOW', 'AMANKAN', 'GABUNG', 'PAKAI', 'AMBIL'
]);

/**
 * Classifies a word into a marketing token category
 */
export function classifyMarketingToken(word: string, sceneRole?: ContentRole): MarketingCategory {
  const clean = word.toUpperCase().replace(/[^A-Z0-9%]/g, '');

  if (BENEFIT_RESULT_WORDS.has(clean) || /\d+%|\d+X|\d+JUTA|ROAS|OMSET|PROFIT/i.test(clean)) {
    return 'benefit_result';
  }
  if (PROBLEM_WORDS.has(clean)) {
    return 'problem';
  }
  if (OFFER_MECHANISM_WORDS.has(clean)) {
    return 'offer_mechanism';
  }
  if (URGENCY_CTA_WORDS.has(clean)) {
    return 'urgency_cta';
  }

  // Fallback to scene role defaults if specific keyword matches scene intent
  if (sceneRole === 'problem' && (clean.length >= 4 || /\d/.test(clean))) return 'problem';
  if (sceneRole === 'proof' && (clean.length >= 4 || /\d/.test(clean))) return 'benefit_result';
  if (sceneRole === 'solution' && (clean.length >= 4 || /\d/.test(clean))) return 'offer_mechanism';
  if (sceneRole === 'cta' && (clean.length >= 4 || /\d/.test(clean))) return 'urgency_cta';

  return 'general';
}

/**
 * Optimizes and extracts the top 1-3 power highlight words (Step 9.1 Quality Improvement)
 * Strictly caps at 1-3 words, eliminates stopwords, and does NOT force random highlights on calm/neutral scenes.
 */
export function extractPowerHighlightWords(
  text: string,
  maxWords: number = 2,
  intensity?: 'LOW' | 'MEDIUM' | 'HIGH'
): string[] {
  const cleaned = text.replace(/[^a-zA-Z0-9%\s]/g, ' ');
  const words = cleaned
    .split(/\s+/)
    .map((w) => w.trim().toUpperCase())
    .filter((w) => w.length >= 2);

  if (words.length === 0) return [];

  // Low intensity scenes prefer clean subtitle reading without distracting colorful highlights
  if (intensity === 'LOW') {
    const highValueOnly = words.filter(
      (w) =>
        !STOPWORDS.has(w) &&
        (PROBLEM_WORDS.has(w) || BENEFIT_RESULT_WORDS.has(w) || OFFER_MECHANISM_WORDS.has(w) || URGENCY_CTA_WORDS.has(w) || /\d+|%|X/i.test(w))
    );
    return highValueOnly.slice(0, 1);
  }

  // Score candidate words
  const scoredWords = words.map((w, index) => {
    let score = 0;
    if (PROBLEM_WORDS.has(w) || BENEFIT_RESULT_WORDS.has(w) || OFFER_MECHANISM_WORDS.has(w) || URGENCY_CTA_WORDS.has(w)) {
      score += 50;
    }
    if (/\d+|%|X/i.test(w)) score += 40;
    if (!STOPWORDS.has(w) && w.length >= 4) score += 20;
    if (index === 0 || index === words.length - 1) score += 5;
    if (STOPWORDS.has(w)) score = -100;

    return { word: w, score };
  });

  const topCandidates = scoredWords
    .filter((item) => item.score >= 40) // Only words with genuine power weight
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(3, Math.max(1, maxWords)))
    .map((item) => item.word);

  // If no strong marketing/power keyword exists, return empty array (clean natural caption)
  return topCandidates;
}

/**
 * Formats caption based on mode:
 * - 'verbatim' (DEFAULT & HIGHEST ACCURACY): Retains 100% of spoken words exactly as in audio
 * - 'punchy': Slightly tightens filler words (only when explicitly requested)
 * - 'summary': Key takeaway badge format
 */
export function formatCaptionByMode(text: string, mode: CaptionMode = 'verbatim', role: string = 'explanation'): string {
  const rawClean = (text || '').replace(/\s+/g, ' ').trim();
  if (!rawClean) return '';

  if (mode === 'verbatim') {
    return rawClean;
  }

  const words = rawClean.split(' ');

  if (mode === 'punchy') {
    if (words.length <= 8) return rawClean;

    const filtered = words.filter((w) => {
      const u = w.toUpperCase().replace(/[^A-Z]/g, '');
      return !['PADA', 'SEBAGAI', 'DENGAN', 'ADALAH', 'BAHWA', 'SEPERTI'].includes(u);
    });

    return filtered.join(' ');
  }

  // Summary mode (visual takeaway)
  if (role === 'hook') return '🔥 ' + words.slice(0, 6).join(' ').toUpperCase();
  if (role === 'problem') return '⚠️ ' + words.slice(0, 6).join(' ').toUpperCase();
  if (role === 'curiosity') return '👀 ' + words.slice(0, 6).join(' ').toUpperCase();
  if (role === 'solution') return '💡 ' + words.slice(0, 6).join(' ').toUpperCase();
  if (role === 'proof') return '📈 ' + words.slice(0, 6).join(' ').toUpperCase();
  if (role === 'cta') return '👉 ' + words.slice(0, 6).join(' ').toUpperCase();

  return words.slice(0, 6).join(' ').toUpperCase();
}

/**
 * Builds precise acoustic/phonetic and character-weighted word timing array.
 */
export function generateWordTimings(
  captionText: string,
  duration: number,
  highlightWords: string[] = [],
  sceneRole?: ContentRole
): WordTiming[] {
  const words = (captionText || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const safeDuration = Math.max(0.2, duration);
  const normalizedHighlights = highlightWords.map((w) =>
    w.toUpperCase().replace(/[^A-Z0-9]/g, '')
  );

  const weights: number[] = words.map((rawWord) => {
    const clean = rawWord.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let charLen = Math.max(1, clean.length);

    if (/\d+/.test(clean)) charLen += 4;
    if (/%/.test(rawWord)) charLen += 3;
    if (/5X|10X|ROAS/i.test(clean)) charLen += 3;

    let weight = Math.pow(charLen, 0.75);

    if (/[,\:;]/.test(rawWord)) {
      weight += 1.2;
    } else if (/[.!?]/.test(rawWord)) {
      weight += 1.8;
    }

    return Math.max(0.5, weight);
  });

  const totalWeight = weights.reduce((acc, w) => acc + w, 0);

  let currentOffset = 0;
  return words.map((rawWord, idx) => {
    const wordShare = (weights[idx] / totalWeight) * safeDuration;
    const startOffset = Number(currentOffset.toFixed(2));
    const endOffset = Number(Math.min(safeDuration, currentOffset + wordShare).toFixed(2));
    currentOffset += wordShare;

    const cleanWord = rawWord.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const isHighlight =
      normalizedHighlights.includes(cleanWord) ||
      normalizedHighlights.some((h) => h.length > 2 && (cleanWord.includes(h) || h.includes(cleanWord)));

    const category = classifyMarketingToken(rawWord, sceneRole);

    return {
      word: rawWord,
      startOffset,
      endOffset,
      isHighlight,
      marketingCategory: category,
    };
  });
}

/**
 * High-precision helper to determine the active spoken word index at any playback timestamp
 */
export function getActiveWordIndex(
  wordTimings: WordTiming[] | undefined,
  sceneElapsed: number,
  wordsCount: number,
  sceneDur: number
): number {
  if (wordsCount <= 0) return 0;

  if (wordTimings && wordTimings.length > 0) {
    for (let i = 0; i < wordTimings.length; i++) {
      const wt = wordTimings[i];
      if (sceneElapsed >= wt.startOffset && sceneElapsed < wt.endOffset) {
        return i;
      }
    }

    if (sceneElapsed >= wordTimings[wordTimings.length - 1].startOffset) {
      return wordTimings.length - 1;
    }

    if (sceneElapsed <= wordTimings[0].startOffset) {
      return 0;
    }
  }

  const progress = Math.max(0, Math.min(1, sceneElapsed / Math.max(0.1, sceneDur)));
  return Math.min(wordsCount - 1, Math.floor(progress * wordsCount));
}

/**
 * Determines modern caption display mode based on scene intent and visual evidence
 */
export function determineCaptionDisplayMode(
  role: ContentRole,
  grammar?: CaptionGrammarType,
  evidenceType?: string,
  sceneIndex?: number
): 'clean_floating' | 'hook_headline' | 'proof_badge' | 'cta_emphasis' {
  if (sceneIndex === 0 || role === 'hook' || grammar === 'HOOK_HEADLINE') {
    return 'hook_headline';
  }
  if (role === 'proof' || evidenceType === 'SCREEN_DEMO' || evidenceType === 'SCREEN_PROOF') {
    return 'proof_badge';
  }
  if (role === 'cta') {
    return 'cta_emphasis';
  }
  return 'clean_floating';
}

export interface WrappedCaptionWord {
  word: string;
  globalIndex: number;
}

export interface WrappedCaptionLine {
  lineIndex: number;
  words: WrappedCaptionWord[];
  text: string;
}

export interface CaptionChunk {
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  words: WrappedCaptionWord[];
  wrappedLines: WrappedCaptionLine[];
  text: string;
}

/**
 * Wraps caption words into balanced lines for 9:16 vertical video layout
 * Target parameters:
 * - normal scene = max 2 lines
 * - ideal 2-3 words per line
 * - max 3 lines ONLY if explicitly allowed (e.g. dense technical proof)
 */
export function calculateCaptionLineWrapping(
  text: string,
  maxWordsPerLine: number = 3,
  allowThreeLines: boolean = false
): WrappedCaptionLine[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const rawWords = clean.split(' ').filter(Boolean);
  if (rawWords.length === 0) return [];

  const totalWords = rawWords.length;
  if (totalWords <= maxWordsPerLine) {
    return [
      {
        lineIndex: 0,
        words: rawWords.map((word, globalIndex) => ({ word, globalIndex })),
        text: clean,
      },
    ];
  }

  // Prepositions/conjunctions/short connectors that we prefer NOT to end a non-final line with
  const PREFER_NOT_END = new Set([
    'YANG', 'DAN', 'DI', 'KE', 'DARI', 'INI', 'ITU', 'UNTUK', 'PADA', 'ADALAH', 'SEBAGAI', 'KARENA', 'JIKA',
    'DENGAN', 'SAYA', 'KAMU', 'KITA', 'KAMI', 'DIA', 'KAU', 'MU', 'NYA', 'KU', 'ATAU', 'SAAT', 'JUGA',
    'THE', 'AND', 'OR', 'BUT', 'IF', 'FOR', 'WITH', 'AT', 'BY', 'TO', 'IN', 'ON', 'OF', 'AN', 'A', 'ABOUT', 'AS'
  ]);

  let numLines = Math.ceil(totalWords / maxWordsPerLine);
  if (numLines < 2) numLines = 2;
  // STRICT target: normal scenes MUST NOT exceed 2 lines!
  const maxAllowedLines = allowThreeLines ? 3 : 2;
  if (numLines > maxAllowedLines) numLines = maxAllowedLines;

  const targetLength = totalWords / numLines;
  let bestPartition: number[] = [];
  let minPenalty = Infinity;

  function evaluatePartition(ends: number[]): number {
    let penalty = 0;
    let prevEnd = 0;
    for (let i = 0; i < ends.length; i++) {
      const lineLen = ends[i] - prevEnd;

      // Penalty for deviation from target length (ideal 2-3 words per line)
      penalty += Math.pow(lineLen - targetLength, 2) * 20;

      // Heavy penalty for line lengths exceeding 3 words
      if (lineLen > maxWordsPerLine) penalty += 250;
      if (lineLen < 1) penalty += 300;

      // Penalty for ending a non-final line with a weak connector/preposition
      if (i < ends.length - 1 && ends[i] > 0) {
        const lastWordInLine = rawWords[ends[i] - 1].toUpperCase().replace(/[^A-Z]/g, '');
        if (PREFER_NOT_END.has(lastWordInLine)) {
          penalty += 120;
        }
      }
      prevEnd = ends[i];
    }
    return penalty;
  }

  if (numLines === 2) {
    for (let split = 1; split < totalWords; split++) {
      const ends = [split, totalWords];
      const penalty = evaluatePartition(ends);
      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestPartition = ends;
      }
    }
  } else if (numLines === 3) {
    for (let s1 = 1; s1 < totalWords - 1; s1++) {
      for (let s2 = s1 + 1; s2 < totalWords; s2++) {
        const ends = [s1, s2, totalWords];
        const penalty = evaluatePartition(ends);
        if (penalty < minPenalty) {
          minPenalty = penalty;
          bestPartition = ends;
        }
      }
    }
  }

  // Fallback to simple chunk division if no optimal partition is found
  if (bestPartition.length === 0) {
    const targetWordsPerLine = Math.ceil(totalWords / numLines);
    const lines: WrappedCaptionLine[] = [];
    let currentWords: WrappedCaptionWord[] = [];
    let currentLineIdx = 0;

    rawWords.forEach((word, globalIndex) => {
      currentWords.push({ word, globalIndex });
      if (currentWords.length >= targetWordsPerLine || globalIndex === totalWords - 1) {
        if (lines.length < numLines - 1 || globalIndex === totalWords - 1) {
          lines.push({
            lineIndex: currentLineIdx++,
            words: currentWords,
            text: currentWords.map((w) => w.word).join(' '),
          });
          currentWords = [];
        }
      }
    });
    if (currentWords.length > 0 && lines.length > 0) {
      lines[lines.length - 1].words.push(...currentWords);
      lines[lines.length - 1].text = lines[lines.length - 1].words.map((w) => w.word).join(' ');
    }
    return lines;
  }

  const lines: WrappedCaptionLine[] = [];
  let prevEnd = 0;
  bestPartition.forEach((end, lineIdx) => {
    const lineWords = rawWords.slice(prevEnd, end).map((word, localIdx) => ({
      word,
      globalIndex: prevEnd + localIdx,
    }));
    lines.push({
      lineIndex: lineIdx,
      words: lineWords,
      text: lineWords.map((w) => w.word).join(' '),
    });
    prevEnd = end;
  });

  return lines;
}

/**
 * High-Retention Dynamic Time-Chunking Engine for Short Video Captions:
 * Divides spoken text into short 3-5 word active pages/chunks (max 2 lines, 2-3 words per line).
 * As voice playback progresses, the screen automatically updates to the current 3-5 word chunk,
 * maintaining high viewer retention, fast readability, zero screen clutter, and 100% audio sync.
 */
export function getActiveCaptionChunk(
  text: string,
  wordTimings: WordTiming[] | undefined,
  sceneElapsed: number,
  sceneDur: number,
  displayMode: string = 'clean_floating'
): {
  activeChunk: CaptionChunk;
  activeWordIdx: number;
  totalChunks: number;
  allChunks: CaptionChunk[];
} {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    const emptyChunk: CaptionChunk = {
      chunkIndex: 0,
      startOffset: 0,
      endOffset: sceneDur,
      words: [],
      wrappedLines: [],
      text: '',
    };
    return { activeChunk: emptyChunk, activeWordIdx: 0, totalChunks: 1, allChunks: [emptyChunk] };
  }

  const rawWords = clean.split(' ').filter(Boolean);
  const totalWords = rawWords.length;
  const safeDur = Math.max(0.1, sceneDur);

  // Active word index calculation
  const activeWordIdx = getActiveWordIndex(wordTimings, sceneElapsed, totalWords, safeDur);

  // Determine max words per chunk & max words per line based on display mode
  // Normal scenes: max 3-5 words per chunk (wrapped into 1-2 lines of 2-3 words)
  let maxWordsPerChunk = 4;
  let maxWordsPerLine = 3;
  let allowThreeLines = false;

  if (displayMode === 'proof_badge') {
    maxWordsPerChunk = 5;
    maxWordsPerLine = 3;
    allowThreeLines = false;
  } else if (displayMode === 'hook_headline') {
    maxWordsPerChunk = 4;
    maxWordsPerLine = 2;
  } else if (displayMode === 'cta_emphasis') {
    maxWordsPerChunk = 5;
    maxWordsPerLine = 3;
  }

  // Punctuation-aware dynamic chunking algorithm (3-5 words per chunk, splitting at natural pauses)
  const chunks: CaptionChunk[] = [];
  let chunkIndex = 0;
  let i = 0;

  while (i < totalWords) {
    let chunkSize = Math.min(maxWordsPerChunk, totalWords - i);

    // Look ahead for punctuation (comma, period, exclamation, question mark) to break naturally
    for (let offset = 2; offset <= chunkSize; offset++) {
      const idx = i + offset - 1;
      const word = rawWords[idx] || '';
      if (/[.,?!;:–—]/.test(word) && offset >= 3) {
        chunkSize = offset;
        break;
      }
    }

    const sliceWords = rawWords.slice(i, i + chunkSize);
    const chunkWords: WrappedCaptionWord[] = sliceWords.map((w, idx) => ({
      word: w,
      globalIndex: i + idx,
    }));
    const chunkText = sliceWords.join(' ');

    let startOffset = 0;
    let endOffset = safeDur;

    if (wordTimings && wordTimings.length >= totalWords) {
      const firstWt = wordTimings[i];
      const lastWt = wordTimings[Math.min(totalWords - 1, i + sliceWords.length - 1)];
      startOffset = firstWt ? firstWt.startOffset : (i / totalWords) * safeDur;
      endOffset = lastWt ? lastWt.endOffset : Math.min(safeDur, ((i + sliceWords.length) / totalWords) * safeDur);
    } else {
      startOffset = Number(((i / totalWords) * safeDur).toFixed(2));
      endOffset = Number((Math.min(safeDur, ((i + sliceWords.length) / totalWords) * safeDur)).toFixed(2));
    }

    // Wrap chunk words into max 2 lines (2-3 words per line)
    const wrappedLines = calculateCaptionLineWrapping(chunkText, maxWordsPerLine, allowThreeLines);
    // Re-assign global indices to wrapped lines
    wrappedLines.forEach((line) => {
      line.words.forEach((w, wIdx) => {
        const matchingGlobal = chunkWords.find((cw) => cw.word === w.word && !line.words.slice(0, wIdx).some((prev) => prev.globalIndex === cw.globalIndex));
        if (matchingGlobal) {
          w.globalIndex = matchingGlobal.globalIndex;
        }
      });
    });

    chunks.push({
      chunkIndex,
      startOffset,
      endOffset,
      words: chunkWords,
      wrappedLines,
      text: chunkText,
    });
    chunkIndex++;
    i += chunkSize;
  }

  // Hard Limit Pass: No caption chunk may stay on screen longer than 3.5s.
  // If a chunk duration > 3.5s and has >= 2 words, split it into 2 shorter chunks.
  let durationNeedsSplitting = true;
  while (durationNeedsSplitting) {
    durationNeedsSplitting = false;
    const refinedChunks: CaptionChunk[] = [];
    for (const chk of chunks) {
      const dur = chk.endOffset - chk.startOffset;
      if (dur > 3.5 && chk.words.length >= 2) {
        durationNeedsSplitting = true;
        const midWordIdx = Math.ceil(chk.words.length / 2);
        const firstWords = chk.words.slice(0, midWordIdx);
        const secondWords = chk.words.slice(midWordIdx);

        const splitOffset = Number((chk.startOffset + dur * (firstWords.length / chk.words.length)).toFixed(2));
        const firstText = firstWords.map((w) => w.word).join(' ');
        const secondText = secondWords.map((w) => w.word).join(' ');

        const firstLines = calculateCaptionLineWrapping(firstText, maxWordsPerLine, allowThreeLines);
        firstLines.forEach((line) => {
          line.words.forEach((w, wIdx) => {
            const mg = firstWords.find((cw) => cw.word === w.word && !line.words.slice(0, wIdx).some((prev) => prev.globalIndex === cw.globalIndex));
            if (mg) w.globalIndex = mg.globalIndex;
          });
        });

        const secondLines = calculateCaptionLineWrapping(secondText, maxWordsPerLine, allowThreeLines);
        secondLines.forEach((line) => {
          line.words.forEach((w, wIdx) => {
            const mg = secondWords.find((cw) => cw.word === w.word && !line.words.slice(0, wIdx).some((prev) => prev.globalIndex === cw.globalIndex));
            if (mg) w.globalIndex = mg.globalIndex;
          });
        });

        refinedChunks.push({
          chunkIndex: refinedChunks.length,
          startOffset: chk.startOffset,
          endOffset: splitOffset,
          words: firstWords,
          wrappedLines: firstLines,
          text: firstText,
        });

        refinedChunks.push({
          chunkIndex: refinedChunks.length,
          startOffset: splitOffset,
          endOffset: chk.endOffset,
          words: secondWords,
          wrappedLines: secondLines,
          text: secondText,
        });
      } else {
        refinedChunks.push({
          ...chk,
          chunkIndex: refinedChunks.length,
        });
      }
    }
    chunks.length = 0;
    chunks.push(...refinedChunks);
  }

  if (chunks.length === 0) {
    const fallbackChunk: CaptionChunk = {
      chunkIndex: 0,
      startOffset: 0,
      endOffset: safeDur,
      words: rawWords.map((w, globalIndex) => ({ word: w, globalIndex })),
      wrappedLines: calculateCaptionLineWrapping(clean, maxWordsPerLine, allowThreeLines),
      text: clean,
    };
    return { activeChunk: fallbackChunk, activeWordIdx, totalChunks: 1, allChunks: [fallbackChunk] };
  }

  // Find active chunk at sceneElapsed
  let activeChunk = chunks[0];
  for (let c = 0; c < chunks.length; c++) {
    const chk = chunks[c];
    if (sceneElapsed >= chk.startOffset && sceneElapsed <= chk.endOffset) {
      activeChunk = chk;
      break;
    }
    if (sceneElapsed > chk.endOffset) {
      activeChunk = chk; // keep last matched chunk if past end offset
    }
  }

  return {
    activeChunk,
    activeWordIdx,
    totalChunks: chunks.length,
    allChunks: chunks,
  };
}


