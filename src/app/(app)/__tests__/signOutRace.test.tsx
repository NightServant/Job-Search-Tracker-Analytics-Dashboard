import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import AppLayout from '../layout'

/**
 * The sign-out race, driven through the REAL AuthProvider and the REAL guard.
 *
 * layout.test.tsx asserts the guard respects a `signingOut` flag, which is
 * necessary and not sufficient: it hands the flag to the component rather than
 * letting the provider produce it, so it cannot prove the flag is raised
 * before the guard reads it. That gap is exactly the shape of the original
 * bug -- a test that asserted the intended call happened while the clobbering
 * call went unobserved.
 *
 * This wires the two together and drives them from a fake Supabase whose
 * signOut() fires onAuthStateChange the way the real one does, then asserts on
 * the ONE thing that matters: where the person ends up.
 */

const replaceMock = vi.hoisted(() => vi.fn())
let emitAuthChange: ((session: null) => void) | null = null

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/lib/supabase', () => ({
  hasValidSupabaseConfig: true,
  supabaseConfigError: null,
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { user: { id: 'u1' } } } }),
      onAuthStateChange: (cb: (event: string, session: null) => void) => {
        emitAuthChange = (session) => cb('SIGNED_OUT', session)
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      // The real client clears the session and notifies subscribers. Firing
      // the callback here is what reproduces the race: the layout re-renders
      // with user === null while it is still mounted.
      signOut: async () => {
        emitAuthChange?.(null)
        return { error: null }
      },
    },
  },
}))

function SignOutButton() {
  const { signOut } = useAuth()
  return (
    <button
      onClick={async () => {
        await signOut()
        // What the settings page does: the sign-out flow owns the destination.
        replaceMock('/')
      }}
    >
      sign out
    </button>
  )
}

beforeEach(() => {
  replaceMock.mockClear()
  emitAuthChange = null
})

describe('signing out of the authenticated shell', () => {
  it('lands on the home page, and never on the sign-in form', async () => {
    // Reported from the deployed app on 2026-09-03. Both redirects fired; the
    // guard ran second and won, so a deliberate sign-out was answered with a
    // sign-in form.
    render(
      <AuthProvider>
        <AppLayout>
          <SignOutButton />
        </AppLayout>
      </AuthProvider>
    )

    const button = await screen.findByRole('button', { name: 'sign out' })
    await userEvent.click(button)

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'))
    expect(
      replaceMock.mock.calls.map((c) => c[0]),
      'the guard clobbered the sign-out destination'
    ).not.toContain('/login')
  })

  it('still sends an uninvited visitor to the sign-in form', async () => {
    // Positive companion. Without it, a guard that had simply been deleted
    // would pass the test above -- and deleting the guard is the tempting
    // wrong fix, since it makes the symptom disappear.
    emitAuthChange = null
    render(
      <AuthProvider>
        <AppLayout>
          <div>private</div>
        </AppLayout>
      </AuthProvider>
    )
    // No sign-out ever started; the session simply expires.
    await waitFor(() => expect(emitAuthChange).not.toBeNull())
    emitAuthChange!(null)
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/login'))
  })
})
