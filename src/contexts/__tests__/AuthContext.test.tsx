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

    it('signs out locally even when the server refuses, and says so', async () => {
      // REWRITTEN 2026-09-05. This asserted `rejects.toThrow('Sign out
      // failed')`, which stopped being true at `dd77ac7` -- signing out is the
      // one action that must not depend on reaching a server, so it clears
      // locally whatever happened and REPORTS the partial revoke instead of
      // throwing it.
      //
      // The stale version did not show up as a failing test. `rejects` on a
      // promise that resolves throws outside the awaited chain, so vitest
      // logged it under "Unhandled Errors" and the file still reported seven
      // passes -- which is how an assertion about deleted behaviour survived
      // the commit that deleted it.
      const mockUser = { id: 'user1', email: 'test@example.com' }
      vi.mocked(supabaseModule.supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: { user: mockUser, access_token: 'token123' } },
        error: null,
      })

      vi.mocked(supabaseModule.supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: { subscription: { unsubscribe: vi.fn() } },
      })

      vi.mocked(supabaseModule.supabase.auth.signOut).mockResolvedValueOnce({
        error: new Error('Sign out failed'),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      expect(result.current.user).toEqual(mockUser)

      let outcome: Awaited<ReturnType<typeof result.current.signOut>> | undefined
      await act(async () => {
        outcome = await result.current.signOut()
      })

      // It did not throw, and the local session is gone regardless.
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()

      // And the caller is told the revoke was partial, so the settings screen
      // can warn that other devices may still be signed in.
      expect(outcome!.revokedEverywhere).toBe(false)
      expect(outcome!.message).toMatch(/could not reach the server/i)
    })

    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')
    })
  })
})
