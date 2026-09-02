'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { CssSpinner } from './css-spinner'

/**
 * Three intents times two sizes -- the six buttons drawn in Figma.
 *
 * Radius is capped at 4px (`rounded-md`) here and everywhere else. The design
 * separates things with hairline rules rather than rounded, shadowed cards, so
 * a softer corner on one control reads as a different design system.
 *
 * Primary fills with `accent-default`, which resolves to orange-700 in light
 * and orange-400 in dark. Both clear AA against their own `accent-on-accent`
 * foreground; orange-500 does not, which is why it is absent from this file.
 *
 * `loading` IS A STATE OF THE BUTTON, NOT SOMETHING THE CALLER DRAWS. Before
 * this, a pending submit was a `disabled` prop and, in the better cases, a
 * relabelled string -- so "the system has your request" was communicated
 * inconsistently, or as nothing at all but a dead control. A disabled button
 * with no motion is indistinguishable from a broken one, which on a sign-in
 * form is the exact moment people click again.
 *
 * Three things happen together, and they have to, which is why this is one
 * prop rather than three:
 *   - a CssSpinner appears before the label
 *   - the button disables itself, so a second submit is impossible
 *   - `aria-busy` is set, so a screen reader is told rather than shown
 *
 * The LABEL DOES NOT CHANGE and the button DOES NOT COLLAPSE to a spinner.
 * Swapping "Sign in" for a bare glyph loses the only text saying what is being
 * waited on, and a button that changes width mid-click moves the pointer off
 * whatever is beside it.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
    'transition-colors duration-[--duration-fast] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent-default text-accent-on-accent hover:bg-accent-hover',
        secondary:
          'border border-border-default bg-bg-canvas text-text-primary hover:bg-bg-inset',
        ghost: 'text-text-secondary hover:bg-bg-inset hover:text-text-primary',
      },
      size: {
        m: 'h-10 px-4 text-body-m',
        s: 'h-8 px-3 text-body-s',
      },
    },
    defaultVariants: { variant: 'primary', size: 'm' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Shows a spinner, disables the control, and sets aria-busy. */
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-variant={variant ?? 'primary'}
      data-loading={loading ? 'true' : undefined}
      // Disabled by loading OR by the caller. Deriving it here rather than
      // asking every call site to pass `disabled={busy || ...}` is what makes
      // a double submit unrepresentable instead of merely discouraged.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && <CssSpinner size={14} />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

export { buttonVariants }
