'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ApplicationsPage } from '@/components/applications/ApplicationsPage'
import { RouteLoading } from '@/components/ui/route-states'
import { DEMO } from '@/lib/demoFixture'
import { demoReadOnly, demoReadOnlyAsync } from '../readOnly'

/**
 * `onAutofill` is deliberately NOT passed. It calls an edge function, and the
 * demo has no backend to call -- omitting it is the honest answer where the
 * other handlers get a toast, because this is the one affordance that does
 * disappear when its handler is absent.
 */
function DemoApplications() {
  // `?application=<id>` is how a wide viewport landing on
  // /demo/applications/<id> gets here with its intent intact -- the same
  // redirect the real app does, so the demo behaves like the product rather
  // than like a smaller version of it.
  const openParam = useSearchParams().get('application')

  return (
    <ApplicationsPage
      jobs={DEMO.jobs}
      defaultCurrency="PHP"
      onCreate={demoReadOnlyAsync}
      onUpdate={demoReadOnlyAsync}
      onImport={demoReadOnlyAsync}
      onDelete={demoReadOnly}
      onCsvError={demoReadOnly}
      initialOpenId={openParam}
    />
  )
}

/** `useSearchParams` needs a Suspense boundary or Next 15 fails the build. */
export default function Page() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <DemoApplications />
    </Suspense>
  )
}
