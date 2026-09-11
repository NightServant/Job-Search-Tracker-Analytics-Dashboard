import { createBrowserClient } from '@supabase/ssr'
import { currentEnvSource, readSupabaseConfig } from './env'

const config = readSupabaseConfig(currentEnvSource())

export const hasValidSupabaseConfig = config.isConfigured

export const supabaseConfigError = hasValidSupabaseConfig
  ? null
  : 'Supabase is not configured for this environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local with real project values.'

if (!hasValidSupabaseConfig) {
  console.warn(supabaseConfigError)
}

/**
 * THE SESSION LIVES IN COOKIES NOW, not localStorage (2026-09-11).
 *
 * `createBrowserClient` is `createClient` with cookie storage wired in. That
 * one change is what makes `src/middleware.ts` possible: a cookie is sent with
 * every request, so the server can decide who is asking BEFORE it renders
 * anything. localStorage never left the browser, which is why every redirect
 * in this app used to be a correction applied after the wrong page was already
 * on screen.
 *
 * The API surface is unchanged -- `supabase.auth`, `supabase.from`, the
 * realtime client and every hook in `src/hooks` carry on untouched -- so this
 * is a storage swap rather than a rewrite.
 *
 * IT SIGNS EVERYONE OUT ONCE. Sessions already in localStorage are not carried
 * across, because nothing can read them from the server; anybody signed in
 * when this deploys signs in again. Stated here rather than discovered.
 *
 * Falling back to a placeholder rather than throwing keeps the app importable
 * in environments with no credentials -- CI, a fresh clone -- so the config
 * error surfaces as a readable warning instead of a module-load crash.
 */
export const supabase = createBrowserClient(
  hasValidSupabaseConfig ? config.url : 'https://placeholder.supabase.co',
  hasValidSupabaseConfig ? config.anonKey : 'placeholder-key'
)
