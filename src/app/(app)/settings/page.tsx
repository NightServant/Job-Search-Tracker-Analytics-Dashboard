'use client'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useUserPreferences, useSetDefaultCurrency } from '@/hooks/useUserPreferences'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { toError } from '@/services/supabaseHelpers'
import type { SupportedCurrency } from '@/services/userPreferences'

/**
 * Thin route wrapper, the same split as every other `(app)` route: the
 * screen takes plain props so it renders without Next routing, AuthProvider
 * or react-query, and this file owns every read and write.
 *
 * `prefs` flows from `useUserPreferences`, the same hook `/applications`
 * now reads to close the seam it left open on purpose. Before this task
 * nothing read the stored `user_preferences` row, so every new application
 * defaulted to PHP regardless of what a user chose here. Both routes go
 * through the hook rather than calling `userPreferencesService` directly so
 * a write from either one invalidates the single
 * `['user-preferences', user?.id]` cache entry the other reads.
 *
 * Account deletion has no self-service call on the client SDK --
 * `auth.admin.deleteUser` needs the service role key, which must never reach
 * the browser -- so it goes through `delete_own_account`, a SECURITY
 * DEFINER Postgres function (see the migration alongside this file) that
 * every user-owned table already cascades from on an `auth.users` deletion.
 * A failure here surfaces as a real toast rather than a silent no-op: the
 * button genuinely attempts the deletion and reports what actually
 * happened, rather than pretending to succeed.
 */
export default function Page() {
  const { user, signOut } = useAuth()
  const { data: prefs = null } = useUserPreferences()
  const setDefaultCurrency = useSetDefaultCurrency()
  const { success, error: showError } = useToast()

  const handleDefaultCurrencyChange = async (code: SupportedCurrency) => {
    try {
      await setDefaultCurrency.mutateAsync(code)
      success('Default currency updated')
    } catch (err) {
      showError(
        'Could not update default currency',
        err instanceof Error ? err.message : 'Unknown error'
      )
    }
  }

  const handleSignOut = async () => {
    try {
      const result = await signOut()
      // A SERVER FAILURE NO LONGER STOPS THE SIGN-OUT. This browser is signed
      // out by the time signOut() resolves, so the navigation happens either
      // way -- previously an unreachable server threw, showed "Sign out
      // failed", and left the user sitting on Settings still signed in.
      //
      // The partial outcome is still worth saying: other devices keep their
      // session until their own token expires, and someone signing out on a
      // shared machine deserves to know that did not reach the rest.
      if (!result.revokedEverywhere && result.message) {
        showError('Signed out here only', result.message)
      }
      // A HARD NAVIGATION, NOT router.replace, and the reason is not style.
      //
      // Gabe reported from the deployed app on 2026-09-03 that this landed on
      // /login. Both redirects were firing: this one, and AppLayout's guard a
      // beat later when onAuthStateChange set the user to null while the
      // layout was still mounted. Whichever ran second won, and it was not
      // reliably this one.
      //
      // `signingOut` on the context now stops the guard from firing at all,
      // which removes the flash. This closes the other half. AuthProvider
      // lives in the ROOT layout, so a client-side navigation to `/` leaves it
      // mounted and leaves that flag raised -- and a raised flag on a later
      // visit to a private route would make the guard stand aside from a
      // rejection it should make, rendering a blank page instead of the
      // sign-in form. A document load tears the provider down, so the flag
      // cannot outlive the sign-out that set it.
      //
      // It also drops every in-memory cache. React Query is still holding the
      // rows of the person who just left; on a shared machine, a client-side
      // navigation keeps them one render away.
      window.location.assign('/')
    } catch (err) {
      showError('Sign out failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleDeleteAccount = async () => {
    try {
      // supabase.rpc() resolves { error } as a plain Postgrest error shape
      // ({message, details, hint, code}), not an Error instance -- that only
      // happens when .throwOnError() is chained, which this call does not
      // do. toError() normalizes it the same way userPreferencesService and
      // every other M2 service already do, so the real message (e.g. "The
      // demo account cannot be deleted") reaches the toast instead of
      // silently falling through to "Unknown error".
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw toError(error)
      await signOut()
      // Same destination and the same mechanism as an ordinary sign-out, and
      // more obviously right here: there is no account left to sign back into,
      // and no cached row that should survive the deletion. The result is not
      // inspected -- the account is gone, so there is no other session left to
      // warn about.
      window.location.assign('/')
    } catch (err) {
      showError('Could not delete account', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <SettingsPage
      prefs={prefs}
      email={user?.email ?? null}
      onDefaultCurrencyChange={(code) => void handleDefaultCurrencyChange(code)}
      savingCurrency={setDefaultCurrency.isPending}
      onSignOut={() => void handleSignOut()}
      onDeleteAccount={() => void handleDeleteAccount()}
    />
  )
}
