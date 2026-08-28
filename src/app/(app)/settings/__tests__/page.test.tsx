import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

// This route reads through useAuth (email, signOut) and useUserPreferences,
// and writes through useSetDefaultCurrency plus a direct RPC for account
// deletion. Mocking all four drives every state without standing up
// AuthProvider or QueryClientProvider -- the same technique every other
// (app) route test in this milestone uses.
const useAuthMock = vi.hoisted(() => vi.fn())
const useUserPreferencesMock = vi.hoisted(() => vi.fn())
const useSetDefaultCurrencyMock = vi.hoisted(() => vi.fn())
const rpcMock = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/AuthContext', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: useUserPreferencesMock,
  useSetDefaultCurrency: useSetDefaultCurrencyMock,
}))
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
  hasValidSupabaseConfig: true,
}))

import Page from '../page'

afterEach(() => cleanup())

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

  it('calls the delete_own_account RPC and signs out once account deletion is confirmed', async () => {
    const { signOut } = setup()
    rpcMock.mockResolvedValue({ error: null })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('delete_own_account'))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    vi.mocked(window.confirm).mockRestore()
  })

  it('does not sign out when the RPC itself fails', async () => {
    const { signOut } = setup()
    rpcMock.mockResolvedValue({ error: { message: 'boom' } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    await waitFor(() => expect(rpcMock).toHaveBeenCalled())
    expect(signOut).not.toHaveBeenCalled()
    vi.mocked(window.confirm).mockRestore()
  })
})
