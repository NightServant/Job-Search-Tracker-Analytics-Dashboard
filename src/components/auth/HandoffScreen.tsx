'use client'

import { StatusState } from '@/components/ui/status-state'

/**
 * The full-page state for a moment when one screen is handing over to another.
 *
 * WHAT IT REPLACES IS `return null`, in four places. Every auth transition in
 * this app has a window where the old screen is no longer right and the new
 * one has not arrived: signing in, signing out, and being sent to /login from
 * a private route. Each of those used to render nothing at all, which is a
 * white document -- and a white document is how somebody concludes the app
 * broke. Gabe reported it twice before the cause was found, because the first
 * two attempts fixed a different layout.
 *
 * ONE COMPONENT SO THE THREE READ THE SAME. They are the same event from the
 * reader's side -- "wait, something is happening" -- and three separately
 * written versions would have drifted into three different waits.
 *
 * `min-h-screen` AND `grid place-items-center`, not the page's normal padding:
 * these render INSTEAD OF a layout, not inside one, so there is no shell to
 * sit in and nothing else on screen to align to.
 *
 * IT SAYS WHICH DIRECTION IT IS GOING. "Signing you in" and "signing you out"
 * are different sentences on purpose: somebody who pressed sign out and reads
 * "signing you in" will think they pressed the wrong thing.
 */
export function HandoffScreen({ title, message }: { title: string; message: string }) {
  return (
    <div data-handoff className="grid min-h-screen place-items-center bg-bg-canvas px-gutter">
      {/*
        `titleAs="h1"`: this IS the page for as long as it is up, and a page
        whose only text is a paragraph has no heading for a screen reader to
        navigate by. StatusState's `loading` kind also carries `role="status"`,
        so the change is announced rather than only drawn -- a blank page and a
        silent one are the same thing to somebody not looking at the screen.
      */}
      <StatusState kind="loading" titleAs="h1" title={title} message={message} />
    </div>
  )
}
