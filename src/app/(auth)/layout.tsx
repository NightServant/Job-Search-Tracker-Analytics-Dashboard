import { InstantSignedInRedirect } from '@/components/auth/InstantSignedInRedirect'
import { SignedInRedirect } from '@/components/auth/SignedInRedirect'

/**
 * A passthrough that does two things, and it exists for the first of them: so
 * /login and /signup do NOT inherit (app)/layout.tsx's auth guard.
 *
 * That guard redirects a signed-out visitor to /login. Under it, /login would
 * redirect a signed-out visitor to /login -- forever -- and /signup would be
 * unreachable by exactly the people who need it.
 *
 * THE SECOND THING IS THE MIRROR OF THAT GUARD, added 2026-09-05 on Gabe's
 * ruling: a visitor who is ALREADY signed in should get the dashboard rather
 * than a form asking them to sign in again. Every product this one competes
 * with behaves that way, and the alternative is a form whose only honest
 * outcome is to put you back where you already were.
 *
 * BOTH REDIRECTS, for the same reason `/` mounts both. The inline script
 * decides before the form paints, so there is no frame of a sign-in page for
 * someone who does not need one; the client component covers what the script
 * cannot see -- an expired token that refreshes, a client-side navigation into
 * the route, and, on these two pages especially, a session that comes into
 * existence while the page is open.
 *
 * IT IS IN THE LAYOUT, NOT IN EACH PAGE. Both pages are client components, so
 * neither can render the server-side script part at all; the layout is the
 * only shared server component the two routes have. It is also the thing that
 * would otherwise be forgotten by a third auth route.
 *
 * SIGNING OUT IS NOT AFFECTED. `clearStoredSession` removes the key before the
 * browser is sent anywhere, so the arriving /login has nothing to find. That
 * ordering is the whole reason sign-out clears locally first rather than
 * waiting on the server -- see lib/supabaseSession.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-canvas">
      {/* First, so the browser decides before it parses the form below. */}
      <InstantSignedInRedirect />
      <SignedInRedirect />
      {children}
    </div>
  )
}
