'use client'

import * as React from 'react'
import { useEvents } from '@/hooks/useEvents'
import { useJobs } from '@/hooks/useJobs'
import { useCalendarExtras } from '@/hooks/useCalendarExtras'
import { Calendar } from '@/components/calendar/Calendar'
import { JobFeed } from '@/components/calendar/JobFeed'
import { dayKey } from '@/lib/calendar'
import { RouteSkeleton } from '@/components/ui/loading-skeletons'
import { RouteError } from '@/components/ui/route-states'

/**
 * Thin route wrapper, same split as `dashboard/page.tsx`: `Calendar` takes
 * its data as props so it renders without Next routing or react-query, and
 * this file owns both reads it needs.
 *
 * `useEvents()` (wrapping `eventService.listUpcoming`) is the primary read
 * and the one that gates loading/error, same as `dashboard/page.tsx` gates
 * on its single `useJobs()` call. `useJobs()` here is a second, supplementary
 * read -- the same shared `['jobs', user?.id]` cache every other screen in
 * this branch already reads -- used only to build `companyByJobId` for the
 * agenda's company line (roadmap 5.7). It deliberately does NOT gate the
 * route: a still-loading or failed jobs fetch must not block the calendar's
 * primary content, it should just mean company enrichment is temporarily
 * empty until the cache resolves -- the identical behaviour `Calendar` had
 * when it read `useJobs()` itself in fix round 1, now just relocated here.
 *
 * `useJobs()` moved from inside `Calendar` (fix round 1) to here (fix round
 * 2) so `Calendar` stays a plain-props component per ruling R3, matching
 * how `applications/page.tsx` also calls multiple hooks at the route and
 * gates only on the primary one.
 *
 * PUBLIC HOLIDAYS (Gabe, 2026-09-10) are a third read, and the same rule
 * applies to them: supplementary, so they never gate the route. A calendar
 * that will not draw because a third-party holiday API is down would be a
 * worse screen than one drawn without holidays -- the interviews are the
 * point, the holidays are context.
 *
 * THE COUNTRY LIVES IN localStorage, NOT IN THE DATABASE, and that is a
 * deliberate limit rather than an oversight. `user_preferences` would mean a
 * migration, a service method and a mutation for a display preference that
 * costs one click to re-pick; per-browser is the honest size of the thing.
 * The trade is stated so nobody is surprised: a second device asks again.
 */
export default function Page() {
  const { data: events = [], isLoading, error } = useEvents()
  const { data: jobs = [] } = useJobs()

  // Holidays and the fresh-roles feed, plus the per-browser choices in front
  // of them. Shared with /demo/calendar, which renders the same two panels
  // over a fixture -- see useCalendarExtras for why they are not inlined here.
  const extras = useCalendarExtras()

  const companyByJobId = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const job of jobs) map[job.id] = job.company
    return map
  }, [jobs])

  /**
   * Applications sent per calendar day, for the grid.
   *
   * `date_applied` is a bare DATE, so it is turned into a local `Date` by
   * PARTS rather than by `new Date(string)` -- the latter reads it as UTC
   * midnight, which is the previous day for anyone behind UTC and would file
   * the whole month one cell to the left. Same rule `jobStats` follows.
   */
  const applicationsByDay = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const job of jobs) {
      if (!job.date_applied) continue
      const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(job.date_applied)
      if (!parts) continue
      const key = dayKey(new Date(+parts[1], +parts[2] - 1, +parts[3]))
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [jobs])

  if (isLoading) {
    return <RouteSkeleton variant="calendar" />
  }

  if (error) {
    return (
      <RouteError
        title="could not load your calendar."
        message={error instanceof Error ? error.message : 'An error occurred while loading your events.'}
      />
    )
  }

  return (
    <Calendar
      events={events}
      companyByJobId={companyByJobId}
      {...extras.calendar}
      applicationsByDay={applicationsByDay}
      feed={<JobFeed {...extras.feed} />}
    />
  )
}
