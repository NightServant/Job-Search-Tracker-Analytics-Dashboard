import * as React from 'react'
import { cn } from '@/lib/utils'
import { dayKey } from '@/lib/calendar'
import { groupEventsByDay } from '@/services/events'
import type { CalendarEvent } from '@/services/events'

const WEEKDAY_HEADINGS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** How many event titles a ~cell can show before falling back to a count. */
const MAX_TITLES_PER_CELL = 3

/**
 * The desktop six-week grid -- `hidden md:grid` so it never renders (and
 * never pays layout cost) below the 768px breakpoint, where 47px cells could
 * show a dot but never an event title. See the roadmap's "Mobile Calendar
 * deliberately diverges from desktop" note (M5 5.7): mobile gets
 * `WeekStrip` + `Agenda` instead, not a squeezed version of this component.
 *
 * `grid` is `Date[][]` from `buildMonthGrid` -- always six weeks, already
 * padded with the neighbouring months' days -- so this component only lays
 * cells out and never has to reason about month boundaries itself.
 *
 * Today's cell carries a 2px `bg-accent-default` rule, the Status Marker /
 * nav-item vocabulary for "this one" -- never a filled chip or dot, which
 * this system reserves for nothing (status is always a rule plus a label).
 */
export interface MonthGridProps {
  grid: Date[][]
  month: number
  events: CalendarEvent[]
  today?: Date
  className?: string
}

export function MonthGrid({ grid, month, events, today = new Date(), className }: MonthGridProps) {
  const grouped = groupEventsByDay(events)
  const todayKey = dayKey(today)

  return (
    <div
      data-month-grid
      className={cn(
        'hidden md:grid grid-cols-7 gap-px border border-border-subtle bg-border-subtle',
        className
      )}
    >
      {WEEKDAY_HEADINGS.map((heading) => (
        <div
          key={heading}
          className="bg-bg-canvas px-2 py-1 text-label-caps uppercase text-text-muted"
        >
          {heading}
        </div>
      ))}
      {grid.flat().map((date) => {
        const key = dayKey(date)
        const dayEvents = grouped.get(key) ?? []
        const inMonth = date.getMonth() === month
        const isToday = key === todayKey

        return (
          <div
            key={key}
            className={cn(
              'flex min-h-24 flex-col gap-1 bg-bg-canvas p-2',
              !inMonth && 'text-text-muted'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn('tabular text-body-s', !inMonth && 'text-text-muted')}>
                {date.getDate()}
              </span>
              {isToday && (
                <span
                  data-today
                  aria-hidden
                  className="h-[2px] w-4 shrink-0 rounded-none bg-accent-default"
                />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              {dayEvents.slice(0, MAX_TITLES_PER_CELL).map((event) => (
                <span key={event.id} className="truncate text-caption text-text-secondary">
                  {event.title}
                </span>
              ))}
              {dayEvents.length > MAX_TITLES_PER_CELL && (
                <span className="text-caption text-text-muted">
                  +{dayEvents.length - MAX_TITLES_PER_CELL} more
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
