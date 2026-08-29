'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { AppDialog } from '@/components/ui/app-dialog'
import { IconButton } from '@/components/ui/icon-button'
import { ChevronDownIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { ModeChooser } from '@/components/cv/ModeChooser'
import { DocumentRow } from './DocumentRow'
import { VersionHistory, type VersionEntry } from './VersionHistory'
import type { ResumeSummary } from '@/services/resumeService'

/**
 * `/cv?draft=new` still works as a deep link -- `src/app/(app)/cv/page.tsx`
 * opens the same `ModeChooser` dialog directly when it lands there with
 * nothing else to sit behind it. `+ new cv` itself no longer navigates: see
 * the dialog below.
 */
export const NEW_CV_HREF = '/cv?draft=new'

/**
 * The Documents screen's body, over plain props -- the same split as
 * `Dashboard`, `ApplicationsPage` and `DetailPage`, so it renders without Next
 * routing or react-query. `src/app/(app)/documents/page.tsx` owns the reads
 * and the writes.
 *
 * `+ new cv` sits in the body header rather than the Top Bar. The bar is
 * chrome and is identical on five of the seven app screens; a control that
 * acts on this screen's content belongs to this screen's content. It is a link
 * rather than a button because creating a CV needs a mode first, and that
 * choice lives on `/cv` beside the editors it chooses between -- one surface
 * owns every write to `resumes`.
 *
 * Version history is one row at a time. Loading every CV's snapshots to render
 * a list of CVs would be one query per row for information almost nobody
 * opens, so the caller fetches on demand and this component only says which
 * row asked.
 */
export interface DocumentsPageProps {
  docs: ResumeSummary[]
  onDelete?: (doc: ResumeSummary) => void
  onToggleVersions?: (doc: ResumeSummary) => void
  openVersionsFor?: string | null
  versions?: VersionEntry[]
  versionsLoading?: boolean
  versionsError?: boolean
  /** Fires once a mode is chosen in the New CV dialog; the caller owns the write and the navigation. */
  onCreateDraft?: (mode: 'word' | 'latex') => void
  creatingDraft?: boolean
}

export function DocumentsPage({
  docs,
  onDelete,
  onToggleVersions,
  openVersionsFor = null,
  versions = [],
  versionsLoading = false,
  versionsError = false,
  onCreateDraft,
  creatingDraft = false,
}: DocumentsPageProps) {
  const [newCvOpen, setNewCvOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Documents"
        action={
          <Button size="s" onClick={() => setNewCvOpen(true)}>
            <PlusIcon size={16} aria-hidden />
            New CV
          </Button>
        }
      />

      {docs.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-border-subtle pt-6">
          <p className="text-body-m text-text-primary">No CVs yet.</p>
          <p className="text-body-s text-text-muted">
            Write one in the document editor or in LaTeX, then pin it to the applications you send
            it to.
          </p>
          <Button variant="secondary" size="s" onClick={() => setNewCvOpen(true)}>
            New CV
          </Button>
        </div>
      ) : (
        <div>
          {docs.map((doc) => {
            const open = openVersionsFor === doc.id
            return (
              <div key={doc.id} className="border-b border-border-subtle">
                <div className="flex items-stretch gap-2">
                  <DocumentRow doc={doc} className="min-w-0 flex-1 border-b-0" />
                  <div className="flex shrink-0 flex-col justify-center gap-1 py-2">
                    <IconButton
                      aria-expanded={open}
                      onClick={() => onToggleVersions?.(doc)}
                      className="w-auto shrink-0 grid-flow-col gap-1 px-2 text-label-caps uppercase"
                    >
                      Versions
                      <ChevronDownIcon
                        size={14}
                        aria-hidden
                        className={open ? 'rotate-180' : undefined}
                      />
                    </IconButton>
                    <IconButton
                      aria-label={`Delete ${doc.title}`}
                      onClick={() => onDelete?.(doc)}
                      className="shrink-0"
                    >
                      <TrashIcon size={16} aria-hidden />
                    </IconButton>
                  </div>
                </div>
                {open && (
                  <VersionHistory
                    title={doc.title}
                    editHref={`/cv?draft=${doc.id}`}
                    versions={versions}
                    loading={versionsLoading}
                    error={versionsError}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      <AppDialog open={newCvOpen} onOpenChange={setNewCvOpen} title="New CV">
        <ModeChooser creating={creatingDraft} onChoose={(mode) => onCreateDraft?.(mode)} />
      </AppDialog>
    </div>
  )
}
