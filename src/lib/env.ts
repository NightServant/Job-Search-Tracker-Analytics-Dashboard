export interface SupabaseConfig {
  url: string
  anonKey: string
  isConfigured: boolean
}

const PLACEHOLDER_URL = [
  'your-project.supabase.co',
  'placeholder.supabase.co',
  'project-id.supabase.co',
]
const PLACEHOLDER_KEY = ['placeholder', 'anon-key-value', 'your-anon-key']

/**
 * Reads Supabase config from a plain object rather than a global.
 *
 * Taking the source as an argument is what makes this testable: import.meta.env
 * and process.env are both ambient and neither can be varied per test.
 *
 * NEXT_PUBLIC_ wins over VITE_ so a half-migrated repo prefers the new names
 * while the Vite app keeps running on the old ones.
 */
export function readSupabaseConfig(source: Record<string, string | undefined>): SupabaseConfig {
  const url = source.NEXT_PUBLIC_SUPABASE_URL ?? source.VITE_SUPABASE_URL ?? ''
  const anonKey = source.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? source.VITE_SUPABASE_ANON_KEY ?? ''
  const isConfigured =
    !!url &&
    !!anonKey &&
    !PLACEHOLDER_URL.some((p) => url.includes(p)) &&
    !PLACEHOLDER_KEY.some((p) => anonKey.toLowerCase().includes(p))
  return { url, anonKey, isConfigured }
}

/**
 * The ambient environment, merged across both runtimes.
 *
 * Next exposes NEXT_PUBLIC_* on process.env; Vite exposes VITE_* on
 * import.meta.env and has no process. Reading both behind typeof guards means
 * this module loads in either without throwing.
 */
export function currentEnvSource(): Record<string, string | undefined> {
  const fromProcess = typeof process !== 'undefined' && process.env ? process.env : {}
  let fromImportMeta: Record<string, string | undefined> = {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = import.meta as any
    if (meta && meta.env) fromImportMeta = meta.env
  } catch {
    // import.meta is unavailable in some CJS contexts; process.env alone is fine there.
  }
  return { ...fromProcess, ...fromImportMeta }
}
