'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card'
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
  description,
  action,
  error,
  children,
}: {
  title: string
  /** One lowercase line saying what the panel answers. */
  description?: string
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
        {description ? <CardDescription>{description}</CardDescription> : null}
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
    return (
      <EmptyState icon="Analytics">
        not enough data yet. this fills in as applications move through the pipeline.
      </EmptyState>
    )
  }
  return <>{render()}</>
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
 * Assigns column spans against the panels that rendered.
 *
 * A grid, deliberately: Gabe asked for cards that match their neighbour's
 * height, and a shared row height is exactly what a grid gives and what
 * independent column stacks cannot. The dead space that used to come with
 * that is handled at the other end -- every panel body fills the height it is
 * handed (see `CardContent` below), so a card matching a taller neighbour has
 * content in the difference rather than air.
 *
 * Spans are computed rather than written into the markup. Walk the list
 * tracking which column is next: a full-width panel takes the row and resets
 * to column one; a half-width panel pairs with the next one if there is a
 * half-width panel to pair with, and is promoted to full width if there is
 * not. A lone panel then fills its row instead of sitting beside a hole.
 *
 * Order is the author's -- this only decides widths.
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


  // Every panel renders, every time. An earlier round hid a panel whose query
  // came back with nothing; Gabe reversed that after seeing it -- a panel that
  // vanishes takes its heading with it, so the reader cannot tell an account
  // with no interviews from a page that forgot to draw the panel. An explicit
  // empty state says which.
  const specs: PanelSpec[] = []

  specs.push({
      key: 'overview',
      span: 'full',
      node: (
        <AnalyticsPanel
          title="overview"
        description="the headline numbers for everything you have tracked."
          action={<Span>all time</Span>}
          error={conversionMetrics.error ? errorMessage(conversionMetrics.error) : undefined}
        >
          <PanelBody state={conversionMetrics} empty={false} render={() => <Overview data={conversionMetrics.data} />} />
        </AnalyticsPanel>
      ),
  })

  specs.push({
      key: 'funnel',
      span: 'half',
      node: (
        <AnalyticsPanel
          title="conversion funnel"
        description="how far applications get, and how long each stage takes to reach."
          action={<Span>all time</Span>}
          error={conversionFunnel.error ? errorMessage(conversionFunnel.error) : undefined}
        >
          <PanelBody
            state={conversionFunnel}
            empty={funnelData.length === 0 || funnelData.every((d) => d.count === 0)}
            render={() => <FunnelChart data={funnelData} />}
          />
        </AnalyticsPanel>
      ),
  })

  specs.push({
      key: 'pipeline',
      span: 'half',
      node: (
        <AnalyticsPanel
          title="pipeline flow"
        description="where applications actually went, stage to stage."
          action={<Span>all time</Span>}
          error={statusTransitions.error ? errorMessage(statusTransitions.error) : undefined}
        >
          <PanelBody
            state={statusTransitions}
            empty={(statusTransitions.data ?? []).length === 0}
            render={() => <PipelineFlow transitions={statusTransitions.data ?? []} />}
          />
        </AnalyticsPanel>
      ),
  })

  specs.push({
      key: 'time-in-stage',
      span: 'half',
      node: (
        <AnalyticsPanel
          title="time in stage"
        description="the average days an application sits before it moves on."
          action={<Span>all time</Span>}
          error={timeInStage.error ? errorMessage(timeInStage.error) : undefined}
        >
          <PanelBody
            state={timeInStage}
            empty={
              (timeInStage.data ?? []).length === 0 ||
              (timeInStage.data ?? []).every((d) => d.count === 0)
            }
            render={() => <TimeInStage data={timeInStage.data ?? []} />}
          />
        </AnalyticsPanel>
      ),
  })

  specs.push({
      key: 'salary',
      span: 'half',
      node: (
        <AnalyticsPanel
          title="salary insights"
          description="the bands companies posted, with each one’s average marked."
          action={<Span>all time</Span>}
        >
          <SalaryInsights jobs={jobs} />
        </AnalyticsPanel>
      ),
  })

  specs.push({
      key: 'cohort',
      // Full width, at Gabe's instruction. Seven columns want the room, and
      // it closes the page, so spanning costs nothing above it.
      span: 'full',
      node: (
        <AnalyticsPanel
          title="cohort analysis"
        description="each month of applications, followed through to its outcome."
          action={<Span>{rangeLabel(range)}</Span>}
          error={cohortAnalysis.error ? errorMessage(cohortAnalysis.error) : undefined}
        >
          <PanelBody
            state={cohortAnalysis}
            empty={
              filteredCohorts.length === 0 || filteredCohorts.every((c) => c.jobsApplied === 0)
            }
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

  // Order is the question each panel answers: how am I doing (overview), how
  // far do applications get (funnel), where do they actually go (pipeline
  // flow), how long do they sit (time in stage), what are they worth
  // (salary), then the month-by-month breakdown last, which is reference
  // material rather than a headline.
  return (
    // Two columns from lg. A 2560px single column meant a lot of scrolling
    // past half-empty panels; paired, each panel gets a width that suits it
    // and the page halves in height.
    //
    // Cards in a row share the row's height, which is what Gabe asked for --
    // and the dead space that used to come with it is handled at the other
    // end: `Card` is h-full, `CardContent` is flex-1, and every panel body
    // grows into the height it is handed. A card matching a taller neighbour
    // has content in the difference rather than air.
    <div className="grid gap-8 lg:grid-cols-2">
      <PageHeader
        className="lg:col-span-2"
        title="analytics"
        description="how your applications actually move, how long each step takes, and what they pay."
        action={<RangePicker value={range} onChange={setRange} />}
      />

      {layOut(specs).map(({ key, node, full }) => (
        <div key={key} data-panel-slot={key} className={full ? 'lg:col-span-2' : undefined}>
          {node}
        </div>
      ))}
    </div>
  )
}

