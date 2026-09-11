'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Callout } from './Callout'
import { SalaryInsights } from './SalaryInsights'
import { PipelineFlow } from './PipelineFlow'
import { layOut, type PanelSpec } from './panelLayout'
import {
  AnalyticsPanel,
  PanelBody,
  Span,
  type MetricState,
} from './AnalyticsPanel'
import { errorMessage } from './errorMessage'

/**
 * RE-EXPORTED, not redefined. `MetricState` moved to `AnalyticsPanel` -- the
 * component that actually renders one -- and importing it back here would be
 * a cycle. `page.tsx` has imported it from this module since M5, so the name
 * stays available where it always was rather than becoming a second edit in
 * an unrelated file.
 */
export type { MetricState }
import type { Job } from '@/types'
import { KpiStat } from '@/components/ui/kpi-stat'
import { cn } from '@/lib/utils'
import { RangePicker } from './RangePicker'
import { FunnelChart, normalizeFunnel } from './FunnelChart'
import { TimeInStage } from './TimeInStage'
import { CohortTable } from './CohortTable'
import { filterByMonth, rangeLabel, rangeStartDate, type RangeOption } from '@/lib/analyticsRange'
import type {
  StatusTransition,
  TimeInStageMetric,
  ConversionFunnelMetric,
  CohortAnalysis,
  ConversionMetrics,
} from '@/services/analyticsService'

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
  /**
   * The selected window, when the caller owns it.
   *
   * The route does, because the queries are keyed on it -- a picker whose
   * value never leaves this component cannot make the fetch it implies. Left
   * out, the component keeps its own state, which is what the demo wants:
   * fixture data, no queries, and one shape (the cohort table) that can still
   * be narrowed after the fact.
   */
  range?: RangeOption
  onRangeChange?: (range: RangeOption) => void
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

function Overview({ data }: { data: ConversionMetrics | null }) {
  const metrics = data ?? {
    totalJobs: 0,
    timeToFirstInterview: null,
    timeToOffer: null,
    conversionRate: 0,
    conversionBySource: {},
  }
  return (
    // ONE COLUMN ON A PHONE. Two 120px columns wrapped every one of these
    // labels -- "TOTAL APPLICATIONS", "TIME TO FIRST INTERVIEW",
    // "CONVERSION RATE" -- onto two lines, so four stats read as eight.
    <div data-overview-kpis className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
      {/* `size="l"` -- the same hero step the Overview's stat cards use
          (Gabe, 2026-09-10: "Analysis overview card must also have the
          emphasis in the statistics"). This block IS the analytics screen's
          headline; at the strip size it read as four captions under the card's
          own description. */}
      <KpiStat size="l" label="total applications" value={metrics.totalJobs} />
      <KpiStat
        size="l"
        label="time to first interview"
        value={metrics.timeToFirstInterview === null ? '—' : `${metrics.timeToFirstInterview}d`}
      />
      <KpiStat
        size="l"
        label="time to offer"
        value={metrics.timeToOffer === null ? '—' : `${metrics.timeToOffer}d`}
      />
      <KpiStat size="l" label="conversion rate" value={`${Math.round(metrics.conversionRate)}%`} />
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
 * THE RANGE PICKER NOW REACHES EVERY PANEL. It used to reach one: five of the
 * six read all-time data and printed the words "all time" in their own
 * headers whatever was selected, because `analyticsService` took no date
 * range. Gabe called it a dead dropdown, and from the outside it was one --
 * picking "Last 3 months" changed a single table and left the rest insisting
 * they were showing everything.
 *
 * The service takes a `since` now (see `analyticsService`), the hooks key on
 * it, and this component labels every panel with the range that produced it.
 * The window is defined once, over the APPLICATIONS -- `date_applied`, or
 * `created_at` for a wishlist row that has no applied date -- so all six
 * panels answer the same question about the same rows.
 *
 * `range` IS CONTROLLED FROM ABOVE when the caller passes it, because the
 * route owns the queries and the queries need the value. It keeps its own
 * state when nobody does, which is what a surface with fixture data behind it
 * wants.
 */
export function Analytics({
  timeInStage,
  conversionFunnel,
  statusTransitions,
  cohortAnalysis,
  conversionMetrics,
  jobs = [],
  range: controlledRange,
  onRangeChange,
}: AnalyticsProps) {
  const [ownRange, setOwnRange] = React.useState<RangeOption>('all')
  const range = controlledRange ?? ownRange
  const setRange = (next: RangeOption) => {
    setOwnRange(next)
    onRangeChange?.(next)
  }

  // STILL FILTERED HERE AS WELL, and deliberately. The service has already
  // scoped the rows, so this is a no-op on live data -- but the demo hands in
  // a fixture computed once over everything, and a cohort table is the one
  // shape that can be narrowed correctly after the fact from the `cohort`
  // month it carries. Cheap, and it keeps the demo's picker honest.
  const filteredCohorts = React.useMemo(
    () => (cohortAnalysis.data ? filterByMonth(cohortAnalysis.data, (c) => c.cohort, range) : []),
    [cohortAnalysis.data, range]
  )

  // SalaryInsights reads the job rows directly rather than a service
  // aggregate, so its window is applied here against the same definition the
  // service uses: the applied date, or the row's own date when there is none.
  const rangedJobs = React.useMemo(() => {
    const since = rangeStartDate(range)
    if (!since) return jobs
    // `?? ''` rather than a bare `created_at.slice`: the same reading as
    // `analyticsService`'s `withinRange` -- a row with neither date cannot be
    // shown to fall inside a narrowed window, so it is outside it. It also
    // stops a partial fixture (a test's, or a row mid-migration) throwing on
    // a screen that is only drawing a histogram.
    return jobs.filter((job) => (job.date_applied ?? job.created_at ?? '').slice(0, 10) >= since)
  }, [jobs, range])

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
          icon="Overview"
        description="the headline numbers for everything you have tracked."
          action={<Span>{rangeLabel(range)}</Span>}
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
          icon="Analytics"
        description="how far applications get, and how long each stage takes to reach."
          action={<Span>{rangeLabel(range)}</Span>}
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
          icon="Applications"
        description="where applications actually went, stage to stage."
          action={<Span>{rangeLabel(range)}</Span>}
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
          icon="Clock"
        description="the average days an application sits before it moves on."
          action={<Span>{rangeLabel(range)}</Span>}
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
          icon="Briefcase"
          description="the bands companies posted, with each one’s average marked."
          action={<Span>{rangeLabel(range)}</Span>}
        >
          <SalaryInsights jobs={rangedJobs} />
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
          icon="Calendar"
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
    // TWO COLUMNS FROM xl (1280), NOT md (768). Reported by Gabe 2026-09-06:
    // the charts ran to an excessive height on tablets and small laptops.
    //
    // The cause is arithmetic, not the charts. The sidebar expands to 240px at
    // exactly 1024, so it eats the width that breakpoint hands over: content is
    // ~700px at 768 (64px rail) and ~720px at 1024 (240px nav), which is two
    // 340px columns either way. At 340px every panel heading wraps to three
    // lines and every chart holds its 192px floor, so the row grows tall while
    // staying too narrow to read -- the worst of both. Content only reaches
    // ~980px, and a column only reaches a legible ~470px, at 1280.
    //
    // Below that the page is a single column, which is what Gabe asked for:
    // one readable chart beats two unreadable ones.
    //
    // Cards in a row share the row's height, which is what Gabe asked for --
    // and the dead space that used to come with it is handled at the other
    // end: `Card` is h-full, `CardContent` is flex-1, and every panel body
    // grows into the height it is handed. A card matching a taller neighbour
    // has content in the difference rather than air.
    <div className="grid gap-section xl:grid-cols-2">
      <PageHeader
        className="xl:col-span-2"
        title="analytics"
        description="how your applications actually move, how long each step takes, and what they pay."
        action={<RangePicker value={range} onChange={setRange} />}
        rule
      />

      {layOut(specs).map(({ key, node, full }) => (
        // `min-w-0` on every slot. A grid item's automatic minimum size is its
        // CONTENT's minimum, and the cohort panel contains a table with a
        // 560px floor -- so that one panel widened the single column on every
        // phone to 598px and the whole analytics screen scrolled sideways. The
        // table is already inside its own `overflow-x-auto`; this is what lets
        // that container actually be narrower than the table it scrolls.
        <div
          key={key}
          data-panel-slot={key}
          className={cn('min-w-0', full && 'xl:col-span-2')}
        >
          {node}
        </div>
      ))}
    </div>
  )
}

