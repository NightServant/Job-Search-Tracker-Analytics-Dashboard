'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { AccountGroup } from './AccountGroup'
import { PreferencesGroup } from './PreferencesGroup'
import { DangerZone } from './DangerZone'
import { ProfileGroup, type ProfileState } from './ProfileGroup'
import { resolveDefaultCurrency, type SupportedCurrency, type UserPreferences } from '@/services/userPreferences'

/**
 * The Settings screen's body, over plain props -- the same split as
 * `Dashboard`, `ApplicationsPage` and `DocumentsPage`, so it renders without
 * Next routing or react-query. `src/app/(app)/settings/page.tsx` owns the
 * reads and the writes.
 *
 * ONE COLUMN, NOT TABS (Gabe, 2026-09-06 -- reversing the two-tab split
 * added earlier the same day). Profile, Account, Preferences, Danger zone, in
 * that order.
 *
 * WHY THE TABS CAME BACK OUT. Settings has four groups and three of them are a
 * handful of rows each; a tab bar over that hides half a short page behind a
 * click and makes the reader remember which half. Tabs earn their place when
 * each side is long enough to be its own screen, and this is not. The profile
 * is the tallest group by far, which is the argument for putting it FIRST --
 * not for hiding everything else behind it.
 *
 * The danger zone staying last is load-bearing rather than habit.
 *
 * NO APPEARANCE GROUP. The theme control lives in the app shell, so a second
 * one here would be a second source of truth over the same `next-themes`
 * state. No export group either -- `/applications` already owns CSV import and
 * export in its own toolbar.
 *
 * `prefs` is the only required prop: `resolveDefaultCurrency` already knows
 * how to read a `null` row (no preferences saved yet) as PHP, so a caller
 * mid-fetch can pass `null` and get the same fallback the rest of the app
 * uses rather than a loading state blocking the two groups that do not
 * depend on it.
 */
export interface SettingsPageProps {
  prefs: UserPreferences | null
  email?: string | null
  onDefaultCurrencyChange?: (code: SupportedCurrency) => void
  savingCurrency?: boolean
  onSignOut?: () => void
  signingOut?: boolean
  onDeleteAccount?: () => void
  deletingAccount?: boolean
  /**
   * The profile panel's state. Defaults to empty so the demo and any caller
   * that does not fetch one still render a complete, honest screen rather
   * than a spinner that never resolves.
   */
  profile?: ProfileState
  /** The import control, rendered inside the Profile panel in every state. */
  profileSource?: React.ReactNode
  /** How to get an export. Shown only when there is no profile yet. */
  profileSteps?: React.ReactNode
}


export function SettingsPage({
  prefs,
  email = null,
  onDefaultCurrencyChange,
  savingCurrency = false,
  onSignOut,
  signingOut = false,
  onDeleteAccount,
  deletingAccount = false,
  profile = { status: 'empty', message: 'No profile imported yet.' },
  profileSource,
  profileSteps,
}: SettingsPageProps) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="settings"
        description="your profile, your account, how figures are displayed, and what happens to your data."
      />
      <ProfileGroup state={profile} source={profileSource} steps={profileSteps} />
      <AccountGroup email={email} onSignOut={onSignOut} signingOut={signingOut} />
      <PreferencesGroup
        defaultCurrency={resolveDefaultCurrency(prefs)}
        onDefaultCurrencyChange={onDefaultCurrencyChange}
        saving={savingCurrency}
      />
      <DangerZone onDeleteAccount={onDeleteAccount} deleting={deletingAccount} />
    </div>
  )
}
