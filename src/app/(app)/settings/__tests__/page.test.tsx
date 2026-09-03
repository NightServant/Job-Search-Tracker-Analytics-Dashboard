import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// This route reads through useAuth (email, signOut) and useUserPreferences,
// and writes through useSetDefaultCurrency plus a direct RPC for account
// deletion. Mocking all four drives every state without standing up
// AuthProvider or QueryClientProvider -- the same technique every other
// (app) route test in this milestone uses.
const useAuthMock = vi.hoisted(() => vi.fn())
const useUserPreferencesMock = vi.hoisted(() => vi.fn())
const useSetDefaultCurrencyMock = vi.hoisted(() => vi.fn())
const rpcMock = vi.hoisted(() => vi.fn())
const showErrorMock = vi.hoisted(() => vi.fn())
const showSuccessMock = vi.hoisted(() => vi.fn())
const replaceMock = vi.hoisted(() => vi.fn())
const assignMock = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/AuthContext', () => ({ useAuth: useAuthMock }))
// The route navigates on sign-out, so it needs a router. jsdom has no app
// router mounted and useRouter throws an invariant without this.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: useUserPreferencesMock,
  useSetDefaultCurrency: useSetDefaultCurrencyMock,
}))
// error/success are hoisted mocks, not inline vi.fn()s, so a failure-path
// test can assert on the actual message a real Supabase error produces --
// not just that some toast fired.
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: showSuccessMock, error: showErrorMock, info: vi.fn() }),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
  hasValidSupabaseConfig: true,
}))

import Page from '../page'

// jsdom refuses a real navigation, so the one call that matters is stubbed.
// It is stubbed rather than spied because `location.assign` is non-writable in
// newer jsdom, and a spy on it silently does nothing.
beforeAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign: assignMock },
  })
})

afterEach(() => {
  replaceMock.mockClear()
  assignMock.mockClear()
  cleanup()
  showErrorMock.mockClear()
  showSuccessMock.mockClear()
})

// Task 4 (M5.5): DangerZone's window.confirm became a ConfirmDialog, so
// triggering the delete now takes two clicks -- open the guard, then accept
// it inside the alertdialog -- rather than one click plus a stubbed global.
async function confirmDeleteAccount() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /delete account/i }))
  const dialog = screen.getByRole('alertdialog', { name: /delete your account/i })
  await user.click(within(dialog).getByRole('button', { name: /delete account/i }))
}

function setup({
  email = 'gabe@example.com',
  prefs = null as { user_id: string; default_currency: string; created_at: string; updated_at: string } | null,
  signOut = vi.fn(),
  mutateAsync = vi.fn().mockResolvedValue(undefined),
} = {}) {
  useAuthMock.mockReturnValue({ user: { id: 'u1', email }, signOut })
  useUserPreferencesMock.mockReturnValue({ data: prefs, isLoading: false, error: null })
  useSetDefaultCurrencyMock.mockReturnValue({ mutateAsync, isPending: false })
  return { signOut, mutateAsync }
}

describe('Settings route wrapper', () => {
  it('renders the signed-in user\'s email in the account group', () => {
    setup({ email: 'gabe@example.com' })
    render(<Page />)
    expect(screen.getByDisplayValue('gabe@example.com')).toBeTruthy()
  })

  // The whole point of this task: applications/page.tsx used to hardcode
  // resolveDefaultCurrency(null), so a stored preference never reached the
  // form. This proves the seam from the settings side -- a stored USD
  // preference has to reach this screen's currency control, not just exist
  // in the database.
  it('selects the stored default currency rather than always falling back to PHP', () => {
    setup({
      prefs: { user_id: 'u1', default_currency: 'USD', created_at: 'x', updated_at: 'x' },
    })
    render(<Page />)
    expect(screen.getByRole('radio', { name: 'USD' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'PHP' }).getAttribute('aria-checked')).toBe('false')
  })

  it('writes a new default currency through useSetDefaultCurrency, not a raw service call', () => {
    const { mutateAsync } = setup()
    render(<Page />)
    fireEvent.click(screen.getByRole('radio', { name: 'EUR' }))
    expect(mutateAsync).toHaveBeenCalledWith('EUR')
  })

  it('signs out through useAuth when the account group\'s sign-out button is clicked', async () => {
    const { signOut } = setup()
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: /^sign out$/i }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
  })

  it('sends the person to the homepage after signing out, not to the sign-in form', async () => {
    // Reported from the deployed app: this landed on /login. Two redirects
    // were firing -- this one, and AppLayout's guard a beat later when the
    // auth state went null while the layout was still mounted.
    //
    // A DOCUMENT LOAD, not router.replace. AuthProvider lives in the root
    // layout, so a client-side navigation leaves it mounted and leaves the
    // `signingOut` flag raised, which would make the guard stand aside from a
    // later rejection it should make. It also drops every in-memory cache,
    // including the rows of the person who just left.
    const { signOut } = setup()
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: /^sign out$/i }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/'))
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('calls the delete_own_account RPC and signs out once account deletion is confirmed', async () => {
    const { signOut } = setup()
    rpcMock.mockResolvedValue({ error: null })
    render(<Page />)
    await confirmDeleteAccount()
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('delete_own_account'))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    // Same destination and mechanism, and more obviously right here -- there
    // is no account left to sign back into, and no cached row that should
    // survive the deletion.
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/'))
  })

  // CRITICAL from the review round: supabase.rpc() resolves { error } as a
  // plain Postgrest error object ({message, details, hint, code}), not an
  // Error instance -- that conversion only happens when .throwOnError() is
  // chained, which this call site does not do. `throw error` on that plain
  // object made `err instanceof Error` false in the catch block, so the
  // toast always read "Unknown error" no matter what Postgres actually
  // said. Both tests below assert on the real message reaching showError,
  // not just that signOut was skipped -- the original test only checked the
  // latter and could not see the bug even though it exercised the exact
  // failure path.
  it('surfaces the demo-account guard\'s real message, not "Unknown error"', async () => {
    const { signOut } = setup()
    rpcMock.mockResolvedValue({
      error: {
        message: 'The demo account cannot be deleted',
        code: '42501',
        details: null,
        hint: null,
      },
    })
    render(<Page />)
    await confirmDeleteAccount()
    await waitFor(() => expect(rpcMock).toHaveBeenCalled())
    expect(showErrorMock).toHaveBeenCalledWith(
      'Could not delete account',
      'The demo account cannot be deleted'
    )
    expect(signOut).not.toHaveBeenCalled()
  })

  it('surfaces a generic RPC failure\'s real message too', async () => {
    const { signOut } = setup()
    rpcMock.mockResolvedValue({
      error: { message: 'boom', code: 'XX000', details: null, hint: null },
    })
    render(<Page />)
    await confirmDeleteAccount()
    await waitFor(() => expect(rpcMock).toHaveBeenCalled())
    expect(showErrorMock).toHaveBeenCalledWith('Could not delete account', 'boom')
    expect(signOut).not.toHaveBeenCalled()
  })
})
