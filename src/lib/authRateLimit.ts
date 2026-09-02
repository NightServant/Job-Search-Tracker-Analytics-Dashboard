/**
 * Throttles repeated auth attempts from one browser.
 *
 * WHAT THIS IS, STATED PLAINLY: an affordance, not a boundary. It runs in the
 * client, so anyone willing to open a console or curl the auth endpoint walks
 * straight past it. This repo already draws that distinction in SQL -- "a
 * disabled button in the UI is an affordance, not a boundary" -- and the same
 * sentence applies here.
 *
 * What it genuinely stops, which is not nothing:
 *   - Double-submits and rage-clicks creating duplicate sign-up attempts.
 *   - A stuck retry loop hammering the auth server from one tab.
 *   - Casual credential-stuffing from the page itself, which is the shape most
 *     opportunistic abuse actually takes.
 *
 * What it CANNOT stop, and what must be configured server-side instead:
 *   - Scripted sign-up floods against the auth API directly. Supabase enforces
 *     its own auth rate limits (Dashboard > Authentication > Rate Limits) and
 *     supports CAPTCHA (hCaptcha or Turnstile) on sign-up and sign-in. Those
 *     are the boundary. This file is the courtesy.
 *
 * Attempts persist in localStorage rather than memory, so a reload does not
 * hand back a fresh budget -- the cheapest bypass closed for the cheapest
 * price. Storage failures (private mode, blocked cookies) fall back to
 * allowing the attempt: locking someone out of sign-in because their browser
 * refuses storage is a worse failure than a missing throttle.
 */

export interface RateLimitState {
  /** Attempt timestamps within the window, oldest first. */
  attempts: number[]
  /** When the current lockout ends, or 0. */
  lockedUntil: number
}

export interface RateLimitDecision {
  allowed: boolean
  /** Seconds until another attempt is permitted. 0 when allowed. */
  retryAfterSeconds: number
  /** Attempts left in the window before a lockout starts. */
  remaining: number
}

export const MAX_ATTEMPTS = 5
export const WINDOW_MS = 60_000
/** Lockouts escalate so a script is slowed more each time it trips the limit. */
export const LOCKOUT_STEPS_MS = [30_000, 2 * 60_000, 10 * 60_000] as const

export const EMPTY_STATE: RateLimitState = { attempts: [], lockedUntil: 0 }

/**
 * Pure decision function: does this attempt proceed, and what is the new state?
 *
 * Pure so the policy is testable at its boundaries without a clock or a
 * browser. `now` is injected for the same reason every other date function in
 * this codebase injects it.
 */
export function evaluateAttempt(
  state: RateLimitState,
  now: number,
  lockoutIndex = 0
): { decision: RateLimitDecision; next: RateLimitState } {
  if (state.lockedUntil > now) {
    return {
      decision: {
        allowed: false,
        retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
        remaining: 0,
      },
      next: state,
    }
  }

  // Drop attempts that have aged out of the window before counting.
  const attempts = state.attempts.filter((t) => now - t < WINDOW_MS)

  if (attempts.length >= MAX_ATTEMPTS) {
    const step = LOCKOUT_STEPS_MS[Math.min(lockoutIndex, LOCKOUT_STEPS_MS.length - 1)]
    const lockedUntil = now + step
    return {
      decision: {
        allowed: false,
        retryAfterSeconds: Math.ceil(step / 1000),
        remaining: 0,
      },
      // The window is cleared with the lockout: the lockout IS the penalty, and
      // keeping the old attempts would re-trip it the instant it expires.
      next: { attempts: [], lockedUntil },
    }
  }

  const next = { attempts: [...attempts, now], lockedUntil: 0 }
  return {
    decision: {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: MAX_ATTEMPTS - next.attempts.length,
    },
    next,
  }
}

/** Clears the record for a key. Called after a SUCCESSFUL sign-in. */
export function clearedState(): RateLimitState {
  return EMPTY_STATE
}

const STORAGE_PREFIX = 'worktrack.auth.attempts.'

function read(key: string): { state: RateLimitState; lockouts: number } {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return { state: EMPTY_STATE, lockouts: 0 }
    const parsed = JSON.parse(raw) as RateLimitState & { lockouts?: number }
    return {
      state: {
        attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
        lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : 0,
      },
      lockouts: typeof parsed.lockouts === 'number' ? parsed.lockouts : 0,
    }
  } catch {
    // Private mode, blocked storage, or corrupt JSON. Treated as no history --
    // see the docblock: refusing sign-in because a browser will not store is a
    // worse failure than a missing throttle.
    return { state: EMPTY_STATE, lockouts: 0 }
  }
}

function write(key: string, state: RateLimitState, lockouts: number): void {
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ ...state, lockouts })
    )
  } catch {
    /* storage unavailable; the throttle degrades to per-page-load */
  }
}

/**
 * Records an attempt for `key` and says whether it may proceed.
 *
 * `key` should identify the ACTION and not the person -- 'signup' or 'signin'
 * rather than an email address. Keying on the email would let an attacker walk
 * a list of addresses without ever tripping a limit, and would leak, through
 * timing, which addresses already have a lockout.
 */
export function takeAuthAttempt(key: string, now = Date.now()): RateLimitDecision {
  const { state, lockouts } = read(key)
  const { decision, next } = evaluateAttempt(state, now, lockouts)
  write(key, next, decision.allowed ? lockouts : lockouts + 1)
  return decision
}

/** Forgets the history for `key`. Call on a successful authentication. */
export function resetAuthAttempts(key: string): void {
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    /* nothing to do */
  }
}
