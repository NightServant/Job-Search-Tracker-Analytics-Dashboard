'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDownIcon } from '@/components/icons'

/**
 * A native `<select>` wearing the Input's four states.
 *
 * Native rather than a custom listbox: the options here are five statuses,
 * three work modes and six currency codes, and a hand-built popup would owe
 * the platform keyboard model, the mobile wheel and the screen-reader
 * semantics that `<select>` already ships. The only thing added is the chevron,
 * because `appearance-none` removes the browser's own.
 *
 * The error contract matches `Input` exactly -- `error` plus `id` renders the
 * message and wires `aria-describedby` -- so a form can hold a mix of the two
 * without special-casing either.
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, id, disabled, children, ...props }, ref) => {
    const describedBy = error && id ? `${id}-error` : undefined
    return (
      <div className="w-full">
        <div className="relative w-full">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            data-error={error ? '' : undefined}
            className={cn(
              'h-10 w-full appearance-none rounded-md border bg-bg-canvas pl-3 pr-9',
              'text-body-m text-text-primary transition-colors duration-(--duration-fast)',
              'focus-visible:outline-none focus-visible:border-accent-default',
              'focus-visible:ring-2 focus-visible:ring-accent-default/30',
              'disabled:cursor-not-allowed disabled:bg-bg-inset disabled:text-text-muted',
              error ? 'border-status-rejected-mark' : 'border-border-default',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDownIcon
            size={16}
            aria-hidden
            className="pointer-events-none absolute right-3 top-3 text-text-muted"
          />
        </div>
        {error && id && (
          <p id={describedBy} className="mt-1 text-body-s text-status-rejected-mark">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'
