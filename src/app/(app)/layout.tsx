'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { SessionExpiredDialog } from '@/components/auth/SessionExpiredDialog'
import { AppShell } from '@/components/shell/AppShell'

/**
 * The authenticated shell.
 *
 * This is the client-side half of the guard and exists so a signed-out visitor
 * is not left staring at an empty frame. It is not the security boundary --
 * every table is behind owner-only RLS, so an unauthenticated request returns
 * nothing regardless of what the UI renders.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signingOut, sessionExpired } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // `signingOut` is what stops this guard from overriding a deliberate
    // sign-out. Reported from the deployed app on 2026-09-03: signing out from
    // /settings landed on /login rather than the home page.
    //
    // Both redirects really did fire. The settings page calls replace('/') as
    // soon as signOut() resolves; a beat later onAuthStateChange sets user to
    // null, this layout re-renders while still mounted, and this effect calls
    // replace('/login'). Second one wins.
    //
    // The fix is not ordering -- it is that these are two different events
    // that happen to share a state. A guard rejection is "you asked for a
    // private page without a session", and /login is right for it. A sign-out
    // is "you chose to leave", and answering that with a sign-in form reads as
    // the app refusing to let go.
    // AN EXPIRY IS THE THIRD EVENT THAT LANDS HERE, and like a sign-out it is
    // not a guard rejection -- so the silent bounce is wrong for it too, for a
    // different reason. A rejection means "you asked for a private page
    // without a session" and /login answers it. An expiry means "you HAD a
    // session and the server ended it while you were reading", and answering
    // that with a sign-in form and no sentence is how somebody concludes the
    // app logged them out at random.
    //
    // `SessionExpiredDialog` below says what happened and carries them to
    // /login itself, with `?next=` set to the screen they were on. Returning
    // early here is what gives it the chance to be read; without it this
    // effect navigates first and the dialog is never seen.
    if (sessionExpired) return
    if (!loading && !user && !signingOut) router.replace('/login')
  }, [loading, user, signingOut, sessionExpired, router])

  // Render nothing while auth resolves. Showing the shell and then redirecting
  // flashes protected chrome at someone who is not signed in.
  //
  // THE ONE EXCEPTION IS AN EXPIRY. It arrives as `user === null` like every
  // other signed-out state, so it falls into this branch -- and rendering
  // nothing would leave the reader looking at a blank page with no idea why.
  // The dialog is rendered INSTEAD OF the shell rather than inside it: the
  // session is gone, so every panel behind it would be showing data this
  // browser no longer has rights to fetch again.
  //
  // It is mounted HERE and not in `AppShell` because the demo renders that
  // same shell with no AuthProvider above it at all -- `useAuth` throws there,
  // which is correct and is how /demo stays a route space rather than an
  // account.
  if (loading || !user) return sessionExpired ? <SessionExpiredDialog /> : null

  return <AppShell>{children}</AppShell>
}
