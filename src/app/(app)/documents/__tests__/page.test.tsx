import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import type { ResumeSummary } from '@/services/resumeService'

/**
 * The Documents route wrapper. `DocumentsPage` itself is covered over plain
 * props in `src/components/documents/__tests__`; this covers the three states
 * the wrapper owns and the wiring between them, which is where the last
 * whole-branch review found handlers that were never exercised.
 */
const useResumesMock = vi.hoisted(() => vi.fn())
const useResumeVersionsMock = vi.hoisted(() => vi.fn())
const deleteMutate = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useResumes', () => ({
  useResumes: useResumesMock,
  useResumeVersions: useResumeVersionsMock,
  useDeleteResume: () => ({ mutateAsync: deleteMutate, isPending: false }),
}))

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import Page from '../page'

function makeDoc(overrides: Partial<ResumeSummary> = {}): ResumeSummary {
  return {
    id: 'cv-1',
    title: 'Backend CV',
    mode: 'word',
    updated_at: '2026-08-20T10:00:00.000Z',
    sections: null,
    version: 2,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useResumeVersionsMock.mockReturnValue({ data: [], isLoading: false, error: null })
  deleteMutate.mockResolvedValue(undefined)
  window.confirm = vi.fn(() => true)
})

afterEach(() => cleanup())

describe('Documents route wrapper', () => {
  it('shows a spinner while the CVs are loading', () => {
    useResumesMock.mockReturnValue({ data: undefined, isLoading: true, error: null })
    const { container } = render(<Page />)
    expect(container.querySelector('[role="status"]')).toBeTruthy()
  })

  it('says the read failed rather than falling through to the no-CVs state', () => {
    useResumesMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('offline') })
    render(<Page />)
    expect(screen.getByText(/could not load your cvs/i)).toBeTruthy()
    expect(screen.queryByText(/no cvs yet/i)).toBeNull()
  })

  it('renders the list once the read resolves', () => {
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    render(<Page />)
    expect(screen.getByRole('link', { name: 'Backend CV' })).toBeTruthy()
  })

  it('confirms before deleting, and does not delete when the confirm is declined', () => {
    window.confirm = vi.fn(() => false)
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: /delete backend cv/i }))
    expect(deleteMutate).not.toHaveBeenCalled()
  })

  it('deletes the CV the row names once the confirm is accepted', async () => {
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    render(<Page />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete backend cv/i }))
    })
    expect(deleteMutate).toHaveBeenCalledWith('cv-1')
  })

  it('only asks for a CV version history once its row has been expanded', () => {
    // One query per row on load would be a version history nobody opened for
    // every CV in the list.
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    render(<Page />)
    expect(useResumeVersionsMock).toHaveBeenLastCalledWith(null)

    fireEvent.click(screen.getByRole('button', { name: /versions/i }))
    expect(useResumeVersionsMock).toHaveBeenLastCalledWith('cv-1')
  })

  it('collapses the version history when the same row is toggled again', () => {
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: /versions/i }))
    fireEvent.click(screen.getByRole('button', { name: /versions/i }))
    expect(useResumeVersionsMock).toHaveBeenLastCalledWith(null)
  })

  it('says the version read failed rather than claiming the CV has no versions', () => {
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    useResumeVersionsMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('x') })
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: /versions/i }))
    expect(screen.getByText(/could not load the saved versions/i)).toBeTruthy()
    expect(screen.queryByText(/no versions saved yet/i)).toBeNull()
  })
})
