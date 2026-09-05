import { createClient } from '@supabase/supabase-js'
import { currentEnvSource, readSupabaseConfig } from './env'

/**
 * Who is calling one of this app's API routes.
 *
 * WHY THESE ROUTES NEEDED IT. `/api/latex/compile` spends FormaTeX quota per
 * request and `/api/tailor` spends a metered LLM allowance; `/api/cv/docx`
 * spends CPU. All three shipped unauthenticated, which means anyone who found
 * the path could drain a paid allowance from a curl loop. Nothing about them
 * is public -- every one exists to serve a signed-in user editing their own
 * CV -- so the gate is simply the one that was missing.
 *
 * THE SCHEME IS THE ONE THE APP ALREADY USES, not a new one. `WordResumeEditor`
 * has always sent `Authorization: Bearer <session.access_token>` to the
 * `cv-render` edge function. These routes read the same header and validate it
 * the same way, so there is one answer to "how does a Worktrack request prove
 * who it is" rather than two.
 *
 * VALIDATED, NOT DECODED. `getUser(token)` asks Supabase to verify the
 * signature and expiry. Reading the JWT's claims locally would accept any
 * well-formed token, including one the caller wrote, which is not
 * authentication -- it is a formality that looks like one.
 */
export interface ApiCaller {
  id: string
  email: string | null
}

export type AuthResult =
  | { ok: true; user: ApiCaller }
  | { ok: false; status: 401 | 503; message: string }

function bearerFrom(request: Request): string | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization')
  if (!header) return null
  const [scheme, token] = header.split(/\s+/, 2)
  // Case-insensitive per RFC 7235; some clients send "bearer".
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token.trim() || null
}

export async function authenticate(request: Request): Promise<AuthResult> {
  const config = readSupabaseConfig(currentEnvSource())
  if (!config.isConfigured) {
    // 503, not 401: the caller did nothing wrong and retrying with a better
    // token will not help. A misconfigured deployment must not read as a
    // rejected user.
    return {
      ok: false,
      status: 503,
      message: 'This deployment has no Supabase configuration, so it cannot verify who is calling.',
    }
  }

  const token = bearerFrom(request)
  if (!token) {
    return { ok: false, status: 401, message: 'Sign in to use this.' }
  }

  // A per-request client with no session persistence: this runs on a shared
  // server, and a client that remembered the last caller's session would be a
  // way for one user's token to answer another user's request.
  const client = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  try {
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) {
      return { ok: false, status: 401, message: 'That session is not valid. Sign in again.' }
    }
    return { ok: true, user: { id: data.user.id, email: data.user.email ?? null } }
  } catch {
    // Supabase unreachable. Failing CLOSED is the only safe direction on an
    // endpoint that spends money -- an outage must not become an open door.
    return { ok: false, status: 503, message: 'Could not verify your session. Try again shortly.' }
  }
}
