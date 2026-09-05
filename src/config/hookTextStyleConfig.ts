import { HookTextStyle } from '../types';

export interface HookStyleConfigItem {
  styleKey: HookTextStyle;
  styleName: string;
  fontFamily: string;
  assFontName: string;
  fontFileName: string;
  fontSize: {
    previewMinPx: number;
    previewMaxPx: number;
    previewDefaultPx: number; // Target 1080p/720p full HD equivalent pixel size
    assPt: number;
    assPtFaceProtected: number;
  };
  letterSpacing: string;
  lineHeight: string;
  baseTextColorHex: string; // ASS BGR color
  baseTextColorTailwind: string;
  highlightColorHex: string; // ASS BGR color
  highlightTailwind: string;
  strokeClassTailwind: string;
  strokeAss: {
    outline: number;
    shadow: number;
  };
  animDurationMs: number;
  maxDurationSeconds: number;
}

export const HOOK_TEXT_STYLE_CONFIG: Record<HookTextStyle, HookStyleConfigItem> = {
  clean_creator: {
    styleKey: 'clean_creator',
    styleName: 'Clean Creator',
    fontFamily: "'Bricolage Grotesque', sans-serif",
    assFontName: 'Bricolage Grotesque',
    fontFileName: 'BricolageGrotesque.ttf',
    fontSize: {
      previewMinPx: 68,
      previewMaxPx: 76,
      previewDefaultPx: 72,
      assPt: 68,
      assPtFaceProtected: 58,
    },
    letterSpacing: '-1px',
    lineHeight: '0.96',
    baseTextColorHex: '&H00E8F7FF&', // #FFF7E8 Bone White (BGR)
    baseTextColorTailwind: 'text-[#FFF7E8]',
    highlightColorHex: '&H0066D1FF&', // #FFD166 Warm Yellow (BGR)
    highlightTailwind: 'text-[#FFD166]',
    strokeClassTailwind: 'drop-shadow-[0_4px_16px_rgba(15,23,42,0.55)] [text-shadow:_0_2px_10px_rgba(15,23,42,0.6)]',
    strokeAss: {
      outline: 3.2,
      shadow: 2.0,
    },
    animDurationMs: 200,
    maxDurationSeconds: 3.0,
  },
  fast_tiktok: {
    styleKey: 'fast_tiktok',
    styleName: 'Fast TikTok',
    fontFamily: "'Bricolage Grotesque', sans-serif",
    assFontName: 'Bricolage Grotesque',
    fontFileName: 'BricolageGrotesque.ttf',
    fontSize: {
      previewMinPx: 74,
      previewMaxPx: 82,
      previewDefaultPx: 78,
      assPt: 74,
      assPtFaceProtected: 62,
    },
    letterSpacing: '-1px',
    lineHeight: '0.94',
    baseTextColorHex: '&H00E8F7FF&', // #FFF7E8 Bone White (BGR)
    baseTextColorTailwind: 'text-[#FFF7E8]',
    highlightColorHex: '&H0066D1FF&', // #FFD166 Warm Yellow (BGR)
    highlightTailwind: 'text-[#FFD166]',
    strokeClassTailwind: 'drop-shadow-[0_4px_16px_rgba(15,23,42,0.55)] [text-shadow:_0_2px_10px_rgba(15,23,42,0.6)]',
    strokeAss: {
      outline: 3.8,
      shadow: 2.5,
    },
    animDurationMs: 180,
    maxDurationSeconds: 3.0,
  },
  meta_ads: {
    styleKey: 'meta_ads',
    styleName: 'Meta Ads',
    fontFamily: "'Bricolage Grotesque', sans-serif",
    assFontName: 'Bricolage Grotesque',
    fontFileName: 'BricolageGrotesque.ttf',
    fontSize: {
      previewMinPx: 64,
      previewMaxPx: 72,
      previewDefaultPx: 68,
      assPt: 64,
      assPtFaceProtected: 56,
    },
    letterSpacing: '-1px',
    lineHeight: '0.98',
    baseTextColorHex: '&H00E8F7FF&', // #FFF7E8 Bone White (BGR)
    baseTextColorTailwind: 'text-[#FFF7E8]',
    highlightColorHex: '&H0066D1FF&', // #FFD166 Warm Yellow (BGR)
    highlightTailwind: 'text-[#FFD166]',
    strokeClassTailwind: 'drop-shadow-[0_4px_16px_rgba(15,23,42,0.55)] [text-shadow:_0_2px_10px_rgba(15,23,42,0.6)]',
    strokeAss: {
      outline: 3.2,
      shadow: 2.5,
    },
    animDurationMs: 200,
    maxDurationSeconds: 3.0,
  },
  educational: {
    styleKey: 'educational',
    styleName: 'Educational',
    fontFamily: "'Bricolage Grotesque', sans-serif",
    assFontName: 'Bricolage Grotesque',
    fontFileName: 'BricolageGrotesque.ttf',
    fontSize: {
      previewMinPx: 66,
      previewMaxPx: 74,
      previewDefaultPx: 70,
      assPt: 66,
      assPtFaceProtected: 56,
    },
    letterSpacing: '-1px',
    lineHeight: '0.96',
    baseTextColorHex: '&H00E8F7FF&', // #FFF7E8 Bone White (BGR)
    baseTextColorTailwind: 'text-[#FFF7E8]',
    highlightColorHex: '&H0066D1FF&', // #FFD166 Warm Yellow (BGR)
    highlightTailwind: 'text-[#FFD166]',
    strokeClassTailwind: 'drop-shadow-[0_4px_16px_rgba(15,23,42,0.55)] [text-shadow:_0_2px_10px_rgba(15,23,42,0.6)]',
    strokeAss: {
      outline: 3.2,
      shadow: 2.0,
    },
    animDurationMs: 200,
    maxDurationSeconds: 3.0,
  },
  premium_authority: {
    styleKey: 'premium_authority',
    styleName: 'Premium Authority',
    fontFamily: "'Playfair Display', serif",
    assFontName: 'Playfair Display',
    fontFileName: 'PlayfairDisplay.ttf',
    fontSize: {
      previewMinPx: 70,
      previewMaxPx: 78,
      previewDefaultPx: 74,
      assPt: 70,
      assPtFaceProtected: 60,
    },
    letterSpacing: '-1px',
    lineHeight: '1.0',
    baseTextColorHex: '&H00E8F7FF&', // #FFF7E8 Bone White (BGR)
    baseTextColorTailwind: 'text-[#FFF7E8]',
    highlightColorHex: '&H0066D1FF&', // #FFD166 Warm Yellow (BGR)
    highlightTailwind: 'text-[#FFD166]',
    strokeClassTailwind: 'drop-shadow-[0_4px_16px_rgba(15,23,42,0.55)] [text-shadow:_0_2px_10px_rgba(15,23,42,0.6)]',
    strokeAss: {
      outline: 2.8,
      shadow: 2.5,
    },
    animDurationMs: 220,
    maxDurationSeconds: 3.0,
  },
};
