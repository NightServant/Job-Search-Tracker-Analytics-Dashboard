'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { buildMonthGrid, weekOf } from '@/lib/calendar'
import { MonthGrid } from './MonthGrid'
import { WeekStrip } from './WeekStrip'
import { Agenda } from './Agenda'
import type { CalendarEvent } from '@/services/events'

/**
 * The calendar screen's body, over plain props -- same split as `Dashboard`
 * (Task 3) and `DetailPage` (Task 5), so it renders without Next routing or
 * react-query. `src/app/(app)/calendar/page.tsx` owns both reads this screen
 * needs: `useEvents()` (wrapping `eventService.listUpcoming`) for `events`,
 * and `useJobs()` -- the same shared `['jobs', user?.id]` cache every other
 * screen in this branch already reads -- to build `companyByJobId`, the
 * `job_id -> company` map `Agenda` needs to satisfy roadmap 5.7's "time,
 * duration, title and company" requirement. `CalendarEvent` itself only has
 * `job_id`, no company.
 *
 * `useJobs()` was called directly inside this component in fix round 1; fix
 * round 2 hoisted it back out to the route, matching `dashboard/page.tsx`
 * and `applications/page.tsx` (both call their hooks at the route and pass
 * data down as props). A component that fetches its own data is not what
 * ruling R3 asked a props-taking `Calendar` for -- route-as-thin-wrapper,
 * sections testable without Next routing -- and Tasks 8/9 would have had
 * only this file to copy from. Component tests here no longer mock any
 * hook; the route's own test (`__tests__/page.test.tsx`) is where that
 * mocking now belongs, the same way it already does for `dashboard`.
 *
 * Desktop and mobile are genuinely different layouts, not one squeezed into
 * the other, per the roadmap's "Mobile Calendar deliberately diverges from
 * desktop" note (M5 5.7): `MonthGrid` (`hidden md:grid`) is the six-week
 * grid; the `md:hidden` block below it pairs `WeekStrip` (date orientation,
 * always the CURRENT week) with `Agenda` (the actual upcoming events, in
 * every case -- not scoped to the desktop month cursor). Wrapping both
 * mobile pieces in one `data-week-strip` container keeps them appearing and
 * disappearing together rather than each having to independently agree on
 * the breakpoint.
 *
 * Month navigation only affects `MonthGrid`, so its controls live in
 * `PageHeader`'s action slot -- the same "content controls belong in the
 * body header" convention Documents' `+ new cv` and Analytics' range picker
 * follow -- and are hidden below `md`, since nothing on the mobile layout
 * responds to them.
 */
export interface CalendarProps {
  events: CalendarEvent[]
  companyByJobId?: Record<string, string>
}

export function Calendar({ events, companyByJobId = {} }: CalendarProps) {
  const today = React.useMemo(() => new Date(), [])
  const [cursor, setCursor] = React.useState(today)

  const grid = React.useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  )
  const week = React.useMemo(() => weekOf(today), [today])
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const goToPreviousMonth = () =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
  const goToNextMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
  const goToToday = () => setCursor(today)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="calendar"
        action={
          <div className="hidden items-center gap-3 md:flex">
            <p className="tabular text-body-m text-text-secondary">{monthLabel}</p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="s" onClick={goToPreviousMonth}>
                previous
              </Button>
              <Button variant="ghost" size="s" onClick={goToToday}>
                today
              </Button>
              <Button variant="ghost" size="s" onClick={goToNextMonth}>
                next
              </Button>
            </div>
          </div>
        }
      />

      <MonthGrid grid={grid} month={cursor.getMonth()} events={events} today={today} />

      <div data-week-strip className="flex flex-col gap-6 md:hidden">
        <WeekStrip days={week} today={today} />
        <Agenda events={events} companyByJobId={companyByJobId} />
      </div>
    </div>
  )
}
