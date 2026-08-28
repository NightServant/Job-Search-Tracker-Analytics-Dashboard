import { PanelSection } from '@/components/ui/panel-section'
import { Button } from '@/components/ui/button'
import { SettingsRow } from './SettingsRow'

/**
 * The last group, by construction -- `SettingsPage` renders it after
 * Account and Preferences, and its own test pins that order.
 *
 * Deleting an account is not a one-click action: `window.confirm` gates it,
 * the same guard every other irreversible action in this codebase already
 * uses (`applications/page.tsx`'s delete, `documents/page.tsx`'s delete).
 * The red used on the button is `status-rejected-mark`, the same token
 * `route-states.tsx`'s error state already uses -- not a new destructive
 * colour, and never the accent, which stays reserved for the one thing this
 * app treats as "the current action."
 */
export interface DangerZoneProps {
  onDeleteAccount?: () => void
  deleting?: boolean
}

export function DangerZone({ onDeleteAccount, deleting = false }: DangerZoneProps) {
  const handleClick = () => {
    if (
      !window.confirm(
        'Delete your account? This permanently removes every application, document and event tied to it. This cannot be undone.'
      )
    ) {
      return
    }
    onDeleteAccount?.()
  }

  return (
    <div data-settings-group="danger">
      <PanelSection title="Danger zone" titleSize="m">
        <SettingsRow
          label="Delete account"
          description="Permanently remove your account and everything tied to it. This cannot be undone."
          control={
            <Button
              variant="secondary"
              size="s"
              onClick={handleClick}
              disabled={deleting}
              className="border-status-rejected-mark text-status-rejected-mark hover:bg-status-rejected-mark/10"
            >
              {deleting ? 'Deleting' : 'Delete account'}
            </Button>
          }
        />
      </PanelSection>
    </div>
  )
}
