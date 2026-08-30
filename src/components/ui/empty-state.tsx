import * as React from 'react'
import { cn } from '@/lib/utils'
import { icons, type IconName } from '@/components/icons'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The glyph above the copy. Large and muted — an illustration, not a control. */
  icon: IconName
  /** One sentence. What is missing, and how it gets here. */
  children: React.ReactNode
  /** An optional action. A link or a button; it sits under the copy. */
  action?: React.ReactNode
}

/**
 * The one empty state, so every screen's reads the same.
 *
 * A large centred glyph over the copy, which is what Gabe asked for. Before
 * this, every empty surface was a bare `<p>` of muted text — an empty panel
 * and a loading panel and a failed panel all looked like the same nothing, and
 * the eye had no anchor to land on.
 *
 * Two things this deliberately is not:
 *
 * It is not an error state. A failed read gets `AlertCircleIcon` in
 * `status-rejected-mark` and says the read failed; an empty state says a true
 * thing about an account with nothing in it yet. Task 5 of M5 needed a fix
 * round precisely because those two were rendering identically, and this
 * component must not undo that — pass an error through `PanelSection`'s
 * `error` prop or `RouteError`, never through here.
 *
 * The icon is `aria-hidden` and carries no information the sentence does not.
 * A screen reader gets the sentence; the glyph is there to give a sighted
 * reader something to land on in an otherwise blank rectangle. An icon that
 * needed announcing would mean the copy was incomplete.
 */
export function EmptyState({ icon, children, action, className, ...props }: EmptyStateProps) {
  const Icon = icons[icon]

  return (
    <div
      data-empty-state
      className={cn(
        'flex flex-col items-center gap-3 px-4 py-10 text-center',
        className
      )}
      {...props}
    >
      <Icon
        size={40}
        aria-hidden
        className="text-text-muted opacity-60 [&_svg]:size-10"
      />
      <p className="max-w-prose text-body-s text-text-muted">{children}</p>
      {action}
    </div>
  )
}
