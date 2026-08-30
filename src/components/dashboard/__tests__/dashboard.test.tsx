import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Dashboard } from '../Dashboard'
import { makeJob } from '@/test/fixtures'
import type { Job } from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000

// A live application gone quiet for a month is well past the 14-day
// follow-up threshold, whatever day the suite happens to run.
const STALE_FIXTURE: Job[] = [
  makeJob({
    id: 'stale-1',
    status: 'applied',
    updated_at: new Date(Date.now() - 30 * DAY_MS).toISOString(),
  }),
]

const FRESH_FIXTURE: Job[] = [
  makeJob({ id: 'fresh-1', status: 'applied' }),
  makeJob({ id: 'fresh-2', status: 'interviewing', company: 'Globex', role: 'PM' }),
  makeJob({ id: 'fresh-3', status: 'wishlist', company: 'Initech', role: 'Analyst' }),
]

describe('Dashboard', () => {
  it('puts the KPI strip above the follow-up nudge, as the frame draws it', () => {
    // REVERSED in M5.5 Item 5, deliberately. This asserted the opposite,
    // from roadmap 5.3's prose ("KPI strip, follow-up nudge first"). Figma
    // 20:64 puts the KPI Strip at y=129 and the Follow-up Nudge at y=287, so
    // the frame and the prose disagree -- and the roadmap names the Figma
    // file as the source of truth for design. Both are above the fold at
    // 1024px, so the nudge is not buried either way.
    const { container } = render(<Dashboard jobs={STALE_FIXTURE} />)
    const nudge = container.querySelector('[data-follow-up]')!
    const kpis = container.querySelector('[data-kpi-strip]')!
    expect(kpis.compareDocumentPosition(nudge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('reads the calendar rather than inventing an events sentence', () => {
    // The old block printed the literal string "N interviews in progress",
    // derived from job statuses -- so it had no empty state and could never
    // show a real event. Item 5's first complaint.
    render(<Dashboard jobs={FRESH_FIXTURE} events={[]} />)
    expect(screen.queryByText(/interviews in progress/i)).toBeNull()
    expect(screen.getByText(/nothing scheduled yet/i)).toBeTruthy()
  })

  it('distinguishes a failing calendar read from an empty calendar', () => {
    render(<Dashboard jobs={FRESH_FIXTURE} events={[]} eventsError />)
    expect(screen.getByText(/could not load your calendar/i)).toBeTruthy()
    expect(screen.queryByText(/nothing scheduled yet/i)).toBeNull()
  })

  it('renders the three charts Gabe asked for', () => {
    // line/area over time, the status doughnut, and bars by source. recharts
    // has been a dependency since M5 and this screen imported none of it.
    const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
    expect(container.querySelector('[data-chart-over-time]')).toBeTruthy()
    expect(container.querySelector('[data-chart-donut]')).toBeTruthy()
    expect(container.querySelector('[data-chart-sources]')).toBeTruthy()
  })

  it('keeps all five statuses in the donut legend, including the zeros', () => {
    // A legend that drops empty statuses changes length as data changes, and
    // the colour under a given segment starts meaning something else.
    const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
    expect(container.querySelectorAll('[data-donut-legend] li')).toHaveLength(5)
  })

  it('hides the nudge entirely when nothing is stale', () => {
    // An empty "nothing to chase" card trains the eye to skip the slot.
    const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
    expect(container.querySelector('[data-follow-up]')).toBeNull()
  })

  it('renders the recent-applications table with real column labels', () => {
    // Replaces "renders six blocks": the six generic text blocks are gone.
    // The old Recent applications block was loose text with no column labels,
    // so nothing lined up between rows and a screen reader got no row/column
    // relationship at all.
    render(<Dashboard jobs={FRESH_FIXTURE} />)
    const table = screen.getByRole('table')
    for (const label of ['company', 'position', 'status', 'applied on']) {
      expect(within(table).getByRole('columnheader', { name: label })).toBeTruthy()
    }
  })

  it('shows KPI values with tabular figures', () => {
    const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
    for (const v of container.querySelectorAll('[data-kpi-value]')) {
      expect(v.className).toContain('tabular')
    }
  })

  it('draws the header rule the frame specifies and no card borders', () => {
    // Figma 20:68 is a 2px full-width rule under the page title. Separation in
    // this system is hairline rules, never boxed cards -- the six bordered
    // blocks this replaced were themselves a fix round in M5.
    const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
    const rule = container.querySelector('[data-header-rule]') as HTMLElement
    expect(rule).toBeTruthy()
    expect(rule.className).toContain('border-t-2')
  })

  it('links each row in Recent applications to that job\'s own detail route', () => {
    // Task 5 built /applications/[id] after this dashboard shipped; every
    // path off this page used to dead-end on the unfiltered list.
    render(<Dashboard jobs={FRESH_FIXTURE} />)
    const link = screen.getByRole('link', { name: /Globex/i })
    expect(link.getAttribute('href')).toBe('/applications/fresh-2')
  })

  it('shows "Not applied" for a wishlist job rather than a fabricated or raw timestamp', () => {
    // date_applied is null for a job nobody has applied to yet. Falling back
    // to created_at used to print that row's signup timestamp as if it were
    // an applied date, and it was a full TIMESTAMPTZ string besides. Alone in
    // the fixture so it is unambiguously the one "recent" row.
    const wishlist = makeJob({
      id: 'wishlist-1',
      status: 'wishlist',
      date_applied: null,
      created_at: '2026-08-20T14:23:01.123456+00:00',
    })
    render(<Dashboard jobs={[wishlist]} />)
    expect(screen.getByText('not applied')).toBeTruthy()
    expect(screen.queryByText(/2026-08-20T/)).toBeNull()
  })

  it('sends the follow-up nudge to the stale application\'s own detail route', () => {
    // stale-1 also shows up in Recent applications, so this scopes the query
    // to the nudge itself rather than risking a match on the other row.
    const { container } = render(<Dashboard jobs={STALE_FIXTURE} />)
    const nudge = container.querySelector('[data-follow-up]') as HTMLElement
    const link = within(nudge).getByRole('link', { name: /Acme/i })
    expect(link.getAttribute('href')).toBe('/applications/stale-1')
  })
})
