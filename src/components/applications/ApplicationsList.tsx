'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ApplicationRow } from '@/components/ui/application-row'
import { TrashIcon } from '@/components/icons'
import type { Job } from '@/types'

/**
 * The mobile view of the same data the kanban shows on desktop.
 *
 * `md:hidden` is a hard rule rather than a preference: five columns across
 * 375px is 75px each, narrower than a card's own padding, so the kanban has no
 * legible small-screen form. The list is the design at that width, not a
 * degraded fallback.
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
}

const CONTROL =
  'grid h-7 w-9 shrink-0 place-items-center rounded-md text-text-muted ' +
  'transition-colors duration-[--duration-fast] hover:bg-bg-inset hover:text-text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default'

export function ApplicationsList({
  jobs,
  onEdit,
  onDelete,
  emptyMessage = 'Nothing matches these filters.',
  id,
  className,
}: ApplicationsListProps) {
  return (
    <div data-list id={id} className={cn('md:hidden', className)}>
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
              href={`/applications/${job.id}`}
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
                date={job.date_applied ?? 'not applied'}
                className="border-b-0"
              />
            </Link>
            {(onEdit || onDelete) && (
              <div className="flex shrink-0 flex-col justify-center gap-1 py-2">
                {onEdit && (
                  <button
                    type="button"
                    aria-label={`Edit ${job.role} at ${job.company}`}
                    onClick={() => onEdit(job)}
                    className={cn(CONTROL, 'text-label-caps uppercase')}
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    aria-label={`Delete ${job.role} at ${job.company}`}
                    onClick={() => onDelete(job)}
                    className={CONTROL}
                  >
                    <TrashIcon size={16} aria-hidden />
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
