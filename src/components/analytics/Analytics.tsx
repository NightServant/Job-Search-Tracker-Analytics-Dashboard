'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card'
import { AlertCircleIcon } from '@/components/icons'
import { EmptyState } from '@/components/ui/empty-state'
import { Callout } from './Callout'
import { SalaryInsights } from './SalaryInsights'
import { PipelineFlow } from './PipelineFlow'
import type { Job } from '@/types'
import { KpiStat } from '@/components/ui/kpi-stat'
import { Skeleton } from '@/components/ui/skeleton'
import { RangePicker } from './RangePicker'
import { FunnelChart, normalizeFunnel } from './FunnelChart'
import { TimeInStage } from './TimeInStage'
import { CohortTable } from './CohortTable'
import { filterByMonth, rangeLabel, type RangeOption } from '@/lib/analyticsRange'
import { salaryDistribution } from '@/lib/salaryHistogram'
import type {
  StatusTransition,
  TimeInStageMetric,
  ConversionFunnelMetric,
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
  statusTransitions: MetricState<StatusTransition[]>
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
    <Card data-analytics-panel className="h-full">
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


function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not load this metric.'
}

function Span({ children }: { children: React.ReactNode }) {
  return <span className="text-body-s text-text-muted">{children}</span>
}

function PanelBody({
  state,
  render,
}: {
  state: MetricState<unknown>
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
  return <>{render()}</>
}

/**
 * Whether a panel should be left off the page entirely.
 *
 * Gabe's call: a panel with nothing to show is not shown. Six cards each
 * saying "not enough data yet" is six times the same sentence and reads as a
 * broken page rather than a new account.
 *
 * Loading and failed are NOT blank. A panel still fetching has to hold its
 * place or the page reflows under the reader as each query lands, and a failed
 * read must say so -- silently dropping a panel because its query errored
 * would tell the reader they have no salary data when the truth is that
 * nobody knows. Only a query that succeeded and genuinely returned nothing
 * takes its panel off the page.
 */
function blank(state: MetricState<unknown>, empty: boolean): boolean {
  return !state.isLoading && !state.error && empty
}

/**
 * One panel's place in the grid. `span` is what the panel WANTS; `layOut`
 * decides what it gets.
 */
interface PanelSpec {
  key: string
  span: 'full' | 'half'
  node: React.ReactNode
}

/**
 * Assigns column spans against the panels that actually rendered.
 *
 * Panels are hidden when their query returns nothing, so the set on the page
 * changes as an account fills up -- which means a hardcoded arrangement is
 * wrong the moment one panel drops out of it. Two half-width panels declared
 * side by side become one half-width panel and a hole when the second is
 * hidden, and every panel after it shifts to the wrong column.
 *
 * So the spans are computed from the visible list, not written into it. Walk
 * it in order tracking which column is next: a full-width panel takes the row
 * and resets to column one; a half-width panel pairs with the next one if
 * there is a half-width panel to pair with, and is promoted to full width if
 * there is not. A lone chart then fills its row instead of sitting beside a
 * gap, and the arrangement re-forms itself for whatever subset is present.
 *
 * Order is still the author's -- this only decides widths.
 */
function layOut(specs: PanelSpec[]): Array<PanelSpec & { full: boolean }> {
  const out: Array<PanelSpec & { full: boolean }> = []
  let atRowStart = true
  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i]
    if (spec.span === 'full') {
      out.push({ ...spec, full: true })
      atRowStart = true
      continue
    }
    if (!atRowStart) {
      // Second half of a row already opened by the previous panel.
      out.push({ ...spec, full: false })
      atRowStart = true
      continue
    }
    const partner = specs[i + 1]
    const paired = partner !== undefined && partner.span === 'half'
    out.push({ ...spec, full: !paired })
    atRowStart = !paired
  }
  return out
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
  statusTransitions,
  cohortAnalysis,
  conversionMetrics,
  jobs = [],
}: AnalyticsProps) {
  const [range, setRange] = React.useState<RangeOption>('all')

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


  const salaryCurrency = React.useMemo(() => salaryDistribution(jobs).currency, [jobs])

  // One flag per panel, computed before the return so the "nothing at all yet"
  // case below can ask whether every one of them is blank.
  const hide = {
    overview: blank(conversionMetrics, (conversionMetrics.data?.totalJobs ?? 0) === 0),
    funnel: blank(
      conversionFunnel,
      funnelData.length === 0 || funnelData.every((d) => d.count === 0)
    ),
    pipeline: blank(statusTransitions, (statusTransitions.data ?? []).length === 0),
    timeInStage: blank(
      timeInStage,
      (timeInStage.data ?? []).length === 0 || (timeInStage.data ?? []).every((d) => d.count === 0)
    ),
    // Salary has no query of its own -- it is derived from the jobs the route
    // already holds -- so there is no loading or error state to protect. A null
    // currency means not one job carries a salary.
    salary: salaryCurrency === null,
    cohort: blank(
      cohortAnalysis,
      filteredCohorts.length === 0 || filteredCohorts.every((c) => c.jobsApplied === 0)
    ),
  }

  // Hiding every panel would otherwise leave a page that is nothing but its
  // own title. One empty state stands in for all six.
  if (Object.values(hide).every(Boolean)) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="analytics" action={<RangePicker value={range} onChange={setRange} />} />
        <EmptyState icon="Analytics">
          nothing to chart yet. add applications and move them through the pipeline, and these
          panels appear as the data arrives.
        </EmptyState>
      </div>
    )
  }

  // Declared in reading order with the width each panel wants; `layOut`
  // resolves that against the panels that actually rendered.
  const specs: PanelSpec[] = []

  if (!hide.overview) {
    specs.push({
      key: 'overview',
      span: 'full',
      node: (
        <AnalyticsPanel
          title="overview"
          action={<Span>all time</Span>}
          error={conversionMetrics.error ? errorMessage(conversionMetrics.error) : undefined}
        >
          <PanelBody state={conversionMetrics} render={() => <Overview data={conversionMetrics.data} />} />
        </AnalyticsPanel>
      ),
    })
  }

  if (!hide.funnel) {
    specs.push({
      key: 'funnel',
      span: 'half',
      node: (
        <AnalyticsPanel
          title="conversion funnel"
          action={<Span>all time</Span>}
          error={conversionFunnel.error ? errorMessage(conversionFunnel.error) : undefined}
        >
          <PanelBody state={conversionFunnel} render={() => <FunnelChart data={funnelData} />} />
        </AnalyticsPanel>
      ),
    })
  }

  if (!hide.pipeline) {
    specs.push({
      key: 'pipeline',
      span: 'half',
      node: (
        <AnalyticsPanel
          title="pipeline flow"
          action={<Span>all time</Span>}
          error={statusTransitions.error ? errorMessage(statusTransitions.error) : undefined}
        >
          <PanelBody
            state={statusTransitions}
            render={() => <PipelineFlow transitions={statusTransitions.data ?? []} />}
          />
        </AnalyticsPanel>
      ),
    })
  }

  if (!hide.timeInStage) {
    specs.push({
      key: 'time-in-stage',
      span: 'half',
      node: (
        <AnalyticsPanel
          title="time in stage"
          action={<Span>all time</Span>}
          error={timeInStage.error ? errorMessage(timeInStage.error) : undefined}
        >
          <PanelBody state={timeInStage} render={() => <TimeInStage data={timeInStage.data ?? []} />} />
        </AnalyticsPanel>
      ),
    })
  }

  if (!hide.salary) {
    specs.push({
      key: 'salary',
      span: 'half',
      node: (
        <AnalyticsPanel title="salary insights" action={<Span>all time</Span>}>
          <SalaryInsights jobs={jobs} />
        </AnalyticsPanel>
      ),
    })
  }

  if (!hide.cohort) {
    specs.push({
      key: 'cohort',
      span: 'full',
      node: (
        <AnalyticsPanel
          title="cohort analysis"
          action={<Span>{rangeLabel(range)}</Span>}
          error={cohortAnalysis.error ? errorMessage(cohortAnalysis.error) : undefined}
        >
          <PanelBody
            state={cohortAnalysis}
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
      ),
    })
  }

  return (
    // Two columns from lg. A 2560px single column meant a lot of scrolling
    // past half-empty panels; paired, each panel gets a width that suits it
    // and the page halves in height.
    //
    // Order is the question each panel answers: how am I doing (overview),
    // how far do applications get (funnel), where do they actually go
    // (pipeline flow), how long do they sit (time in stage), what are they
    // worth (salary), then the full month-by-month breakdown last, because a
    // seven-column table is reference material rather than a headline. The
    // two full-width panels sit at the ends, so the four charts in the middle
    // pair off cleanly however many of them are present.
    //
    // Cards in a row stretch to the taller one (grid's default, plus h-full on
    // the Card so it fills the slot it was given). That was briefly turned off
    // -- a panel showing "not enough data yet" grew to its neighbour's height
    // and left a column of dead space under one line of text, the gap Gabe
    // reported under pipeline flow. Hiding empty panels outright removed that
    // case: nothing that stretches is empty any more. So stretch is back on,
    // because the alternative left the SHORTER card floating with the row's
    // dead space beside it instead of inside it, which looks like a hole
    // rather than a card.
    <div className="grid gap-8 lg:grid-cols-2">
      <PageHeader className="lg:col-span-2" title="analytics" action={<RangePicker value={range} onChange={setRange} />} />

      {layOut(specs).map(({ key, node, full }) => (
        <div key={key} data-panel-slot={key} className={full ? 'lg:col-span-2' : undefined}>
          {node}
        </div>
      ))}
    </div>
  )
}

