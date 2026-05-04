import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const looksLikePlaceholderUrl = (value?: string) => {
  if (!value) return true
  return (
    value.includes('your-project.supabase.co') ||
    value.includes('placeholder.supabase.co') ||
    value.includes('project-id.supabase.co')
  )
}

const looksLikePlaceholderKey = (value?: string) => {
  if (!value) return true
  const lowered = value.toLowerCase()
  return (
    lowered.includes('placeholder') ||
    lowered.includes('anon-key-value') ||
    lowered.includes('your-anon-key')
  )
}

export const hasValidSupabaseConfig =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  !looksLikePlaceholderUrl(supabaseUrl) &&
  !looksLikePlaceholderKey(supabaseAnonKey)

export const supabaseConfigError = hasValidSupabaseConfig
  ? null
  : 'Supabase is not configured for this environment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local with real project values.'

if (!hasValidSupabaseConfig) {
  console.warn(
    supabaseConfigError
  )
}

export const supabase = createClient(
  hasValidSupabaseConfig ? supabaseUrl : 'https://placeholder.supabase.co',
  hasValidSupabaseConfig ? supabaseAnonKey : 'placeholder-key'
)
