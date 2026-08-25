import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

/**
 * Normalises Supabase/Postgrest error shapes into a real Error.
 *
 * Postgrest returns plain objects, not Errors, so throwing one directly loses
 * the stack and confuses anything catching by instanceof.
 */
export function toError(err: PostgrestError | unknown): Error {
  if (err instanceof Error) return err
  const anyErr = err as { message?: string; details?: string } | null
  if (anyErr?.message) return new Error(anyErr.message)
  if (anyErr?.details) return new Error(anyErr.details)
  return new Error('Unknown Supabase error')
}

/**
 * Resolves the signed-in user or refuses to continue.
 *
 * Every table is behind owner-only RLS, so a write without a user is not a
 * silent no-op — it is a policy violation with a confusing message. Failing
 * here gives a clear one instead.
 */
export async function requireUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser()
  if (error) throw toError(error)
  if (!data.user) throw new Error('Not authenticated')
  return data.user.id
}
