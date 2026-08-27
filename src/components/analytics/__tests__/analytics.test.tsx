import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Analytics, type MetricState } from '../Analytics'
import { FunnelChart, normalizeFunnel, STAGE_FILL } from '../FunnelChart'
import { RangePicker } from '../RangePicker'
import type {
  TimeInStageMetric,
  ConversionFunnelMetric,
  SourceConversionTrend,
  CohortAnalysis,
  ConversionMetrics,
} from '@/services/analyticsService'

afterEach(cleanup)

// jsdom has no layout engine, so every element measures 0x0 by default.
// Recharts' ResponsiveContainer reads this to size its SVG and, at 0x0,
// skips rendering its children entirely -- not a failure, just not
// informative for a test. This gives it a plausible chart-sized box so the
// panels that use it (TimeInStage, SourceTrends) actually draw something,
// the same technique widely used to make Recharts testable under jsdom.
Element.prototype.getBoundingClientRect = () => ({
  width: 600,
  height: 260,
  top: 0,
  left: 0,
  bottom: 260,
  right: 600,
  x: 0,
  y: 0,
  toJSON() {},
})

function ok<T>(data: T): MetricState<T> {
  return { data, isLoading: false, error: null }
}
function loading<T>(): MetricState<T> {
  return { data: null, isLoading: true, error: null }
}
function failed<T>(message: string): MetricState<T> {
  return { data: null, isLoading: false, error: new Error(message) }
}

const TIME_IN_STAGE: TimeInStageMetric[] = [
  { status: 'applied', avgDays: 4, medianDays: 3, minDays: 1, maxDays: 10, count: 8 },
  { status: 'interviewing', avgDays: 9, medianDays: 8, minDays: 2, maxDays: 20, count: 5 },
]

// The real analyticsService.getConversionFunnel only ever emits
// Applied/Interviewing/Offer -- see FunnelChart.tsx's normalizeFunnel
// docblock -- so this fixture matches what the hook actually returns, not
// the full five-stage pipeline.
const FUNNEL: ConversionFunnelMetric[] = [
  { stage: 'Applied', count: 12, percentage: 100, avgDaysToStage: 3 },
  { stage: 'Interviewing', count: 6, percentage: 50, avgDaysToStage: 9 },
  { stage: 'Offer', count: 2, percentage: 16.7, avgDaysToStage: 21 },
]

const TRENDS: SourceConversionTrend[] = [
  { source: 'LinkedIn', month: '2026-06', applied: 4, interviewing: 2, offer: 1, rejected: 1, conversionRate: 25 },
  { source: 'LinkedIn', month: '2026-07', applied: 3, interviewing: 1, offer: 0, rejected: 2, conversionRate: 0 },
  { source: 'Referral', month: '2025-01', applied: 2, interviewing: 1, offer: 1, rejected: 0, conversionRate: 50 },
]

const COHORTS: CohortAnalysis[] = [
  { cohort: '2026-07', jobsApplied: 5, jobsInterviewing: 2, jobsOffered: 1, jobsRejected: 1, conversionRate: 20, avgTimeToOffer: 14 },
  { cohort: '2025-02', jobsApplied: 3, jobsInterviewing: 1, jobsOffered: 0, jobsRejected: 2, conversionRate: 0, avgTimeToOffer: null },
]

const METRICS: ConversionMetrics = {
  totalJobs: 14,
  timeToFirstInterview: 6,
  timeToOffer: 21,
  conversionRate: 14.3,
  conversionBySource: { LinkedIn: 1, Referral: 1 },
}

function fullProps() {
  return {
    timeInStage: ok(TIME_IN_STAGE),
    conversionFunnel: ok(FUNNEL),
    sourceConversionTrends: ok(TRENDS),
    cohortAnalysis: ok(COHORTS),
    conversionMetrics: ok(METRICS),
  }
}

function emptyProps() {
  return {
    timeInStage: ok<TimeInStageMetric[]>([]),
    conversionFunnel: ok<ConversionFunnelMetric[]>([]),
    sourceConversionTrends: ok<SourceConversionTrend[]>([]),
    cohortAnalysis: ok<CohortAnalysis[]>([]),
    conversionMetrics: ok<ConversionMetrics>({
      totalJobs: 0,
      timeToFirstInterview: null,
      timeToOffer: null,
      conversionRate: 0,
      conversionBySource: {},
    }),
  }
}

describe('Analytics', () => {
  it('puts the range picker in the body header beside the title, not the top bar', () => {
    // Content controls belong to the content. The Top Bar is chrome and is
    // identical on five of the seven app screens.
    const { container } = render(<Analytics {...fullProps()} />)
    const header = container.querySelector('[data-body-header]')!
    expect(header.querySelector('[data-range-picker]')).toBeTruthy()
    expect(container.querySelector('[data-top-bar] [data-range-picker]')).toBeNull()
  })

  it('says there is nothing to chart rather than drawing an empty axis', () => {
    // Four panels chart or table something with an axis/rows: time in
    // stage, the funnel, source trends and cohorts. The overview KPI strip
    // is exempt -- zeroes and dashes are not "an empty axis".
    render(<Analytics {...emptyProps()} />)
    expect(screen.getAllByText(/not enough data yet/i)).toHaveLength(4)
  })

  it('gives each panel its own loading state rather than gating the whole page on one', () => {
    const props = { ...fullProps(), cohortAnalysis: loading<CohortAnalysis[]>() }
    render(<Analytics {...props} />)
    // The other four panels still rendered their real content.
    expect(screen.getByRole('heading', { name: 'Time in stage' })).toBeTruthy()
    expect(screen.getByText('LinkedIn')).toBeTruthy()
  })

  it('makes a failed panel read differently from an empty one', () => {
    const props = { ...fullProps(), cohortAnalysis: failed<CohortAnalysis[]>('cohort query timed out') }
    render(<Analytics {...props} />)
    expect(screen.getByText(/cohort query timed out/)).toBeTruthy()
    expect(screen.queryByText(/not enough data yet/i)).toBeNull()
  })

  it('states "All time" on panels the range picker cannot filter', () => {
    render(<Analytics {...fullProps()} />)
    const funnelHeading = screen.getByRole('heading', { name: 'Conversion funnel' })
    const funnelSection = funnelHeading.closest('section')!
    expect(funnelSection.textContent).toMatch(/all time/i)
    const stageHeading = screen.getByRole('heading', { name: 'Time in stage' })
    expect(stageHeading.closest('section')!.textContent).toMatch(/all time/i)
  })

  it('narrows source trends and cohorts to the picked range, and leaves the other three panels unchanged', () => {
    render(<Analytics {...fullProps()} />)
    // Default range is "All time", so everything is visible first.
    expect(screen.getByText('Referral')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: '3m' } })
    // 2025-01's Referral row falls outside the last 3 months of "now"; the
    // component's own default clock is real Date.now(), so this only pins
    // the row disappearing, not which exact months remain.
    expect(screen.queryByText('Referral')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Conversion funnel' })).toBeTruthy()
  })

  it('colours the funnel with the status palette, in pipeline order', () => {
    const { container } = render(<FunnelChart data={normalizeFunnel(FUNNEL)} />)
    const stages = [...container.querySelectorAll('[data-stage]')].map((s) => s.getAttribute('data-stage'))
    expect(stages).toEqual(['applied', 'interviewing', 'offer'])
  })

  it('never bakes a resolved colour for a funnel stage -- always the CSS token', () => {
    // Trap 1: jsdom's getComputedStyle returns '' for custom properties, so a
    // naive assertion on the *resolved* pixel colour would pass no matter
    // what the code does. Assert the mechanism instead: the literal value
    // handed to the DOM is a var() reference into src/index.css's status
    // tokens, never a hardcoded hex. This fails if someone swaps in a
    // literal '#2563eb' later.
    const { container } = render(<FunnelChart data={normalizeFunnel(FUNNEL)} />)
    const bars = [...container.querySelectorAll('[data-stage] [data-fill]')]
    expect(bars.length).toBeGreaterThan(0)
    for (const bar of bars) {
      expect(bar.getAttribute('data-fill')).toMatch(/^var\(--color-status-[a-z]+-mark\)$/)
    }
  })

  it('emits the same colour token on every render, so a theme flip needs no re-fetch', () => {
    // Trap 2: a value read once at mount (e.g. via getComputedStyle) does not
    // follow a later theme change. This component sidesteps that class of bug
    // entirely by never resolving to a concrete colour in JS -- it always
    // hands the browser the token reference and lets the CSS cascade (which
    // *does* react live to the `.dark` class next-themes toggles) resolve it
    // at paint time. Proof: flipping `.dark` on the document and re-rendering
    // produces the exact same attribute value, because there was never a
    // theme-dependent branch to begin with.
    const { container, rerender } = render(<FunnelChart data={normalizeFunnel(FUNNEL)} />)
    const before = container.querySelector('[data-stage="applied"] [data-fill]')!.getAttribute('data-fill')

    document.documentElement.classList.add('dark')
    rerender(<FunnelChart data={normalizeFunnel(FUNNEL)} />)
    const after = container.querySelector('[data-stage="applied"] [data-fill]')!.getAttribute('data-fill')
    document.documentElement.classList.remove('dark')

    expect(after).toBe(before)
    expect(STAGE_FILL.applied).toBe(before)
  })

  it('stacks the overview KPIs two-up at mobile widths and four-up from md', () => {
    // Same idiom applications.test.tsx and calendar.test.tsx use for their
    // own responsive assertions -- jsdom never evaluates a media query, so
    // this checks the Tailwind classes that encode both widths are present,
    // not a rendered viewport.
    const { container } = render(<Analytics {...fullProps()} />)
    const grid = container.querySelector('[data-kpi-strip], .grid')!
    expect(grid.className).toContain('grid-cols-2')
    expect(grid.className).toContain('md:grid-cols-4')
  })

  it('scrolls the cohort table inside its own container rather than the page body', () => {
    const { container } = render(<Analytics {...fullProps()} />)
    const heading = screen.getByRole('heading', { name: 'Cohort analysis' })
    const table = heading.closest('section')!.querySelector('table')!
    expect(table.closest('.overflow-x-auto')).toBeTruthy()
  })
})

describe('RangePicker', () => {
  it('offers the four windows the range maths supports, in that order', () => {
    render(<RangePicker value="all" onChange={() => {}} />)
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Last 3 months', 'Last 6 months', 'Last 12 months', 'All time'])
  })
})

describe('normalizeFunnel', () => {
  it('drops stages the service never reports rather than fabricating zero counts', () => {
    // getConversionFunnel only ever returns Applied/Interviewing/Offer --
    // wishlist and rejected are computed internally but never included in
    // its return value. Faking those two in would be exactly the kind of
    // "control that lies" ruling C warned against, one layer down.
    const result = normalizeFunnel(FUNNEL)
    expect(result.map((r) => r.stage)).toEqual(['applied', 'interviewing', 'offer'])
  })

  it('sorts into pipeline order regardless of the input order', () => {
    const shuffled: ConversionFunnelMetric[] = [FUNNEL[2], FUNNEL[0], FUNNEL[1]]
    expect(normalizeFunnel(shuffled).map((r) => r.stage)).toEqual(['applied', 'interviewing', 'offer'])
  })
})
