import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { Job } from '@/types'

// This route reads through four hooks (job, activity, document links, events)
// plus a fifth for CV text, so the fetch state, the not-found state and the
// happy path can all be driven by mocking those modules rather than standing
// up react-query, AuthProvider and Next's router.
const useParamsMock = vi.hoisted(() => vi.fn())
const useJobMock = vi.hoisted(() => vi.fn())
const useActivityMock = vi.hoisted(() => vi.fn())
const useDocumentLinksMock = vi.hoisted(() => vi.fn())
const useJobEventsMock = vi.hoisted(() => vi.fn())
const useCvTextMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ useParams: useParamsMock }))
vi.mock('@/hooks/useJobs', () => ({ useJob: useJobMock }))
vi.mock('@/hooks/useActivity', () => ({ useActivity: useActivityMock }))
vi.mock('@/hooks/useDocumentLinks', () => ({ useDocumentLinks: useDocumentLinksMock }))
vi.mock('@/hooks/useJobEvents', () => ({ useJobEvents: useJobEventsMock }))
vi.mock('@/hooks/useCvText', () => ({ useCvText: useCvTextMock }))

import Page from '../page'

function makeJob(overrides: Partial<Job> = {}): Job {
  const now = '2026-08-01T00:00:00.000Z'
  return {
    id: 'job-1',
    user_id: 'user-1',
    company: 'Acme',
    role: 'Staff Engineer',
    salary_min: 90000,
    salary_max: 120000,
    salary_currency: 'PHP',
    url: null,
    description: null,
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
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

afterEach(() => cleanup())

describe('Application detail route wrapper', () => {
  it('shows a spinner while the job is loading', () => {
    useParamsMock.mockReturnValue({ id: 'job-1' })
    useJobMock.mockReturnValue({ data: undefined, isLoading: true, error: null })
    useActivityMock.mockReturnValue({ data: [], isLoading: false })
    useDocumentLinksMock.mockReturnValue({ data: [], isLoading: false })
    useJobEventsMock.mockReturnValue({ data: [], isLoading: false })
    useCvTextMock.mockReturnValue({ data: undefined })

    const { container } = render(<Page />)
    expect(container.querySelector('[role="status"]')).toBeTruthy()
  })

  // The job itself can resolve well before its activity log does -- these are
  // four independent network reads -- so the spinner has to wait on all of
  // them or the activity panel flashes "no activity logged yet" right before
  // the real entries arrive.
  it('keeps showing the spinner while a secondary panel is still loading', () => {
    useParamsMock.mockReturnValue({ id: 'job-1' })
    useJobMock.mockReturnValue({ data: makeJob(), isLoading: false, error: null })
    useActivityMock.mockReturnValue({ data: undefined, isLoading: true })
    useDocumentLinksMock.mockReturnValue({ data: [], isLoading: false })
    useJobEventsMock.mockReturnValue({ data: [], isLoading: false })
    useCvTextMock.mockReturnValue({ data: undefined })

    const { container } = render(<Page />)
    expect(container.querySelector('[role="status"]')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Staff Engineer' })).toBeNull()
  })

  // A job that does not exist and a job RLS hides because it belongs to
  // someone else both surface as the same "Not found" error from
  // jobService.getJob, so this is also the coverage for a bad [id].
  it('shows a not-found panel instead of a broken shell when the job errors', () => {
    useParamsMock.mockReturnValue({ id: 'does-not-exist' })
    useJobMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Not found') })
    useActivityMock.mockReturnValue({ data: [], isLoading: false })
    useDocumentLinksMock.mockReturnValue({ data: [], isLoading: false })
    useJobEventsMock.mockReturnValue({ data: [], isLoading: false })
    useCvTextMock.mockReturnValue({ data: undefined })

    render(<Page />)
    expect(screen.getByText(/could not find that application/i)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Staff Engineer' })).toBeNull()
  })

  it('renders the application once every read resolves', () => {
    useParamsMock.mockReturnValue({ id: 'job-1' })
    useJobMock.mockReturnValue({ data: makeJob(), isLoading: false, error: null })
    useActivityMock.mockReturnValue({ data: [], isLoading: false })
    useDocumentLinksMock.mockReturnValue({ data: [], isLoading: false })
    useJobEventsMock.mockReturnValue({ data: [], isLoading: false })
    useCvTextMock.mockReturnValue({ data: undefined })

    render(<Page />)
    expect(screen.getByRole('heading', { name: 'Staff Engineer' })).toBeTruthy()
  })
})
