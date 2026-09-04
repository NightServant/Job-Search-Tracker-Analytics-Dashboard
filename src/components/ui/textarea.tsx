'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The Input's states at more than one line.
 *
 * Height is a minimum rather than a fixed `rows`, and the field stays
 * user-resizable: notes on an application run from a phone number to a whole
 * interview debrief, and a box that is right for one is wrong for the other.
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, id, disabled, ...props }, ref) => {
    const describedBy = error && id ? `${id}-error` : undefined
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          data-error={error ? '' : undefined}
          className={cn(
            'min-h-24 w-full resize-y rounded-md border bg-bg-canvas px-3 py-2',
            'text-body-m text-text-primary placeholder:text-text-muted',
            'transition-colors duration-(--duration-fast)',
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
Textarea.displayName = 'Textarea'
