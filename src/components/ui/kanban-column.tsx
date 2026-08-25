import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * A titled column with a count.
 *
 * The count is tabular for the same reason the KPI value is: a column header
 * that reflows as cards move is noise during the one interaction -- dragging --
 * where the eye is already tracking movement.
 *
 * The header rule is `border-border-strong`, not the status colour. Tinting the
 * column by status would put five large colour fields on screen at once and
 * bury the markers they are supposed to frame.
 */
export interface KanbanColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  count: number
}

export function KanbanColumn({ title, count, className, children, ...props }: KanbanColumnProps) {
  return (
    <section className={cn('flex min-w-56 flex-col gap-3', className)} {...props}>
      <header className="flex items-baseline justify-between border-b-2 border-border-strong pb-2">
        <h3 className="text-label-caps uppercase text-text-primary">{title}</h3>
        <span data-column-count className="tabular text-body-s text-text-muted">
          {count}
        </span>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}
