/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_ARCGIS_TOKEN?: string;
  readonly VITE_ARCGIS_RW_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
