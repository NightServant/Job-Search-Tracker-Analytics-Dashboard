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
const getSnapshotsMock = vi.hoisted(() => vi.fn())
const getSnapshotMock = vi.hoisted(() => vi.fn())

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
  getSnapshots: getSnapshotsMock,
  getSnapshot: getSnapshotMock,
  deleteSnapshot: vi.fn(),
}))

// The shared client refuses to construct without real credentials, and Vitest
// redacts the ones in .env, so the two modules that reach for it directly (the
// PDF export call and its session read) get a stub instead.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'token-123' } },
      }),
    },
  },
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
  getSnapshotsMock.mockResolvedValue([])
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

/**
 * A promise the test resolves by hand, so a save can be held in flight while
 * more keystrokes arrive. Every earlier test in this file resolved the save in
 * a microtask, which is why none of them could see the race below.
 */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('keystrokes during an in-flight save are not lost', () => {
  it('keeps the Word editor dirty when the document changed while the save was away', async () => {
    // Type A, the debounce fires and captures A, type B while A is in flight.
    // Marking the editor clean when A lands throws B away silently: the header
    // reads "Saved 3:42 PM" with no unsaved-changes marker, and B exists only
    // in the DOM.
    vi.useFakeTimers()
    params('cv-1')
    resolved(wordDraft())
    const inFlight = deferred<ReturnType<typeof wordDraft>>()
    updateMutate.mockReturnValueOnce(inFlight.promise)
    render(<Page />)

    const titleField = screen.getByLabelText(/cv title/i)
    fireEvent.change(titleField, { target: { value: 'A' } })
    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenCalledTimes(1)

    fireEvent.change(titleField, { target: { value: 'AB' } })
    await act(async () => {
      inFlight.resolve(wordDraft({ title: 'A', updated_at: '2026-08-20T11:00:00.000Z' }))
    })

    expect(screen.getByText(/unsaved changes/i)).toBeTruthy()

    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenLastCalledWith({
      id: 'cv-1',
      patch: expect.objectContaining({ title: 'AB' }),
    })
  })

  it('keeps the LaTeX editor dirty on the same race', async () => {
    vi.useFakeTimers()
    params('cv-2')
    resolved(latexDraft())
    const inFlight = deferred<ReturnType<typeof wordDraft>>()
    updateMutate.mockReturnValueOnce(inFlight.promise)
    render(<Page />)

    const source = screen.getByLabelText('LaTeX source')
    fireEvent.change(source, { target: { value: '\\section{A}' } })
    await act(async () => {
      vi.advanceTimersByTime(1200)
    })

    fireEvent.change(source, { target: { value: '\\section{AB}' } })
    await act(async () => {
      inFlight.resolve(wordDraft())
    })
    expect(screen.getByText(/unsaved changes/i)).toBeTruthy()

    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenLastCalledWith({
      id: 'cv-2',
      patch: expect.objectContaining({ content: { type: 'latex', source: '\\section{AB}' } }),
    })
  })
})

describe('the Word autosave keeps running after a failure', () => {
  it('re-arms on a body edit that changes no other state', async () => {
    // Reset rewrites the document and touches nothing else -- no title, no new
    // editor instance. With the debounce keyed only on [isDirty, title,
    // editor] and isDirty already true after a failed save, nothing re-armed
    // it: one RLS denial and the editor stopped autosaving for the rest of the
    // session while still looking like it was working.
    vi.useFakeTimers()
    params('cv-1')
    resolved(wordDraft())
    updateMutate.mockRejectedValueOnce(new Error('permission denied'))
    render(<Page />)

    fireEvent.change(screen.getByLabelText(/cv title/i), { target: { value: 'Renamed' } })
    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenCalledTimes(1)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    })
    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenCalledTimes(2)
  })
})

describe('snapshots survive the autosave that precedes them', () => {
  it('still snapshots when the save resolves before the 5s timer', async () => {
    // The save debounce is 1200ms and the snapshot debounce is 5000ms, so in
    // any real session the save lands first. Clearing the snapshot timer as
    // soon as the editor went clean meant the 5s timer was cancelled every
    // time and version history was never written at all.
    vi.useFakeTimers()
    params('cv-1')
    resolved(wordDraft())
    render(<Page />)

    fireEvent.change(screen.getByLabelText(/cv title/i), { target: { value: 'Renamed' } })
    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(createSnapshotMock).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(3800)
    })
    expect(createSnapshotMock).toHaveBeenCalledWith('cv-1', 'user-1', expect.anything())
  })
})

describe('PDF export does not paper over a failed save', () => {
  // Export saves first and then posts the same content to the edge function.
  // Both halves are asserted so the negative case cannot pass for some
  // unrelated reason -- an absent session used to stop the request anyway.
  function exportFetch() {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })),
    })
    global.fetch = fetchMock
    return fetchMock
  }

  it('stops rather than exporting a PDF of content the database rejected', async () => {
    params('cv-1')
    resolved(wordDraft())
    updateMutate.mockRejectedValueOnce(new Error('permission denied'))
    const fetchMock = exportFetch()
    render(<Page />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /export pdf/i }))
    })
    expect(updateMutate).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByText(/exporting/i)).toBeNull()
  })

  it('still exports when the save lands, so the guard is not just switching it off', async () => {
    params('cv-1')
    resolved(wordDraft())
    const fetchMock = exportFetch()
    global.URL.createObjectURL = vi.fn(() => 'blob:cv')
    global.URL.revokeObjectURL = vi.fn()
    render(<Page />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /export pdf/i }))
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/resume-export-pdf'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('an overlapping pair of saves cannot un-save the newer one', () => {
  // Revision 1 starts saving on a slow connection; a keystroke makes it
  // revision 2, whose save overtakes it and lands first. When the older write
  // finally resolves it must not stamp its own revision over the newer one --
  // that flips a correctly-saved editor back to dirty and sends a redundant
  // write of content the database already has. `Math.max` in saveDraft is the
  // clause under test, and nothing exercised it until now.
  async function overlap(draft: ReturnType<typeof wordDraft>, label: string, edit: (value: string) => void) {
    vi.useFakeTimers()
    params(draft.id)
    resolved(draft)
    const first = deferred<ReturnType<typeof wordDraft>>()
    const second = deferred<ReturnType<typeof wordDraft>>()
    updateMutate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    render(<Page />)

    edit(`${label}-1`)
    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    edit(`${label}-2`)
    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenCalledTimes(2)

    // Newer write lands first, then the older one.
    await act(async () => {
      second.resolve(wordDraft({ updated_at: '2026-08-20T12:00:00.000Z' }))
    })
    await act(async () => {
      first.resolve(wordDraft({ updated_at: '2026-08-20T11:00:00.000Z' }))
    })
    return { first, second }
  }

  it('leaves the Word editor clean after the slower write finally lands', async () => {
    await overlap(wordDraft(), 'Title', (value) =>
      fireEvent.change(screen.getByLabelText(/cv title/i), { target: { value } })
    )
    expect(screen.queryByText(/unsaved changes/i)).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenCalledTimes(2)
  })

  it('leaves the LaTeX editor clean on the same overlap', async () => {
    await overlap(latexDraft(), 'source', (value) =>
      fireEvent.change(screen.getByLabelText('LaTeX source'), { target: { value } })
    )
    expect(screen.queryByText(/unsaved changes/i)).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenCalledTimes(2)
  })
})

describe('the LaTeX editor snapshots on the same schedule as the Word editor', () => {
  it('still snapshots when the save resolves before the 5s timer', async () => {
    // The Word half of this fix was pinned; this half was not, so reverting the
    // LaTeX snapshot effect to its pre-fix shape left the whole suite green.
    // Both editors carry the identical fix for the identical bug.
    vi.useFakeTimers()
    params('cv-2')
    resolved(latexDraft())
    render(<Page />)

    fireEvent.change(screen.getByLabelText('LaTeX source'), {
      target: { value: '\\section{Edited}' },
    })
    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenCalledTimes(1)
    expect(createSnapshotMock).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(3800)
    })
    expect(createSnapshotMock).toHaveBeenCalledWith('cv-2', 'user-1', {
      type: 'latex',
      source: '\\section{Edited}',
    })
  })
})

describe('restoring a version persists the version that was restored', () => {
  async function restore(draftValue: ReturnType<typeof wordDraft>, content: unknown) {
    vi.useFakeTimers()
    params(draftValue.id)
    resolved(draftValue)
    getSnapshotsMock.mockResolvedValue([
      { id: 's-2', resume_id: draftValue.id, version: 2, created_at: '2026-08-20T10:00:00.000Z' },
      { id: 's-1', resume_id: draftValue.id, version: 1, created_at: '2026-08-19T10:00:00.000Z' },
    ])
    getSnapshotMock.mockResolvedValue({ id: 's-1', content })
    render(<Page />)

    fireEvent.click(screen.getByRole('button', { name: /versions/i }))
    await act(async () => {})
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /restore/i })[1])
    })
  }

  it('writes the restored LaTeX source, not the source it replaced', async () => {
    // saveDraft used to read `latexSource` from the render that preceded the
    // restore, so the write carried the OLD source. It only ever reached the
    // database because the restore also left the editor dirty by accident and
    // the debounce re-sent it 1200ms later.
    await restore(latexDraft(), { type: 'latex', source: '\\section{Restored}' })
    expect(updateMutate).toHaveBeenCalledWith({
      id: 'cv-2',
      patch: expect.objectContaining({
        content: { type: 'latex', source: '\\section{Restored}' },
      }),
    })
  })

  it('leaves the editor clean rather than re-sending the same content 1200ms later', async () => {
    await restore(latexDraft(), { type: 'latex', source: '\\section{Restored}' })
    expect(updateMutate).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/unsaved changes/i)).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenCalledTimes(1)
  })

  it('does the same for a restored Word document', async () => {
    await restore(wordDraft(), {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Restored body' }] }],
    })
    expect(updateMutate).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/unsaved changes/i)).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(1200)
    })
    expect(updateMutate).toHaveBeenCalledTimes(1)
  })
})
