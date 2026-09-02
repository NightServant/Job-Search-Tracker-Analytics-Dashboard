'use client'

import { ApplicationsPage } from '@/components/applications/ApplicationsPage'
import { DEMO } from '@/lib/demoFixture'
import { demoReadOnly, demoReadOnlyAsync } from '../readOnly'

/**
 * `onAutofill` is deliberately NOT passed. It calls an edge function, and the
 * demo has no backend to call -- omitting it is the honest answer where the
 * other handlers get a toast, because this is the one affordance that does
 * disappear when its handler is absent.
 */
export default function Page() {
  return (
    <ApplicationsPage
      jobs={DEMO.jobs}
      defaultCurrency="PHP"
      onCreate={demoReadOnlyAsync}
      onUpdate={demoReadOnlyAsync}
      onImport={demoReadOnlyAsync}
      onDelete={demoReadOnly}
      onCsvError={demoReadOnly}
    />
  )
}
