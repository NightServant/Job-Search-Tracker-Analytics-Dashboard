import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * The thank-you screen survives the session it just created.
 *
 * THIS IS THE TEST THAT WAS MISSING, and its absence is the whole story.
 * `SignUpFlow` has had a third step since it was written -- a success screen
 * that holds for 2.5s and then leaves for /dashboard -- and it was covered by
 * tests that passed. Those tests mounted `SignUpFlow` DIRECTLY. In a browser
 * the flow renders inside the (auth) layout, which mounts two guards, and
 * verifying the code creates a session that makes both of them act at once:
 * `SignedInRedirect` navigates away and `SignedOutOnly` returns null. The step
 * never got a frame. Gabe, 2026-09-15: "there is no auth layout thank you page
 * before dashboard."
 *
 * So the unit under test here is deliberately the COMPOSITION -- layout plus
 * route -- because every piece was individually correct and the defect lived
 * only in how they met. A test of either half alone would still pass today
 * with the fix reverted.
 *
 * `user` FLIPS FROM null TO A SESSION mid-test, which is the event that broke
 * it. A fixed `user: null` would sail through against the old code too.
 */

const replace = vi.fn()
const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}))

const verifySignUpOtp = vi.fn()
let signedIn = false
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: signedIn ? { id: 'u1', email: 'gabe@example.com' } : null,
    session: null,
    loading: false,
    signIn: vi.fn(),
    // Verifying is what creates the session, so the mock does both -- that
    // ordering is the entire bug.
    signUp: vi.fn().mockResolvedValue(undefined),
    verifySignUpOtp,
    resendSignUpOtp: vi.fn(),
    signOut: vi.fn(),
  }),
}))

import AuthLayout from '../layout'
import SignupRoute from '../signup/page'

beforeEach(() => {
  vi.clearAllMocks()
  signedIn = false
  verifySignUpOtp.mockImplementation(async () => {
    signedIn = true
  })
})

const renderRoute = () =>
  render(
    <AuthLayout>
      <SignupRoute />
    </AuthLayout>
  )

async function reachTheCodeStep() {
  await userEvent.type(screen.getByLabelText(/^Email/), 'gabe@example.com')
  await userEvent.type(screen.getByLabelText(/^Password/), 'Hunter22!pass')
  await userEvent.type(screen.getByLabelText(/^Confirm password/), 'Hunter22!pass')
  await userEvent.click(screen.getByRole('button', { name: /create account/i }))
  return screen.findByLabelText(/^Verification code/)
}

describe('signing up inside the real auth layout', () => {
  it('shows the thank-you after the code verifies, instead of vanishing', async () => {
    renderRoute()
    const field = await reachTheCodeStep()
    await userEvent.type(field, '123456')

    await waitFor(() => expect(verifySignUpOtp).toHaveBeenCalled())
    // THE ASSERTION. Against the old code this is absent: SignedOutOnly has
    // already returned null for the whole subtree.
    expect(await screen.findByText('you are all set')).toBeInTheDocument()
  })

  it('does not let the layout redirect out from under it', async () => {
    renderRoute()
    const field = await reachTheCodeStep()
    await userEvent.type(field, '123456')

    await screen.findByText('you are all set')
    // The flow owns the navigation now, on its own delay. A replace() here
    // would mean the guard fired anyway and the screen is about to be lost.
    expect(replace).not.toHaveBeenCalled()
  })

  it('still offers a way out if the automatic redirect never happens', async () => {
    renderRoute()
    const field = await reachTheCodeStep()
    await userEvent.type(field, '123456')

    await screen.findByText('you are all set')
    expect(screen.getByRole('link', { name: /go to the dashboard now/i })).toHaveAttribute(
      'href',
      '/dashboard'
    )
  })

  it('leaves the guards armed on the steps before the thank-you', async () => {
    // The hold is for ONE screen. If a session appears while the credentials
    // form is open -- another tab signing in -- the guard must still act, or
    // this becomes a permanent hole rather than a pause.
    const view = renderRoute()
    await screen.findByLabelText(/^Email/)

    // An explicit rerender, because `useAuth` here is a module-level flag: a
    // guard mounted as a SIBLING of the page will not re-run just because the
    // page's own state changed. In a browser the context update does this.
    signedIn = true
    view.rerender(
      <AuthLayout>
        <SignupRoute />
      </AuthLayout>
    )
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'))
  })
})
