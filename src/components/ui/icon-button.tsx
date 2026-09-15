'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ICON_MOTION_GROUP } from '@/components/icons/motion'

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
 * `shrink-0` is deliberately NOT in the base. It was added by callers that
 * needed it (both controls in `ApplicationsList`, both in `DocumentsPage`,
 * which all sit in a flex row) rather than baked in, because the three
 * call sites in the kanban board's card controls (`KanbanView`, removed
 * 2026-08-29 along with the board itself -- see `ApplicationsPage`) were
 * absolutely positioned and never had it; putting it in the base would have
 * been a layout change smuggled in under a refactor. `cn` still merges width
 * and padding overrides for the one control that carries a word instead of a
 * glyph.
 */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `danger` marks a control that DESTROYS something (Gabe, 2026-09-15: "your
   * document section delete action must be a danger in desktop and laptop
   * screens").
   *
   * WHY IT HAD TO BECOME A PROP RATHER THAN CLASSES AT ONE CALL SITE. Delete
   * was drawn FOUR ways in this app, and the request is one of them:
   *
   *   /applications, table    a `Button` with hand-written
   *                           `border-status-rejected-mark text-status-rejected-mark
   *                           hover:bg-status-rejected-mark/10` — red, and the
   *                           only place that had decided.
   *   /applications, list     a bare `IconButton` — grey.
   *   /documents, desktop     a bare `IconButton` — grey. The reported one.
   *   /documents, below md    `DropdownMenuItem variant="destructive"` — red.
   *
   * So the same verb was red on a phone and grey on the laptop, on the same
   * screen, three inches apart in the source. That is not four decisions; it
   * is one decision that was only ever made where somebody happened to write
   * the classes out. This is where it gets made.
   *
   * RED AT REST, NOT ONLY ON HOVER, and that follows the precedent rather than
   * inventing one: the applications table already paints its delete
   * `text-status-rejected-mark` with no interaction, and the compact overflow
   * item is red the moment the menu opens. A control that only admits what it
   * does once the pointer is on it is a control somebody can click without
   * ever having been told.
   *
   * THE FOCUS RING TURNS RED WITH IT. Every other control in this app rings in
   * the accent; on a destructive one the accent points at the wrong thing --
   * it is the colour this design system uses for "this is the action we want
   * you to take".
   */
  tone?: 'neutral' | 'danger'
}

/**
 * `status-rejected-mark` is the app's red, borrowed from the pipeline rather
 * than a second palette invented for destructive controls -- the same rule
 * `StatusState`'s tones follow. The hover surface is that colour at 10% rather
 * than `status-rejected-fill`, because `fill` is `ink-800` in the dark theme
 * (a neutral) while an alpha of the mark stays red in both.
 */
const TONES = {
  neutral: 'text-text-muted hover:bg-bg-inset hover:text-text-primary focus-visible:ring-accent-default',
  danger:
    'text-status-rejected-mark hover:bg-status-rejected-mark/10 hover:text-status-rejected-mark focus-visible:ring-status-rejected-mark',
} as const

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, type = 'button', tone = 'neutral', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-icon-button
      data-tone={tone}
      className={cn(
        // The named group its glyph's motion variant listens to. Inert on its
        // own: nothing happens unless a child asks for `group-hover/icon:`.
        ICON_MOTION_GROUP,
        'grid h-7 w-9 place-items-center rounded-md',
        // The same press as `buttonVariants`, for the same reason: an icon
        // button is the only control on a row and needs to confirm the tap.
        'transition-[color,background-color,transform] duration-(--duration-fast)',
        'active:scale-[0.94] motion-reduce:active:scale-100 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2',
        TONES[tone],
        className
      )}
      {...props}
    />
  )
)
IconButton.displayName = 'IconButton'
