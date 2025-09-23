/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_ENABLE_TICKETING: string;
  readonly VITE_ENABLE_COMMUNITIES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}