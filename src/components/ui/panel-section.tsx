import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircleIcon, icons, type IconName } from '@/components/icons'
import { ICON_STATE_MOTION } from '@/components/icons/motion'

/**
 * The hairline-separated section every screen in this system groups content
 * under: a heading, an optional action next to it, and either an error state
 * or the panel's own content underneath.
 *
 * Tasks 3 and 5 each hand-rolled this wrapper independently and landed on two
 * different values for it -- a `pt-5`/`pt-6` split and a `gap-3`/`gap-4`
 * split -- because nothing forced the six call sites to share one
 * definition. `pt-6` and `gap-3` are not an arbitrary pick: they are what
 * five of the six original sites already agreed on, so they become the one
 * true values here rather than splitting the difference. A panel whose own
 * content has more internal structure than a single list or paragraph (the
 * ATS panel's score plus two labelled keyword lists) is still free to wrap
 * its *children* in their own inner `gap-4` -- that is content rhythm, not
 * the section-level title-to-content rhythm this component now owns.
 *
 * `icon`, when given, marks the section: a muted 16px glyph before the
 * heading, `aria-hidden`, carrying nothing the heading does not already say.
 * It is for finding a section in a column of them, which is what a detail
 * screen with eight of these actually is. Same rule as `CardTitle`'s -- a
 * glyph that names the section, never one chosen to fill the space.
 *
 * `error`, when given, replaces `children` with the same
 * `AlertCircleIcon` + `text-status-rejected-mark` treatment three panels used
 * to hand-roll identically apart from the wording, so a failed read reads as
 * the same kind of fact wherever it shows up.
 */
export interface PanelSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode
  /** A muted glyph before the heading. Decorative; see the docblock. */
  icon?: IconName
  /**
   * Detail panels sit below a screen that already has its own page header,
   * so they default to the smaller heading. The dashboard's blocks are the
   * page's own top-level groupings and ask for the larger one explicitly.
   */
  titleSize?: 's' | 'm'
  actions?: React.ReactNode
  error?: React.ReactNode
  children: React.ReactNode
  'data-dashboard-block'?: boolean
}

export function PanelSection({
  title,
  icon,
  titleSize = 's',
  actions,
  error,
  children,
  className,
  ...props
}: PanelSectionProps) {
  const Icon = icon ? icons[icon] : null
  return (
    <section
      className={cn('flex flex-col gap-3 border-t border-border-subtle pt-6', className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          className={cn(
            'flex items-center gap-2 text-text-primary',
            titleSize === 'm' ? 'text-heading-m' : 'text-heading-s'
          )}
        >
          {Icon && <Icon size={16} aria-hidden className="shrink-0 text-text-muted" />}
          {title}
        </h2>
        {actions}
      </div>
      {error ? (
        <div className="flex items-start gap-2 text-body-s text-status-rejected-mark">
          {/* The error branch mounts a fresh node when a read fails, so the
              one-shot shake runs exactly when the failure appears -- and
              never again while it sits there being read. */}
          <AlertCircleIcon
            size={16}
            className={cn('mt-0.5 shrink-0', ICON_STATE_MOTION.refuse)}
          />
          {error}
        </div>
      ) : (
        children
      )}
    </section>
  )
}
