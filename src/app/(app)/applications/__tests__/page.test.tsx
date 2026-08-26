import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// Every read and write on this route goes through the useJobs hooks so they
// all land on the same ['jobs', user?.id] cache entry the dashboard reads.
// Mocking the module drives the wrapper's three states without standing up
// AuthProvider or QueryClientProvider.
const useJobsMock = vi.hoisted(() => vi.fn())
const idleMutation = vi.hoisted(() => () => ({ mutateAsync: vi.fn(), isPending: false }))

vi.mock('@/hooks/useJobs', () => ({
  useJobs: useJobsMock,
  useCreateJob: idleMutation,
  useCreateJobsBulk: idleMutation,
  useUpdateJob: idleMutation,
  useDeleteJob: idleMutation,
  useUpdateJobStatus: idleMutation,
  useAutofillJobFromUrl: idleMutation,
}))

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import Page from '../page'

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
})
