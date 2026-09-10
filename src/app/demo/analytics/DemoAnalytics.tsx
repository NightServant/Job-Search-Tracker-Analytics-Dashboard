'use client'

import * as React from 'react'
import { Analytics } from '@/components/analytics/Analytics'
import { DEMO, buildAnalytics } from '@/lib/demoFixture'
import { rangeStartDate, type RangeOption } from '@/lib/analyticsRange'

/**
 * Analytics takes a MetricState per panel, mirroring what a react-query result
 * carries. The fixture supplies already-resolved ones: never loading, never
 * errored, always data. That is not a shortcut -- there is no query to be
 * loading, and a demo that flashes skeletons it will never replace would be
 * imitating latency it does not have.
 */
const resolved = <T,>(data: T) => ({ data, isLoading: false, error: null })

export function DemoAnalytics() {
  const [range, setRange] = React.useState<RangeOption>('all')

  // THE DEMO'S VERSION OF THE SERVICE FIX. On the real screen a narrowed range
  // reaches `analyticsService`, which scopes the rows before aggregating them.
  // There is no service here, so the same window is applied to the fixture's
  // rows and the five aggregates are rebuilt from what is left -- by the same
  // function that built them in the first place, so the demo's analytics can
  // never contradict its own applications list.
  const { jobs, analytics } = React.useMemo(() => {
    const since = rangeStartDate(range)
    if (!since) return { jobs: DEMO.jobs, analytics: DEMO.analytics }
    const scoped = DEMO.jobs.filter(
      (job) => (job.date_applied ?? job.created_at.slice(0, 10)) >= since
    )
    return { jobs: scoped, analytics: buildAnalytics(scoped) }
  }, [range])

  return (
    <Analytics
      timeInStage={resolved(analytics.timeInStage)}
      conversionFunnel={resolved(analytics.conversionFunnel)}
      statusTransitions={resolved(analytics.statusTransitions)}
      cohortAnalysis={resolved(analytics.cohortAnalysis)}
      conversionMetrics={resolved(analytics.conversionMetrics)}
      jobs={jobs}
      range={range}
      onRangeChange={setRange}
    />
  )
}
