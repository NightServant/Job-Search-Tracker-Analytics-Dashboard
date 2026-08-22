import { vi } from 'vitest'

/**
 * Mock Supabase client for testing
 */
export const createMockSupabaseClient = () => {
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue({
      data: [{ id: '1', user_id: 'user123' }],
      error: null,
    }),
  })

  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }),
  })

  const mockDelete = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }),
  })

  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }),
  })

  return {
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      select: mockSelect,
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'user123' },
            access_token: 'token123',
          },
        },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { company: 'Acme', role: 'Engineer' },
        error: null,
      }),
    },
  }
}

/**
 * Mock Auth Context
 */
export const createMockAuthContext = () => ({
  user: { id: 'user123', email: 'test@example.com' },
  session: { access_token: 'token123' },
  loading: false,
  error: null,
})
