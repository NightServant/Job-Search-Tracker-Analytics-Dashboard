'use client'

import { DocumentsNotice, useDocumentsNotice } from '@/components/documents/DocumentsNotice'
import { TemplatesScreen } from '@/components/documents/TemplatesScreen'
import { useCreateDocument } from '@/components/documents/useCreateDocument'

/**
 * Thin route wrapper, the same split every screen here uses: the component
 * takes plain props, this file owns the write and the navigation.
 *
 * BOTH KINDS, and the old note saying otherwise is gone with the thing it was
 * about. It said "Word only, and that is not a default this file gets to
 * change", because the LaTeX editor did not exist below `lg` -- which is where
 * this screen is reached from -- so a LaTeX draft created here could not be
 * opened. Cover letters are the same row and the same editor as a CV, so there
 * is nothing this device cannot open.
 *
 * IT NO LONGER DUPLICATES `documents/page.tsx`'s create. It used to, on the
 * stated grounds that both routes owned a `useCreateResume()` call before
 * either comment existed; `useCreateDocument` is now the single writer, and
 * its docblock says why the duplication stopped being affordable.
 */
export default function Page() {
  const { notify, notice, dismiss } = useDocumentsNotice()
  const { creating, createBlank, createFromTemplate } = useCreateDocument({ notify })

  return (
    <>
      <TemplatesScreen
        busy={creating}
        onChooseBlank={(mode) => void createBlank(mode)}
        onChoose={(choice) => void createFromTemplate(choice)}
      />
      <DocumentsNotice notice={notice} onDismiss={dismiss} />
    </>
  )
}
