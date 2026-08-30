'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCreateResume, useDeleteResume, useResume, useUpdateResume } from '@/hooks/useResumes'
import { useToast } from '@/contexts/ToastContext'
import { RouteError, RouteLoading } from '@/components/ui/route-states'
import { buttonVariants } from '@/components/ui/button'
import { AppDialog } from '@/components/ui/app-dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ModeChooser } from '@/components/cv/ModeChooser'
import { WordResumeEditor } from '@/components/cv/WordResumeEditor'
import { LatexResumeEditor } from '@/components/cv/LatexResumeEditor'
import { DEFAULT_LATEX_SOURCE, DEFAULT_WORD_CONTENT } from '@/components/cv/content'
import type { ResumeContent, ResumeMode } from '@/services/resumeService'

const DOCUMENTS = '/documents'

/**
 * The CV editor route.
 *
 * `src/screens/ResumePage.tsx` used to be three surfaces switched by a local
 * `activeDraftId`: a drafts hub, the Word editor and the LaTeX editor. M5
 * split it. The hub became `/documents`; the two editors moved to
 * `src/components/cv/` and are chosen here by a `?draft=` search param instead
 * of by component state.
 *
 * That param is the URL contract this route publishes:
 *
 *   /cv?draft=<resume-id>  opens that CV in the editor its stored mode names
 *   /cv?draft=new          asks which editor, creates the CV, then replaces
 *                          the URL with the real id
 *   /cv                    has no hub to show any more, so it redirects to
 *                          /documents
 *
 * Moving off local state is what makes a CV linkable at all -- `/documents`
 * links straight into a specific one, and so could an application's linked-CV
 * panel. It also means the browser's back button leaves an editor, which the
 * old in-place switch never allowed.
 *
 * The `?draft=new` round trip exists so `+ new cv` in the Documents header can
 * be a plain link while every write to `resumes` still happens on one route:
 * creating a CV needs a mode chosen first, and this is where the two editors
 * that mode picks between already live.
 */
function CvRoute() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftParam = searchParams.get('draft')
  const isNew = draftParam === 'new'

  const { success, error: showError, info } = useToast()
  const draftQuery = useResume(isNew ? null : draftParam)
  const createResume = useCreateResume()
  const updateResume = useUpdateResume()
  const deleteResume = useDeleteResume()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!draftParam) router.replace(DOCUMENTS)
  }, [draftParam, router])

  const createDraft = async (mode: ResumeMode) => {
    const content: ResumeContent =
      mode === 'latex' ? { type: 'latex', source: DEFAULT_LATEX_SOURCE } : DEFAULT_WORD_CONTENT
    try {
      const created = await createResume.mutateAsync({
        mode,
        title: mode === 'latex' ? 'Untitled LaTeX CV' : 'Untitled CV',
        content,
      })
      info('Draft created', `${mode === 'latex' ? 'LaTeX' : 'Word'} CV ready.`)
      router.replace(`/cv?draft=${created.id}`)
    } catch (err) {
      showError('Create failed', err instanceof Error ? err.message : 'Could not create the CV')
    }
  }

  const deleteDraft = (draftId: string) => setPendingDeleteId(draftId)

  const confirmDeleteDraft = async () => {
    if (!pendingDeleteId) return
    const draftId = pendingDeleteId
    try {
      await deleteResume.mutateAsync(draftId)
      success('CV deleted', 'The draft was removed.')
      router.replace(DOCUMENTS)
    } catch (err) {
      showError('Delete failed', err instanceof Error ? err.message : 'Could not delete the CV')
    } finally {
      setPendingDeleteId(null)
    }
  }

  const persistDraft = (
    draftId: string,
    title: string,
    mode: ResumeMode,
    content: ResumeContent
  ) => updateResume.mutateAsync({ id: draftId, patch: { title, mode, content } })

  if (!draftParam) return <RouteLoading />

  if (isNew) {
    // Nothing else on this route has anything behind it -- /cv?draft=new is
    // only ever reached as a deep link (a bookmark, a back button) once the
    // trigger itself moved onto DocumentsPage as a dialog opened without
    // navigating away. Closing this one has nowhere to return to but
    // Documents, so it replaces the URL instead of leaving /cv?draft=new
    // sitting in history with nothing open.
    return (
      <AppDialog
        open
        onOpenChange={(open) => {
          if (!open) router.replace(DOCUMENTS)
        }}
        title="new CV"
      >
        <ModeChooser creating={createResume.isPending} onChoose={(mode) => void createDraft(mode)} />
      </AppDialog>
    )
  }

  if (draftQuery.isLoading) return <RouteLoading />

  // A failed read and a CV that is not there are different facts, and the
  // second one cannot be fixed by reloading the same URL -- RLS makes a bad id
  // and someone else's CV indistinguishable, exactly as on the application
  // detail route -- so only the first keeps RouteError's default retry.
  if (draftQuery.error) {
    return (
      <RouteError
        title="could not open that CV."
        message={
          draftQuery.error instanceof Error
            ? draftQuery.error.message
            : 'An error occurred while loading it.'
        }
      />
    )
  }

  const draft = draftQuery.data
  if (!draft) {
    return (
      <RouteError
        title="could not find that CV."
        message="It may have been deleted, or the link may be wrong."
        action={
          <Link href={DOCUMENTS} className={buttonVariants({ variant: 'secondary', size: 's' })}>
            back to documents
          </Link>
        }
      />
    )
  }

  const Editor = draft.mode === 'latex' ? LatexResumeEditor : WordResumeEditor
  return (
    <>
      <Editor
        key={draft.id}
        draft={draft}
        backHref={DOCUMENTS}
        onDelete={(id) => deleteDraft(id)}
        onPersistDraft={persistDraft}
      />
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
        title="delete this CV?"
        body="This cannot be undone."
        confirmLabel="delete"
        destructive
        onConfirm={confirmDeleteDraft}
      />
    </>
  )
}

/**
 * `useSearchParams` opts a client page out of static prerendering, which Next
 * 15 fails the build over unless the read sits behind a Suspense boundary.
 */
export default function Page() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <CvRoute />
    </Suspense>
  )
}
