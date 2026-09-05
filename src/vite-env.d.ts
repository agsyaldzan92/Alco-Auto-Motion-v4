/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RENDER_API_BASE_URL?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
