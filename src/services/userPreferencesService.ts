import type { SupabaseClient } from '@supabase/supabase-js'
import { requireUserId, toError } from './supabaseHelpers'
import {
  isSupportedCurrency,
  type SupportedCurrency,
  type UserPreferences,
} from './userPreferences'

/**
 * The read/write half of `user_preferences`. `userPreferences.ts` stays pure
 * -- `SUPPORTED_CURRENCIES`, `isSupportedCurrency`, `resolveDefaultCurrency`,
 * the type -- and this file owns the table access, the same split
 * `events.ts`/`eventService.ts` already established. It is a new file, not a
 * duplicate of the pure one.
 *
 * `get` never filters on `user_id`, matching `eventService`'s convention:
 * every table here is behind owner-only RLS, so a redundant filter would hide
 * a broken policy instead of surfacing it.
 */
export const userPreferencesService = {
  async get(client: SupabaseClient): Promise<UserPreferences | null> {
    const { data, error } = await client.from('user_preferences').select('*').maybeSingle()
    if (error) throw toError(error)
    return (data as UserPreferences | null) ?? null
  },

  /**
   * The row is lazy: most users never change the default, so it is created
   * on first write here rather than seeded by a signup hook that would leave
   * a table full of rows nobody asked for.
   *
   * The currency is checked against `SUPPORTED_CURRENCIES` before the client
   * ever calls `.from(...)` -- the same vocabulary as
   * `user_preferences_currency_check` and `jobs_salary_currency_check`, kept
   * in sync by `userPreferences.ts`'s own comment. Failing here gives a
   * clear message instead of a raw constraint-violation error surfacing from
   * Postgres after a round trip that was never going to succeed.
   */
  async setDefaultCurrency(client: SupabaseClient, code: string): Promise<UserPreferences> {
    if (!isSupportedCurrency(code)) {
      throw new Error(`Unsupported currency: ${code}`)
    }
    const userId = await requireUserId(client)
    const { data, error } = await client
      .from('user_preferences')
      .upsert(
        { user_id: userId, default_currency: code as SupportedCurrency },
        { onConflict: 'user_id' }
      )
      .select()
      .single()
    if (error) throw toError(error)
    return data as UserPreferences
  },
}
