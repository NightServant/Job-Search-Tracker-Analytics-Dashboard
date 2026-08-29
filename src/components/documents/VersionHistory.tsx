import * as React from 'react'
import Link from 'next/link'
import { PanelSection } from '@/components/ui/panel-section'
import { CssSpinner } from '@/components/ui/css-spinner'
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
 * `PanelSection` supplies the heading, the hairline and the failed-read
 * treatment, so a version list that fails reads as the same kind of fact as
 * any other panel that fails. Empty and failed are separate states: "no
 * versions saved yet" is a true statement about a new CV and a false one about
 * a network error.
 */
export interface VersionHistoryProps {
  title: string
  editHref: string
  versions: VersionEntry[]
  loading?: boolean
  error?: boolean
}

export function VersionHistory({
  title,
  editHref,
  versions,
  loading = false,
  error = false,
}: VersionHistoryProps) {
  return (
    <PanelSection
      title={`Versions of ${title}`}
      className="border-t-0 pb-6 pt-3"
      error={error ? 'Could not load the saved versions of this CV.' : undefined}
    >
      {loading ? (
        <CssSpinner size={20} className="text-text-muted" />
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
    </PanelSection>
  )
}
