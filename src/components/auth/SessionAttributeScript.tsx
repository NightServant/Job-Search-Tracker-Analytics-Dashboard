import { currentEnvSource, readSupabaseConfig } from '@/lib/env'
import { sessionStorageKeyFor } from '@/lib/supabaseSession'
import { hasLiveSession } from './instantRedirect'

/**
 * Marks the document as belonging to a signed-in reader BEFORE it paints, so a
 * page can show one control to a visitor and a different one to a user without
 * either of them watching the other's version flicker past first.
 *
 * WHY NOT JUST `useAuth()`. Because that answer arrives late. The session is
 * read asynchronously after React hydrates, so a component that switches on it
 * renders the signed-OUT branch first, every time, for everybody -- and a
 * signed-in reader sees "back to the home page" turn into "back to the
 * dashboard" under their eyes. That is the same defect Gabe reported on the
 * landing page, in a smaller frame.
 *
 * SAME TRICK AS InstantSignedInRedirect, different verb. localStorage is
 * synchronous, so a blocking inline script can read the stored session while
 * the browser is still parsing the document. That one redirects; this one sets
 * `data-session="live"` on <html> and lets CSS do the rest -- see the
 * `[data-when-signed-in]` rules in index.css, and HomeOrDashboardLink for the
 * only thing using them today.
 *
 * AN ATTRIBUTE AND CSS RATHER THAN REWRITING THE DOM. A script that edited the
 * button's text and href would be editing markup React is about to hydrate,
 * and hydration is entitled to put it back. Both versions are in the HTML and
 * only one is displayed, so React owns every node it rendered and the script
 * owns exactly one attribute on an element React does not manage. <html>
 * already carries `suppressHydrationWarning` for next-themes, which sets a
 * class on the same element for the same reason.
 *
 * IT IS A HINT, NOT A CHECK. It reflects what is in this browser's
 * localStorage and verifies nothing. Nothing behind an authorisation decision
 * may read it: a forged entry here changes the wording of a link, and the
 * dashboard and every API route still ask Supabase.
 *
 * SessionAttributeSync keeps it true afterwards -- for an expired token, for a
 * sign-out in another tab, and for a browser where localStorage is unavailable
 * and this script therefore does nothing at all.
 */
export function SessionAttributeScript() {
  const { url, isConfigured } = readSupabaseConfig(currentEnvSource())
  if (!isConfigured) return null

  const key = sessionStorageKeyFor(url)
  if (!key) return null

  // `hasLiveSession.toString()`, not a copy of it: one implementation of "is
  // there a session", and it is the one with tests.
  const script = `(function(){try{var f=${hasLiveSession.toString()};if(f(window.localStorage.getItem("${key}"),Date.now())){document.documentElement.setAttribute("data-session","live");}}catch(e){}})();`

  return <script data-session-attribute dangerouslySetInnerHTML={{ __html: script }} />
}
