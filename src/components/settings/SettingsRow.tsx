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
  /**
   * `ReactNode`, not `string`: the danger zone's description carries a link
   * into the privacy page's deletion section, which is the only route to that
   * document from inside the app.
   */
  description?: React.ReactNode
  control: React.ReactNode
  wide?: boolean
}

export function SettingsRow({ label, description, control, wide = false }: SettingsRowProps) {
  return (
    <div
      className={cn(
        // EVERY row stacks below 640, not just the `wide` ones. A label with a
        // sentence of description beside a `shrink-0` control left the text
        // about 150px wide on a 320px screen -- "permanently remove your
        // account and everything tied to it" set four words to a line, next to
        // a button that had taken half the row. Label above, control below, is
        // the same treatment the tier map asks of a form field.
        'flex flex-col items-start gap-2',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-4'
      )}
    >
      {/* `min-w-0` so a long description wraps inside the row rather than
          setting the row's minimum width. */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-body-m text-text-primary">{label}</p>
        {description && <p className="text-body-s text-text-muted">{description}</p>}
      </div>
      {/* `wide` no longer decides whether the row stacks -- it decides how the
          control behaves once it HAS stacked. A currency selector fills the
          width it has been given; a button keeps its own size. */}
      <div className={cn('shrink-0', wide ? 'w-full sm:w-auto' : 'max-sm:w-full')}>
        {control}
      </div>
    </div>
  )
}
