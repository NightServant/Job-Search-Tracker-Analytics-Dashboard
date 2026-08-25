import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Layout from '../Layout'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from 'next-themes'
import { ToastProvider } from '@/contexts/ToastContext'
import * as supabaseModule from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  hasValidSupabaseConfig: true,
  supabaseConfigError: null,
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}))

describe('Layout Component - Sign Out Functionality', () => {
  const mockUser = { id: 'user1', email: 'test@example.com' }
  const mockSession = { user: mockUser, access_token: 'token123' }

  const renderLayout = () => {
    return render(
      <ToastProvider>
        <ThemeProvider>
          <AuthProvider>
            <Layout />
          </AuthProvider>
        </ThemeProvider>
      </ToastProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should render Sign Out button', async () => {
    vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    })

    vi.mocked(supabaseModule.supabase.auth.onAuthStateChange).mockReturnValueOnce({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    renderLayout()

    await waitFor(() => {
      const signOutButton = screen.queryByText('Sign Out')
      expect(signOutButton).toBeTruthy()
    })
  })

  it('should call signOut when Sign Out button is clicked', async () => {
    vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    })

    vi.mocked(supabaseModule.supabase.auth.onAuthStateChange).mockReturnValueOnce({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    vi.mocked(supabaseModule.supabase.auth.signOut).mockResolvedValueOnce({
      error: null,
    })

    renderLayout()

    await waitFor(() => {
      expect(screen.queryByText('Sign Out')).toBeTruthy()
    })

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    await waitFor(() => {
      expect(supabaseModule.supabase.auth.signOut).toHaveBeenCalled()
    })
  })

  it('should show loading text during sign out', async () => {
    vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    })

    vi.mocked(supabaseModule.supabase.auth.onAuthStateChange).mockReturnValueOnce({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    let signOutResolve: (() => void) | null = null
    vi.mocked(supabaseModule.supabase.auth.signOut).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          signOutResolve = () => resolve({ error: null })
        })
    )

    renderLayout()

    await waitFor(() => {
      expect(screen.queryByText('Sign Out')).toBeTruthy()
    })

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    // Should show loading text
    await waitFor(() => {
      expect(screen.queryByText('Signing Out...')).toBeTruthy()
    })

    if (signOutResolve) {
      signOutResolve()
    }
  })
})
