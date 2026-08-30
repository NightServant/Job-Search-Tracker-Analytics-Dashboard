'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  useTimeInStage,
  useConversionFunnel,
  useSourceConversionTrends,
  useCohortAnalysis,
  useConversionMetrics,
} from '@/hooks/useAnalytics'
import { useJobs } from '@/hooks/useJobs'
import { Analytics, type MetricState } from '@/components/analytics/Analytics'
import { RouteLoading, RouteError } from '@/components/ui/route-states'

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

  const timeInStage = useTimeInStage(userId)
  const conversionFunnel = useConversionFunnel(userId)
  const sourceConversionTrends = useSourceConversionTrends(userId)
  const cohortAnalysis = useCohortAnalysis(userId)
  const conversionMetrics = useConversionMetrics(userId)
  // Salary insights derives its distribution from the jobs themselves: no
  // analyticsService method returns one, and the rows already carry
  // salary_min/salary_max/salary_currency. Deliberately outside this route's
  // loading/error gate -- one slow list must not blank five working panels.
  const { data: jobs = [] } = useJobs()

  const queries = [timeInStage, conversionFunnel, sourceConversionTrends, cohortAnalysis, conversionMetrics]

  if (queries.every((q) => q.isLoading)) {
    return <RouteLoading />
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
      sourceConversionTrends={toState(sourceConversionTrends)}
      cohortAnalysis={toState(cohortAnalysis)}
      conversionMetrics={toState(conversionMetrics)}
    />
  )
}
