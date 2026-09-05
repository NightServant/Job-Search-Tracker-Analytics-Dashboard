/**
 * Where supabase-js keeps the session, and how to get rid of it.
 *
 * The key is derived from the project URL in exactly one place. Two things
 * need it -- the landing page's pre-paint redirect, which reads it, and sign
 * out, which must be able to remove it -- and a key spelled out twice is a key
 * that can be spelled differently twice.
 *
 * Pure and dependency-free on purpose: a server component builds an inline
 * script from part of this, and importing the supabase client into that path
 * would drag a browser-only singleton into the server render.
 */

/** `sb-<ref>-auth-token`, or null if the URL is not a Supabase project URL. */
export function sessionStorageKeyFor(url: string): string | null {
  const ref = url.trim().match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i)?.[1]
  // Belt and braces: this value is interpolated into an inline <script> by
  // InstantSignedInRedirect, so it is constrained to a plain identifier rather
  // than merely trusted for coming from a build-time variable.
  return ref && /^[a-z0-9]+$/i.test(ref) ? `sb-${ref}-auth-token` : null
}

/**
 * Remove the stored session from this browser.
 *
 * WHY THIS EXISTS AT ALL, given supabase-js has `signOut()`. Because
 * `signOut()` does not guarantee it. Reading auth-js's `_signOut`: it calls
 * the server to revoke the token, and if that call fails with anything other
 * than 401/403/404 -- a 500, or an offline `AuthRetryableFetchError` -- it
 * returns the error and never reaches `_removeSession()`. The session stays in
 * localStorage and the user is still signed in.
 *
 * That turns "sign out" into a request that the network can veto, which is
 * backwards: signing out is the one action that must never depend on being
 * able to reach a server. Revoking the token elsewhere is best-effort;
 * clearing it HERE is not.
 *
 * Returns whether anything was actually removed, so a caller can tell "cleaned
 * up" from "there was nothing to clean".
 */
export function clearStoredSession(url: string): boolean {
  const key = sessionStorageKeyFor(url)
  if (!key || typeof window === 'undefined') return false

  let removed = false
  try {
    if (window.localStorage.getItem(key) !== null) {
      window.localStorage.removeItem(key)
      removed = true
    }
    // supabase-js also parks a PKCE verifier beside the session during an
    // OAuth exchange. Leaving it behind is harmless but untidy, and it is the
    // kind of leftover that makes a later flow behave oddly for no visible
    // reason.
    window.localStorage.removeItem(`${key}-code-verifier`)
  } catch {
    // Private mode, or storage disabled. Nothing to clear and nothing to fix.
    return false
  }
  return removed
}
