'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { hasValidSupabaseConfig, supabase, supabaseConfigError } from '@/lib/supabase'
import { clearStoredSession } from '@/lib/supabaseSession'
import { currentEnvSource, readSupabaseConfig } from '@/lib/env'
import { normalizeEmail } from '@/lib/credentials'
import type { OAuthProviderId } from '@/lib/oauthProviders'

/**
 * Turns a Supabase auth error into an Error with a usable message.
 *
 * Replaces three copies of `const anyErr = error as any`. `as any` on an error
 * object is how a message that is actually an object ends up rendered as
 * "[object Object]" in front of a person trying to sign in -- and it silences
 * the compiler on the one value in the function that is least under our
 * control. AuthError always carries a string `message`; the fallback is for
 * the shapes that are not AuthError at all.
 */
function authError(error: unknown): Error {
  if (error instanceof Error && error.message) return new Error(error.message)
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string' && message) return new Error(message)
  }
  return new Error('Authentication failed. Please try again.')
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  /**
   * True from the moment a sign-out starts until the page navigates away.
   *
   * It exists so the (app) route guard can tell two different events apart.
   * Both end with `user === null`, and they want opposite destinations:
   * a guard rejection means "you asked for a private page without a session"
   * and belongs at /login; a sign-out means "you chose to leave" and belongs
   * at the home page. Nothing in the session state distinguishes them --
   * only intent does, and this is where intent lives.
   */
  signingOut: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<SignOutResult>
  /**
   * Confirms a sign-up with the 6-digit code emailed to the address.
   *
   * Requires the Supabase email template for "Confirm signup" to contain
   * {{ .Token }}. Out of the box it contains {{ .ConfirmationURL }} only, and
   * with that template no code is ever sent -- the call below will keep
   * returning "Token has expired or is invalid" against a code that never
   * existed. See docs/SECURITY.md.
   */
  verifySignUpOtp: (email: string, token: string) => Promise<void>
  /** Re-sends the sign-up code. Supabase applies its own cooldown. */
  resendSignUpOtp: (email: string) => Promise<void>
  /** Starts an OAuth redirect. Resolves when the browser is handed over. */
  signInWithProvider: (provider: OAuthProviderId) => Promise<void>
}

/**
 * What a sign-out achieved. `revokedEverywhere` is false when this browser is
 * signed out but the server could not be told -- a real outcome worth naming,
 * because the two differ for anyone signed in elsewhere.
 */
export interface SignOutResult {
  revokedEverywhere: boolean
  message?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const supabaseUrl = readSupabaseConfig(currentEnvSource()).url

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    /**
     * `loading` MUST reach false on every path, and it did not.
     *
     * The bug Gabe hit: restart the dev server, open the app while signed in,
     * and land on the marketing page instead of the dashboard.
     * `getSession()` had no `.catch()`, so a rejected call -- a refresh that
     * cannot reach Supabase, a network blip on the first load -- left
     * `loading` true forever and raised an unhandled rejection. Nothing
     * recovers from that state:
     *
     *   - `SignedInRedirect` fires on `!loading && user`, so `/` shows the
     *     landing page and never moves. That is the reported symptom.
     *   - `AppLayout` returns `null` while `loading || !user`, so a private
     *     route renders a blank screen rather than redirecting.
     *
     * Both read as "signed out" while actually being "never finished asking".
     *
     * Two changes make the flag unwedgeable. The `.catch()` is the obvious
     * one. The second is that `onAuthStateChange` now clears it too:
     * supabase-js emits `INITIAL_SESSION` on subscribe, so if `getSession()`
     * fails but the listener later delivers a session -- a refresh that
     * succeeds on the retry -- the app notices instead of staying stuck
     * behind a flag the failed call was the only thing able to clear.
     *
     * A CAUGHT FAILURE IS NOT A SIGN-OUT. It sets `user` to null because
     * nothing better is known yet, and `onAuthStateChange` corrects that the
     * moment a session turns up. Clearing the stored session here would turn
     * one bad request into a real logout.
     */
    let active = true

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return
        setSession(session)
        setUser(session?.user ?? null)
      })
      .catch((err) => {
        console.warn('Could not read the stored session', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setSession(session)
      setUser(session?.user ?? null)
      // Whichever of the two answers first releases the app.
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!hasValidSupabaseConfig) {
      throw new Error(supabaseConfigError || 'Supabase is not configured')
    }
    // Normalised at the boundary, so Gabe@x.com and gabe@x.com are one
    // identity rather than two rows -- see lib/credentials.
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    })
    if (error) throw authError(error)
  }

  const signUp = async (email: string, password: string) => {
    if (!hasValidSupabaseConfig) {
      throw new Error(supabaseConfigError || 'Supabase is not configured')
    }
    const { error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
    })
    if (error) throw authError(error)
  }

  const verifySignUpOtp = async (email: string, token: string) => {
    if (!hasValidSupabaseConfig) {
      throw new Error(supabaseConfigError || 'Supabase is not configured')
    }
    // `type: 'signup'` and not 'email': they are different flows, and using
    // the wrong one rejects a perfectly good code.
    const { error } = await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token: token.trim(),
      type: 'signup',
    })
    if (error) throw new Error(error.message)
  }

  const resendSignUpOtp = async (email: string) => {
    if (!hasValidSupabaseConfig) {
      throw new Error(supabaseConfigError || 'Supabase is not configured')
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizeEmail(email),
    })
    if (error) throw new Error(error.message)
  }

  const signInWithProvider = async (provider: OAuthProviderId) => {
    if (!hasValidSupabaseConfig) {
      throw new Error(supabaseConfigError || 'Supabase is not configured')
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Back to the app, not to a URL the caller supplied: an
        // attacker-controlled redirectTo on an OAuth flow is how a token ends
        // up somewhere it should not. window.location.origin is ours by
        // definition. The destination must also be listed in the Supabase
        // dashboard's redirect allow-list, which is the real enforcement.
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) throw new Error(error.message)
  }

  /**
   * Sign out of this browser, unconditionally.
   *
   * IT USED TO BE POSSIBLE TO FAIL. `supabase.auth.signOut()` calls the server
   * to revoke the token, and auth-js's `_signOut` returns early on any error
   * that is not a 401/403/404 -- a 500, or an offline
   * `AuthRetryableFetchError` -- WITHOUT reaching `_removeSession()`. The old
   * code then threw, Settings caught it, showed "Sign out failed", and never
   * navigated. The session was still in localStorage and the user was still
   * signed in.
   *
   * That made signing out a request the network could veto, which is
   * backwards. Revoking the token on the server is best-effort and worth
   * attempting -- it is what ends the session on other devices -- but clearing
   * it HERE is the part the user actually asked for, and it now happens
   * whatever the server said.
   *
   * It no longer throws on a server failure, because throwing would mean the
   * caller treats a successful local sign-out as a failure. The result says
   * what happened instead, so the UI can leave AND mention that other devices
   * may still be signed in.
   */
  const signOut = async (): Promise<SignOutResult> => {
    if (!hasValidSupabaseConfig) {
      throw new Error(supabaseConfigError || 'Supabase is not configured')
    }
    // Raised BEFORE the call, not after. onAuthStateChange can fire while
    // signOut() is still in flight, and the guard reads this flag on the very
    // next render -- setting it afterwards would leave exactly the window this
    // is meant to close.
    setSigningOut(true)

    let serverError: Error | null = null
    try {
      const { error } = await supabase.auth.signOut()
      if (error) serverError = authError(error)
    } catch (err) {
      // A rejected call is the same situation as a returned error: the local
      // session still has to go.
      serverError = err instanceof Error ? err : new Error('Sign out failed')
    }

    // THE PART THAT CANNOT FAIL. Whatever happened above, this browser is
    // signed out when this line has run.
    clearStoredSession(supabaseUrl)
    setSession(null)
    setUser(null)

    // `signingOut` stays raised deliberately. The caller navigates away with a
    // document load and this provider is torn down with it; lowering the flag
    // here would re-arm AppLayout's guard during the navigation it is standing
    // aside for, which is the bug it was added to fix.
    return serverError
      ? {
          revokedEverywhere: false,
          message:
            'Signed out on this device. We could not reach the server, so other devices may still be signed in.',
        }
      : { revokedEverywhere: true }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signingOut,
        signIn,
        signUp,
        verifySignUpOtp,
        resendSignUpOtp,
        signInWithProvider,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
