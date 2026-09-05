import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Eye, SplitSquareVertical, Activity, Flame, ShieldAlert, Zap, Layers, UserCheck, Sun } from 'lucide-react';
import { SceneEditPlan, ContentType } from '../types';
import { playSoundEffect } from '../utils/audioEffects';
import { SFX_CONFIGS, INTERNAL_LAYER_CONFIGS } from '../utils/sharedMediaMapping';
import { getPublicHeadline, resolveHookStyle, resolveHookLayout, getHookFontConfig, shouldRenderUpperHeadline, shouldRenderInternalLayer } from '../utils/headlineSanitizer';
import { getActiveWordIndex, determineCaptionDisplayMode, calculateCaptionLineWrapping, getActiveCaptionChunk } from '../engine/captionEngine';
import { getFaceSafeOverlayPlacement } from '../engine/talkingHeadDirector';
import { TALKING_HEAD_MOTION_CONFIG, resolveTalkingHeadMotionProfile, clampScale } from '../config/talkingHeadMotionConfig';
import { getStyleProfile } from '../engine/styleProfiles';
import { selectSfxForScene, selectBestSfxLayerForScene } from '../engine/decisionEngine';

interface PreviewPlayerProps {
  videoUrl: string;
  scenes: SceneEditPlan[];
  currentTime: number;
  setCurrentTime: (t: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  activeSceneIndex: number;
  duration: number;
  enableSfx: boolean;
  setEnableSfx: (enable: boolean) => void;
  viewMode: 'edited' | 'raw' | 'split';
  setViewMode: (mode: 'edited' | 'raw' | 'split') => void;
  contentType?: ContentType;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  videoUrl,
  scenes,
  currentTime,
  setCurrentTime,
  isPlaying,
  setIsPlaying,
  activeSceneIndex,
  duration,
  enableSfx,
  setEnableSfx,
  viewMode,
  setViewMode,
  contentType = 'meta_ads',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rawVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showHud, setShowHud] = useState(false);
  const playerFrameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState<number>(340);

  useEffect(() => {
    const el = playerFrameRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setFrameWidth(el.clientWidth);
      }
    };

    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode]);
  const lastTriggeredSceneRef = useRef<number>(-1);
  const playTimerRef = useRef<number | null>(null);
  const lastTimeUpdateTimestampRef = useRef<number>(Date.now());

  const currentScene = scenes[activeSceneIndex] || scenes[0];

  useEffect(() => {
    setHasVideoError(false);
    setVideoLoaded(false);
  }, [videoUrl]);

  // Calculate high-precision motion transform with camera dynamics, Talking Head Eyeline safeguards & 0-3s hook kinetics
  const getCameraTransform = () => {
    if (viewMode === 'raw' || !currentScene) {
      return { transform: 'scale(1) translate(0px, 0px)', transition: 'none' };
    }

    const sceneStart = currentScene.start;
    const sceneEnd = currentScene.end;
    const sceneDur = Math.max(0.1, sceneEnd - sceneStart);
    const sceneElapsed = Math.max(0, currentTime - sceneStart);
    const progress = Math.min(1, Math.max(0, sceneElapsed / sceneDur));

    const thFraming = currentScene.talking_head_framing;
    const isTH = thFraming?.is_talking_head !== false;

    // Resolve unified motion profile from TALKING_HEAD_MOTION_CONFIG
    const motionProfile = resolveTalkingHeadMotionProfile(
      currentScene,
      currentScene.adRole,
      isTH,
      activeSceneIndex
    );

    // Fast Snap Transition Cut Pop based on motion profile transitionMs
    const cutImpactDuration = Math.min(0.25, (motionProfile.transitionMs || 180) / 1000);
    const cutImpactIntensity = 0.035;
    let cutPop = 0;
    if (sceneElapsed < cutImpactDuration) {
      const popProgress = sceneElapsed / cutImpactDuration;
      cutPop = cutImpactIntensity * (1 - Math.pow(popProgress, 2));
    }

    let calculatedScale = motionProfile.scaleStart;
    let calculatedCropX = motionProfile.cropXStart;
    const calculatedCropY = motionProfile.cropY;

    if (motionProfile.profileKey === 'hook') {
      // Hook 0-3s: Rapid punch zoom 0..0.35s from scaleStart (1.18) to scaleEnd (1.28), then smooth settle to settleScale (1.20)
      const settleScale = motionProfile.settleScale || 1.20;
      if (sceneElapsed < 0.35) {
        calculatedScale = motionProfile.scaleStart + (motionProfile.scaleEnd - motionProfile.scaleStart) * (sceneElapsed / 0.35);
      } else {
        const settleProgress = Math.min(1.0, (sceneElapsed - 0.35) / Math.max(0.5, sceneDur - 0.35));
        calculatedScale = motionProfile.scaleEnd - (motionProfile.scaleEnd - settleScale) * settleProgress;
      }
      calculatedCropX = motionProfile.cropXStart + (motionProfile.cropXEnd - motionProfile.cropXStart) * progress;

      const finalScale = clampScale(calculatedScale + cutPop);
      return {
        transform: `scale(${finalScale.toFixed(3)}) translateX(${calculatedCropX.toFixed(2)}%) translateY(${calculatedCropY.toFixed(2)}%)`,
        transition: sceneElapsed < 0.35 ? 'transform 0.10s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'transform 0.25s ease-out',
      };
    }

    // Explanation / Solution / Proof / CTA / Default: Smooth dynamic progression
    calculatedScale = motionProfile.scaleStart + (motionProfile.scaleEnd - motionProfile.scaleStart) * progress;
    calculatedCropX = motionProfile.cropXStart + (motionProfile.cropXEnd - motionProfile.cropXStart) * progress;

    const finalScale = clampScale(calculatedScale + cutPop);
    return {
      transform: `scale(${finalScale.toFixed(3)}) translateX(${calculatedCropX.toFixed(2)}%) translateY(${calculatedCropY.toFixed(2)}%)`,
      transition: 'none',
    };
  };

  // High-precision Fallback Playback Timer Engine
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    }

    lastTimeUpdateTimestampRef.current = Date.now();
    const intervalMs = 40;

    playTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastTimeUpdateTimestampRef.current) / 1000;
      lastTimeUpdateTimestampRef.current = now;

      const video = videoRef.current;
      if (videoLoaded && video && !video.paused && !video.ended && video.readyState >= 2) {
        return;
      }

      setCurrentTime((prevTime) => {
        const nextTime = prevTime + deltaSec;
        if (nextTime >= duration) {
          setIsPlaying(false);
          return 0;
        }
        return nextTime;
      });
    }, intervalMs);

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [isPlaying, videoLoaded, duration, setCurrentTime, setIsPlaying]);

  // Reset error and reload status whenever video source URL changes
  useEffect(() => {
    setHasVideoError(false);
    setVideoLoaded(false);
  }, [videoUrl]);

  // Synchronize native video elements
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Ignore AbortError when play is interrupted by pause/seek
          if (err.name === 'AbortError') return;

          // Autoplay policy: auto-fallback to muted
          if (err.name === 'NotAllowedError' && !isMuted) {
            setIsMuted(true);
            video.muted = true;
            video.play().catch(() => {
              console.warn('Playback blocked by browser policy');
            });
            return;
          }

          console.warn('Video play caught:', err.name, err.message);
        });
      }
      if (rawVideoRef.current) rawVideoRef.current.play().catch(() => {});
    } else {
      video.pause();
      if (rawVideoRef.current) rawVideoRef.current.pause();
    }
  }, [isPlaying, isMuted]);

  // Handle scene change sound effects
  useEffect(() => {
    if (isPlaying && enableSfx && activeSceneIndex !== lastTriggeredSceneRef.current) {
      lastTriggeredSceneRef.current = activeSceneIndex;
      
      if (currentScene?.sfxLayered && currentScene.sfxLayers && currentScene.sfxLayers.length > 0) {
        const prioritizedLayers = selectBestSfxLayerForScene(currentScene.sfxLayers, currentScene, currentScene.sfxLayeredPattern);
        const hasNegativeOffsets = prioritizedLayers.some(ly => ly.offsetMs < 0);
        const shiftMs = hasNegativeOffsets ? 500 : 0;
        
        prioritizedLayers.forEach((layer) => {
          const delay = Math.max(0, layer.offsetMs + shiftMs);
          const playVol = Math.min(0.25, Math.max(0.08, layer.intensity * 0.25));
          if (delay === 0) {
            playSoundEffect(layer.name, playVol);
          } else {
            setTimeout(() => {
              if (lastTriggeredSceneRef.current === activeSceneIndex) {
                playSoundEffect(layer.name, playVol);
              }
            }, delay);
          }
        });
      } else if (currentScene) {
        const decision = selectSfxForScene(currentScene, activeSceneIndex);
        const sfx = decision.effect;
        const intensity = decision.intensity;
        if (sfx && sfx !== 'none') {
          playSoundEffect(sfx as any, intensity);
        }
      }
    }
  }, [activeSceneIndex, isPlaying, enableSfx, currentScene]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    const video = videoRef.current;
    if (video) {
      try {
        video.currentTime = newTime;
      } catch (_) {}
    }
    if (rawVideoRef.current) {
      try {
        rawVideoRef.current.currentTime = newTime;
      } catch (_) {}
    }
  };

  // Render Studio Presenter Visualizer
  const renderStudioVisualizer = (isSplitRaw: boolean = false) => {
    const isSpeaking = isPlaying;
    const waveCount = 12;

    return (
      <div className="relative w-full h-full bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 flex flex-col items-center justify-center overflow-hidden select-none">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_35%,rgba(99,102,241,0.5),transparent_70%)]" />
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative">
            <div
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-indigo-500 to-rose-400 shadow-2xl transition-transform duration-300 ${
                isSpeaking ? 'scale-105 shadow-indigo-500/40 ring-4 ring-indigo-500/20' : 'scale-100'
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border-2 border-slate-950 relative flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
                  alt="Creator Avatar"
                  className="w-full h-full object-cover"
                />
                {isSpeaking && (
                  <div className="absolute bottom-5 inset-x-0 flex justify-center">
                    <div className="w-4 h-2 bg-rose-400/80 rounded-full animate-ping opacity-75" />
                  </div>
                )}
              </div>
            </div>

            {isSpeaking && (
              <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 font-black text-[9px] rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider animate-pulse">
                  <Activity className="w-2.5 h-2.5" /> Talking Head
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 h-6 mt-5">
            {Array.from({ length: waveCount }).map((_, i) => {
              const randHeight = isSpeaking ? 8 + ((i * 7 + currentTime * 10) % 16) : 4;
              return (
                <div
                  key={i}
                  className="w-1 bg-indigo-400 rounded-full transition-all duration-75"
                  style={{
                    height: `${randHeight}px`,
                    opacity: isSpeaking ? 0.9 : 0.3,
                  }}
                />
              );
            })}
          </div>

          <p className="text-[11px] font-semibold text-slate-400 mt-2 font-mono">
            {isSpeaking ? 'AI Voice Stream Active' : 'Paused'}
          </p>
        </div>

        <div className="absolute bottom-3 left-3 right-3 text-center pointer-events-none z-20">
          <span className="px-2.5 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 font-mono inline-block">
            {isSplitRaw ? 'Raw Footage Track' : 'Alco Auto Motion Engine'}
          </span>
        </div>
      </div>
    );
  };

    // Render Visual Evidence Overlay Cards (Sleek, Compact & Non-Intrusive)
    const renderVisualEvidenceOverlay = () => {
      if (viewMode === 'raw' || !currentScene?.visual_evidence || !currentScene.visual_evidence.userAssetUrl) return null;
      const ev = currentScene.visual_evidence;
      const assetUrl = ev.userAssetUrl;

      if (ev.type === 'SCREEN_PROOF') {
        return (
          <div className="absolute top-11 left-3 right-3 z-30 pointer-events-none animate-fade-in">
            <div className="bg-slate-950/90 border border-emerald-400/90 px-3 py-2 rounded-2xl shadow-xl backdrop-blur-md flex items-center justify-between gap-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="bg-emerald-400 text-slate-950 text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full inline-block">
                    {ev.badgeTag || 'PROOF'}
                  </span>
                  <span className="text-[9px] font-bold text-slate-300 truncate">{ev.title}</span>
                </div>
                <p className="text-base font-black text-emerald-400 font-mono tracking-tight leading-tight">{ev.metricValue || '5.4x ROAS'}</p>
              </div>
              <div className="w-12 h-11 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-slate-900">
                <img src={assetUrl} alt="Screen Proof Asset" className="w-full h-full object-cover opacity-80" />
              </div>
            </div>
          </div>
        );
      }

      if (ev.type === 'SPLIT_COMPARE' && ev.comparisonLabels) {
        return (
          <div className="absolute top-4 left-3 right-3 z-30 pointer-events-none animate-fade-in max-w-[90%] mx-auto">
            <div className="bg-slate-950/90 border border-purple-500/90 px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-[7px] text-rose-400 font-black uppercase">Sebelum</span>
                <p className="text-[10px] text-slate-200 font-bold truncate">{ev.comparisonLabels.before}</p>
              </div>
              <div className="w-px h-5 bg-slate-700 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[7px] text-emerald-400 font-black uppercase">Sesudah</span>
                <p className="text-[10px] text-emerald-300 font-black truncate">{ev.comparisonLabels.after}</p>
              </div>
            </div>
          </div>
        );
      }

      if (ev.type === 'SCREEN_DEMO') {
        return (
          <div className="absolute top-4 left-3 right-3 z-30 pointer-events-none animate-fade-in max-w-[88%] mx-auto">
            <div className="bg-slate-950/90 border border-cyan-400/90 px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="bg-cyan-400 text-slate-950 text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full inline-block">
                    {ev.badgeTag || 'DEMO'}
                  </span>
                  <span className="text-[8px] text-cyan-300 font-bold animate-pulse">● LIVE</span>
                </div>
                <h4 className="text-[10px] font-bold text-slate-100 truncate">{ev.title || 'SYSTEM WORKFLOW'}</h4>
                {ev.calloutPoint && (
                  <p className="text-[9px] text-cyan-300 font-extrabold truncate">⚡ {ev.calloutPoint}</p>
                )}
              </div>
              <div className="w-10 h-9 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-slate-900">
                <img src={assetUrl} alt="Software Screen demo" className="w-full h-full object-cover opacity-80" />
              </div>
            </div>
          </div>
        );
      }

      if (ev.type === 'OFFER_CARD') {
        return (
          <div className="absolute top-4 left-4 right-4 z-30 pointer-events-none animate-bounce-short max-w-[85%] mx-auto">
            <div className="bg-amber-400 text-slate-950 border border-white px-3 py-1 rounded-lg shadow-xl text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="bg-slate-950 text-amber-300 text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full">
                  {ev.badgeTag || 'OFFER'}
                </span>
                <span className="text-[10px] font-black uppercase">{ev.title}</span>
                <span className="text-xs font-black font-mono text-slate-950">{ev.metricValue}</span>
              </div>
            </div>
          </div>
        );
      }

      if (ev.type === 'CTA_CARD') {
        return (
          <div className="absolute top-4 left-4 right-4 z-30 pointer-events-none animate-pulse max-w-[85%] mx-auto">
            <div className="bg-indigo-600 border border-indigo-300 text-white px-3 py-1.5 rounded-xl shadow-xl text-center">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase truncate">{ev.title || 'KLIK LINK DI BIO'}</span>
                <span className="bg-amber-400 text-slate-950 text-[9px] font-black py-0.5 px-2 rounded-full shadow shrink-0">
                  Ambil Sekarang 👉
                </span>
              </div>
            </div>
          </div>
        );
      }

      return null;
    };

    // Render Safe Internal Visual Layers (Typography, Motion Graphic, Data Card - Sanitized Headlines)
    const renderSafeInternalVisualLayer = () => {
      if (viewMode === 'raw' || !currentScene?.brollFormat) return null;

      const hasUpperHeadline = shouldRenderUpperHeadline(currentScene);
      if (!shouldRenderInternalLayer(currentScene.brollFormat || '', hasUpperHeadline)) {
        return null;
      }

      const format = currentScene.brollFormat;
      const headline = getPublicHeadline(currentScene);

      if (format === 'typography') {
        return (
          <div className="absolute top-10 inset-x-3 z-30 pointer-events-none animate-fade-in flex justify-center">
            <div className="bg-slate-950/95 border-2 border-amber-400 text-white px-3.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md text-center max-w-[90%]">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span
                  className="text-[12px] font-black tracking-wider text-amber-300 uppercase"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {headline}
                </span>
              </div>
              <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-1" />
            </div>
          </div>
        );
      }

      if (format === 'motion_graphic') {
        return (
          <div className="absolute top-10 inset-x-3 z-30 pointer-events-none animate-fade-in flex flex-col items-center">
            <div className="relative bg-slate-950/90 border border-cyan-400/90 px-3.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-[11px] font-black">⚡</span>
                <span
                  className="text-[11px] font-extrabold text-cyan-200 uppercase tracking-tight"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {headline}
                </span>
              </div>
            </div>
          </div>
        );
      }

      if (format === 'data_card') {
        return (
          <div className="absolute top-10 inset-x-3 z-30 pointer-events-none animate-fade-in flex flex-col items-center">
            <div className="relative bg-slate-950/90 border border-emerald-400/90 px-3.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-[11px] font-black">✦</span>
                <span
                  className="text-[11px] font-extrabold text-emerald-200 uppercase tracking-tight"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {headline}
                </span>
              </div>
            </div>
          </div>
        );
      }

      return null;
    };

    // Render Upper Hook Headline (Sanitized 3-6 words, Central HOOK_TEXT_STYLE_CONFIG, Pop-in 0.20s, Top Safe Zone)
    const renderUpperHookHeadline = () => {
      if (viewMode === 'raw' || !currentScene) return null;
      if (!shouldRenderUpperHeadline(currentScene)) return null;

      const sceneStart = currentScene.start;
      const sceneEnd = currentScene.end;
      const sceneElapsed = currentTime - sceneStart;

      // Show during first 2.8 seconds of the scene (priority 0-3s hook)
      if (sceneElapsed < 0 || sceneElapsed > Math.min(2.8, sceneEnd - sceneStart)) return null;

      const headline = getPublicHeadline(currentScene);
      if (!headline) return null;

      const style = resolveHookStyle(currentScene);
      const layout = resolveHookLayout(currentScene);
      const fontConfig = getHookFontConfig(style);

      const words = headline.split(' ').filter(Boolean);
      if (words.length === 0) return null;

      // Select key word to highlight (max 1 key word)
      let highlightIdx = words.findIndex(w =>
        /\d+|%|ROAS|OMSET|CPA|CTR|MACET|PENYEBABNYA|BEDANYA|NENDANG|RAHASIA|HASIL|BUKTI|CARA|JANGAN|RUGI|SOLUSI/i.test(w)
      );
      if (highlightIdx < 0) {
        highlightIdx = words.length > 2 ? Math.floor(words.length / 2) : words.length - 1;
      }

      // Check face protection positioning
      const isCloseUpFace = currentScene.talking_head_framing?.framing_mode === 'close_up_impact' ||
        (currentScene.talking_head_framing?.eyeline_y_percent !== undefined && currentScene.talking_head_framing.eyeline_y_percent < 28);

      const topPositionClass = isCloseUpFace ? 'top-3 sm:top-4' : 'top-6 sm:top-8 md:top-10';

      // Pop-in Animation (0.20s ease-out, scale 0.92 -> 1.00, translateY 12px -> 0px, opacity 0 -> 1)
      const animDuration = (fontConfig.animDurationMs || 200) / 1000;
      const animProgress = Math.min(1, Math.max(0, sceneElapsed / animDuration));
      
      const exitStart = Math.min(2.6, sceneEnd - sceneStart - 0.3);
      let opacity = 1;
      if (sceneElapsed < animDuration) {
        opacity = animProgress;
      } else if (sceneElapsed > exitStart) {
        opacity = Math.max(0, 1 - (sceneElapsed - exitStart) / 0.3);
      }

      const scale = sceneElapsed < animDuration ? 0.92 + (1.00 - 0.92) * Math.sin(animProgress * Math.PI / 2) : 1.0;
      const translateY = sceneElapsed < animDuration ? 12 * (1 - Math.sin(animProgress * Math.PI / 2)) : 0;

      let alignClass = 'items-center text-center';
      if (layout === 'left_editorial') {
        alignClass = 'items-start text-left pl-6 sm:pl-10 pr-12';
      }

      // Exact resolution scale calculation (720p base canvas -> frameWidth px)
      const scaleFactor = (frameWidth || 340) / 720;
      const baseTargetPt = isCloseUpFace ? fontConfig.fontSize.assPtFaceProtected : fontConfig.fontSize.assPt;
      const minPreviewPx = style === 'fast_tiktok' ? 32 :
                           (style === 'clean_creator' || style === 'premium_authority') ? 30 : 28;

      const mainFontSizePx = Math.max(minPreviewPx, Math.round(baseTargetPt * scaleFactor));
      const splitTopPx = Math.max(minPreviewPx + 4, Math.round(baseTargetPt * 1.25 * scaleFactor));
      const splitBottomPx = Math.max(16, Math.round(baseTargetPt * 0.65 * scaleFactor));
      const stackedPx = Math.max(minPreviewPx - 2, Math.round(baseTargetPt * 0.92 * scaleFactor));

      return (
        <div
          className={`absolute ${topPositionClass} inset-x-0 px-3 sm:px-6 flex flex-col ${alignClass} z-40 pointer-events-none transition-all duration-150`}
          style={{
            opacity,
            transform: `translateY(${translateY}px) scale(${scale})`,
          }}
        >
          <h2
            className={`${fontConfig.strokeClassTailwind} text-center ${layout === 'left_editorial' ? 'text-left' : ''} max-w-[96%] select-none font-bold uppercase`}
            style={{
              fontFamily: fontConfig.fontFamily,
              letterSpacing: fontConfig.letterSpacing,
              lineHeight: fontConfig.lineHeight,
              fontSize: `${mainFontSizePx}px`,
            }}
          >
            {layout === 'split_emphasis' ? (
              <div className="flex flex-col items-center">
                <span
                  className={`${fontConfig.highlightTailwind} uppercase font-black drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]`}
                  style={{ fontSize: `${splitTopPx}px` }}
                >
                  {words[highlightIdx]}
                </span>
                <span
                  className={`${fontConfig.baseTextColorTailwind} uppercase mt-0.5 font-bold`}
                  style={{ fontSize: `${splitBottomPx}px` }}
                >
                  {words.filter((_, i) => i !== highlightIdx).join(' ')}
                </span>
              </div>
            ) : layout === 'stacked_punch' && words.length > 2 ? (
              <div className="flex flex-col items-center space-y-0.5" style={{ fontSize: `${stackedPx}px` }}>
                <span className="uppercase">
                  {words.slice(0, Math.ceil(words.length / 2)).map((word, idx) => {
                    const isHL = idx === highlightIdx;
                    return (
                      <span
                        key={idx}
                        className={isHL ? `${fontConfig.highlightTailwind} font-black inline-block transform scale-105 transition-transform drop-shadow-[0_0_14px_rgba(250,204,21,0.85)]` : fontConfig.baseTextColorTailwind}
                        style={isHL ? { fontSize: '1.12em' } : undefined}
                      >
                        {word}{' '}
                      </span>
                    );
                  })}
                </span>
                <span className="uppercase">
                  {words.slice(Math.ceil(words.length / 2)).map((word, idx) => {
                    const globalIdx = Math.ceil(words.length / 2) + idx;
                    const isHL = globalIdx === highlightIdx;
                    return (
                      <span
                        key={idx}
                        className={isHL ? `${fontConfig.highlightTailwind} font-black inline-block transform scale-105 transition-transform drop-shadow-[0_0_14px_rgba(250,204,21,0.85)]` : fontConfig.baseTextColorTailwind}
                        style={isHL ? { fontSize: '1.12em' } : undefined}
                      >
                        {word}{' '}
                      </span>
                    );
                  })}
                </span>
              </div>
            ) : (
              // Center Top Impact & Left Editorial
              <span className="uppercase">
                {words.map((word, idx) => {
                  const isHL = idx === highlightIdx;
                  return (
                    <span
                      key={idx}
                      className={isHL ? `${fontConfig.highlightTailwind} font-black inline-block transform scale-105 transition-transform drop-shadow-[0_0_14px_rgba(250,204,21,0.85)]` : fontConfig.baseTextColorTailwind}
                      style={isHL ? { fontSize: '1.12em' } : undefined}
                    >
                      {word}{' '}
                    </span>
                  );
                })}
              </span>
            )}
          </h2>
        </div>
      );
    };

  // Render Real-Time Dynamic Short Video Captions (Face-Safe, Max 2 Lines, Lower Third Safe Zone)
  const renderActiveCaptions = () => {
    if (viewMode === 'raw' || !currentScene?.caption) return null;

    const sceneStart = currentScene.start;
    const sceneEnd = currentScene.end;
    const sceneDur = Math.max(0.1, sceneEnd - sceneStart);
    const sceneElapsed = Math.max(0, currentTime - sceneStart);

    const text = currentScene.caption;
    const grammar = currentScene.caption_grammar || 'KEYWORD_EMPHASIS';
    const role = currentScene.role || 'explanation';

    const displayMode = currentScene.caption_display_mode || determineCaptionDisplayMode(role, grammar, currentScene.visual_evidence?.type, activeSceneIndex);
    const isTalkingHead = currentScene.talking_head_framing?.is_talking_head !== false;

    // Face Safe Overlay Resolver: Guarantees overlay bounds do not collide with speaker face (Y: 18%-54%)
    const safeOverlay = getFaceSafeOverlayPlacement(isTalkingHead, displayMode, currentScene.visual_evidence?.type);

    // Dynamic Time-Chunking: Returns active 3-5 word page (wrapped in max 2 lines, 2-3 words per line)
    const { activeChunk, activeWordIdx } = getActiveCaptionChunk(
      text,
      currentScene.word_timings,
      sceneElapsed,
      sceneDur,
      displayMode
    );

    const wrappedLines = activeChunk.wrappedLines;

    let containerPos = safeOverlay.captionPosClass;
    let containerStyle = 'bg-transparent text-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.95),_0_0_4px_#000000]';
    let fontFamilyClass = "font-['Bricolage_Grotesque',sans-serif] tracking-tight text-sm sm:text-base font-extrabold uppercase";
    let activeWordStyle = 'scale-105 text-amber-300 font-black inline-block drop-shadow-[0_0_14px_rgba(251,191,36,1)] z-20';
    let defaultHighlightClass = 'text-amber-300 font-black drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]';

    if (displayMode === 'hook_headline') {
      fontFamilyClass = "font-['Anton',sans-serif] tracking-wider text-base sm:text-lg uppercase font-black";
      containerStyle = 'bg-transparent max-w-[92%] mx-auto text-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] [text-shadow:_0_2px_14px_rgba(0,0,0,0.95),_0_0_4px_#000000]';
      activeWordStyle = 'scale-105 text-amber-300 font-black inline-block drop-shadow-[0_0_14px_rgba(251,191,36,1)] z-20';
      defaultHighlightClass = 'text-amber-300 font-black drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]';
    } else if (displayMode === 'proof_badge') {
      containerStyle = 'bg-transparent max-w-[88%] mx-auto text-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.95),_0_0_4px_#000000]';
      fontFamilyClass = "font-['Sora',sans-serif] tracking-tight text-xs sm:text-sm font-extrabold uppercase";
      activeWordStyle = 'scale-105 text-cyan-300 font-black inline-block drop-shadow-[0_0_14px_rgba(34,211,238,1)] z-20';
      defaultHighlightClass = 'text-cyan-300 font-black drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]';
    } else if (displayMode === 'cta_emphasis') {
      containerStyle = 'bg-transparent max-w-[88%] mx-auto text-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] [text-shadow:_0_2px_12px_rgba(0,0,0,0.95),_0_0_4px_#000000]';
      fontFamilyClass = "font-['Bricolage_Grotesque',sans-serif] tracking-wide text-xs sm:text-sm font-black uppercase";
      activeWordStyle = 'scale-105 text-amber-300 font-black inline-block drop-shadow-[0_0_14px_rgba(251,191,36,1)] z-20';
    }

    const customPosY = currentScene.captionPositionY ?? (currentScene as any).caption_position_y;
    const customPosStyle: React.CSSProperties = typeof customPosY === 'number' && customPosY > 0
      ? { top: `${customPosY}%`, transform: 'translateY(-50%)', left: '0.75rem', right: '0.75rem' }
      : {};

    return (
      <div
        style={customPosStyle}
        className={`absolute ${typeof customPosY === 'number' && customPosY > 0 ? '' : containerPos} flex flex-col items-center justify-center text-center pointer-events-none z-30 transition-all duration-200`}
      >
        <div className={`px-2 py-1 max-w-[96%] ${containerStyle}`}>
          <div className={`leading-snug text-white flex flex-col items-center justify-center space-y-1.5 ${fontFamilyClass}`}>
            {wrappedLines.map((line) => (
              <div key={line.lineIndex} className="flex flex-wrap justify-center items-center gap-1.5">
                {line.words.map((wObj) => {
                  const i = wObj.globalIndex;
                  const word = wObj.word;
                  const wt = currentScene.word_timings?.[i];
                  const isHighlight = Boolean(wt?.isHighlight);
                  const isCurrentlySpoken = i === activeWordIdx;
                  const cat = wt?.marketingCategory || 'general';
                  const isMetricNumber = /\d+|%|X|RP|USD|JUTA|OMSET|ROAS/i.test(word);

                  let highlightClass = defaultHighlightClass;
                  if (cat === 'problem') {
                    highlightClass = 'text-rose-400 font-black underline decoration-rose-500 decoration-2 drop-shadow-[0_0_10px_rgba(244,63,94,0.9)]';
                  } else if (cat === 'benefit_result' || isMetricNumber) {
                    highlightClass = 'text-amber-300 font-black drop-shadow-[0_0_12px_rgba(251,191,36,1)]';
                  } else if (cat === 'urgency_cta') {
                    highlightClass = 'text-cyan-300 font-black underline decoration-cyan-400 decoration-2 drop-shadow-[0_0_10px_rgba(103,232,249,0.9)]';
                  } else if (cat === 'offer_mechanism') {
                    highlightClass = 'text-emerald-300 font-black underline decoration-emerald-400 decoration-2 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]';
                  }

                  return (
                    <span
                      key={i}
                      className={`transition-all duration-150 ease-out inline-block ${
                        isCurrentlySpoken
                          ? activeWordStyle
                          : isHighlight
                          ? highlightClass
                          : 'text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] px-0.5'
                      }`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render Director HUD (Hook, Urgency, Fatigue metrics on video)
  const renderDirectorHud = () => {
    if (!showHud || viewMode === 'raw' || !currentScene?.scores) return null;
    const scores = currentScene.scores;

    return (
      <div className="absolute top-10 left-3 right-3 flex items-center justify-between z-30 pointer-events-none animate-fade-in text-[10px]">
        {/* Left: Hook Strength & Role */}
        <div className="flex items-center gap-1">
          {scores.hook_strength >= 80 && (
            <span className="px-2 py-0.5 rounded-md font-black bg-rose-600/90 text-white flex items-center gap-1 shadow-md">
              <Flame className="w-3 h-3 text-amber-300" /> Hook {scores.hook_strength}%
            </span>
          )}
          {currentScene.visual_intent && currentScene.visual_intent !== 'none' && (
            <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-900/80 border border-indigo-500/40 text-indigo-200">
              {currentScene.visual_intent.toUpperCase()}
            </span>
          )}
        </div>

        {/* Right: Visual Fatigue Risk Badge */}
        {scores.visual_fatigue_risk > 50 && (
          <span className="px-2 py-0.5 rounded-md font-bold bg-amber-500/90 text-slate-950 flex items-center gap-1 shadow-md">
            <ShieldAlert className="w-3 h-3" /> Fatigue {scores.visual_fatigue_risk}%
          </span>
        )}
      </div>
    );
  };

  const cameraStyle = getCameraTransform();
  const activeVideoFilter = viewMode === 'edited' && currentScene?.visual_correction?.css_filter
    ? currentScene.visual_correction.css_filter
    : 'none';

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Top View Mode & SFX Switcher Bar */}
      <div className="w-full flex items-center justify-between bg-[var(--card)] border border-[var(--border)] p-2 rounded-xl shadow-xs flex-wrap gap-2">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-[var(--secondary)] p-1 rounded-lg">
          <button
            id="btn-view-edited"
            onClick={() => setViewMode('edited')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'edited'
                ? 'bg-[var(--card)] text-blue-500 shadow-2xs'
                : 'text-[var(--muted-foreground)] hover:text-[var(--fg-app)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto Motion (Edited)</span>
          </button>

          <button
            id="btn-view-raw"
            onClick={() => setViewMode('raw')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'raw'
                ? 'bg-[var(--card)] text-[var(--fg-app)] shadow-2xs'
                : 'text-[var(--muted-foreground)] hover:text-[var(--fg-app)]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Raw Video</span>
          </button>

          <button
            id="btn-view-split"
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-[var(--card)] text-blue-500 shadow-2xs'
                : 'text-[var(--muted-foreground)] hover:text-[var(--fg-app)]'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Split Compare</span>
          </button>
        </div>

        {/* SFX and Editor Guide toggles */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setShowHud(!showHud)}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer font-semibold ${
              showHud
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-500 shadow-2xs'
                : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)]'
            }`}
            title="Toggle Editor Guide Overlay (Safezone, 0-3s Hook Marker, Director Badges)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Guide: {showHud ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setEnableSfx(!enableSfx)}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
              enableSfx
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-500 font-semibold'
                : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>SFX: {enableSfx ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Editing Rhythm Live Status Bar */}
      {showHud && viewMode !== 'raw' && currentScene && (
        <div className="w-full bg-slate-900 text-white border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs animate-fade-in shadow-inner flex-wrap gap-2">

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3" /> Scene {activeSceneIndex + 1}/{scenes.length}
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" /> Style: {getStyleProfile(contentType as ContentType).name}
            </span>
            <span className="font-bold text-slate-200 truncate">
              {currentScene.role === 'hook' ? '🔥 0-3s VISUAL HOOK' : currentScene.role === 'problem' ? '🚨 PAIN POINT BUILD' : currentScene.role === 'solution' ? '✨ SOLUTION RELIEF' : currentScene.role === 'proof' ? '📊 VERIFIED PROOF' : '🚀 CTA PUSH'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentScene.editing_rhythm && (
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/60 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Rhythm: {currentScene.editing_rhythm.rhythm_preset.replace('SPECIAL_', '')} ({currentScene.editing_rhythm.cut_cadence_ms}ms)
              </span>
            )}

            {currentScene.motion && (
              <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono text-[10px] uppercase font-bold">
                ⚡ {currentScene.motion.replace('_', ' ')}
              </span>
            )}

            {currentScene.talking_head_framing?.is_talking_head && (() => {
              const prof = resolveTalkingHeadMotionProfile(
                currentScene,
                currentScene.adRole,
                true,
                activeSceneIndex
              );
              return (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-400" /> TH {prof.profileKey}: {prof.scaleStart.toFixed(2)}-{prof.scaleEnd.toFixed(2)}x (Eyeline: {prof.eyelineTargetPercent}%)
                </span>
              );
            })()}

            {currentScene.visual_correction && (
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                <Sun className="w-3 h-3 text-cyan-400" /> {currentScene.visual_correction.status.replace(/_/g, ' ')}
              </span>
            )}

            {currentScene.editing_rhythm?.pattern_interrupt_type && currentScene.editing_rhythm.pattern_interrupt_type !== 'NONE' && (
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/60 font-mono text-[10px] uppercase font-bold">
                🎯 {currentScene.editing_rhythm.pattern_interrupt_type.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 9:16 Vertical Screen Frame */}
      <div className="relative flex justify-center w-full">
        {viewMode === 'split' ? (
          /* Split View: Side by Side Raw vs Edited */
          <div className="flex items-center gap-4 max-w-full overflow-x-auto p-2">
            {/* Raw Screen */}
            <div className="relative w-[230px] sm:w-[260px] aspect-[9/16] bg-slate-950 rounded-2xl overflow-hidden border border-slate-300 shadow-lg">
              <div className="absolute top-2 left-2 z-30 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] font-bold text-slate-300 border border-slate-700">
                RAW (BEFORE)
              </div>
              {!hasVideoError ? (
                <video
                  ref={rawVideoRef}
                  key={`raw-${videoUrl}`}
                  src={videoUrl}
                  playsInline
                  muted
                  onError={() => setHasVideoError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                renderStudioVisualizer(true)
              )}
            </div>

            {/* Edited Screen */}
            <div ref={playerFrameRef} className="relative w-[230px] sm:w-[260px] aspect-[9/16] bg-slate-950 rounded-2xl overflow-hidden border-2 border-indigo-600 shadow-lg">
              <div className="absolute top-2 left-2 z-30 px-2 py-0.5 rounded bg-indigo-600 text-[10px] font-bold text-white shadow">
                ALCO AUTO MOTION (AFTER)
              </div>
              <div
                className="w-full h-full origin-center overflow-hidden transition-transform"
                style={cameraStyle}
              >
                {!hasVideoError ? (
                  <video
                    ref={videoRef}
                    key={`edited-${videoUrl}`}
                    src={videoUrl}
                    playsInline
                    muted={isMuted}
                    onLoadedData={() => setVideoLoaded(true)}
                    onError={() => setHasVideoError(true)}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    style={{ filter: activeVideoFilter }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  renderStudioVisualizer(false)
                )}
              </div>

              {/* B-Roll PIP Overlay */}
              {currentScene?.broll && (
                <div className="absolute top-12 right-2 w-24 aspect-video rounded-lg overflow-hidden border border-amber-400 shadow-xl z-20 animate-fade-in bg-slate-950">
                  <div className="absolute top-0 left-0 bg-amber-500 text-slate-950 text-[7px] font-black px-1">
                    B-ROLL
                  </div>
                  <img
                    src={currentScene.broll.previewUrl || currentScene.broll.sourceUrl}
                    alt="B-roll"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {renderDirectorHud()}
              {renderUpperHookHeadline()}
              {renderSafeInternalVisualLayer()}
              {renderVisualEvidenceOverlay()}
              {renderActiveCaptions()}
            </div>
          </div>
        ) : (
          /* Single Screen Focus Player */
          <div ref={playerFrameRef} className="relative w-[280px] sm:w-[320px] md:w-[340px] aspect-[9/16] bg-slate-950 rounded-3xl overflow-hidden border border-slate-300 shadow-xl group">
            {/* Live Indicator Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-30 pointer-events-none">
              <div className="flex items-center gap-1.5">
                {showHud && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-900/90 text-amber-300 border border-slate-700 shadow backdrop-blur-sm">
                    Scene {activeSceneIndex + 1}
                  </span>
                )}
              </div>

              <span className="font-mono text-[11px] text-slate-200 font-bold bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
              </span>
            </div>

            {/* Video Canvas with Camera Transform */}
            <div
              className="w-full h-full origin-center overflow-hidden"
              style={cameraStyle}
            >
              {!hasVideoError ? (
                <video
                  ref={videoRef}
                  key={`single-${videoUrl}`}
                  src={videoUrl}
                  playsInline
                  muted={isMuted}
                  onLoadedData={() => setVideoLoaded(true)}
                  onError={() => setHasVideoError(true)}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  style={{ filter: activeVideoFilter }}
                  className="w-full h-full object-cover"
                />
              ) : (
                renderStudioVisualizer(false)
              )}
            </div>

            {/* B-Roll Framing (Dynamic Floating PIP Sticker) */}
            {viewMode === 'edited' && currentScene?.broll && (
              <div
                className="absolute top-14 right-3 w-32 aspect-video rounded-xl overflow-hidden border-2 border-amber-400 shadow-2xl z-20 animate-fade-in bg-slate-950/95"
              >
                <div className="absolute top-0 left-0 bg-amber-400 text-slate-950 text-[8px] font-black px-1.5 py-0.5 z-10 uppercase tracking-tight">
                  {currentScene.broll.visual_intent?.toUpperCase() || 'B-ROLL'}
                </div>
                <img
                  src={currentScene.broll.previewUrl || currentScene.broll.sourceUrl}
                  alt="B-roll"
                  className="w-full h-full object-cover opacity-95"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 p-1 text-[8px] text-slate-200 truncate font-mono">
                  {currentScene.broll.query}
                </div>
              </div>
            )}

            {renderDirectorHud()}
            {renderUpperHookHeadline()}
            {renderSafeInternalVisualLayer()}
            {renderVisualEvidenceOverlay()}
            {renderActiveCaptions()}

            {/* Center Play/Pause Overlay */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute inset-0 flex items-center justify-center bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-slate-900/90 text-white flex items-center justify-center shadow-xl border border-slate-700 hover:scale-105 transition-transform">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Media Playback Controls Bar */}
      <div className="w-full max-w-md flex items-center justify-between bg-[var(--card)] border border-[var(--border)] p-2 rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            id="btn-play-pause"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={() => handleSeek(0)}
            className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--fg-app)] hover:bg-[var(--secondary)] transition-all cursor-pointer"
            title="Replay from start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--fg-app)] hover:bg-[var(--secondary)] transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        <div className="text-xs font-mono text-[var(--muted-foreground)]">
          <span className="text-blue-500 font-bold">{currentTime.toFixed(1)}s</span> / {duration.toFixed(1)}s
        </div>
      </div>
    </div>
  );
};
