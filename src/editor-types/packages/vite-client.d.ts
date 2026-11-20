// What `/// <reference types="vite/client" />` gives a Vite project, reduced to `import.meta.env`.
// In the playground, `rayfin dev` (simulated) fills these values in.
interface ImportMetaEnv {
  [key: string]: any;
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
