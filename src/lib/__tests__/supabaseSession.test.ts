import { describe, it, expect, beforeEach } from 'vitest'
import { clearStoredSession, sessionStorageKeyFor } from '../supabaseSession'

const URL_ = 'https://abc123.supabase.co'
const KEY = 'sb-abc123-auth-token'

function cookieNames(): string[] {
  return document.cookie
    .split(';')
    .map((c) => c.split('=')[0]?.trim())
    .filter((n): n is string => Boolean(n))
}

function wipeCookies() {
  for (const name of cookieNames()) {
    document.cookie = `${name}=; Path=/; Max-Age=0`
  }
}

beforeEach(() => {
  window.localStorage.clear()
  wipeCookies()
})

describe('sessionStorageKeyFor', () => {
  it('builds the key supabase-js actually uses', () => {
    expect(sessionStorageKeyFor(URL_)).toBe(KEY)
  })

  it('refuses a URL it cannot read a project ref out of', () => {
    // The value is interpolated into an inline script elsewhere, so an
    // unrecognised shape must produce nothing rather than something odd.
    expect(sessionStorageKeyFor('https://evil.com')).toBeNull()
    expect(sessionStorageKeyFor('not a url')).toBeNull()
  })
})

/**
 * SIGNING OUT IS THE ONE ACTION THAT MUST NOT DEPEND ON A SERVER.
 *
 * `supabase.auth.signOut()` calls the server to revoke the token and, on a 500
 * or an offline failure, returns the error WITHOUT clearing the local session
 * -- so the user is still signed in. This function is the part that cannot
 * fail, which is exactly why it now needs tests: the session moved from
 * localStorage to cookies on 2026-09-11 and the guarantee had to move with it.
 */
describe('clearStoredSession', () => {
  it('removes the session cookie, which is where the session now lives', () => {
    document.cookie = `${KEY}=abc; Path=/`
    expect(cookieNames()).toContain(KEY)

    expect(clearStoredSession(URL_)).toBe(true)
    expect(cookieNames()).not.toContain(KEY)
  })

  it('removes every chunk of a split session, not just the first', () => {
    // `@supabase/ssr` splits a large session across `.0`, `.1`. Clearing only
    // the exact key would leave the rest behind and the browser would still
    // present a partial session.
    document.cookie = `${KEY}.0=part-one; Path=/`
    document.cookie = `${KEY}.1=part-two; Path=/`

    expect(clearStoredSession(URL_)).toBe(true)
    expect(cookieNames().filter((n) => n.startsWith(KEY))).toEqual([])
  })

  it('still sweeps localStorage, so a session from before the move goes too', () => {
    // Anybody signed in before the cookie migration has a session parked in
    // localStorage. Signing out should take it with them rather than leaving
    // it in the browser indefinitely.
    window.localStorage.setItem(KEY, 'legacy-session')
    expect(clearStoredSession(URL_)).toBe(true)
    expect(window.localStorage.getItem(KEY)).toBeNull()
  })

  it('clears the PKCE verifier parked beside the session', () => {
    window.localStorage.setItem(KEY, 'x')
    window.localStorage.setItem(`${KEY}-code-verifier`, 'y')
    clearStoredSession(URL_)
    expect(window.localStorage.getItem(`${KEY}-code-verifier`)).toBeNull()
  })

  it('reports nothing removed when there was nothing to remove', () => {
    // The caller distinguishes "cleaned up" from "there was nothing there".
    expect(clearStoredSession(URL_)).toBe(false)
  })

  it('leaves cookies belonging to anything else alone', () => {
    document.cookie = 'theme=dark; Path=/'
    document.cookie = `${KEY}=abc; Path=/`
    clearStoredSession(URL_)
    expect(cookieNames()).toContain('theme')
  })
})
