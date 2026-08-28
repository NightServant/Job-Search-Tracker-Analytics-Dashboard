import { PageHeader } from '@/components/ui/page-header'
import { AccountGroup } from './AccountGroup'
import { PreferencesGroup } from './PreferencesGroup'
import { DangerZone } from './DangerZone'
import { resolveDefaultCurrency, type SupportedCurrency, type UserPreferences } from '@/services/userPreferences'

/**
 * The Settings screen's body, over plain props -- the same split as
 * `Dashboard`, `ApplicationsPage` and `DocumentsPage`, so it renders without
 * Next routing or react-query. `src/app/(app)/settings/page.tsx` owns the
 * reads and the writes.
 *
 * Three groups, in this order: Account, Preferences, Danger zone. No
 * Appearance group -- the theme control lives in the app shell, so a second
 * one here would be a second source of truth over the same `next-themes`
 * state. No export control -- `/applications` already owns CSV import and
 * export in its own toolbar.
 *
 * `prefs` is the only required prop: `resolveDefaultCurrency` already knows
 * how to read a `null` row (no preferences saved yet) as PHP, so a caller
 * mid-fetch can pass `null` and get the same fallback the rest of the app
 * uses rather than a loading state blocking the two groups that do not
 * depend on it.
 *
 * `/settings` has no active bottom-nav item -- it stopped being a nav
 * destination when Settings moved into the chrome (5.7), so this screen
 * intentionally has nothing analogous to `NAV`'s `active` prop to thread
 * through.
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
}: SettingsPageProps) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" />
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
