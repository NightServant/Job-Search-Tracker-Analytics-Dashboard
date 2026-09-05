import { currentEnvSource, readSupabaseConfig } from '@/lib/env'
import { sessionStorageKeyFor } from '@/lib/supabaseSession'
import { hasLiveSession } from './instantRedirect'

/**
 * Sends a signed-in visitor to /dashboard BEFORE the page it sits on paints.
 *
 * `SignedInRedirect` already does this, but it cannot do it immediately: it is
 * a client component, so it waits for React to hydrate and for
 * `supabase.auth.getSession()` to resolve, and a signed-in visitor sees the
 * page underneath for that whole window. Gabe asked for the dashboard
 * immediately.
 *
 * THE SESSION IS IN localStorage, WHICH IS SYNCHRONOUS. That is the whole
 * trick. This renders a blocking inline script into the HTML, so the browser
 * reads the stored session and calls `location.replace` while it is still
 * parsing the document -- before any of the markup below it has been laid out
 * or painted. No hydration, no network, no frame.
 *
 * THREE ROUTES USE IT: `/`, `/login` and `/signup` -- every public page whose
 * whole purpose is served better by the dashboard once you have an account.
 * It moved out of `components/landing/` when the auth pages took it up
 * (2026-09-05), because a component two route groups depend on should not
 * live inside one of them.
 *
 * It is NOT on `/privacy`. That is a document a signed-in person has an
 * ordinary reason to want to read, so redirecting away from it would be
 * taking something away rather than saving a step. That page changes its way
 * OUT instead -- see HomeOrDashboardLink.
 *
 * WHAT IT DOES NOT DO. It is not authentication and it is not a replacement
 * for `SignedInRedirect`, which stays for the cases this cannot cover: a token
 * that has expired and needs refreshing, a sign-in that happens while the page
 * is open (which on `/login` is the ordinary case), a client-side navigation
 * into the route, and any browser where localStorage is unavailable. This is a
 * fast path over an unchanged slow one.
 *
 * The proper fix for the underlying problem is still a server-readable
 * session -- `@supabase/ssr` with cookie storage and a middleware redirect --
 * which is a migration across the whole app rather than a page-level change.
 * This buys the visible half of that benefit without it.
 *
 * INJECTION: the only interpolated value is the storage key, and
 * `sessionStorageKeyFor` will only return one built from a `^[a-z0-9]+$`
 * project ref. It comes from NEXT_PUBLIC_SUPABASE_URL, which is a build-time
 * constant rather than anything a request can influence, and the pattern makes
 * a crafted value unrepresentable rather than merely unlikely.
 */
export function InstantSignedInRedirect({ to = '/dashboard' }: { to?: string } = {}) {
  const { url, isConfigured } = readSupabaseConfig(currentEnvSource())
  if (!isConfigured) return null

  // One derivation of the storage key, shared with sign-out. Spelling the
  // regex out a second time here is how the two would eventually disagree.
  const key = sessionStorageKeyFor(url)
  if (!key) return null

  // `to` is a literal at every call site, but it is interpolated into a
  // script, so it is constrained rather than trusted: an app-relative path
  // and nothing else. `//evil.com` is a valid URL to `location.replace` and
  // is exactly what this refuses.
  if (!/^\/[A-Za-z0-9/_-]*$/.test(to)) return null

  // `hasLiveSession.toString()` rather than a copy of its body: one
  // implementation, and it is the one the tests exercise.
  const script = `(function(){try{var f=${hasLiveSession.toString()};if(f(window.localStorage.getItem("${key}"),Date.now())){window.location.replace("${to}");}}catch(e){}})();`

  return <script data-instant-redirect dangerouslySetInnerHTML={{ __html: script }} />
}
