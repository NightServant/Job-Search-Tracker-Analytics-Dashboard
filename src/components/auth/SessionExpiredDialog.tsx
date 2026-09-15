'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AppDialog } from '@/components/ui/app-dialog'
import { Button } from '@/components/ui/button'
import { StatusState } from '@/components/ui/status-state'

/**
 * What a signed-in reader sees when their session ends underneath them.
 *
 * THE STATE IT REPLACES WAS SILENCE. The middleware already redirects an
 * unauthenticated request to /login, which is correct and is the actual guard
 * -- but it only runs on a NAVIGATION. Somebody sitting on the analytics
 * screen when their refresh token is refused kept looking at a fully rendered
 * page whose every subsequent query failed, and found out what had happened by
 * clicking something and landing on a sign-in form with no explanation. The
 * server-side expiry added on 2026-09-15 (`[auth.sessions]` in
 * supabase/config.toml) makes that a routine event rather than a rare one, so
 * the two changes only make sense as a pair.
 *
 * A MODAL, WHICH IS THE ONE PLACE THIS APP USES ONE FOR A NOTICE. Everything
 * else that has gone wrong is reported in the surface it belongs to, and the
 * connection notice is deliberately a band rather than a dialog. The
 * difference is that this is not about a surface: NOTHING on screen works any
 * more, every panel is showing data the reader no longer has rights to, and
 * the only useful next action is to sign in. A band over a dead page invites
 * somebody to keep trying; a modal stops them.
 *
 * IT CANNOT BE DISMISSED BY ESCAPE OR BY CLICKING OUTSIDE. `onOpenChange` is
 * given a handler that ignores every close reason except the button's own,
 * because dismissing it would return the reader to exactly the dead page the
 * dialog exists to explain -- and then nothing would tell them again.
 *
 * THE BUTTON CARRIES WHERE THEY WERE. `?next=` is the pathname at the moment
 * the session died, so signing in returns them to the screen they were
 * reading. `lib/authRoutes` already speaks this parameter -- it is what the
 * middleware uses for the same purpose -- so this is not a new convention.
 *
 * NOTHING HERE CALLS `signOut()`. There is no session left to revoke, the
 * local session is already gone (supabase-js cleared it when the refresh
 * failed), and calling out to an auth server that just refused us would be a
 * request whose only possible outcomes are "no-op" and "hangs".
 *
 * IT IS RENDERED BY `(app)/layout.tsx`, NOT BY `AppShell`, and the difference
 * matters twice.
 *
 * First, the shell is rendered by the DEMO too, which has no AuthProvider
 * above it at all -- `useAuth` throws there, correctly, and that is what keeps
 * /demo a route space rather than an account.
 *
 * Second and more importantly, the layout returns `null` the moment `user` is
 * null, which is precisely the state an expiry produces. Mounted inside the
 * shell this component would be unmounted by the very event it exists to
 * report. The layout renders it INSTEAD OF the shell, which is also the honest
 * picture: the session is gone, so every panel behind it would be showing data
 * this browser can no longer fetch again.
 */
export function SessionExpiredDialog() {
  const { sessionExpired, acknowledgeSessionExpiry } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  /**
   * Captured when the dialog OPENS, not read at click time.
   *
   * By the time somebody presses the button the router may have moved --
   * middleware bounces the next navigation to /login -- and `?next=/login`
   * would send them back to the sign-in form after signing in. The pathname
   * that matters is the one they were on when it broke.
   */
  const [returnTo, setReturnTo] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (sessionExpired) setReturnTo((current) => current ?? pathname)
    else setReturnTo(null)
  }, [sessionExpired, pathname])

  if (!sessionExpired) return null

  const href = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login'

  return (
    <AppDialog
      open
      // Every reason but ours is refused -- see the docblock. The signature is
      // `(open, reason)`; ignoring both and doing nothing is what makes
      // Escape and an overlay click no-ops rather than an escape hatch.
      onOpenChange={() => {}}
      title="your session expired"
      icon="Lock"
      size="m"
    >
      <StatusState
        kind="expired"
        compact
        // The dialog's own header already says "your session expired" with the
        // same padlock beside it. Repeating the preset's title two lines under
        // it was a heading printed twice; `null` is how a state defers to the
        // surface holding it.
        title={null}
        // The preset's own sentence is close, and this one is better for being
        // specific about the two things a reader actually wants to know: why
        // it happened to them now, and whether they lost anything.
        message="Worktrack signs you out after a while, and after a stretch of inactivity. Nothing you saved is affected."
        action={
          <Button
            onClick={() => {
              // Cleared BEFORE the push. The dialog unmounts with the
              // navigation either way, but leaving the flag raised would pop
              // it again the moment the reader lands on /login -- which is a
              // modal over a sign-in form telling them to sign in.
              acknowledgeSessionExpiry()
              router.push(href)
            }}
          >
            sign in again
          </Button>
        }
      />
    </AppDialog>
  )
}
