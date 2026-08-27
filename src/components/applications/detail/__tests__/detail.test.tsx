import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { Job } from '@/types'
import { AtsPanel } from '../AtsPanel'
import { NextEvent } from '../NextEvent'
import { JobDescription } from '../JobDescription'
import { ActivityTimeline } from '../ActivityTimeline'
import { LinkedCv } from '../LinkedCv'
import { DetailPage } from '../DetailPage'

afterEach(() => cleanup())

const JOB: Job = {
  id: 'job-1',
  user_id: 'user-1',
  company: 'Acme',
  role: 'Staff Engineer',
  salary_min: 90000,
  salary_max: 120000,
  salary_currency: 'PHP',
  url: 'https://example.com/job',
  description: 'We need React and Kubernetes experience.',
  status: 'applied',
  date_applied: '2026-07-20',
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
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
}

describe('AtsPanel', () => {
  it('renders the ATS result as a rule and a label, never a pill', () => {
    const { container } = render(
      <AtsPanel match={{ score: 72, matched: ['react'], missing: ['go'] }} />
    )
    const rule = container.querySelector('[data-status-rule]')!
    expect(rule.className).toContain('rounded-none')
  })

  it('names the missing keywords rather than only scoring', () => {
    // A bare 72% tells you nothing you can act on.
    render(<AtsPanel match={{ score: 72, matched: ['react'], missing: ['go', 'kubernetes'] }} />)
    expect(screen.getByText(/kubernetes/)).toBeTruthy()
  })

  it('says so plainly when there is nothing to score', () => {
    render(<AtsPanel match={null} />)
    expect(screen.getByText(/see how closely they match/i)).toBeTruthy()
  })
})

describe('NextEvent', () => {
  it('says so plainly when there is no next event', () => {
    render(<NextEvent event={null} />)
    expect(screen.getByText(/nothing scheduled/i)).toBeTruthy()
  })

  it('says the read failed rather than claiming nothing is scheduled', () => {
    render(<NextEvent event={null} error />)
    expect(screen.queryByText(/nothing scheduled/i)).toBeNull()
    expect(screen.getByText(/could not load the next event/i)).toBeTruthy()
  })

  it('renders the event kind and time when one is scheduled', () => {
    render(
      <NextEvent
        event={{
          id: 'evt-1',
          job_id: 'job-1',
          user_id: 'user-1',
          kind: 'interview',
          title: 'Onsite round',
          starts_at: '2026-09-01T14:00:00.000Z',
          duration_minutes: 60,
          notes: null,
        }}
      />
    )
    expect(screen.getByText('Onsite round')).toBeTruthy()
    expect(screen.getByText(/Interview/)).toBeTruthy()
  })
})

describe('JobDescription', () => {
  it('says so plainly when there is no description', () => {
    render(<JobDescription description={null} />)
    expect(screen.getByText(/no job description saved/i)).toBeTruthy()
  })

  it('renders the posting text when present', () => {
    render(<JobDescription description="Build things." url="https://example.com" />)
    expect(screen.getByText('Build things.')).toBeTruthy()
    expect(screen.getByRole('link', { name: /view posting/i })).toBeTruthy()
  })
})

describe('ActivityTimeline', () => {
  it('says so plainly when nothing has been logged', () => {
    render(<ActivityTimeline activity={[]} />)
    expect(screen.getByText(/no activity logged yet/i)).toBeTruthy()
  })

  it('says the read failed rather than claiming nothing was logged', () => {
    render(<ActivityTimeline activity={[]} error />)
    expect(screen.queryByText(/no activity logged yet/i)).toBeNull()
    expect(screen.getByText(/could not load activity/i)).toBeTruthy()
  })

  it('lists entries newest first regardless of input order', () => {
    render(
      <ActivityTimeline
        activity={[
          { id: 'a', job_id: 'job-1', user_id: 'user-1', note: 'Older note', occurred_at: '2026-07-01' },
          { id: 'b', job_id: 'job-1', user_id: 'user-1', note: 'Newer note', occurred_at: '2026-07-15' },
        ]}
      />
    )
    const notes = screen.getAllByText(/note/).map((el) => el.textContent)
    expect(notes[0]).toBe('Newer note')
    expect(notes[1]).toBe('Older note')
  })
})

describe('LinkedCv', () => {
  it('says so plainly when no CV is linked', () => {
    render(<LinkedCv links={[]} />)
    expect(screen.getByText(/no cv linked/i)).toBeTruthy()
  })

  it('says the read failed rather than claiming no CV is linked', () => {
    render(<LinkedCv links={[]} error />)
    expect(screen.queryByText(/no cv linked/i)).toBeNull()
    expect(screen.getByText(/could not load the linked cv/i)).toBeTruthy()
  })

  it('describes the linked CV', () => {
    render(
      <LinkedCv
        links={[{ resume_id: 'resume-1', title: 'Software Engineer CV', version: 2, sent_at: '2026-07-01' }]}
      />
    )
    expect(screen.getByText(/software engineer cv/i)).toBeTruthy()
  })
})

describe('DetailPage', () => {
  it('shows the breadcrumb with the current page as text, not a link', () => {
    render(<DetailPage job={JOB} />)
    expect(screen.queryByRole('link', { name: JOB.role })).toBeNull()
    expect(screen.getByText(JOB.role, { selector: '[aria-current="page"]' })).toBeTruthy()
  })

  it('renders Back and Edit as the header action, not the Top Bar', () => {
    render(<DetailPage job={JOB} />)
    expect(screen.getByRole('link', { name: 'Back' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Edit' })).toBeTruthy()
  })

  it('renders every panel with sensible defaults when only job is given', () => {
    render(<DetailPage job={JOB} />)
    expect(screen.getByText(/no activity logged yet/i)).toBeTruthy()
    expect(screen.getByText(/no cv linked/i)).toBeTruthy()
    expect(screen.getByText(/nothing scheduled/i)).toBeTruthy()
  })

  it('passes each panel its own error flag without blanking the other panels', () => {
    render(<DetailPage job={JOB} activityError linksError nextEventError />)
    expect(screen.getByText(/could not load activity/i)).toBeTruthy()
    expect(screen.getByText(/could not load the linked cv/i)).toBeTruthy()
    expect(screen.getByText(/could not load the next event/i)).toBeTruthy()
    // None of the three failures should print the empty-state copy instead.
    expect(screen.queryByText(/no activity logged yet/i)).toBeNull()
    expect(screen.queryByText(/no cv linked/i)).toBeNull()
    expect(screen.queryByText(/nothing scheduled/i)).toBeNull()
    // The page itself still renders -- a secondary-read failure never blanks
    // the whole screen.
    expect(screen.getByRole('heading', { name: JOB.role })).toBeTruthy()
  })
})
