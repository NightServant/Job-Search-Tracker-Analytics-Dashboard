'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useResumes, useResumeVersions, useDeleteResume, useCreateResume } from '@/hooks/useResumes'
import { useToast } from '@/contexts/ToastContext'
import { RouteError, RouteLoading } from '@/components/ui/route-states'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DocumentsPage } from '@/components/documents/DocumentsPage'
import { DEFAULT_LATEX_SOURCE, DEFAULT_WORD_CONTENT } from '@/components/cv/content'
import { importDocument, UnsupportedDocumentError } from '@/lib/documentImport'
import type { TemplateChoice } from '@/components/documents/TemplateGallery'
import type { ResumeContent, ResumeMode, ResumeSummary } from '@/services/resumeService'

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
 * `onCreateDraft` mirrors `cv/page.tsx`'s own `createDraft` -- same default
 * content, same title strings, same toast copy -- because Task 4 (M5.5) put
 * the New CV dialog's trigger back on this screen instead of behind a
 * navigation to `/cv?draft=new`. The two routes duplicate this dozen lines
 * rather than share a hook for it: this plan's Global Constraints rule out
 * touching `src/hooks/` or `src/services/`, and both routes already had their
 * own `useCreateResume()` call before this task.
 */
export default function Page() {
  const router = useRouter()
  const { data: docs = [], isLoading, error } = useResumes()
  const [openVersionsFor, setOpenVersionsFor] = React.useState<string | null>(null)
  const versionsQuery = useResumeVersions(openVersionsFor)
  const deleteResume = useDeleteResume()
  const createResume = useCreateResume()
  const { success, error: showError, info } = useToast()
  const [pendingDelete, setPendingDelete] = React.useState<ResumeSummary | null>(null)

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const doc = pendingDelete
    try {
      await deleteResume.mutateAsync(doc.id)
      if (openVersionsFor === doc.id) setOpenVersionsFor(null)
      success('CV deleted', 'The draft was removed.')
    } catch (err) {
      showError('Delete failed', err instanceof Error ? err.message : 'Could not delete the CV')
    } finally {
      setPendingDelete(null)
    }
  }

  /**
   * One writer for every way a CV starts -- blank, from a template, or from an
   * imported file. Three call sites creating resumes three slightly different
   * ways is how the title strings and the toast copy drift apart.
   */
  const createDraft = async (mode: ResumeMode, title: string, content: ResumeContent) => {
    try {
      const created = await createResume.mutateAsync({ mode, title, content })
      info('Draft created', `${mode === 'latex' ? 'LaTeX' : 'Word'} CV ready.`)
      router.push(`/cv?draft=${created.id}`)
    } catch (err) {
      showError('Create failed', err instanceof Error ? err.message : 'Could not create the CV')
    }
  }

  const createBlank = (mode: ResumeMode) =>
    createDraft(
      mode,
      mode === 'latex' ? 'Untitled LaTeX CV' : 'Untitled CV',
      mode === 'latex' ? { type: 'latex', source: DEFAULT_LATEX_SOURCE } : DEFAULT_WORD_CONTENT
    )

  // Blank drafts do not come through here: the gallery carries templates only,
  // since `new CV` is already a primary button on that screen.
  const createFromTemplate = ({ mode, template }: TemplateChoice) =>
    createDraft(mode, `${template.name} CV`, template.content as ResumeContent)

  /**
   * The import failure is shown, never swallowed. `.docx` is deliberately
   * unreadable for now (see `lib/documentImport`), and a reader who picked one
   * needs to be told why nothing happened rather than left watching a screen
   * that did not change.
   */
  const importFile = async (file: File) => {
    try {
      const draft = await importDocument(file)
      await createDraft(draft.mode, draft.title, draft.content)
    } catch (err) {
      showError(
        err instanceof UnsupportedDocumentError ? 'Cannot import that file' : 'Import failed',
        err instanceof Error ? err.message : 'Could not read the document'
      )
    }
  }

  if (isLoading) {
    return <RouteLoading />
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
        creatingDraft={createResume.isPending}
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
    </>
  )
}
