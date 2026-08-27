import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Dashboard } from '../Dashboard'
import type { Job } from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000

function makeJob(overrides: Partial<Job> & Pick<Job, 'id' | 'status'>): Job {
  const now = new Date().toISOString()
  return {
    id: overrides.id,
    user_id: 'user-1',
    company: 'Acme',
    role: 'Engineer',
    salary_min: 90000,
    salary_max: 120000,
    salary_currency: 'USD',
    url: null,
    description: null,
    status: overrides.status,
    date_applied: now,
    notes: null,
    contact_name: null,
    contact_email: null,
    contact_linkedin: null,
    contact_notes: null,
    location: null,
    work_mode: null,
    source: null,
    is_referral: false,
    tags: [],
    tech_stack: [],
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

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
  it('puts the follow-up nudge above the KPI strip', () => {
    // The nudge is the only thing on this page that asks for an action today.
    // Below the fold it is a notification nobody reads.
    const { container } = render(<Dashboard jobs={STALE_FIXTURE} />)
    const nudge = container.querySelector('[data-follow-up]')!
    const kpis = container.querySelector('[data-kpi-strip]')!
    expect(nudge.compareDocumentPosition(kpis) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('hides the nudge entirely when nothing is stale', () => {
    // An empty "nothing to chase" card trains the eye to skip the slot.
    const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
    expect(container.querySelector('[data-follow-up]')).toBeNull()
  })

  it('renders six blocks, each linking out to its own route', () => {
    const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
    const blocks = container.querySelectorAll('[data-dashboard-block]')
    expect(blocks).toHaveLength(6)
    for (const b of blocks) expect(b.querySelector('a[href]')).toBeTruthy()
  })

  it('shows KPI values with tabular figures', () => {
    const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
    for (const v of container.querySelectorAll('[data-kpi-value]')) {
      expect(v.className).toContain('tabular')
    }
  })

  it('separates the six blocks with a hairline rule, not a border box', () => {
    // Only job-card.tsx earns a full border in this system, and its own doc
    // comment says why: it moves. A static dashboard grouping doesn't, so it
    // gets a rule instead -- same vocabulary as application-row's border-b.
    const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
    const blocks = container.querySelectorAll('[data-dashboard-block]')
    expect(blocks).toHaveLength(6)
    for (const b of blocks) {
      const el = b as HTMLElement
      expect(el.className).toContain('border-t')
      expect(el.className).not.toMatch(/(^|\s)border(\s|$)/)
    }
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
    expect(screen.getByText('Not applied')).toBeTruthy()
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
