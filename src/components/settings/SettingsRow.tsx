import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The label-description-control row every Settings group is built from: a
 * `Row / <name>` frame in Figma's Settings Column, matched here rather than
 * with `ui/field` because the control sits beside the label, not under it --
 * `ui/field` is for a form's own inputs (see the Preferences group's
 * currency control, which does use it), this is for a settings screen's list
 * of account-level actions.
 *
 * `wide` is the mobile-stacking rule from the roadmap's 5.7 note: a row
 * stacks only when its control is genuinely wide (the account email input,
 * the currency selector) -- everything else, the narrow buttons, stays
 * inline at every width, which is what keeps the danger zone above the fold
 * on a 375px screen.
 */
export interface SettingsRowProps {
  label: string
  description?: string
  control: React.ReactNode
  wide?: boolean
}

export function SettingsRow({ label, description, control, wide = false }: SettingsRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4',
        wide && 'flex-col items-start sm:flex-row sm:items-center'
      )}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-body-m text-text-primary">{label}</p>
        {description && <p className="text-body-s text-text-muted">{description}</p>}
      </div>
      <div className={cn('shrink-0', wide && 'w-full sm:w-auto')}>{control}</div>
    </div>
  )
}
