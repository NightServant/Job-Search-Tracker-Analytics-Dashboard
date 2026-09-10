import * as React from 'react'
import { cn } from '@/lib/utils'
import { dayKey } from '@/lib/calendar'
import { holidaysByDay, type PublicHoliday } from '@/services/holidays'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * The mobile substitute for a chunk of `MonthGrid`: seven day chips giving
 * date orientation, with `Agenda` doing the actual work of listing events
 * underneath. Per the roadmap's "Mobile Calendar deliberately diverges from
 * desktop" note, this is a different layout, not a squeezed grid -- a 47px
 * month cell can show a dot but never an event.
 *
 * Today's chip carries the same 2px `bg-accent-default` rule `MonthGrid`
 * uses, not a filled chip or dot -- the Status Marker vocabulary applies
 * here exactly as it does on desktop.
 *
 * Visibility (`md:hidden`) is applied by the caller (`Calendar`), which
 * wraps this together with `Agenda` in one mobile-only container -- keeping
 * both mobile pieces hidden or shown as a unit rather than each having to
 * agree on the breakpoint independently.
 */
export interface WeekStripProps {
  days: Date[]
  /** Public holidays covering this week. See services/holidays. */
  holidays?: PublicHoliday[]
  today?: Date
  className?: string
}

export function WeekStrip({ days, holidays = [], today = new Date(), className }: WeekStripProps) {
  const todayKey = dayKey(today)
  const byDay = holidaysByDay(holidays)

  // Only the ones inside THIS week, in date order, so the line below the
  // strip names what the strip is showing rather than the whole year.
  const thisWeek = days
    .map((date) => ({ date, list: byDay.get(dayKey(date)) ?? [] }))
    .filter((entry) => entry.list.length > 0)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const isToday = dayKey(date) === todayKey
          const isHoliday = byDay.has(dayKey(date))
          return (
            <div key={dayKey(date)} className="flex flex-col items-center gap-1 py-1">
              <span className="text-label-caps uppercase text-text-muted">
                {WEEKDAY_LABELS[index]}
              </span>
              {/* A HOLIDAY NUMBER TAKES THE ACCENT, which is the same thing
                  the desktop grid does to every in-month number and means the
                  same thing here: this day is part of what the screen is
                  about. Never a filled dot -- see the docblock. */}
              <span
                data-holiday-day={isHoliday ? '' : undefined}
                className={cn(
                  'tabular text-body-m',
                  isHoliday ? 'font-medium text-accent-default' : 'text-text-primary'
                )}
              >
                {date.getDate()}
              </span>
              <span
                data-today={isToday ? '' : undefined}
                aria-hidden
                className={cn(
                  'h-[2px] w-6 rounded-none',
                  isToday ? 'bg-accent-default' : 'bg-transparent'
                )}
              />
            </div>
          )
        })}
      </div>

      {/* THE NAME, SPELLED OUT. Seven columns on a 375px screen are about 45px
          wide, so no holiday name fits inside one -- an accent number alone
          would say "something is different about Thursday" and stop there. */}
      {thisWeek.length > 0 && (
        <ul className="flex flex-col gap-1" data-week-holidays>
          {thisWeek.map(({ date, list }) => (
            <li key={dayKey(date)} className="text-body-s text-text-muted">
              <span className="tabular">{date.getDate()}</span>
              {' — '}
              {list.map((holiday) => holiday.localName).join(', ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
