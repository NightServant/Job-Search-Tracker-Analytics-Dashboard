/**
 * The one auth failure the UI has to recognise rather than merely display.
 *
 * WHY A CLASS AND NOT A STRING MATCH. Every other auth error reaches the form
 * as prose from Supabase and is rendered verbatim, which is right: the server
 * knows what went wrong and we do not want to curate its vocabulary. This one
 * is different because the FORM has to do something extra -- offer a way to
 * sign in instead -- and matching on message text to decide that would break
 * the first time Supabase reworded anything, silently and in production.
 *
 * It lives in `lib/` rather than in `AuthContext` so the form can test for it
 * without importing the context, which drags in a Supabase client.
 */
export class ExistingAccountError extends Error {
  constructor(message = 'An account with this email already exists.') {
    super(message)
    this.name = 'ExistingAccountError'
  }
}

/**
 * `instanceof` ALONE IS NOT ENOUGH and the reason is not theoretical: an error
 * that crosses a module boundary duplicated by the bundler, or one rebuilt
 * from a serialised shape, fails `instanceof` against a different copy of the
 * class while being exactly the error meant here. The name check is the
 * fallback that survives that.
 */
export function isExistingAccountError(error: unknown): boolean {
  return (
    error instanceof ExistingAccountError ||
    (error instanceof Error && error.name === 'ExistingAccountError')
  )
}
