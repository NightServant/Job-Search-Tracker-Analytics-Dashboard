import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

import nextConfig from '../../next.config'

/**
 * The response headers exist, and the two that could take the app down do not.
 *
 * WHY THIS IS A TEST AND NOT A README LINE. A security header is invisible
 * when it works and invisible when it is deleted: the app behaves identically
 * either way, which is the exact property that lets one disappear in a config
 * edit and stay gone. Nothing else in this repository would notice.
 *
 * THE NEGATIVE ASSERTIONS ARE THE VALUABLE HALF, and they are here because
 * `default-src 'self'` was written into the first draft of this config and
 * WOULD HAVE BROKEN PRODUCTION. It supplies `connect-src`, and this app's
 * browser talks to Supabase for every query and every auth call, to Sentry,
 * and to jobicy.com for the remote-roles rail -- so a green build would have
 * shipped an app that could not sign anybody in. It was caught by reading
 * rather than by any gate, which is the argument for the gate.
 *
 * The same trap is one line away in both directions: adding `script-src`
 * without a nonce breaks Next's own hydration bootstrap, and
 * `script-src 'unsafe-inline'` is a directive that permits precisely what it
 * looks like it forbids. Both are asserted against.
 */
type HeaderEntry = { key: string; value: string }

async function headerMap(): Promise<Map<string, string>> {
  const rules = await nextConfig.headers!()
  const all = new Map<string, string>()
  for (const rule of rules) {
    for (const header of rule.headers as HeaderEntry[]) {
      all.set(header.key.toLowerCase(), header.value)
    }
  }
  return all
}

describe('the security response headers', () => {
  it('applies to every path, including /api', async () => {
    // nosniff and frame-ancestors matter on a JSON response too, and a rule
    // scoped to page routes would silently miss them.
    const rules = await nextConfig.headers!()
    expect(rules.some((rule) => rule.source === '/:path*')).toBe(true)
  })

  it('enforces HTTPS for long enough to matter, on subdomains too', async () => {
    const hsts = (await headerMap()).get('strict-transport-security')
    expect(hsts).toBeTruthy()
    // Two years. The preload lists require at least one, and a short max-age
    // is a header that looks like HSTS without being it -- the protection
    // lapses in whatever window an attacker waits out.
    const maxAge = Number(hsts!.match(/max-age=(\d+)/)?.[1] ?? 0)
    expect(maxAge).toBeGreaterThanOrEqual(31536000)
    expect(hsts).toContain('includeSubDomains')
  })

  it('refuses to be framed, in both the old header and the specified one', async () => {
    const headers = await headerMap()
    expect(headers.get('x-frame-options')).toBe('DENY')
    expect(headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
  })

  it('sets the directives that need no nonce and no allowlist', async () => {
    // Each of these is absolute: none has a legitimate exception in this app,
    // which is why they can be set without enumerating anything.
    const csp = (await headerMap()).get('content-security-policy')!
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain('upgrade-insecure-requests')
  })

  it('sets no default-src, which would cut the app off from Supabase', async () => {
    // THE ONE THAT NEARLY SHIPPED. `default-src` supplies `connect-src`, and
    // an app that cannot reach its own auth provider is not a hardened app.
    // If a later edit wants one, it has to add an explicit `connect-src`
    // naming Supabase, Sentry and jobicy in the same breath -- and this
    // assertion is where that conversation starts.
    const csp = (await headerMap()).get('content-security-policy')!
    expect(csp).not.toContain('default-src')
    expect(csp).not.toContain('connect-src')
  })

  it('sets no script-src rather than one with unsafe-inline in it', async () => {
    // A `script-src` without a nonce breaks Next's hydration bootstrap; one
    // with `'unsafe-inline'` permits exactly the injection it appears to stop.
    // Neither is better than the honest absence, so both are refused here.
    const csp = (await headerMap()).get('content-security-policy')!
    expect(csp).not.toContain('script-src')
    expect(csp).not.toContain('unsafe-inline')
  })

  it('stops content-type sniffing and trims the referrer', async () => {
    const headers = await headerMap()
    expect(headers.get('x-content-type-options')).toBe('nosniff')
    // An application URL carries a job id in its query string.
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
  })

  it('denies the device APIs this app never asks for', async () => {
    const policy = (await headerMap()).get('permissions-policy')!
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment']) {
      expect(policy).toContain(`${feature}=()`)
    }
  })
})

/**
 * The session really expires on the SERVER, not only in the browser.
 *
 * `jwt_expiry` is not a session lifetime and the distinction is easy to lose:
 * it is how long one access token is good for, and with refresh-token rotation
 * on, the browser renews it indefinitely. Before `[auth.sessions]` was set, a
 * session on a borrowed laptop lasted forever -- which is why "sessions
 * expire" needed more than the value that was already there.
 *
 * Asserted by reading config.toml rather than by asking Supabase: this is the
 * file `npm run push:auth-config` sends, so it is the thing that can regress
 * in a commit.
 */
describe('the Supabase auth configuration', () => {
  const config = readFileSync('supabase/config.toml', 'utf8')

  it('ends a session on a timebox and on inactivity', () => {
    const sessions = config.slice(config.indexOf('[auth.sessions]'))
    expect(sessions).toMatch(/^timebox = /m)
    expect(sessions).toMatch(/^inactivity_timeout = /m)
  })

  it('expires an emailed code in minutes rather than an hour', () => {
    // One number governs the sign-up confirmation AND the password reset, and
    // both are single-factor: whoever holds the code holds the account. An
    // hour is long enough for a forwarded email or a synced notification on a
    // second device to still be a live key.
    const otp = Number(config.match(/^otp_expiry = (\d+)/m)?.[1] ?? 0)
    expect(otp).toBeGreaterThan(0)
    expect(otp).toBeLessThanOrEqual(900)
  })

  it('keeps the server-side auth rate limits that the client cannot enforce', () => {
    // `lib/authRateLimit` is candid about being a browser affordance. These
    // are the boundary, and they are per-IP inside GoTrue.
    expect(config).toMatch(/^sign_in_sign_ups = \d+/m)
    expect(config).toMatch(/^token_verifications = \d+/m)
  })
})
