'use client'

import * as React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useTimeInStage,
  useConversionFunnel,
  useStatusTransitions,
  useCohortAnalysis,
  useConversionMetrics,
} from '@/hooks/useAnalytics'
import { useJobs } from '@/hooks/useJobs'
import { Analytics, type MetricState } from '@/components/analytics/Analytics'
import { RouteSkeleton } from '@/components/ui/loading-skeletons'
import { RouteError } from '@/components/ui/route-states'
import { rangeStartDate, type RangeOption } from '@/lib/analyticsRange'

function toState<T>(query: { data?: T; isLoading: boolean; error: unknown }): MetricState<T> {
  return { data: query.data ?? null, isLoading: query.isLoading, error: query.error }
}

/**
 * Thin route wrapper, same split as `dashboard/page.tsx` and
 * `calendar/page.tsx`: `Analytics` takes its data as props so it renders
 * without Next routing or react-query, and this file owns every read it
 * needs -- five individual hooks from `src/hooks/useAnalytics.ts` rather
 * than that file's `useAnalytics()` aggregator.
 *
 * The aggregator's `loading` is true if any one of the five underlying
 * queries is loading, and its `error` is the first non-null one -- so a
 * single slow or failed metric would blank a page whose other four panels
 * have something real to show. That is the same class of bug Task 5's
 * review found and fixed for the application detail screen, so this route
 * calls the five hooks directly and hands each one's state to `Analytics`
 * as its own prop, letting `PanelSection` degrade one panel at a time.
 *
 * The route-level gate above `Analytics` only fires at the extremes: a
 * spinner while every metric is still on its first fetch (nothing to show
 * at all yet), and a full-page error only if every metric has failed (a
 * total outage, not one flaky query). Anything in between -- one query
 * still loading, or one query failed, while the rest have data -- renders
 * the page and lets the affected panel say so on its own.
 */
export default function Page() {
  const { user } = useAuth()
  const userId = user?.id

  // THE RANGE LIVES HERE, not in `Analytics`, because it is part of every
  // query key below. Held inside the component it could only ever filter what
  // had already been fetched -- which is exactly how the picker came to look
  // dead: it moved one client-side filter and nothing else.
  const [range, setRange] = React.useState<RangeOption>('all')
  const since = React.useMemo(() => rangeStartDate(range), [range])

  const timeInStage = useTimeInStage(userId, since)
  const conversionFunnel = useConversionFunnel(userId, since)
  const statusTransitions = useStatusTransitions(userId, since)
  const cohortAnalysis = useCohortAnalysis(userId, since)
  const conversionMetrics = useConversionMetrics(userId, since)
  // Salary insights derives its distribution from the jobs themselves: no
  // analyticsService method returns one, and the rows already carry
  // salary_min/salary_max/salary_currency. Deliberately outside this route's
  // loading/error gate -- one slow list must not blank five working panels.
  const { data: jobs = [] } = useJobs()

  const queries = [timeInStage, conversionFunnel, statusTransitions, cohortAnalysis, conversionMetrics]

  // ONLY ON THE FIRST LOAD. Changing the range gives every query a new key,
  // so they all report `isLoading` again -- and blanking the whole screen to
  // a skeleton on every change of the dropdown would be a worse answer than
  // the dead one. `isFetching` on already-cached panels is left to each
  // panel's own state.
  if (queries.every((q) => q.isLoading) && range === 'all') {
    return <RouteSkeleton variant="analytics" />
  }

  if (queries.every((q) => q.error)) {
    const first = queries.find((q) => q.error)?.error
    return (
      <RouteError
        title="could not load your analytics."
        message={first instanceof Error ? first.message : 'An error occurred while loading your analytics.'}
      />
    )
  }

  return (
    <Analytics
      jobs={jobs}
      timeInStage={toState(timeInStage)}
      conversionFunnel={toState(conversionFunnel)}
      statusTransitions={toState(statusTransitions)}
      cohortAnalysis={toState(cohortAnalysis)}
      conversionMetrics={toState(conversionMetrics)}
      range={range}
      onRangeChange={setRange}
    />
  )
}
