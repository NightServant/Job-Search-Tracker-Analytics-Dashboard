'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Sends a signed-in visitor from `/` to `/dashboard`.
 *
 * THIS REVERSES A SETTLED DECISION, so the record should say so rather than
 * quietly changing. `/` was made the homepage for everyone on 2026-09-02, on
 * the reasoning that a portfolio piece whose landing page is the thing a
 * reviewer looks at should not hide it from the only people with accounts.
 * Gabe overruled that on 2026-09-03: typing the bare domain while signed in
 * should land on the dashboard. That is the behaviour of every product this
 * one is competing with, and the reviewer case is still served -- the landing
 * page is one click away on the lockup, and reviewers are signed out anyway.
 *
 * IT RENDERS NOTHING AND BLOCKS NOTHING. The landing page paints first and the
 * redirect happens after the session resolves, which is deliberate: `/` is a
 * static route and the overwhelming majority of its traffic is signed out.
 * Holding the page blank until auth resolves -- what AppLayout does, correctly,
 * for a private shell -- would make every anonymous visitor wait on a check
 * whose answer is almost always no, and would give a static marketing page a
 * blank first paint.
 *
 * The cost is honest and worth naming: a signed-in visitor sees the top of the
 * landing page for a moment before being moved. Removing that frame is not a
 * tuning problem, it needs the session readable on the SERVER, and this app
 * uses supabase-js with the default localStorage storage -- there is no auth
 * cookie for middleware to read. Doing it properly means adopting @supabase/ssr
 * and cookie-backed sessions across the app, which is a migration, not a fix.
 *
 * `replace`, not `push`: otherwise Back from the dashboard returns to `/`,
 * which immediately redirects forward again, and the Back button stops working.
 */
export function SignedInRedirect() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [loading, user, router])

  return null
}
