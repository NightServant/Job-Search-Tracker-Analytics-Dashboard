import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AtsCheck } from '@/components/ui/ats-check'
import { lintSections } from '@/services/atsLint'
import { formatTouchedDate } from '@/services/date'
import type { ResumeSummary } from '@/services/resumeService'

const MODE_LABELS: Record<ResumeSummary['mode'], string> = {
  word: 'Word',
  latex: 'LaTeX',
}

/**
 * One CV, one line.
 *
 * Four columns on desktop -- Info, ATS Check, version, date -- and two lines at
 * 335px, where the last three drop onto their own row beneath the title. The
 * break is one wrapper marked `md:contents`: on mobile it is a flex line, and
 * at `md` it dissolves so its three children become grid cells directly. One
 * piece of markup, not a desktop layout plus a mobile copy of it.
 *
 * Separation is the row's own hairline, the same rule `ApplicationRow` follows:
 * a list of bordered cards draws 2px between every neighbour and boxes the
 * whole list twice. Callers that wrap the row in a composite (to hang controls
 * beside it) pass `border-b-0` and carry the rule on the wrapper instead.
 *
 * The ATS column has three answers, not two. A verdict comes from
 * `resumes.sections`, which is null for every word and latex draft written
 * before the JSON Resume column existed -- those read "Not checked", because
 * telling someone their CV failed an ATS check that never ran is worse than
 * telling them nothing ran.
 *
 * The verdict is an `AtsCheck`, never a `StatusMarker`: a document has no
 * application status, and the five-status vocabulary means one specific thing
 * everywhere else. `AtsCheck` does paint its rule with `status-offer-mark` and
 * `status-rejected-mark` -- M4 deliberately reuses those two marks for
 * pass/fail rather than inventing a second green and red, the same way
 * `route-states` uses `status-rejected-mark` for a generic page error. What
 * must not appear here is a status, not a hue.
 *
 * The version column has three answers for the same reason, and deliberately
 * uses the words the expanded panel uses: a number, "Unnumbered" for a
 * snapshot written before the version column was backfilled, and "No versions"
 * only when the CV genuinely has no history. A row that said "No versions"
 * above a panel listing one entry was the same two-surfaces-disagree defect as
 * numbering snapshots by list position.
 *
 * `updated_at` is `TIMESTAMPTZ` -- a real instant, not a bare DATE -- so it
 * goes through `formatTouchedDate`, which reads it in the viewer's zone.
 * Reading it in UTC would name yesterday for a third of every day at UTC+8.
 */
export interface DocumentRowProps extends React.HTMLAttributes<HTMLDivElement> {
  doc: ResumeSummary
  /**
   * The row's own controls, rendered as a fifth grid cell.
   *
   * These used to hang outside the grid, in a `flex items-stretch` wrapper
   * that put a vertical stack of two icon buttons beside the row. That is what
   * made the columns look unaligned: the grid's `1fr` first column was
   * measured from a width the stack had already eaten, so the four content
   * columns landed at a different x on every row. Passing them in as a cell
   * with a fixed track means the grid measures them like everything else and
   * every row lines up.
   */
  actions?: React.ReactNode
  /**
   * Opens this CV's version history. When given, the version cell becomes the
   * control -- see `VersionCell`.
   */
  onOpenVersions?: () => void
}

/**
 * The one grid definition, shared by the row and by the column-labels strip
 * above it.
 *
 * It was written out twice, once in each file, and they drifted: the row's
 * last track was `auto` (sized by whatever controls it held) while the header
 * reserved a fixed 8.5rem, so every column between them sat at a different x
 * in the labels than in the data. A shared constant makes that class of bug
 * impossible rather than merely fixed -- there is no second copy to fall out
 * of step.
 *
 * The last track is a fixed width, not `auto`, for the same reason: `auto`
 * makes the whole row's geometry depend on how many buttons a caller passed.
 */
export const DOCUMENT_GRID =
  'md:grid-cols-[1fr_7rem_6rem_6rem_2.5rem] md:gap-4'

export function DocumentRow({
  doc,
  actions,
  onOpenVersions,
  className,
  ...props
}: DocumentRowProps) {
  const ats = lintSections(doc.sections)

  return (
    <div
      data-document-row
      className={cn(
        'grid grid-cols-1 gap-2 border-b border-border-subtle py-3',
        // Figma 48:548 is an 80px row; py-3 around ~40px of content made 68px,
        // which is what left the controls looking cramped against cells that
        // are vertically centred.
        DOCUMENT_GRID,
        'md:items-center md:py-5',
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        <Link
          href={`/cv?draft=${doc.id}`}
          className={cn(
            'block truncate rounded-md text-body-m text-text-primary hover:text-accent-default',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default'
          )}
        >
          {doc.title}
        </Link>
        <p className="text-body-s text-text-muted">{MODE_LABELS[doc.mode]}</p>
      </div>

      <div data-row-meta className="flex items-center gap-4 md:contents">
        {ats ? (
          <AtsCheck result={ats} className="w-16 shrink-0" />
        ) : (
          <span className="text-body-s text-text-muted">not checked</span>
        )}
        <VersionCell doc={doc} onOpenVersions={onOpenVersions} />
        <time dateTime={doc.updated_at} className="tabular text-body-s text-text-muted">
          {formatTouchedDate(doc.updated_at)}
        </time>
      </div>

      {actions ? (
        <div data-row-actions className="flex items-center gap-1 md:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  )
}

/**
 * The version column, which is also how version history opens.
 *
 * Gabe had the `versions` button removed from the row. Dropping the panel with
 * it would have deleted a feature he did not ask to delete, and hiding it
 * behind nothing at all would have left the VERSION column stating a number
 * with no way to see what it counts. So the number IS the control: the cell
 * already says "v5" or "no versions", and clicking it opens the history behind
 * that answer.
 *
 * A row with no history is not a button. "no versions" is a complete answer,
 * and a control that opens an empty panel is a promise the data cannot keep.
 */
function VersionCell({
  doc,
  onOpenVersions,
}: {
  doc: ResumeSummary
  onOpenVersions?: () => void
}) {
  const label =
    doc.version !== null ? `v${doc.version}` : doc.hasVersions ? 'unnumbered' : 'no versions'
  const tone = doc.version !== null ? 'text-text-secondary' : 'text-text-muted'

  if (!onOpenVersions || (doc.version === null && !doc.hasVersions)) {
    return <span className={cn('tabular text-body-s', tone)}>{label}</span>
  }

  return (
    <button
      type="button"
      data-row-versions
      onClick={onOpenVersions}
      aria-label={`Version history for ${doc.title}`}
      className={cn(
        'tabular justify-self-start rounded-md text-left text-body-s underline-offset-4',
        'hover:text-accent-default hover:underline',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default',
        tone
      )}
    >
      {label}
    </button>
  )
}
