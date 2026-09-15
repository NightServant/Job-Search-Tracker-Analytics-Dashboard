'use client'

import { cn } from '@/lib/utils'
import { useConnection } from '@/hooks/useConnection'
import { GlobeIcon, ClockIcon } from '@/components/icons'

/**
 * The offline and slow-connection notices, as one band above the app.
 *
 * WHY A BAND AND NOT A PANEL STATE. `StatusState` covers "this surface has
 * nothing to show"; connectivity is not about one surface. Every panel on the
 * screen is affected at once, and most of them are still showing correct data
 * that arrived before the connection went -- replacing all of them with an
 * offline illustration would throw away the readable thing to announce the
 * unreadable one. A band says the true sentence once and leaves the page
 * alone.
 *
 * WHY IT IS NOT A TOAST either, which was the obvious alternative. A toast
 * goes away; being offline does not. Somebody who misses the four seconds it
 * shows spends the next ten minutes wondering why nothing saves, which is the
 * same argument DemoBanner makes for not being dismissible.
 *
 * OFFLINE WINS OVER SLOW when both are somehow true. They are not really
 * exclusive -- `navigator.onLine` can go false while `effectiveType` still
 * reports 2g from before -- and two stacked bands about the same connection is
 * one band too many. Offline is the stronger and more actionable statement.
 *
 * IT CLAIMS NOTHING ABOUT WHAT IS SAVED. The copy says work will be sent when
 * the connection returns -- which is true of what is in the page, because
 * React Query keeps mutations in memory and the user can retry -- and stops
 * there. It does not promise an offline queue that survives a reload, because
 * there is not one. A notice that over-promises during an outage is worse than
 * no notice: it is the reason somebody closes the tab.
 *
 * NO `role="alert"`. The band appears while the reader is doing something
 * else, and an assertive region interrupts whatever a screen reader is in the
 * middle of reading. `role="status"` is polite and announces at the next
 * pause, which is the right urgency for "your train went into a tunnel".
 */
export function ConnectionNotice({ className }: { className?: string }) {
  const { online, slow } = useConnection()

  // Nothing to say is the overwhelmingly common case, and it renders nothing
  // rather than an empty band -- the shell's layout must not reserve height
  // for a notice that is absent 99% of the time.
  if (online && !slow) return null

  const offline = !online
  const Icon = offline ? GlobeIcon : ClockIcon

  return (
    <div
      data-connection-notice={offline ? 'offline' : 'slow'}
      role="status"
      className={cn(
        // Full-bleed with one bottom rule, flush under the top bar -- the same
        // shape DemoBanner takes below md, and for the same reason: a card
        // here would spend its horizontal margins on nothing and push the page
        // heading further down a viewport that has none to spare.
        'flex items-center gap-2 border-b border-border-subtle px-gutter py-2',
        // The accent, not a red. Neither of these is a failure: one is a
        // condition that will pass and the other is a wait. Red here would
        // send somebody looking for what they broke. This is the same ruling
        // `StatusState`'s `warn` tone makes.
        'bg-accent-surface text-body-s text-text-primary',
        className
      )}
    >
      <Icon size={16} aria-hidden className="shrink-0 text-accent-default" />
      <p>
        {offline ? (
          <>
            <span className="font-medium">you are offline.</span> Worktrack is showing what it
            already had. Anything you change will be sent when the connection comes back.
          </>
        ) : (
          <>
            <span className="font-medium">this connection is slow.</span> Pages will take longer
            than usual to load. Nothing is broken.
          </>
        )}
      </p>
    </div>
  )
}
