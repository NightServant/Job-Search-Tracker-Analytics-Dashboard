import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import type { Job } from '@/types'

// Every read and write on this route goes through the useJobs hooks so they
// all land on the same ['jobs', user?.id] cache entry the dashboard reads.
// Mocking the module drives the wrapper's three states without standing up
// AuthProvider or QueryClientProvider.
const useJobsMock = vi.hoisted(() => vi.fn())
const useCreateJobMock = vi.hoisted(() => vi.fn())
const useUpdateJobMock = vi.hoisted(() => vi.fn())
const useCreateJobsBulkMock = vi.hoisted(() => vi.fn())
const idleMutation = vi.hoisted(() => () => ({ mutateAsync: vi.fn(), isPending: false }))

vi.mock('@/hooks/useJobs', () => ({
  useJobs: useJobsMock,
  useCreateJob: useCreateJobMock,
  useCreateJobsBulk: useCreateJobsBulkMock,
  useUpdateJob: useUpdateJobMock,
  useDeleteJob: idleMutation,
  useUpdateJobStatus: idleMutation,
  useAutofillJobFromUrl: idleMutation,
}))

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import Page from '../page'

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

beforeEach(() => {
  useCreateJobMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  useUpdateJobMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  useCreateJobsBulkMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
})

afterEach(() => cleanup())

describe('Applications route wrapper', () => {
  it('shows a spinner while jobs are loading, not an empty board', () => {
    useJobsMock.mockReturnValue({ data: undefined, isLoading: true, error: null })
    const { container } = render(<Page />)
    expect(container.querySelector('[role="status"]')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Applications' })).toBeNull()
  })

  it('surfaces a fetch error instead of the empty-account copy', () => {
    // "No applications yet" is a claim about the account. A failed read has
    // no basis for making it.
    useJobsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('network down'),
    })
    render(<Page />)
    expect(screen.getByText(/network down/)).toBeTruthy()
    expect(screen.queryByText(/no applications yet/i)).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('renders the screen from the shared jobs cache once loaded', () => {
    useJobsMock.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<Page />)
    expect(screen.getByRole('heading', { name: 'Applications' })).toBeTruthy()
    expect(useJobsMock).toHaveBeenCalled()
  })

  // The original bug lived exactly here: handleCreate/handleUpdate/handleImport
  // caught the mutation's rejection, showed a toast, and then fell off the end
  // of the function returning undefined -- which is truthy enough that
  // ApplicationsPage's `ok !== false` gate closed the panel anyway. Driving the
  // rejection through the real mutateAsync from here, rather than stubbing
  // ApplicationsPage's onCreate/onUpdate/onImport props directly, is what
  // proves the handler itself produces the falsy value the gate depends on --
  // not just that the gate honours a false someone hands it.
  it('resolves handleCreate to false and keeps the form open when the mutation rejects', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('permission denied'))
    useCreateJobMock.mockReturnValue({ mutateAsync, isPending: false })
    useJobsMock.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<Page />)

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.change(screen.getByLabelText(/^Company/), { target: { value: 'Acme' } })
    fireEvent.change(screen.getByLabelText(/^Role/), { target: { value: 'Engineer' } })
    fireEvent.click(screen.getByRole('button', { name: /add application/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('heading', { name: /new application/i })).toBeTruthy()
    expect(screen.getByLabelText(/^Company/)).toHaveValue('Acme')
  })

  it('resolves handleUpdate to false and keeps the edit form open when the mutation rejects', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('permission denied'))
    useUpdateJobMock.mockReturnValue({ mutateAsync, isPending: false })
    const job = makeJob({ id: '1', status: 'applied', company: 'Initech' })
    useJobsMock.mockReturnValue({ data: [job], isLoading: false, error: null })
    render(<Page />)

    fireEvent.click(screen.getAllByRole('button', { name: /^edit/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /save application/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('heading', { name: /edit .* at initech/i })).toBeTruthy()
  })

  it('resolves handleImport to false and keeps the parsed CSV summary when the bulk mutation rejects', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('permission denied'))
    useCreateJobsBulkMock.mockReturnValue({ mutateAsync, isPending: false })
    useJobsMock.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<Page />)

    const file = {
      name: 'jobs.csv',
      text: () => Promise.resolve('company,role\nAcme,Engineer'),
    } as unknown as File
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByText(/jobs\.csv/i)
    fireEvent.click(screen.getByRole('button', { name: /^import 1$/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(screen.getByText(/jobs\.csv/i)).toBeTruthy()
  })
})
