'use client'

import * as React from 'react'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useUserPreferences, useSetDefaultCurrency } from '@/hooks/useUserPreferences'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { ProfileImport, ProfileImportSteps } from '@/components/settings/ProfileImport'
import type { ProfileState } from '@/components/settings/ProfileGroup'
import { useUserProfile, useImportProfile, useClearUserProfile } from '@/hooks/useUserProfile'
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
  const { data: stored, isPending: profileLoading } = useUserProfile()
  const importProfile = useImportProfile()
  const clearProfile = useClearUserProfile()
  // What the last import did, kept here rather than read off the mutation: a
  // file set that matched no known header resolves SUCCESSFULLY with nothing
  // recognised, so `mutation.error` is empty on exactly the case worth saying
  // something about.
  const [profileNote, setProfileNote] = React.useState<string | null>(null)
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



  const handleImportProfile = async (files: { name: string; text: string }[]) => {
    setProfileNote(null)
    try {
      const result = await importProfile.mutateAsync(files)
      if (!result.recognised.length) {
        // Naming the files is the whole message: "nothing was recognised" on
        // its own leaves someone guessing which of six CSVs was wrong.
        setProfileNote(
          `Could not recognise ${result.unrecognised.join(', ')}. ` +
            'Pick the CSVs from your LinkedIn export, such as Profile.csv.'
        )
        return
      }
      success(`Imported ${result.recognised.join(', ')}`)
      if (result.unrecognised.length) {
        setProfileNote(`Skipped ${result.unrecognised.join(', ')} — not a table this reads.`)
      }
    } catch (err) {
      setProfileNote(err instanceof Error ? err.message : 'Could not read those files.')
    }
  }

  const handleClearProfile = async () => {
    try {
      await clearProfile.mutateAsync()
      setProfileNote(null)
      success('Profile removed')
    } catch (err) {
      showError('Could not remove the profile', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const profileState: ProfileState = profileLoading
    ? { status: 'loading' }
    : stored?.profile
      ? { status: 'ready', profile: stored.profile }
      : {
          status: 'empty',
          message:
            'No profile yet. Import your LinkedIn data export and everything in it — ' +
            'headline, summary, roles and their descriptions, education, skills — appears here ' +
            'and feeds CV tailoring.',
        }

  return (
    <SettingsPage
      prefs={prefs}
      profile={profileState}
      profileSource={
        <ProfileImport
          onImport={(files) => void handleImportProfile(files)}
          onClear={() => void handleClearProfile()}
          importing={importProfile.isPending}
          clearing={clearProfile.isPending}
          hasProfile={!!stored?.profile}
          note={profileNote}
        />
      }
      profileSteps={<ProfileImportSteps />}
      email={user?.email ?? null}
      onDefaultCurrencyChange={(code) => void handleDefaultCurrencyChange(code)}
      savingCurrency={setDefaultCurrency.isPending}
      onSignOut={() => void handleSignOut()}
      onDeleteAccount={() => void handleDeleteAccount()}
    />
  )
}
