'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { LockIcon, SearchIcon } from '@/components/icons'

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
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [revealed, setRevealed] = React.useState(false)
    const Reveal = revealed ? LockIcon : SearchIcon
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
