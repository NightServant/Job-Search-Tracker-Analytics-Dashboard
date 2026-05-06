import { AlertCircle, Clock } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import type { TimeInStageMetric, ConversionFunnelMetric, CohortAnalysis } from '@/services/analyticsService'

export function TimeInStageSection() {
  const { timeInStage, loading, error } = useAnalytics()

  if (loading) {
    return <div className="card p-5 text-zinc-500">Loading time-in-stage metrics…</div>
  }

  if (error || !timeInStage || timeInStage.length === 0) {
    return null
  }

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        Time In Each Stage
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {timeInStage.map((metric: TimeInStageMetric) => (
          <div key={metric.status} className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary-600" />
              <p className="text-sm font-medium text-zinc-900 dark:text-white capitalize">
                {metric.status}
              </p>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {metric.avgDays}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              avg days
            </p>
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
              <div>Median: {metric.medianDays}d</div>
              <div>{metric.minDays}d–{metric.maxDays}d</div>
              <div>{metric.count} transitions</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ConversionFunnelSection() {
  const { conversionFunnel, conversionMetrics, loading, error } = useAnalytics()

  if (loading) {
    return <div className="card p-5 text-zinc-500">Loading funnel metrics…</div>
  }

  if (error || !conversionFunnel || conversionFunnel.length === 0) {
    return null
  }

  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Conversion Funnel
        </h2>
        {conversionMetrics && (
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Jobs</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {conversionMetrics.totalJobs}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Conversion Rate</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {Math.round(conversionMetrics.conversionRate)}%
              </p>
            </div>
            {conversionMetrics.timeToFirstInterview && (
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Time to Interview
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {conversionMetrics.timeToFirstInterview}d
                </p>
              </div>
            )}
            {conversionMetrics.timeToOffer && (
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Time to Offer
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {conversionMetrics.timeToOffer}d
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Funnel visualization */}
      <div className="space-y-3">
        {conversionFunnel.map((metric: ConversionFunnelMetric, idx: number) => (
          <div key={idx}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {metric.stage}
              </span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                {metric.count} ({Math.round(metric.percentage)}%)
              </span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary-600 h-full transition-all"
                style={{ width: `${metric.percentage}%` }}
              />
            </div>
            {metric.avgDaysToStage > 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                ≈ {metric.avgDaysToStage} days to reach
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CohortAnalysisSection() {
  const { cohortAnalysis, loading, error } = useAnalytics()

  if (loading) {
    return <div className="card p-5 text-zinc-500">Loading cohort analysis…</div>
  }

  if (error || !cohortAnalysis || cohortAnalysis.length === 0) {
    return null
  }

  // Find best performing cohort
  const bestCohort = cohortAnalysis.reduce((best, current) =>
    current.conversionRate > best.conversionRate ? current : best
  )

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        Cohort Analysis
      </h2>

      {/* Best Cohort Highlight */}
      {bestCohort && (
        <div className="mb-4 p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 rounded-lg border border-primary-200 dark:border-primary-700">
          <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
            Best Performing Cohort
          </p>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-primary-700 dark:text-primary-300">Month</p>
              <p className="font-semibold text-primary-900 dark:text-primary-100">
                {bestCohort.cohort}
              </p>
            </div>
            <div>
              <p className="text-xs text-primary-700 dark:text-primary-300">
                Conversion Rate
              </p>
              <p className="font-semibold text-primary-900 dark:text-primary-100">
                {Math.round(bestCohort.conversionRate)}%
              </p>
            </div>
            {bestCohort.avgTimeToOffer && (
              <div>
                <p className="text-xs text-primary-700 dark:text-primary-300">
                  Avg Time to Offer
                </p>
                <p className="font-semibold text-primary-900 dark:text-primary-100">
                  {bestCohort.avgTimeToOffer}d
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cohort Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Cohort
              </th>
              <th className="text-right px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Applied
              </th>
              <th className="text-right px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Interviews
              </th>
              <th className="text-right px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Offers
              </th>
              <th className="text-right px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Conv. Rate
              </th>
              <th className="text-right px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Days to Offer
              </th>
            </tr>
          </thead>
          <tbody>
            {cohortAnalysis.map((cohort: CohortAnalysis) => (
              <tr key={cohort.cohort} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-2 py-2 text-zinc-900 dark:text-white font-medium">
                  {cohort.cohort}
                </td>
                <td className="text-right px-2 py-2 text-zinc-700 dark:text-zinc-300">
                  {cohort.jobsApplied}
                </td>
                <td className="text-right px-2 py-2 text-zinc-700 dark:text-zinc-300">
                  {cohort.jobsInterviewing}
                </td>
                <td className="text-right px-2 py-2 text-zinc-700 dark:text-zinc-300">
                  {cohort.jobsOffered}
                </td>
                <td className="text-right px-2 py-2">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {Math.round(cohort.conversionRate)}%
                  </span>
                </td>
                <td className="text-right px-2 py-2 text-zinc-700 dark:text-zinc-300">
                  {cohort.avgTimeToOffer ? `${cohort.avgTimeToOffer}d` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SourceConversionSection() {
  const { sourceConversionTrends, loading, error } = useAnalytics()

  if (loading) {
    return <div className="card p-5 text-zinc-500">Loading source trends…</div>
  }

  if (error || !sourceConversionTrends || sourceConversionTrends.length === 0) {
    return null
  }

  // Group by source and get latest month data
  const latestBySource = new Map<string, (typeof sourceConversionTrends)[0]>()
  for (const trend of sourceConversionTrends) {
    const existing = latestBySource.get(trend.source)
    if (!existing || trend.month > existing.month) {
      latestBySource.set(trend.source, trend)
    }
  }

  const sortedByConversion = Array.from(latestBySource.values()).sort(
    (a, b) => b.conversionRate - a.conversionRate
  )

  // Find best source
  const bestSource = sortedByConversion[0]

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        Source Performance
      </h2>

      {bestSource && (
        <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 rounded-lg border border-emerald-200 dark:border-emerald-700">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Top Converting Source
          </p>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">Source</p>
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                {bestSource.source}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Conversion Rate
              </p>
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                {Math.round(bestSource.conversionRate)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Offers ({bestSource.month})
              </p>
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                {bestSource.offer}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Source Performance Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Source
              </th>
              <th className="text-right px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Applied
              </th>
              <th className="text-right px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Interviews
              </th>
              <th className="text-right px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Offers
              </th>
              <th className="text-right px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                Conv. Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedByConversion.map((trend) => (
              <tr key={trend.source} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-2 py-2 text-zinc-900 dark:text-white font-medium">
                  {trend.source}
                </td>
                <td className="text-right px-2 py-2 text-zinc-700 dark:text-zinc-300">
                  {trend.applied}
                </td>
                <td className="text-right px-2 py-2 text-zinc-700 dark:text-zinc-300">
                  {trend.interviewing}
                </td>
                <td className="text-right px-2 py-2 text-zinc-700 dark:text-zinc-300">
                  {trend.offer}
                </td>
                <td className="text-right px-2 py-2">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {Math.round(trend.conversionRate)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AnalyticsSections() {
  const { error } = useAnalytics()

  if (error) {
    return (
      <div className="card p-5 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900 dark:text-red-100">Failed to load analytics</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Please check your data and try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TimeInStageSection />
      <ConversionFunnelSection />
      <CohortAnalysisSection />
      <SourceConversionSection />
    </div>
  )
}
