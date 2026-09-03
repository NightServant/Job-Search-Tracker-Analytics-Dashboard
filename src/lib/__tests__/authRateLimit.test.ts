import { describe, it, expect } from 'vitest'
import {
  evaluateAttempt,
  EMPTY_STATE,
  MAX_ATTEMPTS,
  WINDOW_MS,
  LOCKOUT_STEPS_MS,
  type RateLimitState,
} from '../authRateLimit'

const T0 = 1_000_000

function runAttempts(count: number, startAt = T0, gap = 100) {
  let state: RateLimitState = EMPTY_STATE
  let last = { allowed: true, retryAfterSeconds: 0, remaining: MAX_ATTEMPTS }
  for (let i = 0; i < count; i += 1) {
    const out = evaluateAttempt(state, startAt + i * gap)
    state = out.next
    last = out.decision
  }
  return { state, last }
}

describe('evaluateAttempt within the budget', () => {
  it('allows attempts up to the cap and counts down what is left', () => {
    const { last } = runAttempts(1)
    expect(last.allowed).toBe(true)
    expect(last.remaining).toBe(MAX_ATTEMPTS - 1)

    const { last: fifth } = runAttempts(MAX_ATTEMPTS)
    expect(fifth.allowed).toBe(true)
    expect(fifth.remaining).toBe(0)
  })
})

describe('evaluateAttempt past the budget', () => {
  it('locks out on the attempt after the cap', () => {
    const { state } = runAttempts(MAX_ATTEMPTS)
    const { decision } = evaluateAttempt(state, T0 + 1000)
    expect(decision.allowed).toBe(false)
    expect(decision.retryAfterSeconds).toBe(LOCKOUT_STEPS_MS[0] / 1000)
  })

  it('keeps refusing until the lockout expires, then allows again', () => {
    const { state } = runAttempts(MAX_ATTEMPTS)
    const locked = evaluateAttempt(state, T0 + 1000).next
    expect(locked.lockedUntil).toBeGreaterThan(T0)

    // One second before it lifts.
    expect(evaluateAttempt(locked, locked.lockedUntil - 1000).decision.allowed).toBe(false)
    // And after.
    expect(evaluateAttempt(locked, locked.lockedUntil + 1).decision.allowed).toBe(true)
  })

  it('clears the window with the lockout, so it does not re-trip instantly', () => {
    // The lockout IS the penalty. Keeping the old attempts would refuse the
    // very first try after it expires, which reads as the limit being broken.
    const { state } = runAttempts(MAX_ATTEMPTS)
    const locked = evaluateAttempt(state, T0 + 1000).next
    expect(locked.attempts).toEqual([])

    const after = evaluateAttempt(locked, locked.lockedUntil + 1)
    expect(after.decision.allowed).toBe(true)
    expect(after.decision.remaining).toBe(MAX_ATTEMPTS - 1)
  })

  it('escalates the lockout each time it is tripped', () => {
    // A script that waits out the first lockout should be slowed more, not the
    // same amount, on its next run.
    const { state } = runAttempts(MAX_ATTEMPTS)
    const first = evaluateAttempt(state, T0 + 1000, 0).decision
    const second = evaluateAttempt(state, T0 + 1000, 1).decision
    const third = evaluateAttempt(state, T0 + 1000, 2).decision
    expect(second.retryAfterSeconds).toBeGreaterThan(first.retryAfterSeconds)
    expect(third.retryAfterSeconds).toBeGreaterThan(second.retryAfterSeconds)
  })

  it('does not escalate past the last step', () => {
    const { state } = runAttempts(MAX_ATTEMPTS)
    const capped = evaluateAttempt(state, T0 + 1000, 99).decision
    expect(capped.retryAfterSeconds).toBe(
      LOCKOUT_STEPS_MS[LOCKOUT_STEPS_MS.length - 1] / 1000
    )
  })
})

describe('evaluateAttempt window expiry', () => {
  it('forgets attempts that have aged out, so slow retries are never punished', () => {
    // Someone mistyping a password once an hour is not an attack, and a
    // counter that never forgets would eventually lock out a real person.
    const { state } = runAttempts(MAX_ATTEMPTS)
    // Past the window measured from the LAST attempt, not the first. The
    // attempts are spaced 100ms apart, so WINDOW_MS + 1 from T0 still leaves
    // four of the five inside the window -- an off-by-a-gap that made an
    // earlier version of this test assert the wrong number.
    const lastAttempt = state.attempts[state.attempts.length - 1]
    const out = evaluateAttempt(state, lastAttempt + WINDOW_MS + 1)
    expect(out.decision.allowed).toBe(true)
    expect(out.decision.remaining).toBe(MAX_ATTEMPTS - 1)
  })

  it('counts only the attempts inside the window', () => {
    const state: RateLimitState = {
      attempts: [T0 - WINDOW_MS - 5000, T0 - WINDOW_MS - 1, T0 - 100],
      lockedUntil: 0,
    }
    const out = evaluateAttempt(state, T0)
    // Two aged out; one survives, plus this attempt.
    expect(out.next.attempts).toHaveLength(2)
    expect(out.decision.allowed).toBe(true)
  })
})
