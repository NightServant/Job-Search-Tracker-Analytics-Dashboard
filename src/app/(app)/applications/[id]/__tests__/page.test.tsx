import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeJob } from '@/test/fixtures'

/**
 * This route is the MOBILE surface for one application now. On a wide
 * viewport it redirects to the list, which opens the same record in a dialog;
 * on a narrow one it renders the full-screen page, which -- unlike the
 * read-only screen it replaces -- can also edit and delete.
 *
 * Every read and write is mocked at the hook module rather than stood up
 * through react-query, AuthProvider and Next's router, the same way the sister
 * route's tests do it.
 */
const useParamsMock = vi.hoisted(() => vi.fn())
const replaceMock = vi.hoisted(() => vi.fn())
const useJobMock = vi.hoisted(() => vi.fn())
const useActivityMock = vi.hoisted(() => vi.fn())
const useDocumentLinksMock = vi.hoisted(() => vi.fn())
const useJobEventsMock = vi.hoisted(() => vi.fn())
const useCvTextMock = vi.hoisted(() => vi.fn())
const useIsMobileMock = vi.hoisted(() => vi.fn())
const updateMutate = vi.hoisted(() => vi.fn())
const deleteMutate = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useParams: useParamsMock,
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))
vi.mock('@/hooks/useJobs', () => ({
  useJob: useJobMock,
  useUpdateJob: () => ({ mutateAsync: updateMutate, isPending: false }),
  useDeleteJob: () => ({ mutateAsync: deleteMutate, isPending: false }),
  useAutofillJobFromUrl: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/useActivity', () => ({ useActivity: useActivityMock }))
vi.mock('@/hooks/useDocumentLinks', () => ({ useDocumentLinks: useDocumentLinksMock }))
vi.mock('@/hooks/useJobEvents', () => ({ useJobEvents: useJobEventsMock }))
vi.mock('@/hooks/useCvText', () => ({ useCvText: useCvTextMock }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: useIsMobileMock }))
vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({ data: null, isLoading: false, error: null }),
}))
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import Page from '../page'

const JOB = makeJob({ id: 'job-1', company: 'Acme', role: 'Staff Engineer', status: 'applied' })

/** The settled, empty version of the four secondary reads. */
function settleReads() {
  useActivityMock.mockReturnValue({ data: [], isLoading: false, error: null })
  useDocumentLinksMock.mockReturnValue({ data: [], isLoading: false, error: null })
  useJobEventsMock.mockReturnValue({ data: [], isLoading: false, error: null })
  useCvTextMock.mockReturnValue({ data: undefined, isLoading: false, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  useParamsMock.mockReturnValue({ id: 'job-1' })
  useIsMobileMock.mockReturnValue(true)
  useJobMock.mockReturnValue({ data: JOB, isLoading: false, error: null })
  settleReads()
  updateMutate.mockResolvedValue(undefined)
  deleteMutate.mockResolvedValue(undefined)
})

afterEach(() => cleanup())

describe('the application record route, on a wide viewport', () => {
  it('redirects to the list carrying the id, rather than rendering a second detail screen', async () => {
    // The desktop detail page is gone. Every link that used to point at one
    // -- the dashboard's recent table, the follow-up nudge, the applications
    // table's company cell -- lands in the list's dialog instead, without any
    // of them having to know that.
    useIsMobileMock.mockReturnValue(false)
    render(<Page />)

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith('/applications?application=job-1')
    )
    expect(screen.queryByRole('heading', { name: 'Staff Engineer' })).toBeNull()
  })

  it('replaces rather than pushes, so Back does not bounce through this route', async () => {
    useIsMobileMock.mockReturnValue(false)
    render(<Page />)
    await waitFor(() => expect(replaceMock).toHaveBeenCalled())
    // A push would leave this route in the history stack, and going Back from
    // the list would land on it and be redirected forward again.
    expect(replaceMock).toHaveBeenCalledTimes(1)
  })
})

describe('deciding which surface to show, with the real width hook', () => {
  // THE ONE TEST THAT DOES NOT STUB `useIsMobile`, and the only kind that
  // could have caught what it is guarding.
  //
  // The real hook reports `false` until its own effect has measured the
  // window -- it cannot know a viewport during render, and the server has
  // none. Every other test here pins it to a constant, so none of them ever
  // ran the false-then-true transition, and the first version of this route
  // sent EVERY PHONE to the desktop surface: a second piece of state fed by
  // an effect keyed on `isMobile` still held the stale `false` on the commit
  // where the hook corrected itself, and the redirect fired on it.
  //
  // Found by loading the page at 375px, not by the suite. This is the suite
  // catching up.
  const originalWidth = window.innerWidth

  afterEach(() => {
    window.innerWidth = originalWidth
  })

  it('renders the page and never redirects, on a narrow window', async () => {
    const actual = await vi.importActual<typeof import('@/hooks/use-mobile')>(
      '@/hooks/use-mobile'
    )
    useIsMobileMock.mockImplementation(actual.useIsMobile)
    window.innerWidth = 375

    render(<Page />)

    expect(await screen.findByRole('heading', { name: 'Staff Engineer' })).toBeTruthy()
    // Not "not yet" -- never. A redirect that fires and is then corrected has
    // already changed the URL and lost the surface.
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('still redirects on a wide window, with the same real hook', async () => {
    // The companion. Without it, "never redirects" would also pass if the
    // redirect were deleted outright.
    const actual = await vi.importActual<typeof import('@/hooks/use-mobile')>(
      '@/hooks/use-mobile'
    )
    useIsMobileMock.mockImplementation(actual.useIsMobile)
    window.innerWidth = 1280

    render(<Page />)

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith('/applications?application=job-1')
    )
  })
})

describe('the application record route, on a phone', () => {
  it('renders the full-screen record rather than redirecting', async () => {
    render(<Page />)
    expect(await screen.findByRole('heading', { name: 'Staff Engineer' })).toBeTruthy()
    expect(screen.getByText('Acme')).toBeTruthy()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('offers a way back to the list, which a modal would have taken away', async () => {
    // A BREADCRUMB SINCE 2026-09-05, not a "< applications" link, so the
    // accessible name is the crumb's own word rather than a sentence. The
    // trail is scoped so this cannot match the not-found panel's button
    // below, which is a different control saying a different thing.
    render(<Page />)
    const trail = await screen.findByRole('navigation', { name: /breadcrumb/i })
    expect(within(trail).getByRole('link', { name: 'applications' })).toHaveAttribute(
      'href',
      '/applications'
    )
    expect(within(trail).getByText('Staff Engineer')).toHaveAttribute('aria-current', 'page')
  })

  it('shows a not-found panel instead of a broken shell when the job errors', async () => {
    // A bad id and someone else's job are indistinguishable at the query --
    // RLS made them so -- and neither is fixed by reloading, so the recovery
    // offered is the list, not a retry.
    useJobMock.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Not found') })
    render(<Page />)
    expect(await screen.findByText(/could not find that application/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /back to applications/i })).toBeTruthy()
  })

  it('shows a spinner while the job itself is loading', () => {
    useJobMock.mockReturnValue({ data: undefined, isLoading: true, error: null })
    const { container } = render(<Page />)
    expect(container.querySelector('[role="status"]')).toBeTruthy()
  })

  it('never flashes a panel empty state while its read is still in flight', async () => {
    // Five independent network reads. The header and the fields come off the
    // jobs row and show at once; only the four panels wait, and while they
    // wait they must not print the copy that means "there is nothing here".
    useActivityMock.mockReturnValue({ data: [], isLoading: true, error: null })
    render(<Page />)

    expect(await screen.findByRole('heading', { name: 'Staff Engineer' })).toBeTruthy()
    expect(screen.queryByText(/no activity logged/i)).toBeNull()
    expect(screen.queryByText(/nothing scheduled/i)).toBeNull()
  })

  it('marks one failed read as failed without claiming the others are empty', async () => {
    useActivityMock.mockReturnValue({ data: [], isLoading: false, error: new Error('boom') })
    render(<Page />)

    expect(await screen.findByText(/could not load activity/i)).toBeTruthy()
    expect(screen.queryByText(/no activity logged/i)).toBeNull()
    // The other three read fine and still say so.
    expect(screen.getByText(/nothing scheduled/i)).toBeTruthy()
    expect(screen.getByText(/no cv linked/i)).toBeTruthy()
  })

  it('scores the CV against the posting once both have resolved', async () => {
    useJobMock.mockReturnValue({
      data: { ...JOB, description: 'We need React and Postgres experience.' },
      isLoading: false,
      error: null,
    })
    useDocumentLinksMock.mockReturnValue({
      data: [{ resume_id: 'cv-1', sent_at: '2026-01-01T00:00:00.000Z' }],
      isLoading: false,
      error: null,
    })
    useCvTextMock.mockReturnValue({
      data: 'React developer with Postgres experience.',
      isLoading: false,
      error: null,
    })
    render(<Page />)

    // A real percentage, not the "nothing to score" copy.
    expect(await screen.findByText(/%$/)).toBeTruthy()
    expect(screen.queryByText(/see how closely they match/i)).toBeNull()
  })

  it('edits in place instead of sending the reader back to the list', async () => {
    // The old screen's `edit` was a link to /applications, so fixing a typo
    // took three navigations. It is a mode switch on this screen now, and it
    // saves through the same useUpdateJob mutation the list screen uses.
    const user = userEvent.setup({ delay: null })
    render(<Page />)

    await user.click(await screen.findByRole('button', { name: 'edit' }))
    expect(screen.getByLabelText(/^company/)).toHaveValue('Acme')

    await user.clear(screen.getByLabelText(/^company/))
    await user.type(screen.getByLabelText(/^company/), 'Initech')
    await user.click(screen.getByRole('button', { name: /save application/i }))

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1))
    expect(updateMutate.mock.calls[0][0]).toMatchObject({
      id: 'job-1',
      data: expect.objectContaining({ company: 'Initech' }),
    })
    // Back to reading it, not out of the screen.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /save application/i })).toBeNull()
    )
  })

  it('asks before deleting, and leaves the screen only once the delete resolves', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Page />)

    await user.click(await screen.findByRole('button', { name: /delete staff engineer at acme/i }))
    expect(screen.getByText(/cannot be undone/i)).toBeTruthy()
    expect(deleteMutate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith('job-1'))
    // The record it was showing no longer exists, so the screen cannot stay.
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/applications'))
  })
})
