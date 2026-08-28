import * as React from 'react'
import { cn } from '@/lib/utils'
import { dayKey } from '@/lib/calendar'

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
  today?: Date
  className?: string
}

export function WeekStrip({ days, today = new Date(), className }: WeekStripProps) {
  const todayKey = dayKey(today)

  return (
    <div className={cn('grid grid-cols-7 gap-1', className)}>
      {days.map((date, index) => {
        const isToday = dayKey(date) === todayKey
        return (
          <div key={dayKey(date)} className="flex flex-col items-center gap-1 py-1">
            <span className="text-label-caps uppercase text-text-muted">
              {WEEKDAY_LABELS[index]}
            </span>
            <span className="tabular text-body-m text-text-primary">{date.getDate()}</span>
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
  )
}
