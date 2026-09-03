'use client'

import * as React from 'react'
import Link from 'next/link'
import { useAppHref } from '@/components/shell/routeBase'
import { cn } from '@/lib/utils'
import { ApplicationRow } from '@/components/ui/application-row'
import { IconButton } from '@/components/ui/icon-button'
import { TrashIcon } from '@/components/icons'
import { formatAppliedDate } from '@/services/date'
import type { Job } from '@/types'

/**
 * The flat, ungrouped list of applications -- now the only view of them.
 *
 * This used to carry a hard-coded `md:hidden`, because the kanban board was
 * the desktop view and this was the small-screen substitute for it. The board
 * is gone (M5.5 Item 3, 2026-08-29): grouping into five status columns *was*
 * the sorting Gabe asked to remove, and the status tabs replace it. So this
 * renders at every width, and the tabs choose which of its rows show.
 *
 * Nothing about the list was small-screen-specific, which is why it survived
 * the board and the board did not survive it -- ungrouped rows scale from
 * 375px to 1440px, whereas five columns across 375px is 75px each, narrower
 * than a card's own padding.
 *
 * The row itself is M4's `ApplicationRow` and keeps owning the hairline that
 * separates it from its neighbour; the link and the two controls sit around it
 * rather than inside it, so the composite gains behaviour without gaining a
 * second border. The controls stack vertically in a 36px gutter -- side by side
 * they took 72px of a 343px row, and the company name is what paid for it.
 */
export interface ApplicationsListProps {
  jobs: Job[]
  onEdit?: (job: Job) => void
  onDelete?: (job: Job) => void
  emptyMessage?: string
  id?: string
  className?: string
  role?: string
  'aria-labelledby'?: string
}

export function ApplicationsList({
  jobs,
  onEdit,
  onDelete,
  emptyMessage = 'Nothing matches these filters.',
  id,
  className,
  role,
  'aria-labelledby': ariaLabelledBy,
}: ApplicationsListProps) {
  const appHref = useAppHref()
  return (
    <div
      data-list
      id={id}
      role={role}
      aria-labelledby={ariaLabelledBy}
      className={cn(className)}
    >
      {jobs.length === 0 ? (
        <p className="py-8 text-body-s text-text-muted">{emptyMessage}</p>
      ) : (
        jobs.map((job) => (
          <div
            key={job.id}
            data-testid="application-row"
            className="flex items-stretch gap-2 border-b border-border-subtle"
          >
            <Link
              href={appHref(`/applications/${job.id}`)}
              className={cn(
                'min-w-0 flex-1 rounded-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default'
              )}
            >
              <ApplicationRow
                company={job.company}
                role={job.role}
                status={job.status}
                salaryMin={job.salary_min}
                salaryMax={job.salary_max}
                currency={job.salary_currency}
                date={formatAppliedDate(job.date_applied)}
                className="border-b-0"
              />
            </Link>
            {(onEdit || onDelete) && (
              <div className="flex shrink-0 flex-col justify-center gap-1 py-2">
                {onEdit && (
                  <IconButton
                    aria-label={`Edit ${job.role} at ${job.company}`}
                    onClick={() => onEdit(job)}
                    className="shrink-0 text-label-caps uppercase"
                  >
                    edit
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton
                    aria-label={`Delete ${job.role} at ${job.company}`}
                    onClick={() => onDelete(job)}
                    className="shrink-0"
                  >
                    <TrashIcon size={16} aria-hidden />
                  </IconButton>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
