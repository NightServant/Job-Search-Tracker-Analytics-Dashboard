import * as React from 'react'
import { PanelSection } from '@/components/ui/panel-section'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SettingsRow } from './SettingsRow'

/**
 * The last group, by construction -- `SettingsPage` renders it after
 * Account and Preferences, and its own test pins that order.
 *
 * Deleting an account is not a one-click action: a `ConfirmDialog` gates it
 * (Task 4, M5.5 -- replacing the `window.confirm` every irreversible action
 * in this codebase used to share), the same guard `applications/page.tsx`'s
 * delete and `documents/page.tsx`'s delete now use too. `ConfirmDialog`'s
 * `destructive` prop paints its confirm control with `--color-destructive`,
 * mapped to the same `status-rejected` token this file used to reach for by
 * hand -- not a new colour, and never the accent, which stays reserved for
 * the one thing this app treats as "the current action."
 */
export interface DangerZoneProps {
  onDeleteAccount?: () => void
  deleting?: boolean
}

export function DangerZone({ onDeleteAccount, deleting = false }: DangerZoneProps) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)

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
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              className="border-status-rejected-mark text-status-rejected-mark hover:bg-status-rejected-mark/10"
            >
              {deleting ? 'Deleting' : 'Delete account'}
            </Button>
          }
        />
      </PanelSection>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete your account?"
        body="This permanently removes every application, document and event tied to it. This cannot be undone."
        confirmLabel="Delete account"
        destructive
        onConfirm={() => {
          setConfirmOpen(false)
          onDeleteAccount?.()
        }}
      />
    </div>
  )
}
