import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircleIcon } from '@/components/icons'

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
 * `error`, when given, replaces `children` with the same
 * `AlertCircleIcon` + `text-status-rejected-mark` treatment three panels used
 * to hand-roll identically apart from the wording, so a failed read reads as
 * the same kind of fact wherever it shows up.
 */
export interface PanelSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode
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
  titleSize = 's',
  actions,
  error,
  children,
  className,
  ...props
}: PanelSectionProps) {
  return (
    <section
      className={cn('flex flex-col gap-3 border-t border-border-subtle pt-6', className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className={cn(titleSize === 'm' ? 'text-heading-m' : 'text-heading-s', 'text-text-primary')}>
          {title}
        </h2>
        {actions}
      </div>
      {error ? (
        <div className="flex items-start gap-2 text-body-s text-status-rejected-mark">
          <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      ) : (
        children
      )}
    </section>
  )
}
