import * as React from 'react'
import { cn } from '@/lib/utils'
import { dayKey } from '@/lib/calendar'
import { groupEventsByDay } from '@/services/events'
import { holidaysByDay, type PublicHoliday } from '@/services/holidays'
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
 * The grid is the one surface in the app that carries the accent across its
 * whole structure rather than as a single mark. Gabe asked for an orange
 * calendar, said explicitly he did not mean "highlight today" -- that already
 * existed -- and then supplied a reference: a SOLID accent header bar with
 * white weekday names, white cells, hairline accent rules between them, and
 * the date numbers themselves in accent, right-aligned in each cell.
 *
 * Following that reference means every in-month number is accent, so an
 * accent number can no longer be what marks today. Today is carried by its
 * cell tint plus the 2px rule instead, which is the stronger signal anyway.
 *
 * This does NOT break "orange is never a status". A date is not an
 * application status; the five status hues still mean exactly what they mean
 * everywhere else, and no cell here is coloured by anything a job's status
 * says. The accent is doing what the accent does -- marking the surface the
 * screen is about.
 *
 * Today keeps its 2px `bg-accent-default` rule, the Status Marker / nav-item
 * vocabulary for "this one" -- never a filled chip or dot, which this system
 * reserves for nothing (status is always a rule plus a label).
 */
export interface MonthGridProps {
  grid: Date[][]
  month: number
  events: CalendarEvent[]
  /** Public holidays for the years this grid covers. See services/holidays. */
  holidays?: PublicHoliday[]
  /**
   * How many applications went out on each day, keyed by `dayKey`.
   *
   * IT IS THE ONE THING THIS GRID SHOWS THAT THE USER PUT THERE. Interviews
   * and deadlines are sparse by nature -- most people have none most weeks --
   * so a month with nothing booked drew forty-two empty cells and said nothing
   * about a search that was, in fact, busy. `date_applied` is already on every
   * row; plotting it turns the calendar into a record of effort rather than a
   * page waiting for an interview to happen.
   */
  applicationsByDay?: Record<string, number>
  today?: Date
  className?: string
}

export function MonthGrid({
  grid,
  month,
  events,
  holidays = [],
  applicationsByDay = {},
  today = new Date(),
  className,
}: MonthGridProps) {
  const grouped = groupEventsByDay(events)
  const publicHolidays = holidaysByDay(holidays)
  const todayKey = dayKey(today)

  return (
    <div
      data-month-grid
      className={cn(
        // gap-px over a tinted background IS the hairline between cells: the
        // container's colour shows through the one-pixel gaps, which is how
        // the reference's thin orange rules are drawn without a border on
        // every cell.
        'hidden md:grid grid-cols-7 gap-px overflow-hidden rounded-md',
        'border border-accent-surface bg-accent-default/25',
        className
      )}
    >
      {WEEKDAY_HEADINGS.map((heading) => (
        <div
          key={heading}
          // accent-surface, NOT accent-default. `accent-default` is chosen
          // for text contrast -- accent-400 in dark -- and a full-width band
          // of it is the "too bright" Gabe rejected. accent-surface is the
          // token for a field of accent rather than a mark of it, and stays
          // orange in both themes without shouting in either.
          //
          // Title case at body size, per the reference. Not text-label-caps:
          // shouting the weekday names in 11px uppercase over a solid band is
          // a different, louder thing.
          className="bg-accent-surface px-3 py-2 text-body-s font-medium text-accent-on-surface"
        >
          {heading}
        </div>
      ))}
      {grid.flat().map((date) => {
        const key = dayKey(date)
        const dayEvents = grouped.get(key) ?? []
        const dayHolidays = publicHolidays.get(key) ?? []
        const sent = applicationsByDay[key] ?? 0
        const inMonth = date.getMonth() === month
        const isToday = key === todayKey

        return (
          <div
            key={key}
            data-today-cell={isToday ? '' : undefined}
            className={cn(
              'flex min-h-24 flex-col gap-1 p-2',
              // Today is a stronger tint of the same accent, not a second
              // colour -- and it is the cell that carries it, so the day reads
              // as a region of the grid rather than as a decorated number.
              isToday ? 'bg-accent-default/15' : 'bg-bg-canvas',
              // Neighbouring months sit back so the current month reads as the
              // subject of the grid rather than one block of forty-two days.
              // OPAQUE, deliberately: a translucent grey lets the container's
              // orange through, which made the padded weeks the most saturated
              // rows on the grid -- exactly backwards.
              !inMonth && 'bg-bg-inset text-text-muted'
            )}
          >
            {/* Number to the RIGHT, per the reference, so today's rule takes
                the left of the row rather than being pushed off the edge. */}
            <div className="flex items-center justify-between gap-2">
              {isToday ? (
                <span
                  data-today
                  aria-hidden
                  className="h-[2px] w-4 shrink-0 rounded-none bg-accent-default"
                />
              ) : (
                <span aria-hidden />
              )}
              <span
                className={cn(
                  'tabular text-body-s font-medium',
                  inMonth ? 'text-accent-default' : 'text-text-muted',
                  isToday && 'font-semibold'
                )}
              >
                {date.getDate()}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {/* THE HOLIDAY LEADS THE CELL, above whatever is scheduled, and
                  it is set in the muted tone rather than in a status colour:
                  a public holiday is a property of the DAY, not an item on
                  the list, and the five status hues mean one thing in this
                  app. `title` carries the full name because a 47px-wide cell
                  truncates "Araw ng Kagitingan" every time. */}
              {dayHolidays.map((holiday) => (
                <span
                  key={holiday.date + holiday.name}
                  data-holiday
                  title={holiday.localName}
                  className="truncate text-caption font-medium text-text-muted"
                >
                  {holiday.localName}
                </span>
              ))}
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
              {/* LAST IN THE CELL, and muted. What was BOOKED on a day
                  outranks what was sent on it -- an interview is somewhere to
                  be, an application is something already done. */}
              {sent > 0 && (
                <span data-applications-sent className="tabular text-caption text-text-muted">
                  {sent} sent
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
