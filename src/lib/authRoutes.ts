/**
 * Which routes need a session, which refuse one, and where each sends you.
 *
 * A PURE FUNCTION, DELIBERATELY. The middleware around it does cookie work and
 * a network call to Supabase, neither of which is testable at speed; the
 * DECISION is a string and a boolean in, a destination or null out. Every rule
 * below is covered by a unit test, which is not true of anything that has to
 * be exercised through a real request.
 *
 * THREE KINDS OF ROUTE:
 *
 *   PRIVATE   -- the signed-in app. No session means /login, and the path that
 *                was asked for rides along as `?next=` so the sign-in can put
 *                the visitor where they were going rather than on a dashboard
 *                they did not ask for.
 *   AUTH-ONLY -- /login and /signup. A session means /dashboard: a form whose
 *                only honest outcome is to put you back where you already are
 *                is not worth showing.
 *   PUBLIC    -- everything else, including `/` and `/privacy`, which a
 *                signed-in person has an ordinary reason to read.
 *
 * `/` IS NOT REDIRECTED HERE, and that is a deliberate carry-over rather than
 * an omission. It is a static marketing route whose traffic is overwhelmingly
 * signed out; sending signed-in visitors to the dashboard is still wanted, but
 * doing it in middleware would make the page dynamic for everyone and cost
 * every anonymous visitor the static render. It stays a client-side redirect.
 */

/** Everything under these prefixes requires a session. */
const PRIVATE_PREFIXES = [
  '/dashboard',
  '/applications',
  '/calendar',
  '/documents',
  '/cv',
  '/analytics',
  '/settings',
] as const

/** These exist to get you a session, so holding one makes them pointless. */
const AUTH_ONLY = ['/login', '/signup'] as const

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * An app-relative path safe to send someone back to after signing in.
 *
 * THE OPEN-REDIRECT GUARD, and it is the reason this is a function rather than
 * a template string. `?next=` is attacker-controllable by construction -- it is
 * in a URL somebody can send you -- so `//evil.com` and `https://evil.com`,
 * both of which browsers happily treat as absolute, are refused. Only a single
 * leading slash followed by ordinary path characters survives.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/')) return null
  // `//host` and `/\host` are protocol-relative in enough browsers to matter.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null
  if (!/^\/[A-Za-z0-9/_\-.~%?&=+]*$/.test(raw)) return null
  return raw
}

export interface RouteDecision {
  /** Where to send them, or null to let the request through. */
  redirectTo: string | null
}

/**
 * The whole rule, in one place.
 *
 * `pathname` is the path being requested; `signedIn` is whether the cookies
 * carried a session Supabase accepted. Nothing else is consulted -- a decision
 * that depended on a header or a body would be a decision this could not test.
 */
export function decideRoute(
  pathname: string,
  signedIn: boolean,
  search = ''
): RouteDecision {
  if (isPrivatePath(pathname) && !signedIn) {
    // The destination travels with them, so signing in finishes the journey
    // they started rather than dropping them on the dashboard.
    const next = encodeURIComponent(`${pathname}${search}`)
    return { redirectTo: `/login?next=${next}` }
  }

  if (isAuthOnlyPath(pathname) && signedIn) {
    return { redirectTo: '/dashboard' }
  }

  return { redirectTo: null }
}
