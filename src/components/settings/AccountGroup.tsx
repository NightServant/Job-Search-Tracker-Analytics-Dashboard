import { PanelSection } from '@/components/ui/panel-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SettingsRow } from './SettingsRow'

/**
 * Email and sign out, matching Figma's `Group / account`. The email row is
 * read-only rather than editable: there is no service that changes a
 * Supabase Auth email from this screen, and a field that looks editable but
 * silently discards what is typed into it is the exact "control that
 * persists nothing" defect this task was warned against shipping.
 */
export interface AccountGroupProps {
  email?: string | null
  onSignOut?: () => void
  signingOut?: boolean
}

export function AccountGroup({ email = null, onSignOut, signingOut = false }: AccountGroupProps) {
  return (
    <div data-settings-group="account">
      <PanelSection title="account" icon="UserRound" titleSize="m">
        <div className="flex flex-col gap-4">
          <SettingsRow
            label="email"
            description="the address you sign in with."
            wide
            control={
              <Input
                id="account-email"
                value={email ?? ''}
                readOnly
                aria-label="Email"
                className="sm:w-60"
              />
            }
          />
          <SettingsRow
            label="sign out"
            description="end your session on this device."
            control={
              <Button variant="secondary" size="s" onClick={() => onSignOut?.()} disabled={signingOut}>
                {signingOut ? 'Signing out' : 'Sign out'}
              </Button>
            }
          />
        </div>
      </PanelSection>
    </div>
  )
}
