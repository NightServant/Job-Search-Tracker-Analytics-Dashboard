import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OtpStep } from '../OtpStep'

/**
 * One click sends one code.
 *
 * FROM THE AUTH LOGS, NOT FROM A REVIEW. On 2026-09-15 the project's GoTrue
 * logs showed five `/resend` calls inside one second and two more a minute
 * later, all 200. The button was disabled only by the VERIFY busy flag, so a
 * second click while the first request was still open went straight through.
 *
 * WHY IT MATTERS MORE THAN IT LOOKS: `[auth.rate_limit] email_sent = 30` is
 * per PROJECT per hour, not per person. One person clicking through a delivery
 * lag can spend a quarter of the hour's budget, and the cost lands on whoever
 * signs up next -- they get no code at all, which is indistinguishable from
 * the bug that provoked the clicking.
 */

const setup = () => {
  const onResend = vi.fn().mockResolvedValue(undefined)
  render(<OtpStep email="a@b.test" onVerify={vi.fn()} onResend={onResend} onBack={vi.fn()} />)
  return { onResend, button: () => screen.getByTestId('resend') }
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => vi.useRealTimers())

describe('the resend link', () => {
  it('sends once however fast it is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onResend = vi.fn().mockResolvedValue(undefined)
    render(<OtpStep email="a@b.test" onVerify={vi.fn()} onResend={onResend} onBack={vi.fn()} />)
    const button = screen.getByText(/resend the code/i)

    // THE ASSERTION THAT WOULD HAVE CAUGHT IT. Before the guard, five clicks
    // were five emails.
    await user.click(button)
    await user.click(button)
    await user.click(button)
    expect(onResend).toHaveBeenCalledTimes(1)
  })

  it('counts down, then allows another', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onResend = vi.fn().mockResolvedValue(undefined)
    render(<OtpStep email="a@b.test" onVerify={vi.fn()} onResend={onResend} onBack={vi.fn()} />)

    await user.click(screen.getByText(/resend the code/i))
    // The wait is SHOWN, not just enforced. A dead link with no explanation
    // is the thing people click at.
    expect(screen.getByText(/resend in \d+s/)).toBeInTheDocument()

    // ONE SECOND AT A TIME, because that is how the countdown runs: each tick
    // is a setTimeout scheduled by the effect that the previous tick's state
    // change re-ran. Jumping 31s in a single advance fires the first timer and
    // finds no second one waiting, so the count stops at 29 -- a test artifact,
    // not a bug in the component.
    for (let i = 0; i < 31; i += 1) {
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })
    }
    expect(screen.getByText(/resend the code/i)).toBeInTheDocument()
    await user.click(screen.getByText(/resend the code/i))
    expect(onResend).toHaveBeenCalledTimes(2)
  })

  it('does not make you wait after a send that failed', async () => {
    // Nothing was sent, so nothing was spent. A cooldown here would punish
    // somebody for the server's problem.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onResend = vi.fn().mockRejectedValue(new Error('SMTP refused'))
    render(<OtpStep email="a@b.test" onVerify={vi.fn()} onResend={onResend} onBack={vi.fn()} />)

    await user.click(screen.getByText(/resend the code/i))
    expect(screen.getByText(/SMTP refused/)).toBeInTheDocument()
    expect(screen.getByText(/resend the code/i)).toBeInTheDocument()
    await user.click(screen.getByText(/resend the code/i))
    expect(onResend).toHaveBeenCalledTimes(2)
  })
})
