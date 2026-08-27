'use client'

import * as React from 'react'
import { useEvents } from '@/hooks/useEvents'
import { useJobs } from '@/hooks/useJobs'
import { Calendar } from '@/components/calendar/Calendar'
import { RouteLoading, RouteError } from '@/components/ui/route-states'

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
 */
export default function Page() {
  const { data: events = [], isLoading, error } = useEvents()
  const { data: jobs = [] } = useJobs()

  const companyByJobId = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const job of jobs) map[job.id] = job.company
    return map
  }, [jobs])

  if (isLoading) {
    return <RouteLoading />
  }

  if (error) {
    return (
      <RouteError
        title="Could not load your calendar."
        message={error instanceof Error ? error.message : 'An error occurred while loading your events.'}
      />
    )
  }

  return <Calendar events={events} companyByJobId={companyByJobId} />
}
