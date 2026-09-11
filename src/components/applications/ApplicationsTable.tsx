'use client'

import * as React from 'react'
import Link from 'next/link'
import { useAppHref } from '@/components/shell/routeBase'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatusMarker, type Status } from '@/components/ui/status-marker'
import { EmptyState } from '@/components/ui/empty-state'
import { EyeIcon, TrashIcon } from '@/components/icons'
import { formatAppliedDate } from '@/services/date'
import { formatSalaryRange } from '@/services/salary'
import { cn } from '@/lib/utils'
import { iconMotion } from '@/components/icons/motion'
import type { Job } from '@/types'

export interface ApplicationsTableProps {
  jobs: Job[]
  /**
   * Opens the record on THIS screen.
   *
   * ONE MODE, because there is only one now: the record dialog shows and
   * edits the same surface, so the separate edit dialog -- and the `edit`
   * button in this table that opened it -- are gone (Gabe, Worktrack
   * Revisions: "remove the edit button and preserve the danger icon").
   *
   * When it is absent the company cell stays an ordinary link to
   * `/applications/<id>` and the whole row falls back to navigation, which is
   * what a no-JS render does anyway.
   */
  onOpen?: (job: Job) => void
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
  if (jobs.length === 0) {
    return (
      <div data-list id={id} role={role} aria-labelledby={ariaLabelledBy}>
        <EmptyState icon="Applications">{emptyMessage}</EmptyState>
      </div>
    )
  }

  return (
    // No `overflow-x-auto` here any more: `Table` brings its own scroll
    // container, and two nested scrollports meant the sticky first column
    // resolved against one of them while the row scrolled in the other.
    // `sm:flex sm:min-h-0 sm:flex-col` continues the chain that starts at
    // AppShell and ends at Table's scroll container. `min-h-0` is what every
    // link needs: without it a flex item's automatic minimum size is its
    // content height, so the shrink never propagates and the table keeps its
    // full height whatever the frame does.
    //
    // NO `flex-1` on this chain. It was there first and it was wrong: `flex-1`
    // forces growth, so a one-row filter stretched the card to the full frame.
    // Only the page frame itself grows; everything inside it is content-sized
    // and merely allowed to shrink.
    <div
      data-list
      id={id}
      role={role}
      aria-labelledby={ariaLabelledBy}
      className="sm:flex sm:min-h-0 sm:flex-col"
    >
      {/* Stacked below 640 (six columns do not fit a phone), a normal table
          with a pinned company column from there up -- so a sideways scroll
          on a tablet never leaves you looking at a row you cannot identify. */}
      {/* `min-w` from sm up is what turns "six columns squeezed into 700px"
          into "six columns at their real widths, scrolled". Without it the
          table auto-layout hands company and position whatever is left after
          the four rigid columns, and at 768 that was about seven characters --
          `Glasswi...`, `Tracklin...`, a column of ellipses. A tablet scrolls a
          little sideways instead, with company pinned so the row it belongs to
          is never in doubt.

          Not applied below sm: the table is stacked there, and a 780px minimum
          on a block-displayed table would reintroduce the page-wide horizontal
          scroll the stacking exists to remove. Reset in the stacked rule. */}
      <Table stacked stickyHeader className="sm:min-w-[780px]" data-applications-table>
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
          {/* The band is declared on the ROW as well as on the thead. A sticky
                header cell paints `background: inherit`, and `inherit` reads
                its own parent -- the row -- not the thead two levels up. With
                the fill only on the thead the pinned company header was
                transparent and the scrolling columns slid visibly through it,
                while every body cell (whose row does carry a fill) was
                correct. */}
          <TableRow className="bg-accent-surface hover:bg-accent-surface">
            {/* Widths are declared, not inferred. `max-w-0` on the company and
                position CELLS is what lets a long name truncate instead of
                widening the table -- but to the auto-layout it also reads as
                "these two want no width at all", so the surplus went to
                salary, which needs none of it. The header row is where a table
                states its proportions; these five add up to 92% and the
                remainder is the actions column's fixed w-28. */}
            <TableHead sticky className="w-[24%]">company</TableHead>
            <TableHead className="w-[22%]">position</TableHead>
            <TableHead className="w-[14%]">status</TableHead>
            <TableHead className="w-[20%]">salary</TableHead>
            <TableHead className="w-[12%] text-right">applied on</TableHead>
            {/* `w-28`, up from `w-20`: the delete control is a labelled
                button now and 80px cropped it. */}
            {(onOpen || onDelete) && <TableHead className="w-28 text-right">actions</TableHead>}
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
              className={cn(i % 2 === 1 ? 'row-zebra' : 'bg-bg-canvas')}
            >
              <TableCell label="company" sticky className="max-w-0 truncate text-text-primary">
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
                    // AT EVERY WIDTH NOW. This used to fall through to
                    // navigation on a phone, because `/applications/<id>` was
                    // the mobile record. The record is a bottom sheet below
                    // 640 instead, so the same click opens the same surface
                    // everywhere and that route is a redirect.
                    if (!onOpen) return
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                    e.preventDefault()
                    onOpen(job)
                  }}
                  className="rounded-md hover:text-accent-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
                >
                  {job.company}
                </Link>
              </TableCell>
              <TableCell label="position" className="max-w-0 truncate text-text-secondary">
                {job.role}
              </TableCell>
              <TableCell label="status">
                <StatusMarker status={job.status as Status} />
              </TableCell>
              <TableCell label="salary" className="tabular whitespace-nowrap text-text-secondary">
                {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency) ||
                  'not specified'}
              </TableCell>
              <TableCell
                label="applied on"
                className="tabular whitespace-nowrap text-right text-text-muted"
              >
                {job.date_applied ? formatAppliedDate(job.date_applied) : 'not applied'}
              </TableCell>
              {(onOpen || onDelete) && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* VIEW IS A PHONE CONTROL ONLY. On a pointer the company
                        cell is the affordance and a second one beside delete
                        is noise; on a stacked card there is no row to click
                        and the two things you can do to an application are a
                        pair of thumb targets. `sm:hidden` rather than a
                        width hook: display:none takes it out of the
                        accessibility tree too, so a desktop test never finds
                        two ways to open the same record. */}
                    {onOpen && (
                      <Button
                        variant="secondary"
                        size="s"
                        aria-label={`View ${job.role} at ${job.company}`}
                        onClick={() => onOpen(job)}
                        className="sm:hidden"
                      >
                        <EyeIcon size={16} aria-hidden className={`[&_svg]:size-4 ${iconMotion('none')}`} />
                        view
                      </Button>
                    )}
                    {onDelete && (
                      /* A LABELLED DANGER BUTTON, NOT A BARE GLYPH (Gabe,
                         2026-09-11). A trash icon alone is the most
                         destructive control on the screen wearing the
                         quietest chrome — the same weight as the eye beside
                         it, in a row somebody is scanning, one pixel from the
                         thing they meant to click.

                         The treatment is `DangerZone`'s, not a new one: a
                         secondary button re-coloured with
                         `status-rejected-mark`. This system paints destructive
                         intent in the rejected hue and reserves the accent for
                         "the current action", so a filled red button here
                         would shout louder than `add` does.

                         THE ACCESSIBLE NAME STILL CARRIES THE ROW. Ten buttons
                         all announcing "delete" is a list nobody can navigate,
                         and `aria-label` opens with the visible word so the
                         name still contains the label (WCAG 2.5.3). */
                      <Button
                        variant="secondary"
                        size="s"
                        aria-label={`Delete ${job.role} at ${job.company}`}
                        onClick={() => onDelete(job)}
                        className="border-status-rejected-mark text-status-rejected-mark hover:bg-status-rejected-mark/10"
                      >
                        <TrashIcon size={16} aria-hidden className={`[&_svg]:size-4 ${iconMotion('lid')}`} />
                        delete
                      </Button>
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
