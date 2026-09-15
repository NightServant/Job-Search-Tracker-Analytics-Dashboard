import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

/**
 * Normalises Supabase/Postgrest error shapes into a real Error.
 *
 * Postgrest returns plain objects, not Errors, so throwing one directly loses
 * the stack and confuses anything catching by instanceof.
 *
 * THE `code` SURVIVES THE CONVERSION (2026-09-15), and until now it did not.
 * Every caller in this app reaches its errors through here, so dropping the
 * code meant that by the time a screen saw the failure, "the database refused
 * you" and "the network was down" were the same unlabelled Error -- which is
 * why every route answered an RLS refusal with "could not load your dashboard"
 * and a retry button that could never work. See `isPermissionDenied`.
 *
 * Attached with `Object.assign` rather than by subclassing Error: a subclass
 * would have to survive every `instanceof Error` check in the app and every
 * boundary that re-wraps a thrown value, and the only thing anyone needs from
 * it is one string.
 */
export function toError(err: PostgrestError | unknown): Error {
  const code = (err as { code?: unknown } | null)?.code
  const withCode = (error: Error) =>
    typeof code === 'string' && code ? Object.assign(error, { code }) : error

  if (err instanceof Error) return withCode(err)
  const anyErr = err as { message?: string; details?: string } | null
  if (anyErr?.message) return withCode(new Error(anyErr.message))
  if (anyErr?.details) return withCode(new Error(anyErr.details))
  return new Error('Unknown Supabase error')
}

/**
 * Whether a failure is "the answer is no" rather than "it did not work".
 *
 * WHY THE DIFFERENCE IS WORTH CODE. They look identical to a caller and want
 * opposite screens. A failed read is transient: say so and offer a retry, and
 * the retry usually works. A refusal is not: the row belongs to another
 * account, or the token no longer carries the claim it needs, and pressing
 * retry a hundred times gets a hundred refusals. Offering the button is the
 * part that wastes somebody's afternoon.
 *
 * THE CODES, and each is a real thing PostgREST and Postgres send:
 *
 *   42501     Postgres `insufficient_privilege`. What a row-level security
 *             policy raises when a write is refused.
 *   PGRST301  PostgREST: the JWT is missing, malformed or expired. A read
 *             against a policy the token cannot satisfy lands here.
 *   PGRST116  "no rows returned" from `.single()`. INCLUDED DELIBERATELY, and
 *             it is the subtle one: RLS makes a row that belongs to somebody
 *             else indistinguishable from a row that does not exist -- the
 *             policy filters it out and the query honestly finds nothing.
 *             That is the database being correct (leaking "this id exists but
 *             is not yours" would be the defect), and it means this is the
 *             code an actual IDOR attempt produces.
 *
 * A READ THAT RETURNS NOTHING IS NOT ALWAYS THIS. `.single()` on a row the
 * user simply deleted raises PGRST116 too, and this will call that a refusal.
 * ponytail: the two are indistinguishable from the client by construction, and
 * of the two wrong answers "you cannot open this" is the safer one to show for
 * a URL somebody typed. The upgrade path, if it ever matters, is for the route
 * to ask whether the id was ever in the list it already holds.
 */
export function isPermissionDenied(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code
  return code === '42501' || code === 'PGRST301' || code === 'PGRST116'
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
