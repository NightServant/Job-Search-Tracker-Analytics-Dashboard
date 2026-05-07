import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
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

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useAuth hook', () => {
    it('should return user from session', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com' }
      const mockSession = { user: mockUser, access_token: 'token123' }

      vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      })

      vi.mocked(supabaseModule.supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: { subscription: { unsubscribe: vi.fn() } },
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.session).toEqual(mockSession)
    })

    it('should handle sign in', async () => {
      vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      vi.mocked(supabaseModule.supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: { subscription: { unsubscribe: vi.fn() } },
      })

      vi.mocked(supabaseModule.supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: { id: 'user1', email: 'test@example.com' }, session: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123')
      })

      expect(supabaseModule.supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('should handle sign in error', async () => {
      vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      vi.mocked(supabaseModule.supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: { subscription: { unsubscribe: vi.fn() } },
      })

      const mockError = new Error('Invalid credentials')
      vi.mocked(supabaseModule.supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'wrongpassword')
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should handle sign up', async () => {
      vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      vi.mocked(supabaseModule.supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: { subscription: { unsubscribe: vi.fn() } },
      })

      vi.mocked(supabaseModule.supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: { id: 'newuser', email: 'new@example.com' }, session: null },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123')
      })

      expect(supabaseModule.supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      })
    })

    it('should handle sign out', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com' }
      const mockSession = { user: mockUser, access_token: 'token123' }

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

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)

      await act(async () => {
        await result.current.signOut()
      })

      expect(supabaseModule.supabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle sign out error', async () => {
      vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      vi.mocked(supabaseModule.supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: { subscription: { unsubscribe: vi.fn() } },
      })

      const mockError = new Error('Sign out failed')
      vi.mocked(supabaseModule.supabase.auth.signOut).mockResolvedValueOnce({
        error: mockError,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(
        act(async () => {
          await result.current.signOut()
        })
      ).rejects.toThrow('Sign out failed')
    })

    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')
    })
  })
})
