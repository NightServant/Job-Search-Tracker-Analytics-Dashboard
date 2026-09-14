'use client'

import * as React from 'react'
import { useResumes, useResumeVersions, useDeleteResume } from '@/hooks/useResumes'
import { DocumentsNotice, useDocumentsNotice } from '@/components/documents/DocumentsNotice'
import { RouteSkeleton } from '@/components/ui/loading-skeletons'
import { RouteError } from '@/components/ui/route-states'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DocumentsPage } from '@/components/documents/DocumentsPage'
import { useCreateDocument } from '@/components/documents/useCreateDocument'
import { importDocument, UnsupportedDocumentError } from '@/lib/documentImport'
import type { ResumeSummary } from '@/services/resumeService'

/**
 * Thin route wrapper, the same split as `applications/page.tsx`: the screen
 * takes plain props so it renders without Next routing or react-query, and
 * this file owns the reads and the writes.
 *
 * Two reads, not one. The CV list is the page; a CV's snapshots are fetched
 * only once a row has been expanded, because loading every CV's version
 * history to render a list of CVs would be one query per row for something
 * almost nobody opens. `useResumeVersions` stays disabled until
 * `openVersionsFor` names a CV, so its `isLoading` is `false` for a query that
 * was never asked to run rather than reading as a permanent pending state.
 *
 * A failed versions read is not blanked into "no versions saved yet" -- that
 * would tell someone their history is empty when it is merely unreachable --
 * so it is passed down as its own state, the same distinction the application
 * detail panels make.
 *
 * THE THREE CREATE PATHS ARE ONE FUNCTION NOW. This file, the Templates route
 * and `/cv` each kept their own copy of "mutate, toast, navigate" -- same
 * default content, same title strings, same toast copy -- and the comment that
 * used to stand here defended that on the grounds that it was only a dozen
 * lines and that an earlier plan forbade touching `src/hooks/`. Both halves
 * expired: creating a document now has to choose a starter by KIND and run the
 * template through `personalizeTemplate` first, and a route that misses that
 * ships literal `{{name|Your Name}}` to a person. `useCreateDocument` lives in
 * `components/documents/` rather than `src/hooks/`, so the constraint is still
 * respected; see its docblock for the rest of the argument.
 */
export default function Page() {
  const { data: docs = [], isLoading, error } = useResumes()
  const [openVersionsFor, setOpenVersionsFor] = React.useState<string | null>(null)
  const versionsQuery = useResumeVersions(openVersionsFor)
  const deleteResume = useDeleteResume()
  // Sonner on desktop, a persistent bottom banner below `lg` -- see
  // DocumentsNotice for why a toast is the wrong shape on this screen.
  const { notify, notice, dismiss } = useDocumentsNotice()
  const { creating, createBlank, createFromTemplate, createImported } = useCreateDocument({ notify })
  const [pendingDelete, setPendingDelete] = React.useState<ResumeSummary | null>(null)

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const doc = pendingDelete
    try {
      await deleteResume.mutateAsync(doc.id)
      if (openVersionsFor === doc.id) setOpenVersionsFor(null)
      notify('success', 'CV deleted', 'The draft was removed.')
    } catch (err) {
      notify('error', 'Delete failed', err instanceof Error ? err.message : 'Could not delete the CV')
    } finally {
      setPendingDelete(null)
    }
  }

  /**
   * The import failure is shown, never swallowed. `.docx` is deliberately
   * unreadable for now (see `lib/documentImport`), and a reader who picked one
   * needs to be told why nothing happened rather than left watching a screen
   * that did not change.
   */
  const importFile = async (file: File) => {
    try {
      const draft = await importDocument(file)
      await createImported(draft.title, draft.content)
    } catch (err) {
      notify(
        'error',
        err instanceof UnsupportedDocumentError ? 'Cannot import that file' : 'Import failed',
        err instanceof Error ? err.message : 'Could not read the document'
      )
    }
  }

  if (isLoading) {
    return <RouteSkeleton variant="documents" />
  }

  // An empty list and a failed fetch look identical, so the failure has to say
  // so rather than falling through to the "no CVs yet" state.
  if (error) {
    return (
      <RouteError
        title="could not load your CVs."
        message={error instanceof Error ? error.message : 'An error occurred while loading them.'}
      />
    )
  }

  return (
    <>
      <DocumentsPage
        docs={docs}
        onDelete={(doc) => setPendingDelete(doc)}
        onToggleVersions={(doc) =>
          setOpenVersionsFor((current) => (current === doc.id ? null : doc.id))
        }
        openVersionsFor={openVersionsFor}
        versions={(versionsQuery.data ?? []).map((snapshot) => ({
          id: snapshot.id,
          version: snapshot.version ?? null,
          created_at: snapshot.created_at,
        }))}
        versionsLoading={versionsQuery.isLoading}
        versionsError={!!versionsQuery.error}
        onCreateDraft={(mode) => void createBlank(mode)}
        onChooseTemplate={(choice) => void createFromTemplate(choice)}
        onImport={(file) => void importFile(file)}
        creatingDraft={creating}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={pendingDelete ? `Delete ${pendingDelete.title}?` : ''}
        body="This cannot be undone."
        confirmLabel="delete"
        destructive
        onConfirm={confirmDelete}
      />
      <DocumentsNotice notice={notice} onDismiss={dismiss} />
    </>
  )
}
