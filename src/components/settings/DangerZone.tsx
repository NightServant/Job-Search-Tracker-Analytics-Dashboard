import * as React from 'react'
import Link from 'next/link'
import { PanelSection } from '@/components/ui/panel-section'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TrashIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
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
 *
 * THE LINK TO /privacy#deleting IS THE ONLY ONE FROM INSIDE THE APP. The
 * policy was reachable from the landing footer and the sign-in screen and
 * nowhere else, so the people who could actually act on it -- signed-in users
 * with data to delete -- were the ones who could not find it. It goes to the
 * anchor rather than the top of the document: somebody clicking it from here
 * has one question, and it is answered in the last section.
 */
export interface DangerZoneProps {
  onDeleteAccount?: () => void
  deleting?: boolean
}

export function DangerZone({ onDeleteAccount, deleting = false }: DangerZoneProps) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  return (
    <div data-settings-group="danger">
      <PanelSection title="danger zone" icon="AlertCircle" titleSize="m">
        <SettingsRow
          label="delete account"
          description={
            <>
              permanently remove your account and everything tied to it. this cannot be
              undone.{' '}
              <Link
                href="/privacy#deleting"
                className="text-accent-default underline underline-offset-4"
              >
                what this deletes
              </Link>
            </>
          }
          control={
            <Button
              variant="secondary"
              size="s"
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
              className="border-status-rejected-mark text-status-rejected-mark hover:bg-status-rejected-mark/10"
            >
              <TrashIcon size={16} aria-hidden className={iconMotion('lid')} />
              {deleting ? 'Deleting' : 'Delete account'}
            </Button>
          }
        />
      </PanelSection>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="delete your account?"
        body="This permanently removes every application, document and event tied to it. This cannot be undone."
        confirmLabel="delete account"
        destructive
        onConfirm={() => {
          setConfirmOpen(false)
          onDeleteAccount?.()
        }}
      />
    </div>
  )
}
