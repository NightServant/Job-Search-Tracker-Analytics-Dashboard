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
 * IT COSTS THE SIGNED-OUT VISITOR ALMOST NOTHING, which is what makes this the
 * right trade rather than a tax. With no token in storage, `getSession()`
 * resolves from localStorage with no network call at all, so `loading` is
 * false on the first tick and the form paints as it always did. The wait only
 * exists for someone who HAS a session -- and for them the correct thing on
 * screen is not a sign-in form.
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
  const { user, loading } = useAuth()

  // `loading`: we do not yet know. `user`: we know, and the redirect is already
  // in flight. Neither is a state in which a sign-in form should be on screen.
  if (loading || user) return null

  return <>{children}</>
}
