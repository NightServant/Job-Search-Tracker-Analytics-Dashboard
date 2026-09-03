'use client'

import { DocumentsPage } from '@/components/documents/DocumentsPage'
import { DEMO } from '@/lib/demoFixture'
import { demoReadOnly } from '../readOnly'

/**
 * `onToggleVersions` is omitted rather than toasted: version history is a READ,
 * and the fixture carries no snapshot rows to show. A toast on a read would be
 * lying about why nothing happened.
 */
export default function Page() {
  return (
    <DocumentsPage
      docs={DEMO.resumes}
      onDelete={demoReadOnly}
      onCreateDraft={demoReadOnly}
      onChooseTemplate={demoReadOnly}
      onImport={demoReadOnly}
    />
  )
}
