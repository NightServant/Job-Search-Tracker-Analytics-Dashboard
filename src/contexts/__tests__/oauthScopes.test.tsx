import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const signInWithOAuth = vi.hoisted(() => vi.fn())
const getSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOAuth,
    },
  },
  hasValidSupabaseConfig: true,
  supabaseConfigError: null,
}))
vi.mock('@/lib/env', () => ({
  currentEnvSource: () => ({}),
  readSupabaseConfig: () => ({
    isConfigured: true,
    url: 'https://somyuulytwgzltiboewm.supabase.co',
    anonKey: 'anon',
  }),
}))

import { AuthProvider, useAuth } from '../AuthContext'
import { OAUTH_PROVIDERS } from '@/lib/oauthProviders'

/**
 * What the app actually asks each OAuth provider for.
 *
 * WHY THIS IS WORTH A TEST. Supabase Auth requires a valid email back from the
 * provider -- it is the account's identity in `auth.users` -- and Microsoft
 * does not include one unless the `email` scope is requested by name. Nothing
 * in the type system says so, nothing fails at build time, and the failure
 * happens at the END of a full round trip through Microsoft, which reads like
 * a Supabase fault rather than a missing parameter. Found in Supabase's own
 * Azure guide on 2026-09-15 while enabling the provider, not by anything here.
 *
 * The redirect assertion is the older rule and belongs in the same place: the
 * destination is ALWAYS this app's own origin, never a caller-supplied URL,
 * because an attacker-controlled `redirectTo` on an OAuth flow is how a token
 * leaves the site it belongs to.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
  getSession.mockResolvedValue({ data: { session: null } })
  signInWithOAuth.mockResolvedValue({ error: null })
})

const start = async (provider: 'google' | 'azure') => {
  const { result } = renderHook(() => useAuth(), { wrapper })
  await waitFor(() => expect(result.current.loading).toBe(false))
  await act(async () => {
    await result.current.signInWithProvider(provider)
  })
  return signInWithOAuth.mock.calls.at(-1)![0]
}

describe('the OAuth call the buttons make', () => {
  it('asks Microsoft for the email scope by name', async () => {
    // THE ASSERTION THAT WOULD HAVE CAUGHT IT. Without this the Microsoft
    // button completes the whole hand-off and then fails on a missing email.
    const args = await start('azure')
    expect(args.provider).toBe('azure')
    expect(args.options.scopes).toBe('email')
  })

  it('asks Google for nothing extra, because its defaults already carry email', async () => {
    // Not an oversight -- naming the default scopes would imply the table is
    // exhaustive. An entry means "this provider needs something EXTRA".
    const args = await start('google')
    expect(args.options.scopes).toBeUndefined()
  })

  it('sends every provider back to this app origin and nowhere else', async () => {
    for (const provider of OAUTH_PROVIDERS) {
      const args = await start(provider.id)
      expect(args.options.redirectTo).toBe(`${window.location.origin}/dashboard`)
    }
  })
})
