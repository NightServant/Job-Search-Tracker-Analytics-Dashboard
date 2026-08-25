// Retained after the Vite removal because src/lib/env.ts still reads
// import.meta.env as a fallback path. The VITE_* names are gone from the app;
// this only describes the shape so TypeScript accepts the guarded access.
interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
