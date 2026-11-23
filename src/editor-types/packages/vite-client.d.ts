// What `/// <reference types="vite/client" />` gives a Vite project, reduced to `import.meta.env` and `?raw` imports.
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

// A file's text, imported as a string: `import query from './queries/sales.dax?raw'`.
// The same declaration as Vite's own client types (vite 7.2.6, client.d.ts).
declare module '*?raw' {
  const src: string;
  export default src;
}
