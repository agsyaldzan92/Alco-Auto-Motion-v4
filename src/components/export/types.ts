export type ExportTier = 'server_mp4' | 'safe_20fps' | 'standard_24fps' | 'mp4_wasm';
export type RenderDurationMode = 'full_duration' | 'test_15s';
export type BackendMode = 'checking' | 'available' | 'missing' | 'ffmpeg_missing' | 'unknown';

export type HookReviewState = 'bagus' | 'terlalu_kecil' | 'menutup_wajah' | 'terlalu_panjang';
export type CaptionReviewState = 'clean' | 'terlalu_panjang' | 'terlalu_rendah' | 'terlalu_besar' | 'masih_box';
export type SfxReviewState = 'sesuai' | 'terlalu_ramai' | 'terlalu_pelan' | 'terlalu_keras' | 'tidak_cocok_scene';
export type BrollReviewState = 'relevan' | 'generik' | 'kaku' | 'menutup_wajah';
export type TalkingHeadReviewState = 'aman' | 'terlalu_kecil' | 'wajah_tertutup' | 'crop_kurang_bagus';

export interface VideoFormatConfig {
  mimeType: string;
  extension: 'mp4' | 'webm';
  formatLabel: string;
  isUniversalMp4: boolean;
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
  hasAudioTrack?: boolean;
}

export interface ChecklistItem {
  label: string;
  status: 'PASS' | 'WARNING' | 'FAIL' | 'BELUM DICEK';
  detail: string;
}

export interface EndpointCheckDetail {
  endpoint: string;
  url: string;
  httpStatus?: number;
  contentType?: string;
  isHtml: boolean;
  jsonValid: boolean;
  success: boolean;
  data?: any;
  error?: string;
}

export interface FinalExportReadinessResult {
  passed: boolean;
  status: 'PASS' | 'FAILED';
  mainMessage: string;
  failureReasons: string[];
  playbackQualityPass: boolean;
  sourceMatchedPass: boolean;
  audioMatchedPass: boolean;
  motionPass: boolean;
  sfxPass: boolean;
  captionsPass: boolean;
  talkingHeadPass: boolean;
  parityPass: boolean;
}
