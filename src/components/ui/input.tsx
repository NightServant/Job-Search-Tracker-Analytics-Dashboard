'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { EyeIcon, EyeOffIcon } from '@/components/icons'

/**
 * Four states from Figma: Default, Focus, Error, Disabled.
 *
 * Focus is deliberately NOT a prop. It is read from the DOM through
 * `focus-visible`, which makes "two fields rendered focused at once" -- the bug
 * the Figma Sign Up frame shipped with -- unrepresentable rather than merely
 * discouraged. Error and Disabled are props because they are application state;
 * focus never is.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, disabled, ...props }, ref) => {
    const describedBy = error && id ? `${id}-error` : undefined
    return (
      <div className="w-full">
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          data-error={error ? '' : undefined}
          className={cn(
            'h-10 w-full rounded-md border bg-bg-canvas px-3 text-body-m text-text-primary',
            'placeholder:text-text-muted transition-colors duration-[--duration-fast]',
            'focus-visible:outline-none focus-visible:border-accent-default',
            'focus-visible:ring-2 focus-visible:ring-accent-default/30',
            'disabled:cursor-not-allowed disabled:bg-bg-inset disabled:text-text-muted',
            error ? 'border-status-rejected-mark' : 'border-border-default',
            className
          )}
          {...props}
        />
        {error && id && (
          <p id={describedBy} className="mt-1 text-body-s text-status-rejected-mark">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

/**
 * A password field whose reveal control is anchored to the field's right edge.
 *
 * `right-2` on a wrapper that shrink-wraps the input, not a fixed left offset.
 * A fixed offset was measured against the desktop field width and walked off
 * the canvas at 375px, where the field is roughly half as wide.
 *
 * THE GLYPH IS AN EYE, and that is a correction. This control shipped drawing
 * a MAGNIFIER for "show" and a PADLOCK for "hide", because those were the two
 * nearest glyphs already in the barrel. Both say the wrong thing next to a
 * password: a magnifier is the universal affordance for SEARCH, so on the
 * signup screen it read as a search box sitting inside the password field,
 * and a padlock is the universal decoration for "this field is secure" --
 * a state, not a button. Neither invites a click, which is the entire job.
 * lu-eye and lu-eye-off were pulled from the AnimateIcons registry rather
 * than drawn here, per the M5.5 rule against hand-authored SVG geometry.
 *
 * The eye shows while the password is MASKED. The icon names the action the
 * click performs -- reveal -- not the state the field is in, which matches
 * the aria-label beside it and is the convention every password field the
 * user has already met follows.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [revealed, setRevealed] = React.useState(false)
    const Reveal = revealed ? EyeOffIcon : EyeIcon
    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={revealed ? 'text' : 'password'}
          className={cn('pr-11', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          className={cn(
            'absolute right-2 top-1 grid h-8 w-8 place-items-center rounded-md',
            'text-text-muted hover:text-text-primary hover:bg-bg-inset',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default'
          )}
        >
          <Reveal size={18} />
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = 'PasswordInput'
