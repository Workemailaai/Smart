/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API: string;
  readonly VITE_MEDIA_BASE_URL: string;
  readonly VITE_RESULTS_FALLBACK_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
