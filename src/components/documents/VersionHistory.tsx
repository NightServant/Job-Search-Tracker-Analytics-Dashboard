import * as React from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircleIcon } from '@/components/icons'
import { buttonVariants } from '@/components/ui/button'
import { formatSnapshotTime } from '@/services/date'

export interface VersionEntry {
  id: string
  /** `resume_snapshots.version`; null only for rows written before the column existed. */
  version: number | null
  created_at: string
}

/**
 * The saved versions of one CV, on the Documents list.
 *
 * This is deliberately not `components/cv/ResumeVersionHistory`, and the two
 * are not duplicates of each other. That one is a control inside the editor:
 * it restores and deletes snapshots of the CV currently open. This one answers
 * a list-screen question -- "how far along is this CV, and when was it last
 * snapshotted" -- and cannot overwrite anything. Restore stays in the editor
 * because that is the only surface that can show you what you are about to
 * replace, so the link out is the whole action here.
 *
 * Renders inside a dialog (M5.5 Item 4), which supplies the heading -- so
 * this no longer wraps itself in `PanelSection`. It used to be an inline
 * disclosure opened by a square icon button deformed to hold text and a
 * chevron, which is what Gabe called "a weird dropdown": it was not a dropdown
 * at all, and it set `aria-expanded` with no `aria-controls`, telling a screen
 * reader that something expanded without saying what.
 *
 * Empty and failed stay separate states: "no versions saved yet" is a true
 * statement about a new CV and a false one about a network error.
 */
export interface VersionHistoryProps {
  /**
   * No `title` -- the dialog that hosts this owns the heading now. Passing one
   * here as well is how two surfaces end up disagreeing about the same CV.
   */
  editHref: string
  versions: VersionEntry[]
  loading?: boolean
  error?: boolean
}

export function VersionHistory({
  editHref,
  versions,
  loading = false,
  error = false,
}: VersionHistoryProps) {
  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="flex items-center gap-2 text-body-s text-status-rejected-mark">
          <AlertCircleIcon size={16} aria-hidden className="[&_svg]:size-4" />
          Could not load the saved versions of this CV.
        </p>
      ) : loading ? (
        <Skeleton className="h-24 w-full" data-versions-loading />
      ) : versions.length === 0 ? (
        <p className="text-body-s text-text-muted">
          No versions saved yet. Editing this CV snapshots it automatically.
        </p>
      ) : (
        <ul>
          {versions.map((entry) => (
            <li
              key={entry.id}
              className="flex items-baseline justify-between gap-4 border-b border-border-subtle py-2"
            >
              <span className="tabular text-body-s text-text-primary">
                {entry.version === null ? 'Unnumbered' : `v${entry.version}`}
              </span>
              <time dateTime={entry.created_at} className="text-body-s text-text-muted">
                {formatSnapshotTime(entry.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={editHref}
        className={buttonVariants({ variant: 'secondary', size: 's', className: 'self-start' })}
      >
        Open the editor to restore a version
      </Link>
    </div>
  )
}
