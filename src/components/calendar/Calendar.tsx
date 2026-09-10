'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@/components/icons'
import { buildMonthGrid, weekOf } from '@/lib/calendar'
import { MonthGrid } from './MonthGrid'
import { WeekStrip } from './WeekStrip'
import { Agenda } from './Agenda'
import type { CalendarEvent } from '@/services/events'
import type { HolidayCountry, PublicHoliday } from '@/services/holidays'

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
  /** Public holidays for the years this screen is currently showing. */
  holidays?: PublicHoliday[]
  /** Whose holidays. `null` until one is chosen; see services/holidays. */
  holidayCountry?: string | null
  /** What the picker offers. Empty means no picker is drawn at all. */
  holidayCountries?: HolidayCountry[]
  onHolidayCountryChange?: (countryCode: string) => void
  /**
   * The years the grid currently covers, so the caller can fetch exactly
   * those.
   *
   * IT IS REPORTED RATHER THAN ASKED FOR because the month cursor lives here
   * -- this is the only component that knows a December grid reaches into
   * January of the next year. The route owns the fetch, per the same
   * route-owns-the-reads split the rest of this screen follows; this is the
   * one fact it cannot work out on its own.
   */
  onVisibleYearsChange?: (years: number[]) => void
}

export function Calendar({
  events,
  companyByJobId = {},
  holidays = [],
  holidayCountry = null,
  holidayCountries = [],
  onHolidayCountryChange,
  onVisibleYearsChange,
}: CalendarProps) {
  const today = React.useMemo(() => new Date(), [])
  const [cursor, setCursor] = React.useState(today)

  const grid = React.useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  )
  const week = React.useMemo(() => weekOf(today), [today])
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Every year the padded grid touches, plus the current week's -- the mobile
  // layout shows that week regardless of where the desktop cursor is.
  const visibleYears = React.useMemo(() => {
    const years = new Set<number>([today.getFullYear()])
    for (const date of grid.flat()) years.add(date.getFullYear())
    return [...years].sort()
  }, [grid, today])

  const yearsKey = visibleYears.join(',')
  React.useEffect(() => {
    onVisibleYearsChange?.(yearsKey.split(',').map(Number))
    // Keyed on the joined list rather than the array: a fresh array every
    // render would re-report on every render, and `onVisibleYearsChange` is a
    // fresh closure from the route on each of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearsKey])

  const goToPreviousMonth = () =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
  const goToNextMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
  const goToToday = () => setCursor(today)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="calendar"
        description="interviews and follow-ups, laid out by month."
        action={
          <div className="flex flex-wrap items-center gap-3">
            {/* THE COUNTRY IS PART OF THE ANSWER, so it is on screen rather
                than buried in settings. A browser's language tag says what
                language somebody reads, not where they live, so the detected
                value is a guess -- and a calendar quietly showing the wrong
                country's holidays is worse than one showing none. Visible at
                every width, unlike the month nav beside it, because it is the
                one control the mobile layout also depends on. */}
            {holidayCountries.length > 0 && (
              // THE WIDTH IS ON A WRAPPER, not on the Select. `Select`'s own
              // root is `w-full` and only its trigger takes `className`, so a
              // width passed in sizes the button inside a box that is still
              // claiming the whole row -- which pushed the month controls onto
              // a second line at every desktop width.
              <div className="w-52 shrink-0 max-sm:w-full">
                <Select
                  id="holiday-country"
                  icon="Globe"
                  aria-label="Public holidays for"
                  value={holidayCountry ?? ''}
                  onValueChange={(next) => onHolidayCountryChange?.(next)}
                  items={holidayCountries.map((country) => ({
                    value: country.countryCode,
                    label: `${country.name} holidays`,
                  }))}
                />
              </div>
            )}
            <div className="hidden items-center gap-3 md:flex">
            <p className="tabular text-body-m text-text-secondary">{monthLabel}</p>
            {/* Icons sit on the side the control moves you toward, so the
                pair reads as one axis; `today` takes the calendar glyph
                because it is a jump to a date rather than a step along one. */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="s" onClick={goToPreviousMonth}>
                <ChevronLeftIcon size={16} aria-hidden className="[&_svg]:size-4" />
                previous
              </Button>
              <Button variant="ghost" size="s" onClick={goToToday}>
                <CalendarIcon size={16} aria-hidden className="[&_svg]:size-4" />
                today
              </Button>
              <Button variant="ghost" size="s" onClick={goToNextMonth}>
                next
                <ChevronRightIcon size={16} aria-hidden className="[&_svg]:size-4" />
              </Button>
            </div>
            </div>
          </div>
        }
        rule
      />

      <MonthGrid
        grid={grid}
        month={cursor.getMonth()}
        events={events}
        holidays={holidays}
        today={today}
      />

      <div data-week-strip className="flex flex-col gap-6 md:hidden">
        <WeekStrip days={week} holidays={holidays} today={today} />
        <Agenda events={events} companyByJobId={companyByJobId} />
      </div>
    </div>
  )
}
