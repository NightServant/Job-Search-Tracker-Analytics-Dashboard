import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
const createMutate = vi.hoisted(() => vi.fn())
const routerPush = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useResumes', () => ({
  useResumes: useResumesMock,
  useResumeVersions: useResumeVersionsMock,
  useDeleteResume: () => ({ mutateAsync: deleteMutate, isPending: false }),
  useCreateResume: () => ({ mutateAsync: createMutate, isPending: false }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn() }),
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
    hasVersions: true,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useResumeVersionsMock.mockReturnValue({ data: [], isLoading: false, error: null })
  deleteMutate.mockResolvedValue(undefined)
  createMutate.mockResolvedValue({ id: 'cv-new' })
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

  // Item 2's second half, and the same defect class as window.confirm
  // everywhere else: a native confirm is unstyled, unthemeable and
  // untestable without stubbing a global.
  it('confirms before deleting, and does not delete when Cancel is chosen', async () => {
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /delete backend cv/i }))
    expect(screen.getByRole('alertdialog', { name: /delete backend cv/i })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'cancel' }))
    expect(deleteMutate).not.toHaveBeenCalled()
  })

  it('deletes the CV the row names once the confirm is accepted', async () => {
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    const user = userEvent.setup()
    render(<Page />)
    await user.click(screen.getByRole('button', { name: /delete backend cv/i }))
    await user.click(screen.getByRole('button', { name: 'delete' }))
    expect(deleteMutate).toHaveBeenCalledWith('cv-1')
  })

  it('only asks for a CV version history once its row has been expanded', () => {
    // One query per row on load would be a version history nobody opened for
    // every CV in the list.
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    render(<Page />)
    expect(useResumeVersionsMock).toHaveBeenLastCalledWith(null)

    fireEvent.click(screen.getByRole('button', { name: /version history for/i }))
    expect(useResumeVersionsMock).toHaveBeenLastCalledWith('cv-1')
  })

  it('stops asking for versions once the dialog is dismissed', async () => {
    // Was "collapses when the same row is toggled again", back when the
    // history was an inline disclosure you clicked twice. It is a dialog now
    // (M5.5 Item 4), so the trigger is behind an overlay while it is open and
    // Escape is the real dismissal path. What matters either way is that
    // closing releases the query, rather than leaving it subscribed to a row
    // nobody is looking at.
    const user = userEvent.setup()
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /version history for/i }))
    expect(useResumeVersionsMock).toHaveBeenLastCalledWith('cv-1')

    await user.keyboard('{Escape}')
    expect(useResumeVersionsMock).toHaveBeenLastCalledWith(null)
  })

  it('says the version read failed rather than claiming the CV has no versions', () => {
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    useResumeVersionsMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('x') })
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: /version history for/i }))
    expect(screen.getByText(/could not load the saved versions/i)).toBeTruthy()
    expect(screen.queryByText(/no versions saved yet/i)).toBeNull()
  })

  // Task 4 (M5.5): New CV moved from a Link to /cv?draft=new into a dialog
  // opened right here, so choosing a mode has to create the draft and land
  // on its editor exactly as the old full-page ModeChooser did.
  it('creates a CV in the chosen mode from the dialog and opens its editor', async () => {
    useResumesMock.mockReturnValue({ data: [makeDoc()], isLoading: false, error: null })
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getByRole('button', { name: /new cv/i }))
    await user.click(screen.getByRole('button', { name: /latex editor/i }))

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'latex', title: 'Untitled LaTeX CV' })
    )
    await act(async () => {})
    expect(routerPush).toHaveBeenCalledWith('/cv?draft=cv-new')
  })
})
