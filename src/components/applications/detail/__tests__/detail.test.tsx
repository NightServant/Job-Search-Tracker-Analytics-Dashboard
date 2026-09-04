import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { Job } from '@/types'
import { AtsPanel } from '../AtsPanel'
import { NextEvent } from '../NextEvent'
import { JobDescription } from '../JobDescription'
import { ActivityTimeline } from '../ActivityTimeline'
import { LinkedCv } from '../LinkedCv'
import { ApplicationRecord } from '../../record/ApplicationRecord'
import { EMPTY_RECORD_DATA } from '../../record/recordData'

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

  it('says the CV read failed rather than claiming there is nothing to score', () => {
    render(<AtsPanel match={null} error />)
    expect(screen.queryByText(/see how closely they match/i)).toBeNull()
    expect(screen.getByText(/could not load your cv/i)).toBeTruthy()
  })

  it('prefers the error state even when a match happens to be present', () => {
    // A settled failure and a settled score can't both be true for the same
    // read, but the panel should still resolve the ambiguity toward "failed"
    // rather than silently trusting stale match data.
    render(<AtsPanel match={{ score: 90, matched: ['react'], missing: [] }} error />)
    expect(screen.getByText(/could not load your cv/i)).toBeTruthy()
    expect(screen.queryByText('90%')).toBeNull()
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
  it('says so plainly when nothing has been logged, without promising a composer nothing builds', () => {
    render(<ActivityTimeline activity={[]} />)
    expect(screen.getByText(/no activity logged for this application yet/i)).toBeTruthy()
    // The old copy ("Notes you add here...") pointed at a note composer that
    // no task through M5 builds.
    expect(screen.queryByText(/notes you add here/i)).toBeNull()
  })

  it('says the read failed rather than claiming nothing was logged', () => {
    render(<ActivityTimeline activity={[]} error />)
    expect(screen.queryByText(/no activity logged/i)).toBeNull()
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

  it('does not instruct the user to pin a CV from a control that does not exist', () => {
    render(<LinkedCv links={[]} />)
    // documentLinkService.pin/.unpin have zero callers in src, and DocumentRow
    // renders no pin affordance -- promising one here would send the user to
    // /documents to find nothing to click.
    expect(screen.queryByText(/pin one from documents/i)).toBeNull()
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

describe.each(['dialog', 'page'] as const)('ApplicationRecord (%s layout)', (layout) => {
  // BOTH LAYOUTS, from one table. The whole reason the record is one
  // component with a layout prop is that the desktop dialog and the mobile
  // page must not drift; a suite that only ever rendered one of them would
  // let exactly that happen while staying green.

  it('renders every panel with sensible defaults when there is nothing to show', () => {
    render(<ApplicationRecord job={JOB} data={EMPTY_RECORD_DATA} layout={layout} />)
    expect(screen.getByText(/no activity logged for this application yet/i)).toBeTruthy()
    expect(screen.getByText(/no cv linked/i)).toBeTruthy()
    expect(screen.getByText(/nothing scheduled/i)).toBeTruthy()
  })

  it('passes each panel its own error flag without blanking the other panels', () => {
    render(
      <ApplicationRecord
        job={JOB}
        data={{
          ...EMPTY_RECORD_DATA,
          activityError: true,
          linksError: true,
          nextEventError: true,
          atsError: true,
        }}
        layout={layout}
      />
    )
    expect(screen.getByText(/could not load activity/i)).toBeTruthy()
    expect(screen.getByText(/could not load the linked cv/i)).toBeTruthy()
    expect(screen.getByText(/could not load the next event/i)).toBeTruthy()
    expect(screen.getByText(/could not load your cv/i)).toBeTruthy()
    // None of the four failures should print the empty-state copy instead.
    expect(screen.queryByText(/no activity logged/i)).toBeNull()
    expect(screen.queryByText(/no cv linked/i)).toBeNull()
    expect(screen.queryByText(/nothing scheduled/i)).toBeNull()
    expect(screen.queryByText(/see how closely they match/i)).toBeNull()
    // The fields off the jobs row still render -- a secondary-read failure
    // never blanks the whole record.
    expect(screen.getByText('posting url')).toBeTruthy()
  })

  it('shows every section the record is specified to carry', () => {
    render(<ApplicationRecord job={JOB} data={EMPTY_RECORD_DATA} layout={layout} />)
    for (const heading of [
      'job description',
      'activity',
      'next event',
      'linked CV',
      'ATS match',
      'notes',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
    }
  })

  it('says which fields are unset rather than leaving them blank', () => {
    // A blank value in a grid reads as something that failed to load. Asserted
    // on work mode specifically because JOB leaves it null.
    render(<ApplicationRecord job={JOB} data={EMPTY_RECORD_DATA} layout={layout} />)
    const workMode = screen.getByText('work mode').closest('div')
    expect(workMode?.textContent).toMatch(/not set/i)
  })

  it('holds back only the four secondary panels while their reads are in flight', () => {
    // The fields off the jobs row came with the list and are shown at once;
    // blanking them too would make opening a record feel like a page load.
    render(
      <ApplicationRecord job={JOB} data={{ ...EMPTY_RECORD_DATA, loading: true }} layout={layout} />
    )
    expect(screen.getByText('posting url')).toBeTruthy()
    expect(screen.queryByText(/no activity logged/i)).toBeNull()
    expect(screen.getByText(/loading this application/i)).toBeTruthy()
  })
})
