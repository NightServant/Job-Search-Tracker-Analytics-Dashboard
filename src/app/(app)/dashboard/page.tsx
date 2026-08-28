'use client'

import { useJobs } from '@/hooks/useJobs'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { RouteLoading, RouteError } from '@/components/ui/route-states'

/**
 * Thin route wrapper. All the layout lives in `Dashboard`, which takes its
 * data as props so it can be rendered directly in tests without going
 * through Next routing -- this component's only job is to fetch and hand it
 * off.
 *
 * Goes through `useJobs()` rather than calling `jobService.getJobs()`
 * directly, because `ApplicationsPage`, `ApplicationForm` and `useJobStats`
 * all read the same react-query cache under the `['jobs', user?.id]` key. A
 * separate `useEffect` fetch here would be a second, cache-independent copy
 * of the list: edit an application on `/applications` and land back here,
 * and the KPI strip would show pre-edit numbers until a hard reload --
 * exactly what mounting react-query is meant to prevent.
 */
export default function Page() {
  const { data: jobs = [], isLoading, error } = useJobs()

  if (isLoading) {
    return <RouteLoading />
  }

  // A KPI strip full of zeros looks exactly like an empty account, so a
  // failed fetch has to say so rather than silently rendering one.
  if (error) {
    return (
      <RouteError
        title="Could not load your dashboard."
        message={error instanceof Error ? error.message : 'An error occurred while loading your applications.'}
      />
    )
  }

  return <Dashboard jobs={jobs} />
}
