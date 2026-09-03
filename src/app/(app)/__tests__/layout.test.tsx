import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import AppLayout from '../layout'

const useAuthMock = vi.hoisted(() => vi.fn())
const replaceMock = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/AuthContext', () => ({ useAuth: useAuthMock }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

beforeEach(() => {
  replaceMock.mockClear()
  useAuthMock.mockReset()
})

describe('the authenticated shell guard', () => {
  it('sends a signed-out visitor to the sign-in form', () => {
    // The guard's actual job: somebody who asked for a private page without a
    // session gets the sign-in form, not an empty frame.
    useAuthMock.mockReturnValue({ user: null, loading: false, signingOut: false })
    render(<AppLayout>x</AppLayout>)
    expect(replaceMock).toHaveBeenCalledWith('/login')
  })

  it('waits for the session to resolve before deciding', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true, signingOut: false })
    render(<AppLayout>x</AppLayout>)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('does not redirect a signed-in visitor', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' }, loading: false, signingOut: false })
    render(<AppLayout>x</AppLayout>)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('stands aside while a sign-out is in flight', () => {
    // THE BUG THIS EXISTS FOR, reported from the deployed app on 2026-09-03:
    // signing out from /settings landed on /login instead of the home page.
    //
    // Both redirects fire. The settings page calls replace('/') the moment
    // signOut() resolves; a beat later onAuthStateChange sets user to null,
    // this layout re-renders, and its effect calls replace('/login') while it
    // is still mounted. The guard runs second, so the guard wins.
    //
    // The two events are not the same event. A guard rejection means "you
    // asked for a private page without a session", and /login is right. A
    // sign-out means "you chose to leave", and being handed a sign-in form
    // reads as the app refusing to let go. Only intent separates them, so
    // intent is what the flag carries.
    useAuthMock.mockReturnValue({ user: null, loading: false, signingOut: true })
    render(<AppLayout>x</AppLayout>)
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
