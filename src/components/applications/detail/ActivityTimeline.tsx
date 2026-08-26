import * as React from 'react'
import { cn } from '@/lib/utils'
import { ClockIcon } from '@/components/icons'
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
 */
export interface ActivityTimelineProps extends React.HTMLAttributes<HTMLElement> {
  activity: ActivityEntry[]
}

export function ActivityTimeline({ activity, className, ...props }: ActivityTimelineProps) {
  const sorted = sortActivityDescending(activity)

  return (
    <section
      aria-label="Activity"
      className={cn('flex flex-col gap-3 border-t border-border-subtle pt-6', className)}
      {...props}
    >
      <h2 className="text-heading-s text-text-primary">Activity</h2>
      {sorted.length === 0 ? (
        <p className="text-body-s text-text-muted">
          No activity logged yet. Notes you add here track what happened and when.
        </p>
      ) : (
        <ul className="flex flex-col">
          {sorted.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 border-b border-border-subtle py-3 last:border-b-0"
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
    </section>
  )
}
