import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOutIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
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
    <Card data-settings-group="account">
      <CardHeader>
        <CardTitle icon="UserRound">
          <h2>account</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                <LogOutIcon size={16} aria-hidden className={iconMotion('forward')} />
                {signingOut ? 'Signing out' : 'Sign out'}
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
