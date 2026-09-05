import { ContentRole, ContentType, VisualIntent, BRollItem, SceneIntelligenceScore, UserProofAsset } from '../types';
import { EXTENDED_STOCK_CATALOG, StockCatalogItem } from './stockCatalog';

/**
  * AI Creative Performance B-Roll Director
  * Determines visual intent, timing offsets, framing, and semantic search queries
  * based on the 6-stage marketing framework: HOOK -> PROBLEM -> CURIOSITY -> SOLUTION -> PROOF -> CTA
  * Prioritizes user-uploaded authentic screenshots/dashboards/products over generic B-roll.
  */
export function determineBrollDecision(
  role: ContentRole,
  text: string,
  scores: SceneIntelligenceScore,
  index: number,
  totalScenes: number,
  contentType: ContentType,
  userAssets?: UserProofAsset[]
): {
  intent: VisualIntent;
  broll: BRollItem | null;
  directorNote: string;
} {
  // STRICT RULE 2 & 5: If user did NOT upload supporting assets, NO B-roll, stock, or generic illustrations allowed AT ALL!
  if (!userAssets || userAssets.length === 0) {
    return {
      intent: 'none',
      broll: null,
      directorNote: 'No user assets uploaded: B-roll disabled. Scene relies purely on A-roll, camera motion zooms, and caption emphasis.',
    };
  }

  const textUpper = text.toUpperCase();

  // Helper to find matching user asset by priority asset types
  const findUserAsset = (types: UserProofAsset['type'][]) => {
    return userAssets.find((a) => types.includes(a.type)) || null;
  };

  // 1. HOOK (0-3s Window): Keep 100% Talking Head unless user specifically uploaded a logo/badge
  if (index === 0 || role === 'hook') {
    const userHookAsset = findUserAsset(['logo', 'product']);
    if (userHookAsset) {
      return {
        intent: 'product',
        broll: {
          query: userHookAsset.label || userHookAsset.name,
          title: userHookAsset.name,
          sourceUrl: userHookAsset.url,
          previewUrl: userHookAsset.url,
          mediaType: userHookAsset.type === 'screen_recording' ? 'video' : 'image',
          visual_intent: 'product',
          overlay_style: 'pip',
          opacity: 0.92,
          startOffset: 0.8,
          duration: 1.8,
          badgeTag: userHookAsset.label || 'USER BRAND ASSET',
          entryTransition: 'zoom_in',
          isUserAsset: true,
        },
        directorNote: `0-3s Hook Strategy with User Asset: ${userHookAsset.name} displayed as micro PIP overlay.`,
      };
    }
    return {
      intent: 'none',
      broll: null,
      directorNote: '0-3s Hook Rule: 100% direct speaker eye-contact to establish immediate human rapport before introducing overlays.',
    };
  }

  // 2. PROBLEM / PAIN AGITATION
  if (role === 'problem' || textUpper.includes('SALAH') || textUpper.includes('BAKAR UANG') || textUpper.includes('RUGI') || textUpper.includes('BONCOS')) {
    const userProblemAsset = findUserAsset(['screenshot', 'dashboard', 'before_after']);
    if (userProblemAsset) {
      return {
        intent: 'metaphor',
        broll: {
          query: userProblemAsset.label || userProblemAsset.name,
          title: userProblemAsset.name,
          sourceUrl: userProblemAsset.url,
          previewUrl: userProblemAsset.url,
          mediaType: userProblemAsset.type === 'screen_recording' ? 'video' : 'image',
          visual_intent: 'metaphor',
          overlay_style: 'pip',
          opacity: 0.95,
          startOffset: 0.3,
          duration: 2.5,
          badgeTag: userProblemAsset.label || 'USER PROBLEM EVIDENCE',
          entryTransition: 'fade',
          isUserAsset: true,
        },
        directorNote: `Authentic User Asset Attached: Using uploaded ${userProblemAsset.name} for problem scene.`,
      };
    }
  }

  // 3. CURIOSITY / CONTRAST
  if (role === 'curiosity' || textUpper.includes('TERNYATA') || textUpper.includes('KUNCINYA') || textUpper.includes('BUKAN') || textUpper.includes('BEFORE AFTER')) {
    const userCompareAsset = findUserAsset(['before_after', 'screenshot']);
    if (userCompareAsset) {
      return {
        intent: 'contrast',
        broll: {
          query: userCompareAsset.label || userCompareAsset.name,
          title: userCompareAsset.name,
          sourceUrl: userCompareAsset.url,
          previewUrl: userCompareAsset.url,
          mediaType: userCompareAsset.type === 'screen_recording' ? 'video' : 'image',
          visual_intent: 'contrast',
          overlay_style: 'pip',
          opacity: 0.95,
          startOffset: 0.2,
          duration: 2.8,
          badgeTag: userCompareAsset.label || 'USER COMPARE ASSET',
          entryTransition: 'slide_left',
          isUserAsset: true,
        },
        directorNote: `Authentic User Asset Attached: Using uploaded ${userCompareAsset.name} for curiosity comparison.`,
      };
    }
  }

  // 4. PROOF / METRICS / VALIDATION
  if (role === 'proof' || scores.proof_strength >= 7 || /ROAS|CTR|OMSET|DATA|BUKTI|HASIL|%|X|GRAFIK|TEMBUS/i.test(textUpper)) {
    const userProofAsset = findUserAsset(['dashboard', 'screenshot']);
    if (userProofAsset) {
      return {
        intent: 'proof',
        broll: {
          query: userProofAsset.label || userProofAsset.name,
          title: userProofAsset.name,
          sourceUrl: userProofAsset.url,
          previewUrl: userProofAsset.url,
          mediaType: userProofAsset.type === 'screen_recording' ? 'video' : 'image',
          visual_intent: 'proof',
          overlay_style: 'pip',
          opacity: 0.98,
          startOffset: 0.0,
          duration: 3.2,
          badgeTag: userProofAsset.label || 'REAL DASHBOARD PROOF',
          entryTransition: 'zoom_in',
          isUserAsset: true,
        },
        directorNote: `Priority User Evidence: Attached authentic screenshot/dashboard (${userProofAsset.name}) to proof scene.`,
      };
    }
  }

  // 5. SOLUTION / PROCESS / PRODUCT
  if (role === 'solution' || textUpper.includes('SOLUSI') || textUpper.includes('MODUL') || textUpper.includes('TEMPLATE') || textUpper.includes('PRODUK') || textUpper.includes('VALIDASI')) {
    const userProductAsset = findUserAsset(['product', 'screen_recording', 'dashboard']);
    if (userProductAsset) {
      return {
        intent: 'product',
        broll: {
          query: userProductAsset.label || userProductAsset.name,
          title: userProductAsset.name,
          sourceUrl: userProductAsset.url,
          previewUrl: userProductAsset.url,
          mediaType: userProductAsset.type === 'screen_recording' ? 'video' : 'image',
          visual_intent: 'product',
          overlay_style: 'pip',
          opacity: 0.95,
          startOffset: 0.2,
          duration: 3.0,
          badgeTag: userProductAsset.label || 'REAL PRODUCT DEMO',
          entryTransition: 'zoom_in',
          isUserAsset: true,
        },
        directorNote: `Priority User Asset: Displaying uploaded product photo (${userProductAsset.name}) during solution presentation.`,
      };
    }
  }

  // 6. CALL TO ACTION (CTA)
  if (role === 'cta' || index === totalScenes - 1) {
    const userCtaAsset = findUserAsset(['logo', 'product', 'screenshot']);
    if (userCtaAsset) {
      return {
        intent: 'urgency',
        broll: {
          query: userCtaAsset.label || userCtaAsset.name,
          title: userCtaAsset.name,
          sourceUrl: userCtaAsset.url,
          previewUrl: userCtaAsset.url,
          mediaType: userCtaAsset.type === 'screen_recording' ? 'video' : 'image',
          visual_intent: 'urgency',
          overlay_style: 'pip',
          opacity: 0.95,
          startOffset: 0.3,
          duration: 2.5,
          badgeTag: userCtaAsset.label || 'BRAND LOGO PROMPT',
          entryTransition: 'zoom_in',
          isUserAsset: true,
        },
        directorNote: `Authentic User Asset Attached: Using uploaded ${userCtaAsset.name} as closing CTA prompt.`,
      };
    }
  }

  // Fallback if user assets exist but none specifically matched this role: use the first available user asset
  const fallbackUserAsset = userAssets[index % userAssets.length];
  if (fallbackUserAsset) {
    return {
      intent: 'process',
      broll: {
        query: fallbackUserAsset.label || fallbackUserAsset.name,
        title: fallbackUserAsset.name,
        sourceUrl: fallbackUserAsset.url,
        previewUrl: fallbackUserAsset.url,
        mediaType: fallbackUserAsset.type === 'screen_recording' ? 'video' : 'image',
        visual_intent: 'process',
        overlay_style: 'pip',
        opacity: 0.95,
        startOffset: 0.2,
        duration: 2.5,
        badgeTag: fallbackUserAsset.label || fallbackUserAsset.name,
        entryTransition: 'fade',
        isUserAsset: true,
      },
      directorNote: `User Asset Attached: Displaying uploaded ${fallbackUserAsset.name}.`,
    };
  }

  return {
    intent: 'none',
    broll: null,
    directorNote: 'No matching user asset for this scene.',
  };
}
