'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonVariantProps } from './button-variants'
import { CssSpinner } from './css-spinner'

/**
 * Three intents times two sizes -- the six buttons drawn in Figma.
 *
 * THE CLASS RECIPE LIVES IN ./button-variants, which carries no `'use client'`
 * directive, and it is NOT re-exported from here. It used to live in this
 * file, which quietly made it a client-only export and threw at request time
 * in any server component that called it -- discovered as a 500 on the 404
 * page, which is a memorable place to find it.
 *
 * Re-exporting it would have been the smaller diff and would not have fixed
 * anything: a re-export from a `'use client'` module is itself client-marked,
 * so the next server component to reach for `@/components/ui/button` would
 * have hit exactly the same error. One canonical import path is what makes
 * the failure unrepeatable rather than merely fixed once.
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
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

