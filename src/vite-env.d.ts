/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GENERATED_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
