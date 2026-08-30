import * as React from 'react'
import { CalendarIcon } from '@/components/icons'
import { PanelSection } from '@/components/ui/panel-section'
import type { CalendarEvent, EventKind } from '@/services/events'

const KIND_LABELS: Record<EventKind, string> = {
  interview: 'Interview',
  deadline: 'Deadline',
  take_home: 'Take-home',
  follow_up: 'Follow-up',
  other: 'Event',
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * The soonest upcoming event tied to this application, if there is one.
 *
 * Takes the single event already chosen by the caller rather than the whole
 * list, so this component has nothing to sort or filter and cannot get
 * "soonest" wrong. A blank panel here would read as still loading, so the
 * no-event case says plainly that nothing is scheduled.
 *
 * `error` is a third state, distinct from both loading and empty: a failed
 * read must not render the same "nothing scheduled" copy a genuinely
 * event-free application gets.
 */
export interface NextEventProps extends React.HTMLAttributes<HTMLElement> {
  event: CalendarEvent | null
  error?: boolean
}

export function NextEvent({ event, error = false, className, ...props }: NextEventProps) {
  return (
    <PanelSection
      aria-label="Next event"
      title="next event"
      error={error ? 'Could not load the next event. Try refreshing the page.' : undefined}
      className={className}
      {...props}
    >
      {event === null ? (
        <p className="text-body-s text-text-muted">nothing scheduled for this application yet.</p>
      ) : (
        <div className="flex items-start gap-3">
          <CalendarIcon size={16} className="mt-0.5 shrink-0 text-text-muted" />
          <div className="min-w-0">
            <p className="truncate text-body-m text-text-primary">{event.title}</p>
            <p className="text-body-s text-text-muted">
              {KIND_LABELS[event.kind]} · {formatEventTime(event.starts_at)}
            </p>
          </div>
        </div>
      )}
    </PanelSection>
  )
}
