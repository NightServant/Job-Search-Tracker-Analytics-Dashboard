'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
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
  const { user, loading, signingOut } = useAuth()
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
    if (!loading && !user && !signingOut) router.replace('/login')
  }, [loading, user, signingOut, router])

  // Render nothing while auth resolves. Showing the shell and then redirecting
  // flashes protected chrome at someone who is not signed in.
  if (loading || !user) return null

  return <AppShell>{children}</AppShell>
}
