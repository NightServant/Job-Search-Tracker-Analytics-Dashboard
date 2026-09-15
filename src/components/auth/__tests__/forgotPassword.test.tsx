import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForgotPasswordFlow } from '../ForgotPasswordFlow'

/**
 * Getting back into an account: address -> code -> new password -> dashboard.
 *
 * WHAT IS WORTH ASSERTING HERE is the ORDER and the refusals, not the markup.
 * Each step exists to stop something: the address step to stop a reset email
 * being sent anywhere on request, the code step to prove the inbox, the
 * password step to stop a weak or mistyped password being saved. A flow that
 * let any of them be skipped would still look correct on screen.
 *
 * THE ENUMERATION RULE IS TESTED TOO, because it is the thing most likely to
 * be "improved" away by someone who has just seen `signUp` tell people their
 * account exists. `resetPasswordForEmail` reports success either way and this
 * flow must not claim otherwise -- a reset endpoint that says "no such user"
 * is the most-probed oracle there is.
 */

const STRONG = 'Str0ng!Passw0rd'

const props = (overrides = {}) => ({
  onRequest: vi.fn().mockResolvedValue(undefined),
  onVerify: vi.fn().mockResolvedValue(undefined),
  onSetPassword: vi.fn().mockResolvedValue(undefined),
  onDone: vi.fn(),
  ...overrides,
})

const setField = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

async function askForCode(email = 'gabe@example.com') {
  setField(/^Email/, email)
  await userEvent.click(await screen.findByRole('button', { name: 'Send the code' }))
}

async function enterCode(code = '123456') {
  await userEvent.type(await screen.findByLabelText(/^Verification code/), code)
}

// `lib/authRateLimit` counts attempts in localStorage and the count survives
// between tests in a file, so a later test's first submit is silently refused.
beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

describe('asking for a code', () => {
  it('sends one and moves to the code step', async () => {
    const p = props()
    render(<ForgotPasswordFlow {...p} />)
    await askForCode()

    expect(p.onRequest).toHaveBeenCalledWith('gabe@example.com')
    expect(await screen.findByLabelText(/^Verification code/)).toBeInTheDocument()
  })

  it('normalises the address, so Gabe@X.com and gabe@x.com are one account', async () => {
    const p = props()
    render(<ForgotPasswordFlow {...p} />)
    await askForCode('Gabe@Example.com')
    expect(p.onRequest).toHaveBeenCalledWith('gabe@example.com')
  })

  it('refuses an address it could not reach, before sending anything', async () => {
    /*
      `gabe..x@example.com` AND NOT `not-an-address`, which is the whole point
      of the test. The field is `type="email"`, so the browser refuses the
      obviously-broken one itself and the form never submits -- asserting on
      that would be asserting on jsdom's constraint validation rather than on
      this app.

      Consecutive dots in the local part pass the HTML5 email pattern and fail
      `isValidEmail`, so this exercises the layer that can actually regress.
    */
    const p = props()
    render(<ForgotPasswordFlow {...p} />)
    await askForCode('gabe..x@example.com')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(p.onRequest).not.toHaveBeenCalled()
  })

  it('never says whether the address has an account', async () => {
    // THE ENUMERATION RULE. Nothing on the way to the code step may claim the
    // address is known or unknown -- `resetPasswordForEmail` cannot tell us,
    // and an endpoint that could would be the oracle this avoids.
    render(<ForgotPasswordFlow {...props()} />)
    await askForCode()
    await screen.findByLabelText(/^Verification code/)

    // SCOPED TO THE FLOW'S OWN COLUMN, not `document.body`. The brand panel
    // beside it advertises "a demo that needs no account", which matched the
    // pattern and failed this test while the flow was behaving perfectly --
    // a false positive that would have sent the next reader hunting.
    const column = document.querySelector('[data-reset-progress]')!.parentElement!
    expect(column.textContent ?? '').not.toMatch(
      /no account|not found|does not exist|already have an account|unknown address/i
    )
  })
})

describe('the code step', () => {
  it('goes back to the address step without losing the flow', async () => {
    render(<ForgotPasswordFlow {...props()} />)
    await askForCode()
    await userEvent.click(await screen.findByText(/use a different email/i))
    expect(await screen.findByLabelText(/^Email/)).toBeInTheDocument()
  })

  it('resends through the same call that sent the first one', async () => {
    // Not a second endpoint: `resetPasswordForEmail` IS the resend, and a
    // separate one would be a second code path to keep working.
    const p = props()
    render(<ForgotPasswordFlow {...p} />)
    await askForCode()
    await screen.findByLabelText(/^Verification code/)
    await userEvent.click(screen.getByText(/resend the code/i))
    await waitFor(() => expect(p.onRequest).toHaveBeenCalledTimes(2))
  })

  it('keeps the person on the code step when the code is refused', async () => {
    const p = props({ onVerify: vi.fn().mockRejectedValue(new Error('Token has expired')) })
    render(<ForgotPasswordFlow {...p} />)
    await askForCode()
    await enterCode('000000')

    expect(await screen.findByText(/Token has expired/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Verification code/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^New password/)).toBeNull()
  })
})

describe('choosing the new password', () => {
  async function reachPasswordStep(p = props()) {
    render(<ForgotPasswordFlow {...p} />)
    await askForCode()
    await enterCode()
    await screen.findByLabelText(/^New password/)
    return p
  }

  it('is reachable only after the code verifies', async () => {
    const p = await reachPasswordStep()
    expect(p.onVerify).toHaveBeenCalledWith('gabe@example.com', '123456')
    expect(screen.getByLabelText(/^Confirm new password/)).toBeInTheDocument()
  })

  it('saves the password and leaves for the dashboard', async () => {
    const p = await reachPasswordStep()
    setField(/^New password/, STRONG)
    setField(/^Confirm new password/, STRONG)
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    await waitFor(() => expect(p.onSetPassword).toHaveBeenCalledWith(STRONG))
    expect(p.onDone).toHaveBeenCalled()
  })

  it('refuses a weak password without sending it', async () => {
    const p = await reachPasswordStep()
    setField(/^New password/, 'password')
    setField(/^Confirm new password/, 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(p.onSetPassword).not.toHaveBeenCalled()
  })

  it('refuses a mistyped confirmation, which would otherwise cost another email', async () => {
    const p = await reachPasswordStep()
    setField(/^New password/, STRONG)
    setField(/^Confirm new password/, STRONG + 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(p.onSetPassword).not.toHaveBeenCalled()
  })

  it('does not leave for the dashboard when saving fails', async () => {
    // THE ONE THAT MATTERS MOST. Navigating away on a failed save would leave
    // somebody on the dashboard believing their password had changed when it
    // had not -- and they would find out at the next sign-in.
    const p = props({ onSetPassword: vi.fn().mockRejectedValue(new Error('Password is too weak')) })
    await reachPasswordStep(p)
    setField(/^New password/, STRONG)
    setField(/^Confirm new password/, STRONG)
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText(/Password is too weak/)).toBeInTheDocument()
    expect(p.onDone).not.toHaveBeenCalled()
  })
})
