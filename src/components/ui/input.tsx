'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { EyeIcon, EyeOffIcon } from '@/components/icons'
import { SmoothInput } from '@/components/v1/skiper106'

/**
 * Four states from Figma: Default, Focus, Error, Disabled.
 *
 * Focus is deliberately NOT a prop. It is read from the DOM through
 * `focus-visible`, which makes "two fields rendered focused at once" -- the bug
 * the Figma Sign Up frame shipped with -- unrepresentable rather than merely
 * discouraged. Error and Disabled are props because they are application state;
 * focus never is.
 *
 * THE SMOOTH CARET LIVES HERE NOW, behind `smoothCaret`. Before this, skiper106's
 * SmoothInput was imported directly by the two auth screens and handed a
 * `wrapperClassName` that re-typed Input's border, background and focus colour
 * by hand. That is the drift this merge removes: the copy had already fallen
 * behind on three states -- no focus RING, no error border, no disabled
 * treatment -- so the sign-in email field and every other field in the app
 * were quietly two different components that only looked alike while nothing
 * went wrong. Gabe asked for one input on 2026-09-02: "merge the smooth caret
 * input effect of Skiper UI and the shadcn one for design consistency and
 * functionality".
 *
 * ONE CLASS STRING, TWO BRANCHES. `fieldClassName` below is built once and
 * handed to whichever element renders, so the caret branch cannot drift from
 * the plain one again -- there is no second copy to forget. SmoothInput puts
 * `className` last in its own cn(), so these win over its `bg-transparent`.
 *
 * OPT-IN RATHER THAN ALWAYS-ON, and that is a safety call, not indecision.
 * The technique hides the native caret (`caret-color: transparent`) and draws
 * a replacement from a measured text width. Where the measurement cannot run
 * -- a font that never loads, a field inside something that transforms, a
 * browser the spring path has not been tried on -- the failure mode is a field
 * with NO VISIBLE CARET AT ALL, which is worse than an unsmoothed one. Turning
 * it on for the ~40 fields across the app on a whim would be trading a real
 * regression risk for an effect nobody asked for outside auth.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  /**
   * Draw skiper106's springing caret instead of the browser's. Opt-in; see the
   * docblock for why this is not simply on everywhere.
   */
  smoothCaret?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, disabled, smoothCaret = false, type, ...props }, ref) => {
    const describedBy = error && id ? `${id}-error` : undefined

    const fieldClassName = cn(
      'h-10 w-full rounded-md border bg-bg-canvas px-3 text-body-m text-text-primary',
      'placeholder:text-text-muted transition-colors duration-[--duration-fast]',
      'focus-visible:outline-none focus-visible:border-accent-default',
      'focus-visible:ring-2 focus-visible:ring-accent-default/30',
      'disabled:cursor-not-allowed disabled:bg-bg-inset disabled:text-text-muted',
      error ? 'border-status-rejected-mark' : 'border-border-default',
      className
    )

    const shared = {
      id,
      disabled,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy,
      'data-error': error ? '' : undefined,
      className: fieldClassName,
      ...props,
    }

    return (
      <div className="w-full">
        {smoothCaret ? (
          <SmoothInput
            ref={ref}
            // SmoothInput narrows `type` to text | password because those are
            // the only two it can measure -- a date or number field renders
            // browser chrome inside the box that the measuring span knows
            // nothing about. Anything else falls back to the plain branch
            // rather than being silently mis-measured.
            type={type === 'password' ? 'password' : 'text'}
            wrapperClassName="w-full"
            {...shared}
          />
        ) : (
          <input ref={ref} type={type} {...shared} />
        )}
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
 * IT TAKES THE SMOOTH CARET TOO, which reverses what AuthScreen's docblock used
 * to claim -- that a masked field has "no visible caret to smooth". It does:
 * the caret moves between bullets exactly as it moves between letters, and
 * skiper106 measures a masked field deliberately, repeating the platform's own
 * bullet glyph (U+25CF on Firefox, U+2022 elsewhere) so the position lands
 * right. The real worry in that note was the redrawn caret colliding with the
 * reveal button, and it does not: the button is absolutely positioned on the
 * OUTER wrapper while the caret is clamped inside the input's own box, which
 * `pr-11` already keeps clear of it.
 *
 * The caret is opt-in on Input and ON by default here, because every password
 * field in this app is an auth field -- the surface the effect was adopted for.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, smoothCaret = true, ...props }, ref) => {
    const [revealed, setRevealed] = React.useState(false)
    const Reveal = revealed ? EyeOffIcon : EyeIcon
    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={revealed ? 'text' : 'password'}
          smoothCaret={smoothCaret}
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
