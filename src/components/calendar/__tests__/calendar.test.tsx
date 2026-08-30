import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { CalendarEvent } from '@/services/events'

import { Calendar } from '../Calendar'
import { Agenda } from '../Agenda'

afterEach(() => cleanup())

const ev = (id: string, starts_at: string, job_id: string | null = 'job-1'): CalendarEvent => ({
  id,
  job_id,
  user_id: 'user-1',
  kind: 'interview',
  title: 'Technical interview',
  starts_at,
  duration_minutes: 60,
  notes: null,
})

const EVENTS: CalendarEvent[] = [ev('a', new Date().toISOString())]

describe('Calendar', () => {
  // Fix round 2: Calendar no longer calls useJobs() itself (ruling R3 --
  // a props-taking component, matching Dashboard/DetailPage). It takes
  // companyByJobId as a plain prop built by the route, so no hook mock is
  // needed here at all; that mock now lives in
  // src/app/(app)/calendar/__tests__/page.test.tsx.
  it('is a month grid on desktop and a week strip plus agenda on mobile', () => {
    // 47px cells can show a dot but never an event, so mobile is a different
    // layout rather than a squeezed one.
    const { container } = render(<Calendar events={EVENTS} />)
    expect(container.querySelector('[data-month-grid]')!.className).toContain('hidden md:grid')
    expect(container.querySelector('[data-week-strip]')!.className).toContain('md:hidden')
  })

  it('marks today with an accent rule, not a filled chip', () => {
    const { container } = render(<Calendar events={EVENTS} />)
    const today = container.querySelector('[data-today]')!
    // R4: the plan's original assertion only proved the absence of a
    // radius. Strengthened to assert the presence of the actual 2px accent
    // rule the Status Marker vocabulary requires -- the same class the nav
    // item's active rule and the status tabs' active rule use.
    expect(today.className).toContain('rounded-none')
    expect(today.className).toContain('bg-accent-default')
    expect(today.className).toContain('h-[2px]')
  })

  it('renders a page header titled Calendar', () => {
    render(<Calendar events={EVENTS} />)
    expect(screen.getByRole('heading', { name: 'calendar' })).toBeTruthy()
  })

  it('threads a companyByJobId prop through into the agenda, unmodified', () => {
    render(<Calendar events={EVENTS} companyByJobId={{ 'job-1': 'Acme Corp' }} />)
    expect(screen.getByText('Acme Corp')).toBeTruthy()
  })
})

describe('Agenda', () => {
  it('uses a neutral rule for events, never the status palette', () => {
    // An event kind is not an application status, and the five status hues
    // mean one specific thing everywhere else in the app.
    const { container } = render(<Agenda events={EVENTS} />)
    const rules = container.querySelectorAll('[data-event-rule]')
    expect(rules.length).toBeGreaterThan(0)
    for (const row of rules) {
      expect(row.className).not.toMatch(/status-(wishlist|applied|interviewing|offer|rejected)/)
    }
  })

  it('says there is nothing scheduled rather than rendering an empty list', () => {
    render(<Agenda events={[]} />)
    expect(screen.getByText(/nothing scheduled/i)).toBeTruthy()
  })

  it('distinguishes two identically-titled events on the same day by company', () => {
    // Concrete failure this closes: two interview events both titled
    // "Technical interview" for different companies used to render as
    // identical rows.
    const same = new Date().toISOString()
    const events = [ev('a', same, 'job-1'), ev('b', same, 'job-2')]
    render(
      <Agenda
        events={events}
        companyByJobId={{ 'job-1': 'Acme Corp', 'job-2': 'Globex' }}
      />
    )
    expect(screen.getByText('Acme Corp')).toBeTruthy()
    expect(screen.getByText('Globex')).toBeTruthy()
  })

  it('renders a standalone event (no job_id) without a company line, never "null" or a bare separator', () => {
    const { container } = render(
      <Agenda events={[ev('a', new Date().toISOString(), null)]} companyByJobId={{}} />
    )
    expect(container.textContent).not.toContain('null')
    // The row's own text, specifically -- not just "the word null is absent
    // somewhere on the page" -- must not contain a stray leading separator
    // where a company would otherwise have gone.
    const row = container.querySelector('[data-event-rule]')!
    expect(row.textContent).not.toMatch(/^\s*·/)
    expect(row.textContent).not.toContain('undefined')
  })

  it('gives the time/kind line tabular numerals, matching MonthGrid and WeekStrip', () => {
    const { container } = render(<Agenda events={EVENTS} />)
    const row = container.querySelector('[data-event-rule]')!
    const timeLine = row.querySelector('.tabular')
    expect(timeLine).toBeTruthy()
  })
})
