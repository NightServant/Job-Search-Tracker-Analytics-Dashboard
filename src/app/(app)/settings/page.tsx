'use client'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useUserPreferences, useSetDefaultCurrency } from '@/hooks/useUserPreferences'
import { SettingsPage } from '@/components/settings/SettingsPage'
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
      await signOut()
    } catch (err) {
      showError('Sign out failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleDeleteAccount = async () => {
    try {
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw error
      await signOut()
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
