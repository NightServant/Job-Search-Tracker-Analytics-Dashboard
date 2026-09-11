import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SignedOutOnly } from '@/components/auth/SignedOutOnly'

const useAuthMock = vi.hoisted(() => vi.fn())
vi.mock('@/contexts/AuthContext', () => ({ useAuth: useAuthMock }))

afterEach(() => cleanup())

/**
 * The gate in front of /login and /signup.
 *
 * Gabe, 2026-09-11: "I am signed in but authentication forms shows up even
 * when I am logged in." Both redirects in the (auth) layout are corrections
 * made after something is already on screen; this is what stops the form being
 * that something.
 */
describe('SignedOutOnly', () => {
  it('paints the form for a visitor who is known to be signed out', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false })
    render(
      <SignedOutOnly>
        <p>sign in form</p>
      </SignedOutOnly>
    )
    expect(screen.getByText('sign in form')).toBeTruthy()
  })

  it('paints nothing for a visitor who is signed in', () => {
    // The exact reported case. The redirect is already in flight; a sign-in
    // form is never the right thing to show someone who has a session.
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false })
    render(
      <SignedOutOnly>
        <p>sign in form</p>
      </SignedOutOnly>
    )
    expect(screen.queryByText('sign in form')).toBeNull()
  })

  it('paints nothing while auth is still resolving', () => {
    // The window the inline script cannot cover on a client-side navigation.
    // Rendering the form here and retracting it a moment later is precisely
    // the flash being removed.
    useAuthMock.mockReturnValue({ user: null, loading: true })
    render(
      <SignedOutOnly>
        <p>sign in form</p>
      </SignedOutOnly>
    )
    expect(screen.queryByText('sign in form')).toBeNull()
  })
})
