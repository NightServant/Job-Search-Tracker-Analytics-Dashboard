'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { AppDialog } from '@/components/ui/app-dialog'
import { IconButton } from '@/components/ui/icon-button'
import { PlusIcon, TrashIcon, UploadIcon } from '@/components/icons'
import { EmptyState } from '@/components/ui/empty-state'
import { ModeChooser } from '@/components/cv/ModeChooser'
import { DocumentRow, DOCUMENT_GRID } from './DocumentRow'
import { TemplateGallery, type TemplateChoice } from './TemplateGallery'
import { VersionHistory, type VersionEntry } from './VersionHistory'
import { IMPORT_ACCEPT } from '@/lib/documentImport'
import type { ResumeSummary } from '@/services/resumeService'

/**
 * `/cv?draft=new` still works as a deep link -- `src/app/(app)/cv/page.tsx`
 * opens the same `ModeChooser` dialog directly when it lands there with
 * nothing else to sit behind it.
 */
export const NEW_CV_HREF = '/cv?draft=new'

/**
 * The Documents screen, laid out the way Microsoft Word lays out its start
 * screen, at Gabe's instruction: a row of template cards across the top, then
 * the list of documents you already have beneath it.
 *
 * That ordering is the whole idea and it is worth stating why it is right
 * here rather than only in Word. This screen has two jobs -- start something,
 * or reopen something -- and the old layout served only the second, with
 * starting hidden behind one button in the corner. Putting the templates on
 * the page makes the first job visible without a click and gives the empty
 * state something to actually be empty OF.
 *
 * **Where `new CV` lives is conditional, deliberately.** With documents on the
 * page it sits in the header, where a page-level action belongs. With none, it
 * does NOT: the empty state already owns the screen and already carries the
 * call to action, and a second identical button in the corner is the same
 * offer made twice, three inches apart. Gabe asked for exactly this.
 *
 * `import` sits beside `new CV` wherever `new CV` is -- header when there are
 * documents, empty state when there are not -- because they are the two ways
 * to get a document into this list and separating them would imply a
 * hierarchy that does not exist.
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
  /** Fires when a template card is picked. A null template means a blank document. */
  onChooseTemplate?: (choice: TemplateChoice) => void
  /** Fires with the picked file; the caller parses it and owns the write. */
  onImport?: (file: File) => void
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
  onChooseTemplate,
  onImport,
  creatingDraft = false,
}: DocumentsPageProps) {
  const openDoc = docs.find((doc) => doc.id === openVersionsFor) ?? null
  const [newCvOpen, setNewCvOpen] = React.useState(false)
  const fileInput = React.useRef<HTMLInputElement>(null)
  const hasDocs = docs.length > 0

  const importButton = (
    <Button variant="secondary" size="s" onClick={() => fileInput.current?.click()}>
      <UploadIcon size={16} aria-hidden />
      import
    </Button>
  )

  return (
    <div className="flex flex-col gap-8">
      {/*
        A hidden input rather than a drop zone or a dialog: the picker is the
        platform's own and already knows how to filter by extension, remember
        the last folder, and search. Rendered once at the top so both call
        sites -- header and empty state -- drive the same element.
      */}
      <input
        ref={fileInput}
        type="file"
        accept={IMPORT_ACCEPT}
        data-import-input
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Cleared unconditionally, so picking the same file twice in a row
          // fires change twice rather than once.
          event.target.value = ''
          if (file) onImport?.(file)
        }}
      />

      <PageHeader
        title="documents"
        description="the CVs you send out, and every version you have saved of them."
        action={
          hasDocs ? (
            <div className="flex items-center gap-2">
              {importButton}
              <Button size="s" onClick={() => setNewCvOpen(true)}>
                <PlusIcon size={16} aria-hidden />
                new CV
              </Button>
            </div>
          ) : undefined
        }
      />

      <TemplateGallery
        busy={creatingDraft}
        onChoose={(choice) => onChooseTemplate?.(choice)}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-heading-s text-text-primary">your documents</h2>

        {hasDocs ? (
          <div>
            {/* Column labels, Word's own recents header: the row already had
                four columns and nothing said what any of them were. */}
            <div
              data-document-columns
              className={cn('hidden border-b border-border-subtle pb-2 md:grid', DOCUMENT_GRID)}
            >
              <span className="text-label-caps uppercase text-text-muted">name</span>
              <span className="text-label-caps uppercase text-text-muted">ATS</span>
              <span className="text-label-caps uppercase text-text-muted">version</span>
              <span className="text-label-caps uppercase text-text-muted">modified</span>
              {/* The actions track, empty. Present so the label row declares
                  the same five tracks the data rows do. */}
              <span />
            </div>
            {docs.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                onOpenVersions={() => onToggleVersions?.(doc)}
                actions={
                  <IconButton aria-label={`Delete ${doc.title}`} onClick={() => onDelete?.(doc)}>
                    <TrashIcon size={16} aria-hidden className="[&_svg]:size-4" />
                  </IconButton>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="Documents"
            action={
              // Primary, at Gabe's instruction, and correct: with the header
              // action gone this is the only call to action on the screen, so
              // a secondary button here would leave the page with no primary
              // at all. `import` sits beside it as the other way in.
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="s" onClick={() => setNewCvOpen(true)}>
                  <PlusIcon size={16} aria-hidden />
                  new CV
                </Button>
                {importButton}
              </div>
            }
          >
            no CVs yet. start from a template above, write one from scratch, or import a document
            you already have.
          </EmptyState>
        )}
      </section>

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
