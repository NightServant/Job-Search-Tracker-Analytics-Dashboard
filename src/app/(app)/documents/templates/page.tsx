'use client'

import { useRouter } from 'next/navigation'
import { useCreateResume } from '@/hooks/useResumes'
import { DocumentsNotice, useDocumentsNotice } from '@/components/documents/DocumentsNotice'
import { TemplatesScreen } from '@/components/documents/TemplatesScreen'
import { DEFAULT_WORD_CONTENT } from '@/components/cv/content'
import type { TemplateChoice } from '@/components/documents/TemplateGallery'
import type { ResumeContent } from '@/services/resumeService'

/**
 * Thin route wrapper, the same split every screen here uses: the component
 * takes plain props, this file owns the write and the navigation.
 *
 * WORD ONLY, and that is not a default this file gets to change -- the LaTeX
 * editor does not exist below `lg`, which is where this screen is reached
 * from, so a LaTeX draft created here could not be opened.
 *
 * The create-then-navigate pair matches `documents/page.tsx` exactly: same
 * mutation, same title strings, same toast. It is duplicated rather than
 * shared for the reason that file already records -- both routes owned a
 * `useCreateResume()` call before this one existed.
 */
export default function Page() {
  const router = useRouter()
  const createResume = useCreateResume()
  const { notify, notice, dismiss } = useDocumentsNotice()

  const createDraft = async (title: string, content: ResumeContent) => {
    try {
      const created = await createResume.mutateAsync({ mode: 'word', title, content })
      notify('info', 'Draft created', 'Word CV ready.')
      router.push(`/cv?draft=${created.id}`)
    } catch (err) {
      notify('error', 'Create failed', err instanceof Error ? err.message : 'Could not create the CV')
    }
  }

  return (
    <>
    <TemplatesScreen
      busy={createResume.isPending}
      onChooseBlank={() => void createDraft('Untitled CV', DEFAULT_WORD_CONTENT)}
      onChoose={({ template }: TemplateChoice) =>
        void createDraft(`${template.name} CV`, template.content as ResumeContent)
      }
    />
    <DocumentsNotice notice={notice} onDismiss={dismiss} />
    </>
  )
}
