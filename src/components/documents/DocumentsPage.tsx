'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { AppDialog } from '@/components/ui/app-dialog'
import { IconButton } from '@/components/ui/icon-button'
import { PlusIcon, TrashIcon } from '@/components/icons'
import { ModeChooser } from '@/components/cv/ModeChooser'
import { EmptyState } from '@/components/ui/empty-state'
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
  const openDoc = docs.find((doc) => doc.id === openVersionsFor) ?? null
  const [newCvOpen, setNewCvOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="documents"
        description="the CVs you send out, and every version you have saved of them."
        action={
          <Button size="s" onClick={() => setNewCvOpen(true)}>
            <PlusIcon size={16} aria-hidden />
            new CV
          </Button>
        }
      />

      {docs.length === 0 ? (
        <EmptyState
          icon="Documents"
          action={
            <Button variant="secondary" size="s" onClick={() => setNewCvOpen(true)}>
              new CV
            </Button>
          }
        >
          no CVs yet. write one in the document editor or in LaTeX, then pin it to the applications
          you send it to.
        </EmptyState>
      ) : (
        <div>
          {docs.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              actions={
                <>
                  <Button
                    variant="secondary"
                    size="s"
                    onClick={() => onToggleVersions?.(doc)}
                  >
                    versions
                  </Button>
                  <IconButton
                    aria-label={`Delete ${doc.title}`}
                    onClick={() => onDelete?.(doc)}
                  >
                    <TrashIcon size={16} aria-hidden className="[&_svg]:size-4" />
                  </IconButton>
                </>
              }
            />
          ))}
        </div>
      )}

      <AppDialog
        open={openDoc !== null}
        onOpenChange={(next) => {
          if (!next && openDoc) onToggleVersions?.(openDoc)
        }}
        title={openDoc ? `versions of ${openDoc.title}` : 'versions'}
      >
        {openDoc && (
          <VersionHistory
            editHref={`/cv?draft=${openDoc.id}`}
            versions={versions}
            loading={versionsLoading}
            error={versionsError}
          />
        )}
      </AppDialog>

      <AppDialog open={newCvOpen} onOpenChange={setNewCvOpen} title="new CV">
        <ModeChooser creating={creatingDraft} onChoose={(mode) => onCreateDraft?.(mode)} />
      </AppDialog>
    </div>
  )
}
