import { createClient } from '@supabase/supabase-js'
import { currentEnvSource, readSupabaseConfig } from './env'

const config = readSupabaseConfig(currentEnvSource())

export const hasValidSupabaseConfig = config.isConfigured

export const supabaseConfigError = hasValidSupabaseConfig
  ? null
  : 'Supabase is not configured for this environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local with real project values.'

if (!hasValidSupabaseConfig) {
  console.warn(supabaseConfigError)
}

// Falling back to a placeholder rather than throwing keeps the app importable in
// environments with no credentials -- CI, a fresh clone -- so the config error
// surfaces as a readable warning instead of a module-load crash.
export const supabase = createClient(
  hasValidSupabaseConfig ? config.url : 'https://placeholder.supabase.co',
  hasValidSupabaseConfig ? config.anonKey : 'placeholder-key'
)
