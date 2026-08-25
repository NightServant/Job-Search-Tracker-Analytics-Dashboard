import { describe, it, expect } from 'vitest'
import { readSupabaseConfig } from '../env'

describe('readSupabaseConfig', () => {
  it('prefers NEXT_PUBLIC_ values when both are present', () => {
    const cfg = readSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://next.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'next-key',
      VITE_SUPABASE_URL: 'https://vite.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'vite-key',
    })
    expect(cfg.url).toBe('https://next.supabase.co')
    expect(cfg.anonKey).toBe('next-key')
  })

  it('falls back to VITE_ values so the Vite app keeps working mid-migration', () => {
    const cfg = readSupabaseConfig({
      VITE_SUPABASE_URL: 'https://vite.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'vite-key',
    })
    expect(cfg.url).toBe('https://vite.supabase.co')
    expect(cfg.isConfigured).toBe(true)
  })

  it('reports unconfigured when values are missing', () => {
    expect(readSupabaseConfig({}).isConfigured).toBe(false)
  })

  it('treats a placeholder URL as unconfigured', () => {
    const cfg = readSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://your-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k',
    })
    expect(cfg.isConfigured).toBe(false)
  })

  it('treats a placeholder key as unconfigured', () => {
    const cfg = readSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://real.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your-anon-key',
    })
    expect(cfg.isConfigured).toBe(false)
  })
})
