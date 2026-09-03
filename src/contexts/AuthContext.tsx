'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { hasValidSupabaseConfig, supabase, supabaseConfigError } from '@/lib/supabase'
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
  signOut: () => Promise<void>
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

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
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

  const signOut = async () => {
    if (!hasValidSupabaseConfig) {
      throw new Error(supabaseConfigError || 'Supabase is not configured')
    }
    // Raised BEFORE the call, not after. onAuthStateChange can fire while
    // signOut() is still in flight, and the guard reads this flag on the very
    // next render -- setting it afterwards would leave exactly the window this
    // is meant to close.
    setSigningOut(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      // Lowered again only on failure. On success the caller navigates away
      // and this provider unmounts, so leaving it raised is correct: clearing
      // it would re-arm the guard during the navigation it is standing aside
      // for, which is the bug.
      setSigningOut(false)
      throw authError(error)
    }
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
