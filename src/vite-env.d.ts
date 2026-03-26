/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css?url' {
  const src: string;
  export default src;
}
