'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { icons, type IconName } from '@/components/icons'

/**
 * The Input's states at more than one line.
 *
 * Height is a minimum rather than a fixed `rows`, and the field stays
 * user-resizable: notes on an application run from a phone number to a whole
 * interview debrief, and a box that is right for one is wrong for the other.
 *
 * `icon` MATCHES Input's, and it exists so a grid does not have to. The
 * application form's contact block is a grid of three inputs and a textarea;
 * a leading glyph on three of the four is worse than none at all, because the
 * odd one out reads as a field that failed to render rather than as a field
 * of a different kind.
 *
 * IT IS PINNED TO THE FIRST LINE (`top-3`), not vertically centred the way
 * Input's is. This box grows -- `min-h-48` on the job description, and the
 * user can drag it taller -- and a glyph that centres itself floats into the
 * middle of a paragraph as the text runs on.
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  /** A glyph inside the leading edge of the box, on the first line. */
  icon?: IconName
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, icon, id, disabled, ...props }, ref) => {
    const describedBy = error && id ? `${id}-error` : undefined
    const Icon = icon ? icons[icon] : null
    return (
      <div className="w-full">
        <div className={cn(Icon && 'relative w-full')}>
          {Icon && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-3 z-10 text-text-muted"
            >
              <Icon size={16} />
            </span>
          )}
          <textarea
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            data-error={error ? '' : undefined}
            className={cn(
              'min-h-24 w-full resize-y rounded-md border bg-bg-canvas py-2',
              Icon ? 'pl-10 pr-3' : 'px-3',
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
Textarea.displayName = 'Textarea'
