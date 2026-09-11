'use client'

import { useAuth } from '@/contexts/AuthContext'

/**
 * Holds an auth form back until it is known that the visitor needs one.
 *
 * THE BUG THIS FIXES (Gabe, 2026-09-11: "I am signed in but authentication
 * forms shows up even when I am logged in"). `(app)/layout.tsx` has always
 * returned `null` while `loading || !user`, so a private screen never paints
 * for somebody who is about to be bounced out. The `(auth)` group had no
 * mirror of that: it rendered `{children}` immediately and left the redirect
 * to catch up, so a signed-in visitor got a fully painted sign-in form for the
 * whole of the auth-resolution window, every time.
 *
 * `InstantSignedInRedirect` closes that window on a FULL PAGE LOAD -- it reads
 * localStorage before the document is parsed. It cannot close it on a
 * client-side navigation, which is exactly how somebody signed in arrives
 * here: the "sign in" link in the landing navbar is a `next/link`, so no
 * document is parsed and no inline script runs. That is the path that produced
 * the screenshot.
 *
 * IT KEYS ON `user` AND DELIBERATELY NOT ON `loading`, and that is the whole
 * design. The first version gated on both, which cost the form its SERVER
 * RENDER: `loading` starts true on the server, so the page shipped an empty
 * shell and the form appeared only after hydration -- measured on the deployed
 * build, `signup-email` appeared zero times in the HTML. That is a worse
 * regression than the flash it was fixing, and it hit every signed-out visitor
 * rather than the rare signed-in one.
 *
 * Keying on `user` alone restores the server render and still fixes the report,
 * because of where the bug actually lives. `AuthProvider` sits in the ROOT
 * layout, so on a CLIENT-SIDE navigation it is already mounted and `user` is
 * already populated -- there is no resolution window to flash through. The form
 * simply never renders. On a full page load the pre-paint script handles it
 * before this component exists.
 *
 * WHAT IS LEFT UNCOVERED, stated rather than discovered: a full page load, by
 * a signed-in visitor, where the inline script could not run -- localStorage
 * blocked, or a browser refusing it. There the form paints until
 * `getSession()` resolves, exactly as it did before any of this. That is rare,
 * and it is not worth every signed-out visitor losing their first paint.
 *
 * IT IS NOT A SECURITY BOUNDARY and must not be read as one. Nothing here
 * protects data: that is row-level security on every table plus the auth check
 * in every API route. This decides which of two public pages to paint, and a
 * visitor who defeated it would see a form they could already see by signing
 * out.
 *
 * WHY NOT ON `/` TOO. The landing page deliberately paints first for everyone
 * -- it is a static marketing route whose traffic is overwhelmingly signed
 * out, and holding it blank on an auth check would give every anonymous
 * visitor a blank first paint to serve the minority who are signed in. See
 * `SignedInRedirect`. A sign-in form is not marketing and does not get that
 * exemption.
 */
export function SignedOutOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // Known to be signed in: the redirect is already in flight and a sign-in form
  // is never the right thing to have on screen. Anything else -- signed out, or
  // not yet known -- renders, which is what keeps the server render intact.
  if (user) return null

  return <>{children}</>
}
