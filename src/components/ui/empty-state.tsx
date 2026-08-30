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
 * The glyph is 72px and the copy is body-m in `text-secondary`, not body-s in
 * `text-muted`. The first pass was 40px over body-s, which is caption scale:
 * on Documents, where the empty state is the entire screen, it read as a
 * stray note in the middle of a blank page. Muted copy is right for a note
 * beside real content and wrong for copy that IS the content — nothing else
 * on the screen outranks it, so nothing needs it de-emphasised.
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
        // Scaled up: at 40px over body-s this read as a caption dropped into
        // the middle of a 900px blank page rather than as the page's content.
        // An empty state IS the screen when it shows, so it is sized like one.
        'flex flex-col items-center gap-5 px-4 py-20 text-center',
        className
      )}
      {...props}
    >
      <Icon
        size={72}
        aria-hidden
        className="text-text-muted opacity-50 [&_svg]:size-18"
      />
      <p className="max-w-prose text-body-m text-text-secondary">{children}</p>
      {action}
    </div>
  )
}
