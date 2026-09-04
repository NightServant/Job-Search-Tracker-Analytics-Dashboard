'use client'

import * as React from 'react'
import Link from 'next/link'
import { useAppHref } from '@/components/shell/routeBase'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IconButton } from '@/components/ui/icon-button'
import { StatusMarker, type Status } from '@/components/ui/status-marker'
import { EmptyState } from '@/components/ui/empty-state'
import { TrashIcon } from '@/components/icons'
import { formatAppliedDate } from '@/services/date'
import { formatSalaryRange } from '@/services/salary'
import { cn } from '@/lib/utils'
import { iconMotion } from '@/components/icons/motion'
import type { Job } from '@/types'

export interface ApplicationsTableProps {
  jobs: Job[]
  /**
   * Opens the record on THIS screen, in the given mode.
   *
   * When it is absent the company cell stays an ordinary link to
   * `/applications/<id>` and the whole row falls back to navigation, which is
   * what the mobile surface wants and what a no-JS render does anyway.
   */
  onOpen?: (job: Job, mode: 'view' | 'edit') => void
  onDelete?: (job: Job) => void
  emptyMessage?: string
  id?: string
  role?: string
  'aria-labelledby'?: string
}

/**
 * The applications, as a real table.
 *
 * This replaced a stack of flex rows. A `<table>` gives a screen reader the
 * row/column relationship that stack never had -- "company: Trend Micro,
 * status: applied" instead of four unrelated strings -- and it is what makes
 * the columns line up between rows rather than each row negotiating its own
 * widths.
 *
 * ALTERNATING ROW COLOURS ARE A DELIBERATE EXCEPTION, and it is worth being
 * honest about that. This system separates with hairline rules and does not
 * fill blocks; Gabe asked for zebra striping specifically. The compromise is
 * `bg-bg-surface` -- an existing token one step off the canvas, not a new
 * colour and not a tint -- so the banding reads at a glance across a wide row
 * without becoming a filled card. The hairline `border-b` stays underneath it;
 * the stripe is an aid to tracking a row across 1100px, not a replacement for
 * the rule.
 *
 * Status stays a `StatusMarker`, never a badge. The five-status vocabulary is
 * a 2px rule plus a label everywhere in this app, and `badge` was adopted in
 * M5.5 on the explicit condition that it never carries application status.
 *
 * `date_applied` is a bare DATE, so it goes through `formatAppliedDate` (UTC).
 * A wishlist row has none -- it says so rather than borrowing `created_at`,
 * which would print the row's signup time as though it were an applied date.
 */
export function ApplicationsTable({
  jobs,
  onOpen,
  onDelete,
  emptyMessage = 'nothing matches these filters.',
  id,
  role,
  'aria-labelledby': ariaLabelledBy,
}: ApplicationsTableProps) {
  const appHref = useAppHref()
  // Read at CLICK time, not at render time. `useIsMobile` reports false until
  // its effect has run, and a click cannot happen before hydration -- so the
  // first-render value never reaches a decision, and there is no need to gate
  // the whole table on a width the server cannot know.
  const isMobile = useIsMobile()
  if (jobs.length === 0) {
    return (
      <div data-list id={id} role={role} aria-labelledby={ariaLabelledBy}>
        <EmptyState icon="Applications">{emptyMessage}</EmptyState>
      </div>
    )
  }

  return (
    <div data-list id={id} role={role} aria-labelledby={ariaLabelledBy} className="overflow-x-auto">
      <Table data-applications-table>
        {/*
          The same accent band the calendar's weekday row wears, from the same
          `accent-surface` pair. accent-surface is the token for a FIELD of
          accent; `accent-default` is picked for text contrast (accent-400 in
          dark) and a full-width bar of it is the over-bright header Gabe
          rejected on the calendar.

          `[&_th]:text-accent-on-surface` because TableHead sets its own muted
          foreground, which would otherwise win over anything inherited.
        */}
        <TableHeader className="bg-accent-surface [&_th]:text-accent-on-surface">
          <TableRow className="hover:bg-transparent">
            <TableHead>company</TableHead>
            <TableHead>position</TableHead>
            <TableHead>status</TableHead>
            <TableHead>salary</TableHead>
            <TableHead className="text-right">applied on</TableHead>
            {(onOpen || onDelete) && <TableHead className="w-20 text-right">actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job, i) => (
            <TableRow
              key={job.id}
              data-testid="application-row"
              // Zebra on the odd rows only, so the first row sits on the
              // canvas and the banding reads as an aid rather than as a fill.
              //
              // Tinted from accent-surface rather than the neutral bg-surface,
              // so the banding belongs to the same warm family as the header
              // band above it instead of reading as a grey table wearing an
              // orange hat. At 30% it stays a guide for the eye across a row
              // and never competes with the StatusMarker in the row itself.
              className={cn(i % 2 === 1 && 'bg-accent-surface/30')}
            >
              <TableCell className="max-w-0 truncate text-text-primary">
                {/*
                  STILL A REAL LINK, even on desktop where clicking it opens
                  the dialog instead of navigating. Rendering a <button> here
                  would take away cmd-click, middle-click and "open in new
                  tab" on a row whose href is a genuine, shareable address --
                  so the anchor stays and the plain left-click is what gets
                  intercepted. Every modified click falls through to the
                  browser untouched.
                */}
                <Link
                  href={appHref(`/applications/${job.id}`)}
                  onClick={(e) => {
                    if (isMobile || !onOpen) return
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                    e.preventDefault()
                    onOpen(job, 'view')
                  }}
                  className="rounded-md hover:text-accent-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
                >
                  {job.company}
                </Link>
              </TableCell>
              <TableCell className="max-w-0 truncate text-text-secondary">{job.role}</TableCell>
              <TableCell>
                <StatusMarker status={job.status as Status} />
              </TableCell>
              <TableCell className="tabular whitespace-nowrap text-text-secondary">
                {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency) ||
                  'not specified'}
              </TableCell>
              <TableCell className="tabular whitespace-nowrap text-right text-text-muted">
                {job.date_applied ? formatAppliedDate(job.date_applied) : 'not applied'}
              </TableCell>
              {(onOpen || onDelete) && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onOpen && (
                      <IconButton
                        aria-label={`Edit ${job.role} at ${job.company}`}
                        onClick={() => onOpen(job, 'edit')}
                        className="text-label-caps uppercase"
                      >
                        edit
                      </IconButton>
                    )}
                    {onDelete && (
                      <IconButton
                        aria-label={`Delete ${job.role} at ${job.company}`}
                        onClick={() => onDelete(job)}
                      >
                        <TrashIcon size={16} aria-hidden className={`[&_svg]:size-4 ${iconMotion('lid')}`} />
                      </IconButton>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
