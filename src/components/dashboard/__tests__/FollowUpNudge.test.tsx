import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FollowUpNudge } from '../FollowUpNudge'
import { RouteBaseProvider } from '@/components/shell/routeBase'
import type { StaleCandidate } from '@/services/followUp'

/** Oldest first, the order getStaleApplications already returns. */
function candidates(n: number): StaleCandidate[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `job-${i}`,
    company: `Company ${i}`,
    role: 'Engineer',
    status: 'applied' as const,
    last_touched_at: new Date(2026, 0, i + 1).toISOString(),
  }))
}

const trigger = () => screen.getByRole('button', { name: /follow/i })

describe('FollowUpNudge when nothing is stale', () => {
  it('renders nothing at all', () => {
    // Absence is the stronger signal: an "all caught up" card looks like
    // content, so the eye learns to skip that slot and then skips it on the
    // day it matters.
    const { container } = render(<FollowUpNudge stale={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('FollowUpNudge on the dashboard', () => {
  // It used to render every quiet application inline, which on a real search
  // is routinely fifteen rows -- turning the one panel whose job is "the
  // single thing to do today" into the longest element on the page and pushing
  // both charts below the fold. It is now a count and a control.
  it('shows the count without listing anything', () => {
    render(<FollowUpNudge stale={candidates(15)} />)
    expect(trigger()).toHaveTextContent('15')
    // The list is the dialog's job now. Nothing is rendered inline.
    expect(screen.queryByTestId('follow-up-list')).toBeNull()
    expect(screen.queryByText('Company 0')).toBeNull()
  })

  it('counts one follow-up in the singular', () => {
    // "review 1 follow-ups" is the kind of thing that ships.
    render(<FollowUpNudge stale={candidates(1)} />)
    expect(trigger().textContent).toMatch(/1 follow-up\b/)
    expect(trigger().textContent).not.toMatch(/follow-ups/)
  })
})

describe('FollowUpNudge dialog', () => {
  it('opens on the CTA and lists every quiet application', async () => {
    render(<FollowUpNudge stale={candidates(15)} />)
    await userEvent.click(trigger())

    const dialog = await screen.findByRole('dialog')
    const rows = within(dialog).getAllByRole('listitem')
    // ALL of them, not a capped subset -- the dialog scrolls, so there is no
    // reason to hide any, and a truncated dialog would understate the backlog.
    expect(rows).toHaveLength(15)
  })

  it('keeps the most stale ones at the top, where they are worth chasing', async () => {
    // getStaleApplications returns oldest-first, and that order is the whole
    // point: the ones that have gone quiet longest are the ones to chase.
    render(<FollowUpNudge stale={candidates(15)} />)
    await userEvent.click(trigger())

    const dialog = await screen.findByRole('dialog')
    const rows = within(dialog).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Company 0')
    expect(rows[14]).toHaveTextContent('Company 14')
  })

  it('links each row to its own application', async () => {
    // This is the one element whose entire purpose is "go deal with THIS
    // application", so landing anywhere less specific defeats it.
    render(<FollowUpNudge stale={candidates(3)} />)
    await userEvent.click(trigger())

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('link', { name: /Company 0/ })).toHaveAttribute(
      'href',
      '/applications/job-0'
    )
  })

  it('keeps those links inside the demo when it is rendered there', async () => {
    // The demo renders the REAL screens. An unprefixed /applications/<id>
    // leaves the demo, hits the (app) auth guard and lands on /login, which
    // reads as the demo being broken rather than as a boundary working.
    render(
      <RouteBaseProvider base="/demo">
        <FollowUpNudge stale={candidates(3)} />
      </RouteBaseProvider>
    )
    await userEvent.click(trigger())

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('link', { name: /Company 0/ })).toHaveAttribute(
      'href',
      '/demo/applications/job-0'
    )
  })
})
