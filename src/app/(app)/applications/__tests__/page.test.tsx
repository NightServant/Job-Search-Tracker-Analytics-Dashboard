import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeJob } from '@/test/fixtures'
import { selectedLabel } from '@/test/select'

// Every read and write on this route goes through the useJobs hooks so they
// all land on the same ['jobs', user?.id] cache entry the dashboard reads.
// Mocking the module drives the wrapper's three states without standing up
// AuthProvider or QueryClientProvider.
const useJobsMock = vi.hoisted(() => vi.fn())
const useCreateJobMock = vi.hoisted(() => vi.fn())
const useUpdateJobMock = vi.hoisted(() => vi.fn())
const useCreateJobsBulkMock = vi.hoisted(() => vi.fn())
const useUserPreferencesMock = vi.hoisted(() => vi.fn())
const deleteJobMutate = vi.hoisted(() => vi.fn())
const idleMutation = vi.hoisted(() => () => ({ mutateAsync: vi.fn(), isPending: false }))

vi.mock('@/hooks/useJobs', () => ({
  useJobs: useJobsMock,
  useCreateJob: useCreateJobMock,
  useCreateJobsBulk: useCreateJobsBulkMock,
  useUpdateJob: useUpdateJobMock,
  useDeleteJob: () => ({ mutateAsync: deleteJobMutate, isPending: false }),
  useUpdateJobStatus: idleMutation,
  useAutofillJobFromUrl: idleMutation,
}))

// The currency seam this route used to leave open: resolveDefaultCurrency
// was always called with a hardcoded null, so a stored preference could
// never reach the form. Mocking the read half of that seam lets the tests
// below prove a stored preference actually gets there now.
vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: useUserPreferencesMock,
}))

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

// The record dialog's four secondary reads, which this route now owns for
// whichever row is open. They are stubbed rather than exercised here -- the
// record's own behaviour is covered in detail.test.tsx -- but they have to be
// stubbed, or importing them drags in the real Supabase client.
vi.mock('@/hooks/useActivity', () => ({ useActivity: () => ({ data: [], isLoading: false }) }))
vi.mock('@/hooks/useDocumentLinks', () => ({
  useDocumentLinks: () => ({ data: [], isLoading: false }),
}))
vi.mock('@/hooks/useJobEvents', () => ({ useJobEvents: () => ({ data: [], isLoading: false }) }))
vi.mock('@/hooks/useCvText', () => ({ useCvText: () => ({ data: undefined }) }))

// `?application=<id>` is how a desktop deep link off /applications/<id>
// arrives. Returning no param is the ordinary case; one test overrides it.
const searchParamMock = vi.hoisted(() => vi.fn(() => null as string | null))
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: searchParamMock }),
}))

import Page from '../page'

beforeEach(() => {
  useCreateJobMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  useUpdateJobMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  useCreateJobsBulkMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  useUserPreferencesMock.mockReturnValue({ data: null, isLoading: false, error: null })
  deleteJobMutate.mockReset().mockResolvedValue(undefined)
  searchParamMock.mockReturnValue(null)
})

afterEach(() => cleanup())

describe('Applications route wrapper', () => {
  it('shows a spinner while jobs are loading, not an empty board', () => {
    useJobsMock.mockReturnValue({ data: undefined, isLoading: true, error: null })
    const { container } = render(<Page />)
    expect(container.querySelector('[role="status"]')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'applications' })).toBeNull()
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
    expect(screen.getByRole('button', { name: 'retry' })).toBeTruthy()
  })

  it('renders the screen from the shared jobs cache once loaded', () => {
    useJobsMock.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<Page />)
    expect(screen.getByRole('heading', { name: 'applications' })).toBeTruthy()
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

    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    fireEvent.change(screen.getByLabelText(/^company/), { target: { value: 'Acme' } })
    fireEvent.change(screen.getByLabelText(/^role/), { target: { value: 'Engineer' } })
    fireEvent.click(screen.getByRole('button', { name: /add application/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('heading', { name: /new application/i })).toBeTruthy()
    expect(screen.getByLabelText(/^company/)).toHaveValue('Acme')
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
    // Still on the FORM, not bounced back to the record. The dialog's heading
    // is now the role alone -- company and status moved into the header's own
    // slots beside it -- so the check that it stayed open is the presence of a
    // field carrying the typed value, which is the thing a rejected save must
    // not throw away.
    expect(screen.getByLabelText(/^company/)).toHaveValue('Initech')
    expect(screen.getByRole('button', { name: /save application/i })).toBeTruthy()
  })

  it('returns to the record, not to the list, once an edit saves', async () => {
    // The dialog is the whole record now. Closing it after a save would throw
    // away the context the edit was made in, and the saved values are exactly
    // what the person who just typed them wants to check.
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    useUpdateJobMock.mockReturnValue({ mutateAsync, isPending: false })
    const job = makeJob({ id: '1', status: 'applied', company: 'Initech', role: 'QA Lead' })
    useJobsMock.mockReturnValue({ data: [job], isLoading: false, error: null })
    render(<Page />)

    fireEvent.click(screen.getAllByRole('button', { name: /^edit/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /save application/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /save application/i })).toBeNull()
    )
    // The dialog is still open, showing the record it just saved.
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'QA Lead' })).toBeTruthy()
  })

  it('opens the named record on mount when a desktop deep link redirected here', async () => {
    // /applications/<id> is the mobile surface. A wide viewport landing there
    // is replaced with /applications?application=<id>, and this is the half
    // that makes the intent survive the redirect.
    searchParamMock.mockReturnValue('1')
    const job = makeJob({ id: '1', status: 'applied', company: 'Initech', role: 'QA Lead' })
    useJobsMock.mockReturnValue({ data: [job], isLoading: false, error: null })
    render(<Page />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    expect(screen.getByRole('heading', { name: 'QA Lead' })).toBeTruthy()
    // Viewing, not editing -- a deep link is a request to read the record.
    expect(screen.queryByRole('button', { name: /save application/i })).toBeNull()
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

  // Task 9's whole point: this route used to call
  // resolveDefaultCurrency(null) unconditionally, so a stored preference
  // could never reach the form -- a user could set USD in Settings and every
  // new application still opened at PHP. These two tests prove the read half
  // of that seam is actually wired, not just that resolveDefaultCurrency
  // itself works in isolation.
  it('defaults a new application to PHP when the user has no stored preference', () => {
    useUserPreferencesMock.mockReturnValue({ data: null, isLoading: false, error: null })
    useJobsMock.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<Page />)

    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    // The control is a button now, not a <select>, so it has no `value` --
    // what it SHOWS is the assertion, which is what a user checks anyway.
    expect(selectedLabel(screen.getByLabelText(/^currency/))).toBe('PHP')
  })

  it('defaults a new application to the stored preference instead of PHP', () => {
    useUserPreferencesMock.mockReturnValue({
      data: { user_id: 'user-1', default_currency: 'USD', created_at: 'x', updated_at: 'x' },
      isLoading: false,
      error: null,
    })
    useJobsMock.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<Page />)

    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    expect(selectedLabel(screen.getByLabelText(/^currency/))).toBe('USD')
  })

  // Item 2's second half: window.confirm is the same defect class as the
  // dialog Gabe asked back for, and it guarded a destructive action, so the
  // replacement has to keep that guard rather than just re-skin it.
  it('asks before deleting, naming the application, and does not delete on Cancel', async () => {
    const job = makeJob({ id: '1', status: 'applied', company: 'Initech', role: 'Engineer' })
    useJobsMock.mockReturnValue({ data: [job], isLoading: false, error: null })
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getAllByRole('button', { name: /^delete/i })[0])
    expect(
      screen.getByRole('alertdialog', { name: 'Delete Engineer at Initech?' })
    ).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'cancel' }))
    expect(deleteJobMutate).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('deletes the named application once the confirm is accepted', async () => {
    const job = makeJob({ id: '1', status: 'applied', company: 'Initech', role: 'Engineer' })
    useJobsMock.mockReturnValue({ data: [job], isLoading: false, error: null })
    const user = userEvent.setup()
    render(<Page />)

    await user.click(screen.getAllByRole('button', { name: /^delete/i })[0])
    await user.click(screen.getByRole('button', { name: 'delete' }))
    await waitFor(() => expect(deleteJobMutate).toHaveBeenCalledWith('1'))
  })
})
