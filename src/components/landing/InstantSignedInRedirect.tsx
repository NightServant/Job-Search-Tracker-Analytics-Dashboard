import { currentEnvSource, readSupabaseConfig } from '@/lib/env'
import { hasLiveSession } from './instantRedirect'

/**
 * Sends a signed-in visitor to /dashboard BEFORE the landing page paints.
 *
 * `SignedInRedirect` already does this, but it cannot do it immediately: it is
 * a client component, so it waits for React to hydrate and for
 * `supabase.auth.getSession()` to resolve, and a signed-in visitor sees the
 * top of the marketing page for that whole window. Gabe asked for the
 * dashboard immediately.
 *
 * THE SESSION IS IN localStorage, WHICH IS SYNCHRONOUS. That is the whole
 * trick. This renders a blocking inline script into the HTML, so the browser
 * reads the stored session and calls `location.replace` while it is still
 * parsing the document -- before any of the landing markup below it has been
 * laid out or painted. No hydration, no network, no frame.
 *
 * WHAT IT DOES NOT DO. It is not authentication and it is not a replacement
 * for `SignedInRedirect`, which stays for the cases this cannot cover: a token
 * that has expired and needs refreshing, a sign-in that happens while the page
 * is open, and any browser where localStorage is unavailable. This is a fast
 * path over an unchanged slow one.
 *
 * The proper fix for the underlying problem is still a server-readable
 * session -- `@supabase/ssr` with cookie storage and a middleware redirect --
 * which is a migration across the whole app rather than a page-level change.
 * This buys the visible half of that benefit without it.
 *
 * INJECTION: the only interpolated value is the project ref, and it is
 * accepted only if it matches `^[a-z0-9]+$`. It comes from
 * NEXT_PUBLIC_SUPABASE_URL, which is a build-time constant rather than
 * anything a request can influence, and the pattern makes a crafted value
 * unrepresentable rather than merely unlikely.
 */
export function InstantSignedInRedirect() {
  const { url, isConfigured } = readSupabaseConfig(currentEnvSource())
  if (!isConfigured) return null

  const ref = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i)?.[1]
  if (!ref || !/^[a-z0-9]+$/i.test(ref)) return null

  // `hasLiveSession.toString()` rather than a copy of its body: one
  // implementation, and it is the one the tests exercise.
  const script = `(function(){try{var f=${hasLiveSession.toString()};if(f(window.localStorage.getItem("sb-${ref}-auth-token"),Date.now())){window.location.replace("/dashboard");}}catch(e){}})();`

  return <script data-instant-redirect dangerouslySetInnerHTML={{ __html: script }} />
}
