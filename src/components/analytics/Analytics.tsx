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
      <CardContent className="flex flex-1 flex-col">
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
 * One panel awaiting placement.
 *
 * `weight` is a rough estimate of the panel's height in arbitrary units, used
 * to balance the two columns. It does not need to be accurate -- only to rank
 * a tall panel above a short one, which is knowable from what the panel
 * contains (a stats row plus a chart plus a table is taller than five bars)
 * and does not need measuring.
 */
interface PanelSpec {
  key: string
  span: 'full' | 'column'
  weight: number
  node: React.ReactNode
}

/**
 * Packs the column panels into two balanced columns.
 *
 * Three layouts were tried before this one and all three failed the same way.
 * A grid lays out in ROWS, so two cards in a row share a height: the shorter
 * one either stretches and carries the difference as empty card, or does not
 * and carries it as a hole beside it. Redistributing that space -- centring
 * it, spreading the rows into it, adding content to fill it -- only moves it.
 * CSS multi-column has no rows and looked like the answer, but `break-inside:
 * avoid` (without which a card splits in half across the column boundary)
 * defeats the browser's balancer: it put a 261px panel alone in one column
 * and stacked 822px in the other.
 *
 * So the packing is explicit. Greedy: walk the panels in the author's order
 * and put each one in whichever column is currently shorter. Each column is
 * its own flex stack, so a card is exactly as tall as its content and the
 * next card starts right below it. No card is ever stretched, and there is no
 * shared row height to leave a gap.
 *
 * `weight` only has to RANK panels, not measure them -- greedy packing on
 * approximate weights lands within one panel of optimal, and being one panel
 * off means a slightly longer column, not a hole in the middle of one.
 *
 * A single column panel spans the full width instead, since one card in
 * column one leaves column two visibly empty.
 */
function packColumns(specs: PanelSpec[]): {
  full: PanelSpec[]
  columns: [PanelSpec[], PanelSpec[]]
} {
  const full = specs.filter((spec) => spec.span === 'full')
  const flowing = specs.filter((spec) => spec.span === 'column')

  // One panel cannot fill two columns, so it takes the width instead.
  if (flowing.length === 1) return { full: [...full, ...flowing], columns: [[], []] }

  const columns: [PanelSpec[], PanelSpec[]] = [[], []]
  const heights = [0, 0]
  for (const spec of flowing) {
    const target = heights[0] <= heights[1] ? 0 : 1
    columns[target].push(spec)
    heights[target] += spec.weight
  }
  return { full, columns }
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
      weight: 0,
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
      span: 'column',
      weight: 3, // five bars and a divider
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
      span: 'column',
      weight: 4, // a fixed-height diagram plus a footnote
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
      span: 'column',
      weight: 4, // a fixed-height chart
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
      span: 'column',
      weight: 8, // a stats row, a chart AND a company table -- the tall one
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
      // Packed like the rest rather than spanning both columns. Spanning
      // forces a break across the full width, which stranded empty space
      // beside the shorter column. Its seven columns still fit -- the table
      // carries its own min-width and overflow-x-auto, per the global
      // constraint that a wide table scrolls inside its own container.
      span: 'column',
      weight: 4, // a callout plus a handful of rows
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

  // Order above is the question each panel answers: how am I doing
  // (overview), how far do applications get (funnel), where do they actually
  // go (pipeline flow), how long do they sit (time in stage), what are they
  // worth (salary), then the month-by-month breakdown, which is reference
  // material rather than a headline. `packColumns` preserves that order
  // within each column; what it decides is which column.
  const packed = packColumns(specs)

  return (
    // Two columns from lg. A 2560px single column meant a lot of scrolling
    // past half-empty panels; paired, each panel gets a width that suits it
    // and the page halves in height.
    <div className="flex flex-col gap-8">
      <PageHeader title="analytics" action={<RangePicker value={range} onChange={setRange} />} />

      {packed.full.map(({ key, node }) => (
        <div key={key} data-panel-slot={key} data-panel-column="full">
          {node}
        </div>
      ))}

      {/* Two independent stacks, not a grid: a grid would give paired cards a
          shared row height, which is the whole source of the dead space. Each
          column is its own flex column, so every card is exactly as tall as
          its content. items-start keeps the two stacks from stretching to
          match each other's total height. */}
      {packed.columns.some((column) => column.length > 0) && (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {packed.columns.map((column, index) => (
            <div key={index} className="flex flex-1 flex-col gap-8">
              {column.map(({ key, node }) => (
                <div key={key} data-panel-slot={key} data-panel-column={index}>
                  {node}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

