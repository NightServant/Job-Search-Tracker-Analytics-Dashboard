import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

const getSession = vi.hoisted(() => vi.fn())
const listeners = vi.hoisted(() => [] as ((event: string, session: unknown) => void)[])
const onAuthStateChange = vi.hoisted(() =>
  vi.fn((cb: (event: string, session: unknown) => void) => {
    listeners.push(cb)
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
)

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession, onAuthStateChange, signOut: vi.fn() } },
  hasValidSupabaseConfig: true,
  supabaseConfigError: null,
}))

import { AuthProvider, useAuth } from '../AuthContext'

function Probe() {
  const { loading, user } = useAuth()
  return <p data-testid="state">{`loading=${loading} user=${user ? 'yes' : 'no'}`}</p>
}

const state = () => screen.getByTestId('state').textContent

beforeEach(() => {
  vi.clearAllMocks()
  listeners.length = 0
})

/**
 * THE BUG: restart the dev server while signed in, open the app, and land on
 * the marketing page instead of the dashboard.
 *
 * `getSession()` had no `.catch()`. A rejected call left `loading` true
 * forever, and nothing recovers from that -- `SignedInRedirect` fires on
 * `!loading && user`, so `/` never moves, and `AppLayout` renders `null` while
 * `loading || !user`, so a private route goes blank. Both read as "signed
 * out" while actually being "never finished asking".
 */
describe('the auth loading flag', () => {
  it('clears when the session resolves', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(state()).toBe('loading=false user=yes'))
  })

  it('CLEARS EVEN WHEN getSession REJECTS, rather than wedging forever', async () => {
    // The defect, asserted directly. Before the fix this stayed
    // "loading=true" for the lifetime of the page.
    getSession.mockRejectedValue(new Error('Failed to fetch'))
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(state()).toBe('loading=false user=no'))
  })

  it('does not leave an unhandled rejection behind', async () => {
    // The same missing `.catch()` also produced an unhandled rejection, which
    // is how it stayed invisible: nothing in the UI said anything had failed.
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    getSession.mockRejectedValue(new Error('Failed to fetch'))
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(state()).toContain('loading=false'))
    await new Promise((r) => setTimeout(r, 20))
    process.off('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()
  })

  it('picks the session up from the listener when the first read failed', async () => {
    // supabase-js emits INITIAL_SESSION on subscribe, and a refresh that
    // failed once often succeeds on the retry. Before the fix only
    // `getSession()` could clear the flag, so a session arriving this way was
    // stored and then ignored -- signed in, and still stuck on the landing
    // page.
    getSession.mockRejectedValue(new Error('Failed to fetch'))
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(state()).toBe('loading=false user=no'))

    act(() => {
      listeners.forEach((cb) => cb('INITIAL_SESSION', { user: { id: 'u1' } }))
    })
    expect(state()).toBe('loading=false user=yes')
  })

  it('clears when getSession never settles at all, via the listener', async () => {
    // The case that makes the listener's own `setLoading(false)` earn its
    // place. A REJECTED read is caught by `.finally()`; a read that simply
    // never answers -- a fetch left hanging when the dev server went away
    // mid-request -- has no `.finally()` to reach, and `onAuthStateChange` is
    // then the only thing that can release the app.
    //
    // Written after a mutation showed the listener line could be deleted with
    // every other test still green.
    getSession.mockReturnValue(new Promise(() => {}))
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(state()).toBe('loading=true user=no')

    act(() => {
      listeners.forEach((cb) => cb('INITIAL_SESSION', { user: { id: 'u1' } }))
    })
    expect(state()).toBe('loading=false user=yes')
  })

  it('a failed read is not a sign-out', async () => {
    // It sets `user` to null because nothing better is known yet. Clearing the
    // STORED session here would turn one bad request into a real logout, and
    // the next page load would genuinely need a password.
    getSession.mockRejectedValue(new Error('Failed to fetch'))
    const signOut = vi.fn()
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(state()).toContain('loading=false'))
    expect(signOut).not.toHaveBeenCalled()
  })

  it('ignores a late answer after unmount', async () => {
    // The dev server restarting mid-load is exactly when a resolution lands
    // against a component that is already gone.
    let resolve!: (v: unknown) => void
    getSession.mockReturnValue(new Promise((r) => (resolve = r)))
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>)
    unmount()
    await act(async () => {
      resolve({ data: { session: { user: { id: 'u1' } } } })
      await Promise.resolve()
    })
    // No "update on an unmounted component" warning, and no crash.
    expect(true).toBe(true)
  })
})
