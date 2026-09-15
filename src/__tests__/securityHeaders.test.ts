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
 * What the auth configuration actually promises, including where it cannot.
 *
 * `jwt_expiry` IS NOT A SESSION LIFETIME and the distinction is the reason
 * this block exists: it is how long one access token is good for, and with
 * refresh-token rotation on, the browser renews it indefinitely. So "sessions
 * expire" needs more than the value that was already there.
 *
 * IT STILL DOES, because the thing that would supply it -- `[auth.sessions]`
 * -- is a Pro feature and this project is on the free tier. The push returns
 * 402. The first test below therefore checks the honest state rather than the
 * intended one, and says so loudly enough that a green run is not mistaken for
 * a solved problem.
 *
 * Asserted by reading config.toml rather than by asking Supabase: this is the
 * file `npm run push:auth-config` sends, so it is the thing that can regress
 * in a commit.
 */
describe('the Supabase auth configuration', () => {
  const config = readFileSync('supabase/config.toml', 'utf8')

  it('either times sessions out, or records why it cannot', () => {
    /*
      THIS ASSERTED A TIMEBOX UNTIL 2026-09-15, WHEN THE PUSH CAME BACK 402:

        {"message":"User sessions can only be configured on Pro Plans and up."}

      Server-side session expiry is a paid feature, and this project is on the
      free tier. The block had to be commented out -- `config push` sends the
      whole file in one request, so it was not failing alone, it was taking the
      Brevo SMTP switch, the site_url and the OTP expiry down with it.

      WHY THE TEST DID NOT SIMPLY GO AWAY. Deleting it would delete the only
      executable record that this is unfinished, and "sessions expire" is a
      line in the security brief. So it now accepts EITHER state and checks the
      one that is true: live, and both keys are set; or disabled, and the file
      says it is a plan limit rather than an oversight. On the day the project
      moves to Pro, uncommenting makes the first branch true and the assertions
      about both keys come back automatically.

      WHAT IS REALLY LOST, so nobody reads a green test as a working feature:
      nothing ends a session on the server. `jwt_expiry` rotates an access
      token hourly and refresh rotation continues indefinitely, so a session on
      a stolen laptop lives until someone signs out. No client code can close
      that -- a timeout the client enforces is one that anyone who does not run
      the client skips.
    */
    const live = /^\[auth\.sessions\]/m.test(config)
    if (live) {
      const sessions = config.slice(config.search(/^\[auth\.sessions\]/m))
      expect(sessions).toMatch(/^timebox = /m)
      expect(sessions).toMatch(/^inactivity_timeout = /m)
      return
    }
    // Disabled: the reason has to be in the file, not only in a commit.
    expect(config, 'sessions are off with no explanation').toMatch(/402/)
    expect(config).toMatch(/Pro Plans/)
    expect(config, 'the way back has to be written down').toMatch(/# timebox = /)
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
