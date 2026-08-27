import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import type { ResumeDraft } from '@/services/resumeService'

/**
 * The CV editor route.
 *
 * These tests exist because M5 Task 7 split a live 670-line editor out of
 * `src/screens/ResumePage.tsx` and then deleted that file. A green build does
 * not prove an editor still works, so this covers the three things the split
 * could plausibly have broken: that each editor still mounts for its own mode,
 * that autosave still reaches the database, and that the snapshot timer still
 * fires. The route is driven through mocked hooks rather than react-query and
 * AuthProvider, matching `applications/[id]`'s wrapper test.
 */
const useSearchParamsMock = vi.hoisted(() => vi.fn())
const routerReplace = vi.hoisted(() => vi.fn())
const useResumeMock = vi.hoisted(() => vi.fn())
const createMutate = vi.hoisted(() => vi.fn())
const updateMutate = vi.hoisted(() => vi.fn())
const deleteMutate = vi.hoisted(() => vi.fn())
const createSnapshotMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useSearchParams: useSearchParamsMock,
  useRouter: () => ({ replace: routerReplace, push: vi.fn() }),
}))

vi.mock('@/hooks/useResumes', () => ({
  useResume: useResumeMock,
  useCreateResume: () => ({ mutateAsync: createMutate, isPending: false }),
  useUpdateResume: () => ({ mutateAsync: updateMutate, isPending: false }),
  useDeleteResume: () => ({ mutateAsync: deleteMutate, isPending: false }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}))

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

vi.mock('@/services/resumeSnapshotService', () => ({
  createSnapshot: createSnapshotMock,
  getSnapshots: vi.fn().mockResolvedValue([]),
  getSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
}))

// The shared client refuses to construct without real credentials, and Vitest
// redacts the ones in .env, so the two modules that reach for it directly (the
// PDF export call and its session read) get a stub instead.
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
  hasValidSupabaseConfig: false,
}))

import Page from '../page'

function params(value: string | null) {
  useSearchParamsMock.mockReturnValue({ get: () => value })
}

function wordDraft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
  return {
    id: 'cv-1',
    title: 'Backend CV',
    mode: 'word',
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Shipped the rewrite' }] }],
    },
    updated_at: '2026-08-20T10:00:00.000Z',
    ...overrides,
  }
}

function latexDraft(): ResumeDraft {
  return {
    id: 'cv-2',
    title: 'LaTeX CV',
    mode: 'latex',
    content: { type: 'latex', source: '\\documentclass{article}\\begin{document}Hi\\end{document}' },
    updated_at: '2026-08-20T10:00:00.000Z',
  }
}

function resolved(draft: ResumeDraft | null) {
  useResumeMock.mockReturnValue({ data: draft, isLoading: false, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  updateMutate.mockImplementation(async ({ patch }: { patch: { title?: string } }) =>
    wordDraft({ title: patch.title ?? 'Backend CV', updated_at: '2026-08-20T11:00:00.000Z' })
  )
  createMutate.mockResolvedValue(wordDraft({ id: 'cv-new' }))
  global.fetch = vi.fn().mockRejectedValue(new Error('offline'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('/cv route states', () => {
  it('sends a bare /cv to the documents list, which is where the drafts hub went', () => {
    params(null)
    resolved(null)
    render(<Page />)
    expect(routerReplace).toHaveBeenCalledWith('/documents')
  })

  it('shows a spinner while the CV is loading', () => {
    params('cv-1')
    useResumeMock.mockReturnValue({ data: undefined, isLoading: true, error: null })
    const { container } = render(<Page />)
    expect(container.querySelector('[role="status"]')).toBeTruthy()
  })

  it('says the CV could not be found rather than opening an empty editor', () => {
    params('does-not-exist')
    resolved(null)
    render(<Page />)
    expect(screen.getByText(/could not find that cv/i)).toBeTruthy()
    expect(screen.queryByLabelText(/cv title/i)).toBeNull()
  })

  it('says the read failed rather than treating a failed fetch as a missing CV', () => {
    params('cv-1')
    useResumeMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('offline') })
    render(<Page />)
    expect(screen.getByText(/could not open that cv/i)).toBeTruthy()
  })
})

describe('/cv?draft=<id> opens the right editor', () => {
  it('mounts the Word editor, with the stored document in it', () => {
    params('cv-1')
    resolved(wordDraft())
    const { container } = render(<Page />)
    expect(screen.getByRole('heading', { name: 'Word CV' })).toBeTruthy()
    expect(container.querySelector('.ProseMirror')).toBeTruthy()
    expect(container.textContent).toContain('Shipped the rewrite')
    expect((screen.getByLabelText(/cv title/i) as HTMLInputElement).value).toBe('Backend CV')
  })

  it('mounts the LaTeX editor with its source and its live preview instead', () => {
    params('cv-2')
    resolved(latexDraft())
    const { container } = render(<Page />)
    expect(screen.getByRole('heading', { name: 'LaTeX CV' })).toBeTruthy()
    expect((screen.getByLabelText('LaTeX source') as HTMLTextAreaElement).value).toContain(
      'documentclass'
    )
    expect(container.querySelector('iframe[title="LaTeX preview"]')).toBeTruthy()
    expect(container.querySelector('.ProseMirror')).toBeNull()
  })

  it('offers Word or LaTeX at ?draft=new and opens what it creates', async () => {
    params('new')
    resolved(null)
    render(<Page />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /latex editor/i }))
    })
    expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ mode: 'latex' }))
    expect(routerReplace).toHaveBeenCalledWith('/cv?draft=cv-new')
  })
})

describe('the editor still saves', () => {
  it('autosaves a title edit 1200ms after the last keystroke', async () => {
    vi.useFakeTimers()
    params('cv-1')
    resolved(wordDraft())
    render(<Page />)

    fireEvent.change(screen.getByLabelText(/cv title/i), { target: { value: 'Renamed CV' } })
    expect(updateMutate).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenCalledWith({
      id: 'cv-1',
      patch: expect.objectContaining({ title: 'Renamed CV', mode: 'word' }),
    })
  })

  it('snapshots the CV 5000ms after an edit, so version history keeps filling up', async () => {
    vi.useFakeTimers()
    params('cv-1')
    resolved(wordDraft())
    render(<Page />)

    fireEvent.change(screen.getByLabelText(/cv title/i), { target: { value: 'Renamed CV' } })
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(createSnapshotMock).toHaveBeenCalledWith('cv-1', 'user-1', expect.anything())
  })

  it('saves LaTeX as latex-shaped content, not as a tiptap document', async () => {
    vi.useFakeTimers()
    params('cv-2')
    resolved(latexDraft())
    render(<Page />)

    fireEvent.change(screen.getByLabelText('LaTeX source'), { target: { value: '\\section{New}' } })
    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenCalledWith({
      id: 'cv-2',
      patch: expect.objectContaining({
        mode: 'latex',
        content: { type: 'latex', source: '\\section{New}' },
      }),
    })
  })

  it('saves on demand as well as on a timer', async () => {
    params('cv-1')
    resolved(wordDraft())
    render(<Page />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    })
    expect(updateMutate).toHaveBeenCalled()
  })
})

describe('the editor chrome carries no lucide glyphs', () => {
  it('renders Save as a text button, one of the four icons the set eliminated', () => {
    params('cv-1')
    resolved(wordDraft())
    render(<Page />)
    expect(screen.getByRole('button', { name: /^save$/i }).querySelector('svg')).toBeNull()
  })

  it('leaves the drafts list reachable from the editor', () => {
    params('cv-1')
    resolved(wordDraft())
    render(<Page />)
    expect(screen.getByRole('link', { name: /back/i }).getAttribute('href')).toBe('/documents')
  })
})
