/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROJECT_ASSISTANT_URL?: string
  readonly VITE_PROJECT_ASSISTANT_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
