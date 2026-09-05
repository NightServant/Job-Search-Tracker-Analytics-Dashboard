/**
 * Does the browser already hold a live session?
 *
 * SELF-CONTAINED ON PURPOSE. This function is serialised with `.toString()`
 * into an inline `<script>` on the landing page (see InstantSignedInRedirect),
 * so it must reference nothing outside its own body -- no imports, no helpers,
 * no closure. If it ever grows a dependency it will still typecheck, still
 * pass its tests, and silently throw in the browser, so the rule is written
 * here rather than assumed.
 *
 * Serialising the real function is what stops the inline script drifting from
 * the logic under test. The alternative -- a hand-written copy in a template
 * string -- is two implementations of one rule, and only one of them has
 * tests.
 *
 * IT DOES NOT VERIFY THE TOKEN, and does not need to. The only decision here
 * is whether to show the marketing page or go straight to the dashboard; the
 * dashboard's own guard, and every API route, still check with Supabase. A
 * forged localStorage entry buys a redirect to a screen that will then refuse
 * to load anything.
 */
export function hasLiveSession(raw: string | null, nowMs: number): boolean {
  try {
    if (!raw) return false
    let text = raw
    // supabase-js 2.9x writes a `base64-` prefixed value in some
    // configurations and plain JSON in others. Both are read.
    if (text.slice(0, 7) === 'base64-') {
      text = atob(text.slice(7))
    }
    const parsed = JSON.parse(text)
    const session = parsed && parsed.currentSession ? parsed.currentSession : parsed
    const expiresAt = session && session.expires_at
    if (typeof expiresAt !== 'number') return false
    // An expired token is NOT a redirect. supabase-js may still refresh it
    // successfully a moment later, and SignedInRedirect will move the visitor
    // then -- but sending them to a guarded screen on a token that is already
    // dead risks a bounce straight back out.
    return expiresAt * 1000 > nowMs
  } catch {
    return false
  }
}
