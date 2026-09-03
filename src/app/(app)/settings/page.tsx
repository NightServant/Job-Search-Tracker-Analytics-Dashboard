'use client'

import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
      await signOut()
      // TO THE HOMEPAGE, EXPLICITLY. Gabe's ruling on 2026-09-03. Without
      // this the person went to /login, and only by accident: nothing here
      // navigated at all, so they sat on /settings until AppLayout's guard
      // noticed the session was gone and bounced them. Two problems with
      // that. The destination was wrong -- somebody who just chose to leave
      // is being handed a sign-in form, which reads as the app refusing to
      // let go -- and the timing was a race, so the last frame before the
      // redirect was the settings page with its data already gone.
      //
      // `replace`, not `push`: the settings page they just signed out of must
      // not be one Back press away, because going back to it would land a
      // signed-out visitor on the guard and bounce them again.
      router.replace('/')
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
      // Same destination as an ordinary sign-out, and more obviously right
      // here: there is no account left to sign back into.
      router.replace('/')
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
