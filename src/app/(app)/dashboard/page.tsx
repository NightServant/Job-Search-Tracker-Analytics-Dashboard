'use client'

import { useJobs } from '@/hooks/useJobs'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon } from '@/components/icons'

/**
 * Thin route wrapper. All the layout lives in `Dashboard`, which takes its
 * data as props so it can be rendered directly in tests without going
 * through Next routing -- this component's only job is to fetch and hand it
 * off.
 *
 * Goes through `useJobs()` rather than calling `jobService.getJobs()`
 * directly, because `JobsPage`, `JobForm` and `useJobStats` all read the same
 * react-query cache under the `['jobs', user?.id]` key. A separate
 * `useEffect` fetch here would be a second, cache-independent copy of the
 * list: edit an application on `/applications` and land back here, and the
 * KPI strip would show pre-edit numbers until a hard reload -- exactly what
 * mounting react-query is meant to prevent.
 */
export default function Page() {
  const { data: jobs = [], isLoading, error } = useJobs()

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={24} />
      </div>
    )
  }

  // A KPI strip full of zeros looks exactly like an empty account, so a
  // failed fetch has to say so rather than silently rendering one.
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <AlertCircleIcon size={32} className="text-status-rejected-mark" />
        <p className="text-body-m text-text-primary">Could not load your dashboard.</p>
        <p className="text-body-s text-text-muted">
          {error instanceof Error ? error.message : 'An error occurred while loading your applications.'}
        </p>
        <Button variant="secondary" size="s" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return <Dashboard jobs={jobs} />
}
