'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusMarker, type Status } from '@/components/ui/status-marker'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { formatAppliedDate } from '@/services/date'
import type { Job } from '@/types'

export interface RecentApplicationsTableProps {
  jobs: Job[]
  limit?: number
}

/**
 * The Figma Overview's bottom block (26:76): a titled table with a link out,
 * a column-labels row reading `company` / `position` / `status` / `applied on`,
 * and five rows.
 *
 * A real `<table>` via shadcn's Table, not a stack of flex rows. The old
 * `DashboardBlocks` rendered three applications as loose text with no column
 * labels, so nothing lined up between rows and a screen reader got no
 * row/column relationship at all.
 *
 * Each row links to its own detail route. M5's whole-branch review found the
 * dashboard never linked to `/applications/[id]` despite that route being
 * built one task earlier; this is the surface where that link belongs.
 *
 * `date_applied` is a bare DATE, not an instant, so it goes through
 * `formatAppliedDate` (UTC) rather than `formatTouchedDate` (viewer's zone).
 * Reading a calendar day in local time shifts it by one for half the world.
 *
 * Header band and row banding come from `accent-surface`, the same pair
 * `ApplicationsTable` and `CohortTable` use -- three tables across three
 * screens, one treatment. `accent-surface`, never `accent-default`: the
 * latter is picked for TEXT contrast (accent-400 in dark) and a full-width
 * band of it is the over-bright header Gabe rejected on the calendar.
 */
export function RecentApplicationsTable({ jobs, limit = 5 }: RecentApplicationsTableProps) {
  const rows = jobs.slice(0, limit)

  if (rows.length === 0) {
    return (
      <EmptyState icon="Applications">
        no applications yet. add one and it shows up here.
      </EmptyState>
    )
  }

  return (
    <Table data-recent-applications>
      <TableHeader className="bg-accent-surface [&_th]:text-accent-on-surface">
        <TableRow className="hover:bg-transparent">
          <TableHead>company</TableHead>
          <TableHead>position</TableHead>
          <TableHead>status</TableHead>
          <TableHead className="text-right">applied on</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((job, i) => (
          // Zebra on the odd rows only, so the first row sits on the card and
          // the banding reads as an aid rather than as a fill.
          <TableRow key={job.id} className={cn(i % 2 === 1 && 'bg-accent-surface/30')}>
            <TableCell className="max-w-0 truncate text-text-primary">
              <Link href={`/applications/${job.id}`} className="hover:text-accent-default">
                {job.company}
              </Link>
            </TableCell>
            <TableCell className="max-w-0 truncate text-text-secondary">{job.role}</TableCell>
            <TableCell>
              <StatusMarker status={job.status as Status} />
            </TableCell>
            <TableCell className="tabular text-right text-text-muted">
              {/* A wishlist job has no date_applied. An em dash says "no
                  value"; "not applied" says which value is missing and why,
                  and it is what this column said before the table replaced
                  the old text block. Falling back to created_at would print
                  the row's signup timestamp as though it were an applied
                  date, which is worse than either. */}
              {job.date_applied ? formatAppliedDate(job.date_applied) : 'not applied'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
