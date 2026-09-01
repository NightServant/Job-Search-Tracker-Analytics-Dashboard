import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { Job } from '@/types'
import { Analytics, type MetricState } from '../Analytics'
import { FunnelChart, normalizeFunnel, STAGE_FILL } from '../FunnelChart'
import { TimeInStage } from '../TimeInStage'
import { SalaryInsights } from '../SalaryInsights'
import { RangePicker } from '../RangePicker'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type {
  TimeInStageMetric,
  ConversionFunnelMetric,
  StatusTransition,
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
// panels that use it (TimeInStage, the salary and cohort charts) actually draw something,
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

const TRANSITIONS: StatusTransition[] = [
  { from: 'wishlist', to: 'applied', count: 4 },
  { from: 'applied', to: 'interviewing', count: 3 },
  { from: 'interviewing', to: 'offer', count: 1 },
  { from: 'applied', to: 'rejected', count: 2 },
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

/**
 * Two priced jobs, so `fullProps` really is full: salary insights derives its
 * own emptiness from `jobs` rather than a query, so omitting them hid the
 * panel and every "all six panels" assertion was quietly about five.
 *
 * Cast, because Salary Insights reads four of `Job`'s ~30 columns and a
 * literal carrying the other twenty-six would be noise around the three
 * fields under test.
 */
const PRICED_JOBS = [
  { id: 'j1', company: 'Acme', salary_min: 20_000, salary_max: 30_000, salary_currency: 'PHP' },
  { id: 'j2', company: 'Globex', salary_min: 40_000, salary_max: 60_000, salary_currency: 'PHP' },
] as unknown as Job[]

function fullProps() {
  return {
    jobs: PRICED_JOBS,
    timeInStage: ok(TIME_IN_STAGE),
    conversionFunnel: ok(FUNNEL),
    statusTransitions: ok(TRANSITIONS),
    cohortAnalysis: ok(COHORTS),
    conversionMetrics: ok(METRICS),
  }
}

function emptyProps() {
  return {
    timeInStage: ok<TimeInStageMetric[]>([]),
    conversionFunnel: ok<ConversionFunnelMetric[]>([]),
    statusTransitions: ok<StatusTransition[]>([]),
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

  it('shows every panel with an explicit empty state rather than hiding it', () => {
    // An earlier round hid a panel whose query returned nothing; Gabe
    // reversed it after seeing the result. A panel that vanishes takes its
    // heading with it, so the reader cannot tell an account with no
    // interviews from a page that forgot to draw the panel.
    const { container } = render(<Analytics {...emptyProps()} />)
    expect(container.querySelectorAll('[data-analytics-panel]')).toHaveLength(6)
    expect(screen.getByRole('heading', { name: 'pipeline flow' })).toBeTruthy()
    expect(screen.getAllByText(/not enough data yet/i).length).toBeGreaterThan(0)
  })

  it('gives each panel its own loading state rather than gating the whole page on one', () => {
    const props = { ...fullProps(), cohortAnalysis: loading<CohortAnalysis[]>() }
    render(<Analytics {...props} />)
    // The other four panels still rendered their real content -- the cohort
    // panel is the only one showing a skeleton. Anchored on the cohort table
    // being gone while a sibling panel's own rows are present, rather than on
    // a heading, which renders in every state including loading.
    const cohort = screen
      .getByRole('heading', { name: 'cohort analysis' })
      .closest('[data-analytics-panel]')!
    expect(cohort.querySelector('table')).toBeNull()
    expect(cohort.querySelector('[role="status"][aria-busy="true"]')).toBeTruthy()
    const funnel = screen
      .getByRole('heading', { name: 'conversion funnel' })
      .closest('[data-analytics-panel]')!
    expect(funnel.querySelectorAll('[data-stage]').length).toBeGreaterThan(0)
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
    const funnelHeading = screen.getByRole('heading', { name: 'conversion funnel' })
    expect(funnelHeading.closest('[data-analytics-panel]')!.textContent).toMatch(/all time/i)
    const stageHeading = screen.getByRole('heading', { name: 'time in stage' })
    expect(stageHeading.closest('[data-analytics-panel]')!.textContent).toMatch(/all time/i)
  })

  it('narrows cohorts to the picked range, and leaves the other panels unchanged', () => {
    render(<Analytics {...fullProps()} />)
    // Cohort analysis is the one remaining panel the picker filters: source
    // trends, which was the other, is gone. Its "top converting source"
    // callout went with it, which is why this no longer needs getAllByText to
    // step around the source name appearing in two places.
    expect(screen.getByText('Feb 2025')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Date range'), { target: { value: '3m' } })
    // 2025-02's cohort falls outside the last 3 months of "now"; the
    // component's own default clock is real Date.now(), so this only pins
    // the row disappearing, not which exact months remain.
    expect(screen.queryByText('Feb 2025')).toBeNull()
    expect(screen.getByRole('heading', { name: 'conversion funnel' })).toBeTruthy()
  })

  it('treats an all-zero series as empty rather than drawing a blank chart', () => {
    // The empty check only tested for NO ROWS. An account with applications
    // but no interviews has rows whose every value is zero, so the bars
    // rendered at zero height and the panel looked broken rather than empty.
    const zeroed = fullProps()
    zeroed.timeInStage = {
      data: [{ status: 'applied', avgDays: 0, medianDays: 0, minDays: 0, maxDays: 0, count: 0 }],
      isLoading: false,
      error: null,
    }
    render(<Analytics {...zeroed} />)
    const panel = screen
      .getByRole('heading', { name: 'time in stage' })
      .closest('[data-analytics-panel]')!
    expect(panel.textContent).toMatch(/not enough data yet/i)
  })

  it('keeps a still-loading or failed panel on the page instead of hiding it', () => {
    // Blank means "the query came back with nothing". A panel that is still
    // fetching has to hold its place or the page reflows as each query lands,
    // and a failed read must say so -- dropping it would tell the reader they
    // have no cohorts when the truth is that nobody knows.
    const stillLoading = { ...fullProps(), cohortAnalysis: loading<CohortAnalysis[]>() }
    const { unmount } = render(<Analytics {...stillLoading} />)
    expect(screen.getByRole('heading', { name: 'cohort analysis' })).toBeTruthy()
    unmount()

    const errored = { ...fullProps(), cohortAnalysis: failed<CohortAnalysis[]>('cohort query timed out') }
    render(<Analytics {...errored} />)
    expect(screen.getByRole('heading', { name: 'cohort analysis' })).toBeTruthy()
    expect(screen.getByText(/cohort query timed out/)).toBeTruthy()
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
      .getByRole('heading', { name: 'overview' })
      .closest('[data-analytics-panel]')!
    const grid = overview.querySelector('[data-overview-kpis]')!
    expect(grid.className).toContain('grid-cols-2')
    expect(grid.className).toContain('md:grid-cols-4')
  })

  it('wears the same accent band and banding as the applications table', () => {
    // The app's two densest tables, on its two densest screens. Leaving one
    // grey and accenting the other read as two unrelated decisions.
    const { container } = render(<Analytics {...fullProps()} />)
    const head = container.querySelector(
      '[data-panel-slot="cohort"] thead'
    )!
    expect(head.className).toMatch(/bg-accent-surface/)
    expect(head.className).toMatch(/text-accent-on-surface/)
    // accent-default is the TEXT weight -- accent-400 in dark -- and a
    // full-width band of it is the over-bright header Gabe rejected.
    expect(head.className).not.toMatch(/bg-accent-default/)
  })

  it('alternates the cohort rows so a seven-column row stays traceable across its width', () => {
    render(<Analytics {...fullProps()} />)
    const rows = [
      ...screen
        .getByRole('heading', { name: 'cohort analysis' })
        .closest('[data-analytics-panel]')!
        .querySelectorAll('tbody tr'),
    ]
    expect(rows.length).toBeGreaterThan(1)
    // Striping is only striping if neighbours differ; asserting the class is
    // present somewhere would pass on every row carrying it.
    expect(rows[0].className).not.toMatch(/bg-accent-surface/)
    expect(rows[1].className).toMatch(/bg-accent-surface\/30/)
    // The old neutral band is gone, same as the applications table.
    expect(rows[1].className).not.toMatch(/bg-bg-surface/)
  })

  it('spans the KPI strip and the cohort table, and pairs the four charts', () => {
    const { container } = render(<Analytics {...fullProps()} />)
    const span = (key: string) =>
      container.querySelector(`[data-panel-slot="${key}"]`)!.className.includes('lg:col-span-2')
    expect(span('overview')).toBe(true)
    expect(span('cohort')).toBe(true)
    for (const key of ['funnel', 'pipeline', 'time-in-stage', 'salary']) {
      expect(span(key)).toBe(false)
    }
  })

  it('gives a chart the full width when it has no partner to pair with', () => {
    // layOut walks the list in pairs, so an odd count leaves one chart alone.
    // It fills its row rather than sitting beside a hole. Reachable through
    // the public component by giving salary insights no priced jobs, which is
    // the one panel whose presence is not query-driven.
    const { container } = render(<Analytics {...fullProps()} jobs={[]} />)
    expect(
      container.querySelector('[data-panel-slot="salary"]')!.className
    ).not.toContain('lg:col-span-2')
    // It is still on the page, saying it is empty.
    expect(screen.getByRole('heading', { name: 'salary insights' })).toBeTruthy()
  })

  it('stretches every card to its row and lets the body fill the difference', () => {
    // Gabe asked for cards that match their neighbour's height AND carry no
    // gap inside. Those pull against each other, so both halves are pinned:
    // the card stretches, and the content claims the height rather than
    // leaving it as air under one line of text.
    const { container } = render(<Analytics {...fullProps()} />)
    for (const slot of container.querySelectorAll('[data-panel-slot]')) {
      expect(slot.querySelector('[data-analytics-panel]')!.className).toContain('h-full')
    }
    const content = container.querySelector(
      '[data-panel-slot="funnel"] [data-slot="card-content"]'
    )!
    expect(content.className).toContain('flex-1')
    // The funnel absorbs it by growing its bars: a bar's LENGTH encodes the
    // count, so its height is free to stretch and says nothing different.
    const stage = container.querySelector('[data-funnel-chain] [data-stage]')!
    expect(stage.className).toContain('h-full')
    expect(stage.className).toContain('max-h-12')
  })

  it('lets the two chart panels follow their row rather than setting its height', () => {
    // Both charts are flex-1 so they grow into a card stretched to a taller
    // neighbour, with a LOW floor so they never force the row taller than the
    // neighbour needed. A 256px floor did exactly that -- measured at 1440px,
    // dropping it to 192px took the funnel/pipeline row from 383px to 369px,
    // which is the funnel's own natural height rather than the Sankey's floor.
    const { container } = render(<Analytics {...fullProps()} />)
    for (const key of ['pipeline', 'time-in-stage']) {
      const box = container.querySelector(
        `[data-panel-slot="${key}"] [data-slot="card-content"] [class*="min-h-"]`
      )!
      expect(box.className, key).toContain('flex-1')
      expect(box.className, key).toContain('min-h-48')
      expect(box.className, key).not.toContain('min-h-64')
    }
  })

  it('says what the page and every panel are for', () => {
    const { container } = render(<Analytics {...fullProps()} />)
    expect(container.querySelector('[data-page-description]')!.textContent).toMatch(
      /how your applications actually move/i
    )
    // A panel heading names the panel; the line under it says what question
    // the panel answers. Every panel carries one, so none is a bare title.
    const panels = [...container.querySelectorAll('[data-analytics-panel]')]
    expect(panels.length).toBe(6)
    for (const panel of panels) {
      const description = panel.querySelector('[data-slot="card-description"]')
      expect(description, panel.querySelector('h2')?.textContent ?? '').toBeTruthy()
    }
  })

  it('scrolls the cohort table inside its own container rather than the page body', () => {
    render(<Analytics {...fullProps()} />)
    const heading = screen.getByRole('heading', { name: 'cohort analysis' })
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

describe('FunnelChart timings', () => {
  it('shows how long each stage took, which the chart used to discard', () => {
    // getConversionFunnel has always returned avgDaysToStage and
    // normalizeFunnel dropped it on the floor, so the panel could show a bar,
    // a count and a percentage but could not answer "how long does this take".
    render(<FunnelChart data={normalizeFunnel(FUNNEL)} />)
    expect(screen.getByText('3d to reach')).toBeTruthy()
    expect(screen.getByText('9d to reach')).toBeTruthy()
    expect(screen.getByText('21d to reach')).toBeTruthy()
    // The exits group carries it too -- how long people wait before a
    // rejection is the most useful number on the panel.
    expect(screen.getByText('11d to reach')).toBeTruthy()
  })

  it('writes a dash rather than "0d" where zero does not mean instant', () => {
    // Two different zeroes: Wishlist is the starting stage, and a stage nobody
    // has reached also reports 0. "0d to reach" would read as "this step is
    // instant" for both, which is wrong for the second and meaningless for the
    // first.
    const unreached: ConversionFunnelMetric[] = [
      { stage: 'Wishlist', count: 10, percentage: 100, avgDaysToStage: 0, isExit: false },
      { stage: 'Applied', count: 10, percentage: 100, avgDaysToStage: 1, isExit: false },
      { stage: 'Interviewing', count: 0, percentage: 0, avgDaysToStage: 0, isExit: false },
    ]
    render(<FunnelChart data={normalizeFunnel(unreached)} />)
    expect(screen.queryByText(/0d to reach/)).toBeNull()
    expect(screen.getAllByText('\u2014')).toHaveLength(2)
    expect(screen.getByText('1d to reach')).toBeTruthy()
  })

  it('drops the timing line entirely when no stage has a timing', () => {
    // An account with no status history reports 0 for every stage. Rendering
    // the line anyway gave five dashes -- height with nothing in it, which is
    // worse than the gap it was added to close.
    const noHistory: ConversionFunnelMetric[] = [
      { stage: 'Wishlist', count: 10, percentage: 100, avgDaysToStage: 0, isExit: false },
      { stage: 'Applied', count: 10, percentage: 100, avgDaysToStage: 0, isExit: false },
      { stage: 'Rejected', count: 1, percentage: 10, avgDaysToStage: 0, isExit: true },
    ]
    render(<FunnelChart data={normalizeFunnel(noHistory)} />)
    expect(screen.queryByText('\u2014')).toBeNull()
    // The bars themselves are untouched.
    expect(screen.getByText('Wishlist')).toBeTruthy()
  })

  it('carries avgDaysToStage through normalizeFunnel', () => {
    const result = normalizeFunnel(PARTIAL_FUNNEL)
    expect(result.map((r) => r.avgDaysToStage)).toEqual([3, 9, 21])
  })
})

describe('SalaryInsights scope', () => {
  const priced = (rows: Array<[number, string]>) =>
    rows.map(([amount, currency], i) => ({
      id: `j${i}`,
      company: `Co ${i}`,
      salary_min: amount,
      salary_max: amount,
      salary_currency: currency,
    })) as unknown as Job[]

  it('says nothing about scope when every salary is in one currency', () => {
    // The always-on line went at Gabe's request: "jobs with salary" already
    // gives the included count, and every figure carries its own currency
    // symbol, so the prose was restating what was above it.
    render(<SalaryInsights jobs={priced([[20_000, 'PHP'], [30_000, 'PHP']])} />)
    expect(screen.queryByText(/not shown/i)).toBeNull()
  })

  it('still discloses salaries it dropped for being in another currency', () => {
    // The one case where silence misleads. Figures are never converted, so a
    // mixed-currency account gets ONE currency charted and the rest dropped --
    // without this the numbers look like the whole picture and are not.
    render(
      <SalaryInsights
        jobs={priced([[20_000, 'PHP'], [30_000, 'PHP'], [5_000, 'USD']])}
      />
    )
    expect(screen.getByText(/1 application in another currency not shown/i)).toBeTruthy()
  })
})

describe('RangePicker', () => {
  it('offers the four windows the range maths supports, in that order', () => {
    render(<RangePicker value="all" onChange={() => {}} />)
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Last 3 months', 'Last 6 months', 'Last 12 months', 'all time'])
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
