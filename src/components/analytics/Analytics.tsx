'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AlertCircleIcon } from '@/components/icons'
import { Callout } from './Callout'
import { SalaryInsights } from './SalaryInsights'
import type { Job } from '@/types'
import { KpiStat } from '@/components/ui/kpi-stat'
import { Skeleton } from '@/components/ui/skeleton'
import { RangePicker } from './RangePicker'
import { FunnelChart, normalizeFunnel } from './FunnelChart'
import { TimeInStage } from './TimeInStage'
import { SourceTrends } from './SourceTrends'
import { CohortTable } from './CohortTable'
import { filterByMonth, rangeLabel, type RangeOption } from '@/lib/analyticsRange'
import type {
  TimeInStageMetric,
  ConversionFunnelMetric,
  SourceConversionTrend,
  CohortAnalysis,
  ConversionMetrics,
} from '@/services/analyticsService'

/**
 * One query's worth of state, mirroring what a react-query result carries.
 * Kept as a plain shape (rather than importing `UseQueryResult`) so this
 * component has no react-query dependency of its own -- `page.tsx` is the
 * only file that touches the hooks, matching ruling D.
 */
export interface MetricState<T> {
  data: T | null
  isLoading: boolean
  error: unknown
}

export interface AnalyticsProps {
  timeInStage: MetricState<TimeInStageMetric[]>
  conversionFunnel: MetricState<ConversionFunnelMetric[]>
  sourceConversionTrends: MetricState<SourceConversionTrend[]>
  cohortAnalysis: MetricState<CohortAnalysis[]>
  conversionMetrics: MetricState<ConversionMetrics>
  /**
   * For the salary panel only. Derived from rows the app already has rather
   * than a new analyticsService query -- see `lib/salaryHistogram`.
   */
  jobs?: Job[]
}

/**
 * A Card wearing PanelSection's error treatment.
 *
 * Gabe asked for the card component on this screen. `PanelSection` supplied
 * the heading, the hairline and -- the part that matters -- a failed-read
 * state distinct from an empty one, which M5's Task 5 needed a fix round to
 * get right. Swapping to a bare Card would have quietly dropped that, so the
 * error branch moves here instead of disappearing.
 */
function AnalyticsPanel({
  title,
  action,
  error,
  children,
}: {
  title: string
  action?: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    // data-analytics-panel because Card renders a div where PanelSection
    // rendered a <section>. An unnamed <section> is not a landmark, so nothing
    // in the accessibility tree is lost -- but the panel boundary still has to
    // be addressable, by tests and by anything that needs to scope a query to
    // one panel.
    <Card data-analytics-panel>
      <CardHeader>
        {/* An <h2> inside CardTitle, not instead of it: CardTitle renders a
            div, so converting these panels to Cards silently removed every
            panel heading from the accessibility tree and from the document
            outline. Tailwind's preflight resets heading size and weight to
            inherit, so this is semantics at zero visual cost. */}
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="flex items-center gap-2 text-body-s text-status-rejected-mark">
            <AlertCircleIcon size={16} aria-hidden className="[&_svg]:size-4" />
            {error}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Figma `App Footer` (80:1052) -- six link items with `·` separators. Absent
 * from the code until now. Plain links, not nav: this is the end of a 2560px
 * page, and the sidebar is the navigation.
 */
function AppFooter({ className }: { className?: string }) {
  const links = [
    { href: '/dashboard', label: 'overview' },
    { href: '/applications', label: 'applications' },
    { href: '/calendar', label: 'calendar' },
    { href: '/documents', label: 'documents' },
    { href: '/analytics', label: 'analytics' },
    { href: '/settings', label: 'settings' },
  ]
  return (
    <footer
      data-app-footer
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border-subtle pt-6 text-body-s text-text-muted',
        className
      )}
    >
      {links.map((link, i) => (
        <React.Fragment key={link.href}>
          {i > 0 && <span aria-hidden>·</span>}
          <Link href={link.href} className="hover:text-accent-default">
            {link.label}
          </Link>
        </React.Fragment>
      ))}
    </footer>
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not load this metric.'
}

function Span({ children }: { children: React.ReactNode }) {
  return <span className="text-body-s text-text-muted">{children}</span>
}

function PanelBody({
  state,
  empty,
  render,
}: {
  state: MetricState<unknown>
  empty: boolean
  render: () => React.ReactNode
}) {
  if (state.isLoading) {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">loading</span>
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (empty) {
    return <p className="text-body-s text-text-muted">not enough data yet.</p>
  }
  return <>{render()}</>
}

function Overview({ data }: { data: ConversionMetrics | null }) {
  const metrics = data ?? {
    totalJobs: 0,
    timeToFirstInterview: null,
    timeToOffer: null,
    conversionRate: 0,
    conversionBySource: {},
  }
  return (
    <div data-overview-kpis className="grid grid-cols-2 gap-6 md:grid-cols-4">
      <KpiStat label="total applications" value={metrics.totalJobs} />
      <KpiStat
        label="time to first interview"
        value={metrics.timeToFirstInterview === null ? '—' : `${metrics.timeToFirstInterview}d`}
      />
      <KpiStat label="time to offer" value={metrics.timeToOffer === null ? '—' : `${metrics.timeToOffer}d`} />
      <KpiStat label="conversion rate" value={`${Math.round(metrics.conversionRate)}%`} />
    </div>
  )
}

/**
 * The analytics screen's body, over plain props -- same split as `Dashboard`
 * (Task 3) and `Calendar` (Task 6), so it renders without Next routing or
 * react-query. `src/app/(app)/analytics/page.tsx` owns all five reads this
 * screen needs, one hook per metric.
 *
 * Deliberately NOT wired through `useAnalytics()`, the aggregator hook
 * already in `src/hooks/useAnalytics.ts`. Its `loading` is true if any of
 * the five underlying queries is loading, and its `error` is the first
 * non-null one of the five -- so one slow or failed metric blanks a page
 * that has four other panels with something to show. That is the exact
 * defect Task 5's review found and fixed for the application detail screen
 * ("secondary fetch errors read as empty states"), so this screen takes the
 * same five hooks individually instead and gives each panel its own state
 * via `PanelSection`'s `error` prop -- with `PanelBody` additionally telling
 * "still loading" and "loaded but genuinely empty" apart, which `error`
 * alone does not cover.
 *
 * The range picker only reaches two of five panels. Every `analyticsService`
 * method takes just `userId` -- no date range -- and of the five return
 * shapes only `SourceConversionTrend` (`month`) and `CohortAnalysis`
 * (`cohort`) carry a time dimension at all. `TimeInStageMetric`,
 * `ConversionFunnelMetric` and `ConversionMetrics` cannot be range-filtered,
 * even client-side, so their panels read "All time" instead of silently
 * ignoring a control that would otherwise appear to govern them. See the
 * pre-flight ruling in
 * `.superpowers/sdd/2026-08-25-m5-application-screens/progress.md` for why
 * this is the shipped shape rather than a placeholder -- adding a range
 * parameter to `analyticsService` is parked as M2 work.
 */
export function Analytics({
  timeInStage,
  conversionFunnel,
  sourceConversionTrends,
  cohortAnalysis,
  conversionMetrics,
  jobs = [],
}: AnalyticsProps) {
  const [range, setRange] = React.useState<RangeOption>('all')

  const filteredTrends = React.useMemo(
    () =>
      sourceConversionTrends.data
        ? filterByMonth(sourceConversionTrends.data, (t) => t.month, range)
        : [],
    [sourceConversionTrends.data, range]
  )
  const filteredCohorts = React.useMemo(
    () => (cohortAnalysis.data ? filterByMonth(cohortAnalysis.data, (c) => c.cohort, range) : []),
    [cohortAnalysis.data, range]
  )

  const funnelData = React.useMemo(
    () => normalizeFunnel(conversionFunnel.data ?? []),
    [conversionFunnel.data]
  )

  // Both callouts are SELECTED from the rows their own table already shows --
  // one sort, no query. No analyticsService method returns a "best" anything,
  // and inventing one for a superlative already in memory is how M5's Task 8
  // ended up with a range picker over services that take no range.
  const bestCohort = React.useMemo(
    () =>
      filteredCohorts.length === 0
        ? null
        : [...filteredCohorts].sort((a, b) => b.conversionRate - a.conversionRate)[0],
    [filteredCohorts]
  )

  const topSource = React.useMemo(() => {
    if (filteredTrends.length === 0) return null
    const totals = new Map<string, { applied: number; offer: number }>()
    for (const row of filteredTrends) {
      const acc = totals.get(row.source) ?? { applied: 0, offer: 0 }
      acc.applied += row.applied
      acc.offer += row.offer
      totals.set(row.source, acc)
    }
    return [...totals.entries()]
      .map(([source, t]) => ({
        source,
        applied: t.applied,
        offer: t.offer,
        rate: t.applied > 0 ? Math.round((t.offer / t.applied) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate || b.applied - a.applied)[0]
  }, [filteredTrends])

  return (
    // Two columns from lg. A 2560px single column meant a lot of scrolling
    // past half-empty panels; paired, each panel gets a width that suits it and
    // the page halves in height. The footer spans both (lg:col-span-2) because
    // it is the end of the page, not a panel.
    <div className="grid gap-8 lg:grid-cols-2">
      <PageHeader className="lg:col-span-2" title="analytics" action={<RangePicker value={range} onChange={setRange} />} />

      <AnalyticsPanel
        title="overview"
        action={<Span>all time</Span>}
        error={conversionMetrics.error ? errorMessage(conversionMetrics.error) : undefined}
      >
        <PanelBody state={conversionMetrics} empty={false} render={() => <Overview data={conversionMetrics.data} />} />
      </AnalyticsPanel>

      <AnalyticsPanel
        title="conversion funnel"
        action={<Span>all time</Span>}
        error={conversionFunnel.error ? errorMessage(conversionFunnel.error) : undefined}
      >
        <PanelBody
          state={conversionFunnel}
          empty={funnelData.length === 0}
          render={() => <FunnelChart data={funnelData} />}
        />
      </AnalyticsPanel>

      <AnalyticsPanel
        title="time in stage"
        action={<Span>all time</Span>}
        error={timeInStage.error ? errorMessage(timeInStage.error) : undefined}
      >
        <PanelBody
          state={timeInStage}
          empty={(timeInStage.data ?? []).length === 0}
          render={() => <TimeInStage data={timeInStage.data ?? []} />}
        />
      </AnalyticsPanel>

      <AnalyticsPanel
        title="source trends"
        action={<Span>{rangeLabel(range)}</Span>}
        error={sourceConversionTrends.error ? errorMessage(sourceConversionTrends.error) : undefined}
      >
        <PanelBody
          state={sourceConversionTrends}
          empty={filteredTrends.length === 0}
          render={() => (
            <div className="flex flex-col gap-6">
              <SourceTrends data={filteredTrends} />
              {topSource && (
                <Callout
                  label="top converting source"
                  metrics={[
                    { label: 'source', value: topSource.source },
                    { label: 'applications', value: String(topSource.applied) },
                    { label: 'offer rate', value: `${topSource.rate}%` },
                  ]}
                />
              )}
            </div>
          )}
        />
      </AnalyticsPanel>

      <AnalyticsPanel
        title="cohort analysis"
        action={<Span>{rangeLabel(range)}</Span>}
        error={cohortAnalysis.error ? errorMessage(cohortAnalysis.error) : undefined}
      >
        <PanelBody
          state={cohortAnalysis}
          empty={filteredCohorts.length === 0}
          render={() => (
            <div className="flex flex-col gap-6">
              {bestCohort && (
                <Callout
                  label="best performing cohort"
                  metrics={[
                    { label: 'cohort', value: bestCohort.cohort },
                    { label: 'applied', value: String(bestCohort.jobsApplied) },
                    { label: 'conversion', value: `${Math.round(bestCohort.conversionRate)}%` },
                  ]}
                />
              )}
              <CohortTable data={filteredCohorts} />
            </div>
          )}
        />
      </AnalyticsPanel>

      <AnalyticsPanel title="salary insights" action={<Span>all time</Span>}>
        <SalaryInsights jobs={jobs} />
      </AnalyticsPanel>

      <AppFooter className="lg:col-span-2" />
    </div>
  )
}
