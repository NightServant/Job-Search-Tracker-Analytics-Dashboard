import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignUpFlow } from '../SignUpFlow'
import { ExistingAccountError } from '@/lib/existingAccount'

/**
 * Signing up with an address that already has an account.
 *
 * THE DEAD END THIS CLOSES. Supabase answers that request with HTTP 200, no
 * error, and a user object carrying a decoy id -- deliberately, because an
 * endpoint that says "taken" lets anyone probe a user table one address at a
 * time. The cost is paid by the honest case: the flow advanced to "check your
 * email", no email was ever sent because there is nothing to confirm, and the
 * person waited, resent, and concluded the app was broken.
 *
 * WHAT IS ASSERTED IS THE BEHAVIOUR, NOT THE DETECTION. Whether the tell is
 * `identities: []` or something else is Supabase's business and could change;
 * `AuthContext` owns reading it and throwing `ExistingAccountError`. What must
 * not change is that the flow STOPS, says so, and offers the way out.
 */

const props = (overrides = {}) => ({
  onSignUp: vi.fn().mockResolvedValue(undefined),
  onVerify: vi.fn(),
  onResend: vi.fn(),
  onDone: vi.fn(),
  ...overrides,
})

const STRONG = 'Str0ng!Passw0rd'

/** `fireEvent.change` and `findByRole`, matching SignUpFlow.test's helper --
 *  the submit carries a spinner between a rejected attempt and the next one,
 *  and `getByRole` misses it in that frame on a slower runner. */
async function fillAndSubmit(email = 'gabe@example.com') {
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: STRONG } })
  fireEvent.change(screen.getByLabelText(/^Confirm password/), { target: { value: STRONG } })
  await userEvent.click(await screen.findByRole('button', { name: 'Create account' }))
}

// `lib/authRateLimit` counts attempts in localStorage, and the count SURVIVES
// between tests in a file -- so a later test's first submit is silently the
// fifth and is refused before `onSignUp` is ever called. That is what made the
// last two tests here fail with the component working correctly.
beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

describe('signing up with an address that already has an account', () => {
  it('says so, instead of asking for a code that will never arrive', async () => {
    const p = props({ onSignUp: vi.fn().mockRejectedValue(new ExistingAccountError()) })
    render(<SignUpFlow {...p} />)
    await fillAndSubmit()

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent(/already have an account/i)
    // The address is echoed back IN THE NOTICE, so somebody who typed a second
    // address by mistake can see WHICH one is already registered. Scoped with
    // `within`, because the same string is also sitting in the email field.
    expect(within(notice).getByText('gabe@example.com')).toBeInTheDocument()
  })

  it('does not advance to the code step', async () => {
    // THE ASSERTION THAT MATTERS MOST. Before this, the flow moved on and
    // parked the person in front of a field for a code that does not exist.
    const p = props({ onSignUp: vi.fn().mockRejectedValue(new ExistingAccountError()) })
    render(<SignUpFlow {...p} />)
    await fillAndSubmit()

    await screen.findByText(/already have an account/i)
    expect(screen.queryByLabelText(/^Verification code/)).toBeNull()
    expect(p.onVerify).not.toHaveBeenCalled()
  })

  it('offers a way out that the app can actually honour', async () => {
    // A bare /login. The first draft linked to `/login?email=…` and to a
    // password reset; AuthScreen reads no `email` param and this app has no
    // reset flow, so both were promises the next page does not keep.
    const p = props({ onSignUp: vi.fn().mockRejectedValue(new ExistingAccountError()) })
    render(<SignUpFlow {...p} />)
    await fillAndSubmit()

    const link = await screen.findByRole('link', { name: /sign in instead/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('is not painted as a failure, because nothing failed', async () => {
    const p = props({ onSignUp: vi.fn().mockRejectedValue(new ExistingAccountError()) })
    const { container } = render(<SignUpFlow {...p} />)
    await fillAndSubmit()

    const alert = await waitFor(() => container.querySelector('[data-existing-account]')!)
    expect(alert).toBeTruthy()
    // The destructive variant says "you did something wrong". Having an
    // account is not doing something wrong.
    expect(alert.className).not.toMatch(/destructive/)
  })

  it('clears on the next attempt, so a corrected address is not shadowed', async () => {
    // Retry with a different address must not leave the old notice standing:
    // it names an address, and a stale one points at the wrong account.
    const onSignUp = vi
      .fn()
      .mockRejectedValueOnce(new ExistingAccountError())
      .mockResolvedValueOnce(undefined)
    render(<SignUpFlow {...props({ onSignUp })} />)
    await fillAndSubmit()
    await screen.findByText(/already have an account/i)

    await fillAndSubmit('new@example.com')

    expect(await screen.findByLabelText(/^Verification code/)).toBeInTheDocument()
    expect(screen.queryByText(/already have an account/i)).toBeNull()
  })

  it('leaves every other failure rendered as the plain message it is', async () => {
    // The special case must stay special. A network failure is not an
    // invitation to sign in.
    const p = props({ onSignUp: vi.fn().mockRejectedValue(new Error('Network unreachable')) })
    render(<SignUpFlow {...p} />)
    await fillAndSubmit()

    expect(await screen.findByText('Network unreachable')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sign in instead/i })).toBeNull()
  })
})
