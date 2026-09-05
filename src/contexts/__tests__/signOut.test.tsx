import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const signOutFn = vi.hoisted(() => vi.fn())
const getSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: signOutFn,
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

const KEY = 'sb-somyuulytwgzltiboewm-auth-token'

function storeSession() {
  localStorage.setItem(KEY, JSON.stringify({ expires_at: 99999999999, user: { id: 'u1' } }))
  localStorage.setItem(`${KEY}-code-verifier`, 'pkce')
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
})

/**
 * SIGNING OUT MUST NOT BE A REQUEST THE NETWORK CAN VETO.
 *
 * auth-js's `_signOut` calls the server to revoke the token and returns early
 * on any error that is not a 401/403/404 -- a 500, or an offline
 * `AuthRetryableFetchError` -- WITHOUT reaching `_removeSession()`. The old
 * code threw on that, Settings caught it, showed "Sign out failed", and never
 * navigated: the session stayed in localStorage and the user stayed signed in.
 */
describe('signing out', () => {
  it('clears the stored session on the happy path', async () => {
    storeSession()
    signOutFn.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useAuth(), { wrapper })

    let outcome
    await act(async () => {
      outcome = await result.current.signOut()
    })

    expect(localStorage.getItem(KEY)).toBeNull()
    expect(outcome).toMatchObject({ revokedEverywhere: true })
  })

  it('CLEARS IT ANYWAY when the server returns an error', async () => {
    storeSession()
    signOutFn.mockResolvedValue({ error: { message: 'Internal Server Error', status: 500 } })
    const { result } = renderHook(() => useAuth(), { wrapper })

    let outcome
    await act(async () => {
      outcome = await result.current.signOut()
    })

    expect(localStorage.getItem(KEY), 'the session survived a server error').toBeNull()
    expect(outcome).toMatchObject({ revokedEverywhere: false })
  })

  it('CLEARS IT ANYWAY when the call rejects outright', async () => {
    // Offline. The rejection path is separate from the returned-error path in
    // auth-js, and both used to leave the session in place.
    storeSession()
    signOutFn.mockRejectedValue(new Error('Failed to fetch'))
    const { result } = renderHook(() => useAuth(), { wrapper })

    let outcome
    await act(async () => {
      outcome = await result.current.signOut()
    })

    expect(localStorage.getItem(KEY)).toBeNull()
    expect(outcome).toMatchObject({ revokedEverywhere: false })
  })

  it('does not throw on a server failure, so the caller still leaves', async () => {
    // Throwing would make the caller treat a successful LOCAL sign-out as a
    // failure -- which is exactly what stranded the user on Settings.
    storeSession()
    signOutFn.mockResolvedValue({ error: { message: 'boom', status: 500 } })
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await expect(result.current.signOut()).resolves.toBeDefined()
    })
  })

  it('clears the user in memory as well as on disk', async () => {
    // Otherwise React Query and every mounted screen keep rendering the
    // person who just left until the navigation completes.
    storeSession()
    signOutFn.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signOut()
    })
    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
  })

  it('takes the PKCE verifier with it', async () => {
    storeSession()
    signOutFn.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signOut()
    })
    expect(localStorage.getItem(`${KEY}-code-verifier`)).toBeNull()
  })

  it('still attempts the server revoke, rather than only clearing locally', async () => {
    // The remote call is what ends the session on other devices. Dropping it
    // would make sign-out reliable and much less useful.
    storeSession()
    signOutFn.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signOut()
    })
    expect(signOutFn).toHaveBeenCalled()
  })
})
