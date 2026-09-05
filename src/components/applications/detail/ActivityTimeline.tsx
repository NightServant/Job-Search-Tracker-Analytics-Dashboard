import * as React from 'react'
import { ClockIcon } from '@/components/icons'
import { PanelSection } from '@/components/ui/panel-section'
import { sortActivityDescending, type ActivityEntry } from '@/services/activityLog'

function formatOccurredAt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Free-form notes against the application, newest first.
 *
 * Sorts defensively with `sortActivityDescending` rather than trusting the
 * caller's ordering -- the service already orders newest-first at the
 * database, but a component that only reads correctly ordered data is one
 * accidental refactor away from a silently backwards timeline.
 *
 * Separated by a hairline rule per entry, never a bordered card: five
 * panels on this page already read as boxes if any one of them draws its
 * own border.
 *
 * `error` is a third state, distinct from both loading (handled one level up
 * by the route's combined spinner) and empty: a failed read must not render
 * the same "no activity logged yet" copy a genuine empty list gets, or a
 * network blip reads as proof nothing was ever logged.
 *
 * The empty copy says only that nothing is logged, not that there is
 * anywhere to log it from -- nothing in this codebase calls
 * `activityService.create` yet, and no task through M5 adds a composer, so
 * promising one here would point at a control that does not exist.
 */
export interface ActivityTimelineProps extends React.HTMLAttributes<HTMLElement> {
  activity: ActivityEntry[]
  error?: boolean
}

export function ActivityTimeline({
  activity,
  error = false,
  className,
  ...props
}: ActivityTimelineProps) {
  const sorted = sortActivityDescending(activity)

  return (
    <PanelSection
      aria-label="Activity"
      title="activity"
      icon="Clock"
      error={error ? 'Could not load activity. Try refreshing the page.' : undefined}
      className={className}
      {...props}
    >
      {sorted.length === 0 ? (
        <p className="text-body-s text-text-muted">no activity logged for this application yet.</p>
      ) : (
        <ul className="flex flex-col">
          {sorted.map((entry) => (
            <li
              key={entry.id}
              // `content-auto` per ENTRY, not on the list. An unbounded activity
              // log is the one place in this app where a scroll container
              // really does hold hundreds of rows, and skipping the layout and
              // paint of the ones off-screen is free here: these are two lines
              // of text and a glyph, with nothing that has to be measured to
              // be correct. Deliberately not used on the chart panels or the
              // landing page -- Recharts sizes itself from a real measurement
              // and reports 0 for skipped content, and the pinned scroll
              // sections need their true heights to drive the animation.
              className="content-auto flex items-start gap-3 border-b border-border-subtle py-3 last:border-b-0"
            >
              <ClockIcon size={16} className="mt-0.5 shrink-0 text-text-muted" />
              <div className="min-w-0">
                <p className="text-body-s text-text-muted">{formatOccurredAt(entry.occurred_at)}</p>
                <p className="text-body-m text-text-primary">{entry.note}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  )
}
