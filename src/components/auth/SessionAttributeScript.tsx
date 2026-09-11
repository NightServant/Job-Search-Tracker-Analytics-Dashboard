import { currentEnvSource, readSupabaseConfig } from '@/lib/env'
import { sessionStorageKeyFor } from '@/lib/supabaseSession'

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
 * IT READS THE COOKIE, synchronously, while the browser is still parsing the
 * document -- so the attribute is set before anything paints. It read
 * localStorage until 2026-09-11, when the session moved to cookies so that
 * middleware could see it; `document.cookie` is just as synchronous, so the
 * trick survives the move intact. This sets `data-session="live"` on <html>
 * and lets CSS do the rest -- see the `[data-when-signed-in]` rules in
 * index.css, and HomeOrDashboardLink for the only thing using them today.
 *
 * AN ATTRIBUTE AND CSS RATHER THAN REWRITING THE DOM. A script that edited the
 * button's text and href would be editing markup React is about to hydrate,
 * and hydration is entitled to put it back. Both versions are in the HTML and
 * only one is displayed, so React owns every node it rendered and the script
 * owns exactly one attribute on an element React does not manage. <html>
 * already carries `suppressHydrationWarning` for next-themes, which sets a
 * class on the same element for the same reason.
 *
 * IT IS A HINT, NOT A CHECK, and the cookie version leans on that harder: it
 * tests only that a session cookie is PRESENT, not that it is valid or
 * unexpired. Decoding a `@supabase/ssr` cookie in an inline script would mean
 * reassembling its `.0`/`.1` chunks and base64 in serialised source, which is
 * a lot of fragile code to decide the wording of one link. Nothing behind an
 * authorisation decision may read this: a forged cookie changes a link's text,
 * and middleware, the dashboard and every API route still ask Supabase.
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

  // `indexOf(key) === 0` rather than an exact match: `@supabase/ssr` splits a
  // large session across `…auth-token.0`, `.1`, and either chunk is equally
  // good evidence that a session exists.
  //
  // INJECTION: `key` is the only interpolated value and `sessionStorageKeyFor`
  // will only return one built from a `^[a-z0-9]+$` project ref, taken from a
  // build-time variable no request can influence.
  const script = `(function(){try{var k=${JSON.stringify(key)};if(document.cookie.split(";").some(function(c){return c.trim().indexOf(k)===0;})){document.documentElement.setAttribute("data-session","live");}}catch(e){}})();`

  return <script data-session-attribute dangerouslySetInnerHTML={{ __html: script }} />
}
