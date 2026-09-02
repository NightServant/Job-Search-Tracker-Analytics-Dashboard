import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignUpFlow } from '../SignUpFlow'

const STRONG = 'Str0ng!Passw0rd'

function setup(overrides: Partial<React.ComponentProps<typeof SignUpFlow>> = {}) {
  const props = {
    onSignUp: vi.fn().mockResolvedValue(undefined),
    onVerify: vi.fn().mockResolvedValue(undefined),
    onResend: vi.fn().mockResolvedValue(undefined),
    onProvider: vi.fn().mockResolvedValue(undefined),
    onDone: vi.fn(),
    doneDelayMs: 10,
    ...overrides,
  }
  render(<SignUpFlow {...props} />)
  return props
}

async function fillDetails(email = 'Gabe@Example.com', password = STRONG, confirm = password) {
  await userEvent.type(screen.getByLabelText(/^Email/), email)
  await userEvent.type(screen.getByLabelText(/^Password/), password)
  await userEvent.type(screen.getByLabelText(/^Confirm password/), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

describe('the registration progress bar', () => {
  it('names the three steps and marks the first as current', () => {
    setup()
    const bar = document.querySelector('[data-registration-progress]')!
    expect(bar).toBeInTheDocument()
    const steps = [...bar.querySelectorAll('[data-step]')].map((s) => s.getAttribute('data-step'))
    expect(steps).toEqual(['your details', 'verify', 'done'])
    // Scoped to [data-step], not a bare [data-state]: the icon row above the
    // track carries a state too, so an unscoped query returns whichever row
    // happens to come first in the DOM.
    expect(
      bar.querySelector('[data-step][data-state="current"]')?.getAttribute('data-step')
    ).toBe('your details')
  })

  it('carries an icon per step, above the track', async () => {
    setup()
    const bar = document.querySelector('[data-registration-progress]')!
    const icons = [...bar.querySelectorAll('[data-step-icon]')]
    expect(icons.map((i) => i.getAttribute('data-step-icon'))).toEqual([
      'your details',
      'verify',
      'done',
    ])
    // Each one renders a real glyph rather than an empty span reserving space.
    expect(icons.every((i) => i.querySelector('svg') !== null)).toBe(true)

    // ABOVE the track, which is the half of the request that is about
    // position. compareDocumentPosition is the order the DOM actually has,
    // not the order the source happens to read in.
    const track = bar.querySelector('[data-progress-fill]')!.parentElement!
    expect(icons[0].compareDocumentPosition(track) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
  })

  it('centres each icon over its own label rather than hugging an edge', () => {
    // justify-between put the first glyph on the container's left edge and the
    // last on its right, while the labels beneath them are several times
    // wider -- so an 18px icon sat at the corner of its label, not over it.
    // The fix is one shared column model, asserted here as: both rows are
    // grids with the SAME template, and the content of each cell is centred.
    setup()
    const bar = document.querySelector('[data-registration-progress]')!
    const iconRow = bar.querySelector('[data-progress-icons]') as HTMLElement
    const labelRow = bar.querySelector('ol') as HTMLElement

    expect(iconRow.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
    expect(labelRow.style.gridTemplateColumns).toBe(iconRow.style.gridTemplateColumns)
    expect(iconRow.className).not.toContain('justify-between')
    expect(labelRow.className).not.toContain('justify-between')
    expect((iconRow.firstElementChild as HTMLElement).className).toContain('justify-center')
    expect((labelRow.firstElementChild as HTMLElement).className).toContain('text-center')
  })

  it('keeps each icon in the same state as its own label', async () => {
    // Two rows rendered from one list is how they drift: an icon row still
    // showing step one while the labels have moved on says nothing useful.
    setup()
    const bar = () => document.querySelector('[data-registration-progress]')!
    const stateOf = (sel: string) =>
      [...bar().querySelectorAll(sel)].map((n) => n.getAttribute('data-state'))

    expect(stateOf('[data-step-icon]')).toEqual(stateOf('[data-step]'))

    await fillDetails()
    await waitFor(() =>
      expect(stateOf('[data-step-icon]')).toEqual(['done', 'current', 'todo'])
    )
    expect(stateOf('[data-step-icon]')).toEqual(stateOf('[data-step]'))
  })

  it('advances as the person moves through the flow', async () => {
    setup()
    const fill = () => document.querySelector('[data-progress-fill]') as HTMLElement
    expect(fill().style.width).toBe('0%')

    await fillDetails()
    await waitFor(() => expect(fill().style.width).toBe('50%'))
  })
})

describe('the password requirements checklist', () => {
  it('is on the form before anything is typed, not revealed by touching the field', () => {
    // This asserted the OPPOSITE until 2026-09-02 -- the list hid until the
    // field was touched. Gabe overruled it: the rules are worth most while
    // someone is still deciding what to type, which is before they reach the
    // field at all.
    setup()
    const list = document.querySelector('[data-password-requirements]')
    expect(list).not.toBeNull()
    expect(list!.querySelectorAll('[data-requirement]')).toHaveLength(6)
  })

  it('shows every rule at once, unmet, rather than revealing them as they break', () => {
    // Revealing rules one at a time turns one decision into a guessing game.
    setup()
    const list = document.querySelector('[data-password-requirements]')!
    expect(list.querySelectorAll('[data-requirement]')).toHaveLength(6)
    expect(list.querySelectorAll('[data-met="true"]')).toHaveLength(0)
  })

  it('ticks each rule as it is met, live', async () => {
    setup()
    await userEvent.type(screen.getByLabelText(/^Password/), 'abc')
    const met = () => document.querySelectorAll('[data-requirement][data-met="true"]').length
    expect(met()).toBeGreaterThan(0)

    await userEvent.type(screen.getByLabelText(/^Password/), 'DEF123!x')
    await waitFor(() => expect(met()).toBe(6))
  })
})

describe('registration validation, before anything leaves the browser', () => {
  it('refuses an unreachable address without calling the server', async () => {
    const props = setup()
    await fillDetails('not-an-email')
    expect(await screen.findByText(/does not look like an email/i)).toBeInTheDocument()
    expect(props.onSignUp).not.toHaveBeenCalled()
  })

  it('refuses a weak password without calling the server', async () => {
    // Every request not sent is a row the auth server does not have to reject.
    const props = setup()
    await fillDetails('a@b.co', 'weakpass')
    expect(await screen.findByText(/does not meet every requirement/i)).toBeInTheDocument()
    expect(props.onSignUp).not.toHaveBeenCalled()
  })

  it('refuses mismatched passwords without calling the server', async () => {
    const props = setup()
    await fillDetails('a@b.co', STRONG, `${STRONG}x`)
    expect(await screen.findByText('Those passwords do not match.')).toBeInTheDocument()
    expect(props.onSignUp).not.toHaveBeenCalled()
  })

  it('normalises the email before submitting it', async () => {
    // The duplicate-account fix: Gabe@Example.com and gabe@example.com must
    // reach the auth server as one identity, or case permutations of a single
    // address become many rows for one person.
    const props = setup()
    await fillDetails('  Gabe@Example.COM  ')
    await waitFor(() => expect(props.onSignUp).toHaveBeenCalledWith('gabe@example.com', STRONG))
  })
})

describe('registration rate limiting', () => {
  it('stops submitting once the attempt budget is spent', async () => {
    // An affordance rather than a boundary -- the server-side limits are the
    // real control -- but it does stop a stuck retry loop and rage-clicks.
    const props = setup({ onSignUp: vi.fn().mockRejectedValue(new Error('nope')) })
    for (let i = 0; i < 6; i += 1) {
      // EVERY field is cleared each round. Clearing only the email lets the
      // password field accumulate, and six copies of a 15-character password
      // is 90 characters -- which trips the bcrypt 72-byte check first and
      // means the rate limiter is never reached. The test would then pass or
      // fail for a reason unrelated to what it is named after.
      await userEvent.clear(screen.getByLabelText(/^Email/))
      await userEvent.clear(screen.getByLabelText(/^Password/))
      await userEvent.clear(screen.getByLabelText(/^Confirm password/))
      await fillDetails('a@b.co')
    }
    expect(await screen.findByText(/Too many attempts/i)).toBeInTheDocument()
    // Five got through, the sixth was refused locally.
    expect((props.onSignUp as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(5)
  })
})

describe('the verification step', () => {
  it('shows the address the code went to', async () => {
    setup()
    await fillDetails()
    expect(await screen.findByText('gabe@example.com')).toBeInTheDocument()
  })

  it('verifies the code and then thanks the person', async () => {
    const props = setup()
    await fillDetails()
    await userEvent.type(await screen.findByLabelText(/^Verification code/), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }))

    await waitFor(() =>
      expect(props.onVerify).toHaveBeenCalledWith('gabe@example.com', '123456')
    )
    expect(await screen.findByText('you are all set')).toBeInTheDocument()
  })

  it('keeps digits only, so a pasted code with stray characters still works', async () => {
    setup()
    await fillDetails()
    const field = (await screen.findByLabelText(/^Verification code/)) as HTMLInputElement
    await userEvent.type(field, 'a1b2c3d4e5f6g7')
    expect(field.value).toBe('123456')
  })

  it('surfaces a rejected code without losing the step', async () => {
    setup({ onVerify: vi.fn().mockRejectedValue(new Error('Token has expired or is invalid')) })
    await fillDetails()
    await userEvent.type(await screen.findByLabelText(/^Verification code/), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }))
    expect(await screen.findByText(/Token has expired/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Verification code/)).toBeInTheDocument()
  })
})

describe('the thank-you step', () => {
  it('leaves for the dashboard on its own, and offers a link in case it does not', async () => {
    const props = setup()
    await fillDetails()
    await userEvent.type(await screen.findByLabelText(/^Verification code/), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }))

    expect(await screen.findByText('you are all set')).toBeInTheDocument()
    // The manual way out: an automatic navigation that fails silently would
    // otherwise strand someone on a thank-you page.
    expect(screen.getByRole('link', { name: /go to the dashboard now/i })).toHaveAttribute(
      'href',
      '/dashboard'
    )
    await waitFor(() => expect(props.onDone).toHaveBeenCalled())
  })
})

describe('the faster options', () => {
  it('sits below the manual form, not above it', () => {
    // Gabe's 2026-09-02 ruling, from a reference layout: the email and
    // password fields come first, then the divider, then the providers.
    // Asserted on DOM ORDER rather than on a class or a wrapper, because the
    // order is the whole request -- a flex-col-reverse that looked right would
    // still read wrong to a screen reader and to the keyboard.
    setup()
    const email = screen.getByLabelText(/^Email/)
    const submit = screen.getByRole('button', { name: 'Create account' })
    const providers = document.querySelector('[data-oauth-buttons]')!

    expect(email.compareDocumentPosition(providers) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
    expect(submit.compareDocumentPosition(providers) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
  })

  it('offers the providers Supabase can actually serve', async () => {
    const props = setup()
    const buttons = document.querySelectorAll('[data-oauth-buttons] [data-provider]')
    expect([...buttons].map((b) => b.getAttribute('data-provider'))).toEqual([
      'google',
      'github',
    ])
    await userEvent.click(screen.getByRole('button', { name: /Continue with Google/i }))
    expect(props.onProvider).toHaveBeenCalledWith('google')
  })
})
