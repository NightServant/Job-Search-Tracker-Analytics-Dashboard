import { describe, it, expect, vi } from 'vitest'
import { userPreferencesService } from '../userPreferencesService'

/**
 * The same chainable PostgREST stand-in `resumeService.test.ts` uses, with
 * `upsert` added to the chain since this service writes through it rather
 * than `insert`/`update`.
 */
function fakeClient(result: { data: unknown; error: unknown }, user: { id: string } | null = { id: 'user-1' }) {
  const calls: Array<[string, unknown[]]> = []
  const query: Record<string, unknown> = {}
  for (const name of ['select', 'upsert', 'eq']) {
    query[name] = vi.fn((...args: unknown[]) => {
      calls.push([name, args])
      return query
    })
  }
  query.single = vi.fn(() => Promise.resolve(result))
  query.maybeSingle = vi.fn(() => Promise.resolve(result))
  query.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected)

  const from = vi.fn(() => query)
  return {
    calls,
    from,
    client: {
      from,
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user }, error: null })) },
    } as never,
  }
}

const ROW = { user_id: 'user-1', default_currency: 'USD', created_at: 'x', updated_at: 'x' }

describe('userPreferencesService.get', () => {
  it('reads the row without filtering on user_id -- RLS scopes it, and a redundant filter would hide a broken policy', async () => {
    const { client, calls } = fakeClient({ data: ROW, error: null })
    const prefs = await userPreferencesService.get(client)
    expect(prefs?.default_currency).toBe('USD')
    expect(calls.some(([name]) => name === 'eq')).toBe(false)
  })

  it('returns null rather than throwing when the user has no row yet', async () => {
    // The row is lazy: most users never change the default, so there is no
    // signup hook seeding one, and "no row" is the ordinary case, not a
    // failure.
    const { client } = fakeClient({ data: null, error: null })
    expect(await userPreferencesService.get(client)).toBeNull()
  })

  it('throws a real Error, not the raw Postgrest error shape, when the read fails', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'permission denied' } })
    await expect(userPreferencesService.get(client)).rejects.toThrow('permission denied')
  })
})

describe('userPreferencesService.setDefaultCurrency', () => {
  it('creates the row on first write rather than requiring a signup hook', async () => {
    const { client } = fakeClient({ data: ROW, error: null })
    const prefs = await userPreferencesService.setDefaultCurrency(client, 'USD')
    expect(prefs.default_currency).toBe('USD')
  })

  it('upserts on user_id so a second write updates the existing row instead of duplicating it', async () => {
    const { client, calls } = fakeClient({ data: { ...ROW, default_currency: 'EUR' }, error: null })
    await userPreferencesService.setDefaultCurrency(client, 'EUR')
    const upsertCall = calls.find(([name]) => name === 'upsert')
    expect(upsertCall).toBeTruthy()
    expect(upsertCall?.[1][0]).toMatchObject({ user_id: 'user-1', default_currency: 'EUR' })
  })

  it('refuses a currency outside the CHECK constraint before hitting the database', async () => {
    const { client, from } = fakeClient({ data: null, error: null })
    // A rejected promise, not a thrown function wrapper: setDefaultCurrency
    // is async, so the validation failure has to be asserted on the promise
    // it returns, not on the synchronous call expression itself.
    await expect(userPreferencesService.setDefaultCurrency(client, 'XYZ')).rejects.toThrow()
    expect(from).not.toHaveBeenCalled()
  })
})
