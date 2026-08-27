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

  // A settled failure on a secondary read is not the same fact as a genuine
  // empty read, and it must not render as one -- the same defect the panels'
  // own empty states exist to prevent, one level up. The page itself must
  // still render (the job and the other two panels loaded fine), so this is
  // deliberately not folded into the not-found panel above.
  it('shows the activity panel as failed, not empty, when the activity read errors', () => {
    useParamsMock.mockReturnValue({ id: 'job-1' })
    useJobMock.mockReturnValue({ data: makeJob(), isLoading: false, error: null })
    useActivityMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom') })
    useDocumentLinksMock.mockReturnValue({ data: [], isLoading: false, error: null })
    useJobEventsMock.mockReturnValue({ data: [], isLoading: false, error: null })
    useCvTextMock.mockReturnValue({ data: undefined })

    render(<Page />)
    expect(screen.getByRole('heading', { name: 'Staff Engineer' })).toBeTruthy()
    expect(screen.getByText(/could not load activity/i)).toBeTruthy()
    expect(screen.queryByText(/no activity logged yet/i)).toBeNull()
  })

  it('shows the linked CV panel as failed, not empty, when the document-links read errors', () => {
    useParamsMock.mockReturnValue({ id: 'job-1' })
    useJobMock.mockReturnValue({ data: makeJob(), isLoading: false, error: null })
    useActivityMock.mockReturnValue({ data: [], isLoading: false, error: null })
    useDocumentLinksMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom') })
    useJobEventsMock.mockReturnValue({ data: [], isLoading: false, error: null })
    useCvTextMock.mockReturnValue({ data: undefined })

    render(<Page />)
    expect(screen.getByRole('heading', { name: 'Staff Engineer' })).toBeTruthy()
    expect(screen.getByText(/could not load the linked cv/i)).toBeTruthy()
    expect(screen.queryByText(/no cv linked/i)).toBeNull()
  })

  it('shows the next-event panel as failed, not empty, when the events read errors', () => {
    useParamsMock.mockReturnValue({ id: 'job-1' })
    useJobMock.mockReturnValue({ data: makeJob(), isLoading: false, error: null })
    useActivityMock.mockReturnValue({ data: [], isLoading: false, error: null })
    useDocumentLinksMock.mockReturnValue({ data: [], isLoading: false, error: null })
    useJobEventsMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('boom') })
    useCvTextMock.mockReturnValue({ data: undefined })

    render(<Page />)
    expect(screen.getByRole('heading', { name: 'Staff Engineer' })).toBeTruthy()
    expect(screen.getByText(/could not load the next event/i)).toBeTruthy()
    expect(screen.queryByText(/nothing scheduled/i)).toBeNull()
  })
})
