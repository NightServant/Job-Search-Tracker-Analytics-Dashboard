'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { buildMonthGrid, weekOf } from '@/lib/calendar'
import { useJobs } from '@/hooks/useJobs'
import { MonthGrid } from './MonthGrid'
import { WeekStrip } from './WeekStrip'
import { Agenda } from './Agenda'
import type { CalendarEvent } from '@/services/events'

/**
 * The calendar screen's body, over plain props -- same split as `Dashboard`
 * (Task 3) and `DetailPage` (Task 5), so it renders without Next routing or
 * react-query for its `events` prop. `src/app/(app)/calendar/page.tsx` owns
 * the `eventService.listUpcoming` read this screen needs.
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
 *
 * `useJobs()` is called here directly, not threaded in as a prop from the
 * route -- it is the one exception to this component's "plain props" split.
 * Roadmap 5.7 requires the agenda carry each event's company, and
 * `CalendarEvent` has only `job_id`; `useJobs()` is the same shared
 * `['jobs', user?.id]` cache every other screen in this branch already
 * reads (Task 3's ruling for `Dashboard`), so this is a second read of data
 * already in cache, not a new query. Component tests mock `@/hooks/useJobs`
 * the same way `dashboard/__tests__/page.test.tsx` mocks it for the route,
 * rather than standing up `AuthProvider`/`QueryClientProvider`.
 */
export interface CalendarProps {
  events: CalendarEvent[]
}

export function Calendar({ events }: CalendarProps) {
  const { data: jobs = [] } = useJobs()
  const companyByJobId = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const job of jobs) map[job.id] = job.company
    return map
  }, [jobs])

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
        title="Calendar"
        action={
          <div className="hidden items-center gap-3 md:flex">
            <p className="tabular text-body-m text-text-secondary">{monthLabel}</p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="s" onClick={goToPreviousMonth}>
                Previous
              </Button>
              <Button variant="ghost" size="s" onClick={goToToday}>
                Today
              </Button>
              <Button variant="ghost" size="s" onClick={goToNextMonth}>
                Next
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
