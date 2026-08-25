'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

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
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-variant={variant ?? 'primary'}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export { buttonVariants }
