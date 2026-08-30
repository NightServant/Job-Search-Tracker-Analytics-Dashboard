'use client'

import * as React from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircleIcon } from '@/components/icons'
import { EmptyState } from '@/components/ui/empty-state'
import type { CalendarEvent } from '@/services/events'

const KIND_LABELS: Record<CalendarEvent['kind'], string> = {
  interview: 'interview',
  deadline: 'deadline',
  take_home: 'take-home',
  follow_up: 'follow-up',
  other: 'event',
}

export interface UpcomingEventsProps {
  events: CalendarEvent[]
  companyByJobId?: Record<string, string>
  loading?: boolean
  error?: boolean
  limit?: number
}

/**
 * The next few things in the calendar — Figma Overview panel 25:76.
 *
 * This panel is the whole of Gabe's "no empty state display for calendar".
 * The old block did not read the calendar at all: it printed the literal
 * string `N interviews in progress`, derived from job statuses, so there was
 * nothing to be empty about and nothing to show when something *was*
 * scheduled. `useEvents` already existed and `/calendar` already used it; the
 * Overview simply never called it.
 *
 * Three states, kept apart on purpose. Loading is a skeleton, not an empty
 * list — an empty list while a read is in flight tells the user they have
 * nothing scheduled, which may be false. A failed read says so rather than
 * claiming an empty calendar, the same distinction Task 5 of M5 had to add to
 * the application detail panels. Genuinely empty says so plainly and points at
 * the calendar.
 *
 * Event rows use no status colour. An event kind is not an application status,
 * and the five hues mean one specific thing everywhere else — the same rule
 * `/calendar`'s agenda follows.
 */
export function UpcomingEvents({
  events,
  companyByJobId = {},
  loading = false,
  error = false,
  limit = 3,
}: UpcomingEventsProps) {
  if (error) {
    return (
      <p className="flex items-center gap-2 py-4 text-body-s text-status-rejected-mark">
        <AlertCircleIcon size={16} aria-hidden className="[&_svg]:size-4" />
        could not load your calendar.
      </p>
    )
  }

  if (loading) {
    return (
      <div data-events-loading className="flex flex-col gap-3 py-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  const shown = events.slice(0, limit)

  return (
    <div className="flex flex-1 flex-col gap-3">
      {shown.length === 0 ? (
        <EmptyState data-events-empty icon="Calendar" className="flex-1 justify-center">
          nothing scheduled yet. interviews and deadlines you add show up here.
        </EmptyState>
      ) : (
        <ul className="flex flex-col">
          {shown.map((event) => {
            const when = new Date(event.starts_at)
            const company = event.job_id ? companyByJobId[event.job_id] : undefined
            return (
              <li
                key={event.id}
                data-event-row
                className="flex items-start gap-3 border-b border-border-subtle py-3 last:border-b-0"
              >
                <div className="w-9 shrink-0 text-center">
                  <p className="tabular text-body-m text-text-primary">{when.getDate()}</p>
                  <p className="text-label-caps uppercase text-text-muted">
                    {when.toLocaleString(undefined, { month: 'short' })}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-m text-text-primary">{event.title}</p>
                  <p className="truncate text-body-s text-text-muted">
                    {KIND_LABELS[event.kind]}
                    {company ? ` · ${company}` : ''} ·{' '}
                    <span className="tabular">
                      {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Link href="/calendar" className="text-body-s text-accent-default hover:underline">
        open calendar
      </Link>
    </div>
  )
}
