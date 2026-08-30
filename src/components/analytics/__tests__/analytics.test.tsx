import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Analytics, type MetricState } from '../Analytics'
import { FunnelChart, normalizeFunnel, STAGE_FILL } from '../FunnelChart'
import { TimeInStage } from '../TimeInStage'
import { SourceTrends } from '../SourceTrends'
import { RangePicker } from '../RangePicker'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type {
  TimeInStageMetric,
  ConversionFunnelMetric,
  SourceConversionTrend,
  CohortAnalysis,
  ConversionMetrics,
} from '@/services/analyticsService'

// Real hook by default everywhere in this file (matchMedia is mocked to
// `matches: false` in src/test/setup.ts, so the real hook already returns
// false) -- mocked here only so the colour/motion tests below can force
// both branches deterministically without depending on that setup detail.
vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: vi.fn(() => false),
}))

afterEach(() => {
  cleanup()
  vi.mocked(usePrefersReducedMotion).mockReturnValue(false)
})

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

// analyticsService.getConversionFunnel returns all five stages: the four
// chain stages (isExit: false) plus Rejected, reported separately as an
// exit rather than a fifth rung -- see FunnelChart.tsx's normalizeFunnel
// docblock and ConversionFunnelMetric.isExit.
const FUNNEL: ConversionFunnelMetric[] = [
  { stage: 'Wishlist', count: 20, percentage: 100, avgDaysToStage: 0, isExit: false },
  { stage: 'Applied', count: 12, percentage: 60, avgDaysToStage: 3, isExit: false },
  { stage: 'Interviewing', count: 6, percentage: 30, avgDaysToStage: 9, isExit: false },
  { stage: 'Offer', count: 2, percentage: 10, avgDaysToStage: 21, isExit: false },
  { stage: 'Rejected', count: 5, percentage: 25, avgDaysToStage: 11, isExit: true },
]

// A subset fixture matching what an older service version (or a caller
// that only tracked the middle of the pipeline) might supply -- exercises
// normalizeFunnel's "drop stages we weren't given" behaviour independent of
// the full FUNNEL fixture above.
const PARTIAL_FUNNEL: ConversionFunnelMetric[] = [
  { stage: 'Applied', count: 12, percentage: 100, avgDaysToStage: 3, isExit: false },
  { stage: 'Interviewing', count: 6, percentage: 50, avgDaysToStage: 9, isExit: false },
  { stage: 'Offer', count: 2, percentage: 16.7, avgDaysToStage: 21, isExit: false },
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
    // closest('[data-analytics-panel]'), not closest('section'): these panels
    // are Cards now (M5.5 Item 7), and Card renders a div.
    const funnelHeading = screen.getByRole('heading', { name: 'Conversion funnel' })
    expect(funnelHeading.closest('[data-analytics-panel]')!.textContent).toMatch(/all time/i)
    const stageHeading = screen.getByRole('heading', { name: 'Time in stage' })
    expect(stageHeading.closest('[data-analytics-panel]')!.textContent).toMatch(/all time/i)
  })

  it('narrows source trends and cohorts to the picked range, and leaves the other three panels unchanged', () => {
    render(<Analytics {...fullProps()} />)
    // getAllByText: the source name now appears twice at "All time" -- once in
    // the trends data and once in the "top converting source" callout, which
    // is selected from those same rows.
    expect(screen.getAllByText('Referral').length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: '3m' } })
    // 2025-01's Referral row falls outside the last 3 months of "now"; the
    // component's own default clock is real Date.now(), so this only pins
    // the row disappearing, not which exact months remain.
    expect(screen.queryByText('Referral')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Conversion funnel' })).toBeTruthy()
  })

  it('colours the funnel with the status palette, in pipeline order', () => {
    const { container } = render(<FunnelChart data={normalizeFunnel(PARTIAL_FUNNEL)} />)
    const stages = [...container.querySelectorAll('[data-stage]')].map((s) => s.getAttribute('data-stage'))
    expect(stages).toEqual(['applied', 'interviewing', 'offer'])
  })

  it('renders all five stages -- the real service return shape now that fix 1 has landed -- in pipeline order, with Rejected handled as an exit rather than the chain\'s fifth rung', () => {
    // task-8-report.md claimed this proof already existed; it did not --
    // every prior fixture here had exactly the three stages the unfixed
    // service returned, so no test ever constructed a five-stage datum.
    const { container } = render(<FunnelChart data={normalizeFunnel(FUNNEL)} />)

    const stages = [...container.querySelectorAll('[data-stage]')].map((s) => s.getAttribute('data-stage'))
    expect(stages).toEqual(['wishlist', 'applied', 'interviewing', 'offer', 'rejected'])

    // Palette: every bar's fill is the token for its OWN stage, not a
    // shared or mismatched one.
    for (const stage of stages) {
      const fill = container.querySelector(`[data-stage="${stage}"] [data-fill]`)!.getAttribute('data-fill')
      expect(fill).toBe(STAGE_FILL[stage as keyof typeof STAGE_FILL])
    }

    // Rejected is structurally separated from the chain, not appended to it
    // as though it were the next descending bar.
    const rejectedBar = container.querySelector('[data-stage="rejected"]')!
    expect(rejectedBar.closest('[data-funnel-exits]')).toBeTruthy()
    expect(rejectedBar.getAttribute('data-exit')).toBe('true')

    for (const stage of ['wishlist', 'applied', 'interviewing', 'offer']) {
      const bar = container.querySelector(`[data-stage="${stage}"]`)!
      expect(bar.closest('[data-funnel-exits]')).toBeNull()
      expect(bar.getAttribute('data-exit')).toBeNull()
    }
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
    render(<Analytics {...fullProps()} />)
    // Scoped to the Overview panel: '.grid' alone now matches a Card's own
    // header grid first, which is not the KPI strip.
    const overview = screen
      .getByRole('heading', { name: 'Overview' })
      .closest('[data-analytics-panel]')!
    const grid = overview.querySelector('[data-overview-kpis]')!
    expect(grid.className).toContain('grid-cols-2')
    expect(grid.className).toContain('md:grid-cols-4')
  })

  it('scrolls the cohort table inside its own container rather than the page body', () => {
    render(<Analytics {...fullProps()} />)
    const heading = screen.getByRole('heading', { name: 'Cohort analysis' })
    const table = heading.closest('[data-analytics-panel]')!.querySelector('table')!
    expect(table.closest('.overflow-x-auto')).toBeTruthy()
  })
})

describe('TimeInStage', () => {
  // Recharts' Animate wrapper (react-smooth) defers a bar's first paint to
  // requestAnimationFrame when isAnimationActive is true, so a synchronous
  // render/act cycle produces NO <path> inside .recharts-bar-rectangle at
  // all -- not a zero-sized one, none. With isAnimationActive false the
  // path commits synchronously on the very first render. That is a real,
  // observable side effect of the prop -- proven below by using it two
  // ways: to disable animation so the colour assertion can read the `fill`
  // attribute at all, and as the assertion itself for the reduced-motion
  // gate.

  it('never bakes a resolved colour into a bar fill -- always the CSS token', () => {
    // Same trap as FunnelChart's "never bakes a resolved colour" test:
    // jsdom's getComputedStyle returns '' for custom properties, so a
    // resolved-colour assertion could never fail. This reads the literal
    // `fill` attribute Recharts writes to the DOM instead, which fails if
    // STAGE_FILL[status] is swapped for a hardcoded hex like '#2563eb'.
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true) // animation off so the bar commits synchronously
    const { container } = render(<TimeInStage data={TIME_IN_STAGE} />)
    const fills = [...container.querySelectorAll('.recharts-bar-rectangle path')].map((el) => el.getAttribute('fill'))
    expect(fills.length).toBeGreaterThan(0)
    for (const fill of fills) {
      expect(fill).toMatch(/^var\(--color-status-[a-z]+-mark\)$/)
    }
  })

  it('gates bar animation on the reduced-motion preference', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false)
    const animating = render(<TimeInStage data={TIME_IN_STAGE} />)
    expect(animating.container.querySelectorAll('.recharts-bar-rectangle path').length).toBe(0)
    animating.unmount()

    vi.mocked(usePrefersReducedMotion).mockReturnValue(true)
    const still = render(<TimeInStage data={TIME_IN_STAGE} />)
    expect(still.container.querySelectorAll('.recharts-bar-rectangle path').length).toBeGreaterThan(0)
  })
})

describe('SourceTrends', () => {
  it('never bakes a resolved colour into a line stroke -- always the CSS token', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true) // animation off so the line commits synchronously
    const { container } = render(<SourceTrends data={TRENDS} />)
    const strokes = [...container.querySelectorAll('.recharts-line-curve')].map((el) => el.getAttribute('stroke'))
    expect(strokes.length).toBeGreaterThan(0)
    for (const stroke of strokes) {
      expect(stroke).toMatch(/^var\(--color-(accent-default|text-muted)\)$/)
    }
  })

  it('gates line animation on the reduced-motion preference', () => {
    // Recharts' Line uses a different animation mechanism than Bar --
    // the <path> is present on the very first synchronous render either
    // way, but react-smooth's "draw the line in" effect starts it at
    // stroke-dasharray="0px 0px" (invisible) when isAnimationActive is
    // true, and omits the attribute entirely (the full stroke, immediately)
    // when it's false. This fails if isAnimationActive is hardcoded either
    // way regardless of reducedMotion.
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false)
    const animating = render(<SourceTrends data={TRENDS} />)
    const animatingCurve = animating.container.querySelector('.recharts-line-curve')!
    expect(animatingCurve.getAttribute('stroke-dasharray')).toBe('0px 0px')
    animating.unmount()

    vi.mocked(usePrefersReducedMotion).mockReturnValue(true)
    const still = render(<SourceTrends data={TRENDS} />)
    const stillCurve = still.container.querySelector('.recharts-line-curve')!
    expect(stillCurve.getAttribute('stroke-dasharray')).toBeNull()
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
  it('drops stages it is not given rather than fabricating zero counts', () => {
    // Defensive behaviour for a caller passing a partial datum -- production
    // getConversionFunnel always returns all five stages as of Task 8's fix
    // round. Faking missing stages in would be exactly the kind of "control
    // that lies" ruling C warned against, one layer down.
    const result = normalizeFunnel(PARTIAL_FUNNEL)
    expect(result.map((r) => r.stage)).toEqual(['applied', 'interviewing', 'offer'])
  })

  it('sorts into pipeline order regardless of the input order', () => {
    const shuffled: ConversionFunnelMetric[] = [PARTIAL_FUNNEL[2], PARTIAL_FUNNEL[0], PARTIAL_FUNNEL[1]]
    expect(normalizeFunnel(shuffled).map((r) => r.stage)).toEqual(['applied', 'interviewing', 'offer'])
  })

  it('carries isExit through from the service so Rejected never gets read as chain membership', () => {
    const result = normalizeFunnel(FUNNEL)
    const byStage = Object.fromEntries(result.map((r) => [r.stage, r.isExit]))
    expect(byStage.wishlist).toBe(false)
    expect(byStage.applied).toBe(false)
    expect(byStage.interviewing).toBe(false)
    expect(byStage.offer).toBe(false)
    expect(byStage.rejected).toBe(true)
  })
})
