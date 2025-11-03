/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_ENABLE_TICKETING: string;
  readonly VITE_ENABLE_COMMUNITIES: string;
  readonly VITE_FF_COALITION_LOYALTY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}