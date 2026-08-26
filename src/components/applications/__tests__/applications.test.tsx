import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ApplicationsPage } from '../ApplicationsPage'
import { ApplicationForm } from '../ApplicationForm'
import type { Job } from '@/types'

function makeJob(overrides: Partial<Job> & Pick<Job, 'id' | 'status'>): Job {
  const now = '2026-08-01T00:00:00.000Z'
  return {
    id: overrides.id,
    user_id: 'user-1',
    company: 'Acme',
    role: 'Engineer',
    salary_min: 90000,
    salary_max: 120000,
    salary_currency: 'PHP',
    url: null,
    description: null,
    status: overrides.status,
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
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

const JOBS: Job[] = [
  makeJob({ id: '1', status: 'wishlist', company: 'Initech' }),
  makeJob({ id: '2', status: 'applied', company: 'Globex' }),
  makeJob({ id: '3', status: 'interviewing', company: 'Umbrella' }),
  makeJob({ id: '4', status: 'interviewing', company: 'Soylent' }),
  makeJob({ id: '5', status: 'offer', company: 'Hooli' }),
  makeJob({ id: '6', status: 'rejected', company: 'Vandelay' }),
]

afterEach(() => cleanup())

describe('ApplicationsPage', () => {
  it('shows a kanban at desktop width and never below 768px', () => {
    // Five columns at 375px is 75px each -- narrower than the card's own padding.
    const { container } = render(<ApplicationsPage jobs={JOBS} />)
    expect(container.querySelector('[data-kanban]')!.className).toContain('hidden md:grid')
    expect(container.querySelector('[data-list]')!.className).toContain('md:hidden')
  })

  it('filters the mobile list by the selected status tab', () => {
    render(<ApplicationsPage jobs={JOBS} />)
    fireEvent.click(screen.getByRole('tab', { name: /interviewing/i }))
    const rows = screen.getAllByTestId('application-row')
    expect(rows).toHaveLength(JOBS.filter((j) => j.status === 'interviewing').length)
  })

  it('marks the selected tab for a screen reader, not just visually', () => {
    render(<ApplicationsPage jobs={JOBS} />)
    const tab = screen.getByRole('tab', { name: /interviewing/i })
    fireEvent.click(tab)
    expect(tab.getAttribute('aria-selected')).toBe('true')
  })

  it('carries Add in the body header rather than the toolbar', () => {
    // The roadmap flagged Add sitting in the Top Bar as the last inconsistency
    // against Documents' "+ new cv". The body header is where it gets fixed.
    const { container } = render(<ApplicationsPage jobs={JOBS} />)
    const header = container.querySelector('[data-body-header]')!
    expect(header.querySelector('button')!.textContent).toContain('Add')
  })

  it('narrows both the list and the kanban by the search box', () => {
    render(<ApplicationsPage jobs={JOBS} />)
    fireEvent.change(screen.getByLabelText('Search applications'), {
      target: { value: 'hooli' },
    })
    expect(screen.getAllByTestId('application-row')).toHaveLength(1)
    expect(screen.getAllByTestId('kanban-card')).toHaveLength(1)
  })

  it('states the status with a rule and a label, never a pill', () => {
    const { container } = render(<ApplicationsPage jobs={JOBS} />)
    const rules = container.querySelectorAll('[data-status-rule]')
    expect(rules.length).toBeGreaterThan(0)
    rules.forEach((rule) => expect(rule.className).toContain('rounded-none'))
  })

  it('says the list is empty rather than rendering an empty kanban', () => {
    render(<ApplicationsPage jobs={[]} />)
    expect(screen.getByText(/no applications yet/i)).toBeTruthy()
  })
})

describe('ApplicationForm', () => {
  it('starts a new application in the stored default currency', () => {
    // A PHP user typing a peso figure into a form defaulted to USD produces a
    // number that is wrong by a factor of 55 and looks plausible.
    render(<ApplicationForm defaultCurrency="PHP" />)
    expect((screen.getByLabelText('Currency') as HTMLSelectElement).value).toBe('PHP')
  })

  it('disables submit and shows a spinner while saving', () => {
    render(<ApplicationForm defaultCurrency="PHP" saving />)
    const submit = screen.getByRole('button', { name: /saving/i })
    expect(submit).toHaveProperty('disabled', true)
    expect(submit.querySelector('[role="status"]')).toBeTruthy()
  })

  it('keeps the job own currency when editing rather than the account default', () => {
    // Re-defaulting an existing USD job to the account currency would relabel
    // a stored figure without changing it.
    const job = makeJob({ id: '9', status: 'applied', salary_currency: 'USD' })
    render(<ApplicationForm defaultCurrency="PHP" job={job} />)
    expect((screen.getByLabelText('Currency') as HTMLSelectElement).value).toBe('USD')
  })

  it('refuses to submit a job with no company and says why', () => {
    const onSubmit = vi.fn()
    render(<ApplicationForm defaultCurrency="PHP" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/^Role/), { target: { value: 'Engineer' } })
    fireEvent.click(screen.getByRole('button', { name: /add application/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/company is required/i)).toBeTruthy()
  })

  it('submits the typed currency alongside the figures', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ApplicationForm defaultCurrency="PHP" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/^Company/), { target: { value: 'Acme' } })
    fireEvent.change(screen.getByLabelText(/^Role/), { target: { value: 'Engineer' } })
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'USD' } })
    fireEvent.click(screen.getByRole('button', { name: /add application/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      company: 'Acme',
      role: 'Engineer',
      salary_currency: 'USD',
    })
  })

  it('saves with a text button, never an icon', () => {
    // Save was one of the four glyphs M5 eliminated outright.
    const { container } = render(<ApplicationForm defaultCurrency="PHP" />)
    const submit = container.querySelector('button[type="submit"]')!
    expect(submit.textContent!.trim().length).toBeGreaterThan(0)
    expect(submit.querySelector('svg')).toBeNull()
  })
})
