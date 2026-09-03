import type { Metadata } from 'next'
import { Analytics } from '@/components/analytics/Analytics'
import { DEMO } from '@/lib/demoFixture'

export const metadata: Metadata = {
  title: 'Demo · Analytics',
  description: 'Conversion, time-in-stage and salary insights, over invented data.',
}


/**
 * Analytics takes a MetricState per panel, mirroring what a react-query result
 * carries. The fixture supplies already-resolved ones: never loading, never
 * errored, always data. That is not a shortcut -- there is no query to be
 * loading, and a demo that flashes skeletons it will never replace would be
 * imitating latency it does not have.
 */
const resolved = <T,>(data: T) => ({ data, isLoading: false, error: null })

export default function Page() {
  const { analytics } = DEMO
  return (
    <Analytics
      timeInStage={resolved(analytics.timeInStage)}
      conversionFunnel={resolved(analytics.conversionFunnel)}
      statusTransitions={resolved(analytics.statusTransitions)}
      cohortAnalysis={resolved(analytics.cohortAnalysis)}
      conversionMetrics={resolved(analytics.conversionMetrics)}
      jobs={DEMO.jobs}
    />
  )
}
