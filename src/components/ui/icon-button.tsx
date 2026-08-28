'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The small square control that hangs beside a row or a card: delete, edit,
 * drag, expand.
 *
 * Three screens hand-rolled this as a `CONTROL` class constant --
 * `ApplicationsList`, `KanbanView` and `DocumentsPage` -- and two of the three
 * were byte-identical. It is not a `Button` variant: `Button` is 32 or 40px
 * tall with horizontal padding and sits in a header or a form, while this is a
 * 28x36 affordance that has to fit in the gutter of a 44px list row without
 * pushing the content it belongs to. Merging them would mean a size that is
 * wrong in one of the two places.
 *
 * `shrink-0` is deliberately NOT in the base. Four of the seven call sites
 * carry it -- both controls in `ApplicationsList` and both in `DocumentsPage`,
 * all of which sit in a flex row. The three in `KanbanView` are absolutely
 * positioned and never had it, so putting it in the base would have been a
 * layout change smuggled in under a refactor. Callers that need it pass it,
 * and `cn` merges width and padding overrides for the one control that carries
 * a word instead of a glyph.
 */
export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-icon-button
      className={cn(
        'grid h-7 w-9 place-items-center rounded-md text-text-muted',
        'transition-colors duration-[--duration-fast] hover:bg-bg-inset hover:text-text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default',
        className
      )}
      {...props}
    />
  )
)
IconButton.displayName = 'IconButton'
