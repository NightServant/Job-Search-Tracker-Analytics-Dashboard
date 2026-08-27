import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Calendar } from '../Calendar'
import { Agenda } from '../Agenda'
import type { CalendarEvent } from '@/services/events'

afterEach(() => cleanup())

const ev = (id: string, starts_at: string): CalendarEvent => ({
  id,
  job_id: 'job-1',
  user_id: 'user-1',
  kind: 'interview',
  title: 'Technical interview',
  starts_at,
  duration_minutes: 60,
  notes: null,
})

const EVENTS: CalendarEvent[] = [ev('a', new Date().toISOString())]

describe('Calendar', () => {
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
    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeTruthy()
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
})
