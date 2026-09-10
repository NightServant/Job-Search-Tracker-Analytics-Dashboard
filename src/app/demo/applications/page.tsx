'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ApplicationsPage } from '@/components/applications/ApplicationsPage'
import { EMPTY_RECORD_DATA, type ApplicationRecordData } from '@/components/applications/record/recordData'
import { DEMO } from '@/lib/demoFixture'
import type { Job } from '@/types'
import { demoReadOnly, demoReadOnlyAsync } from '../readOnly'
import { RouteSkeleton } from '@/components/ui/loading-skeletons'

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
  const params = useSearchParams()
  const openParam = params.get('application')
  const addParam = params.get('add')

  // WHICH ROW IS OPEN, so the record can be given the events belonging to it.
  //
  // The demo passed no `record` at all until 2026-09-10, so every dialog it
  // opened fell back to `EMPTY_RECORD_DATA` -- no next event, and, once the
  // interview date field landed, an interviewing application whose interview
  // field was blank. The fixture HAS the events; nothing was handing them over.
  const [openJob, setOpenJob] = React.useState<Job | null>(null)

  const record: ApplicationRecordData = React.useMemo(() => {
    if (!openJob) return EMPTY_RECORD_DATA
    const forJob = DEMO.events
      .filter((event) => event.job_id === openJob.id)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    return {
      ...EMPTY_RECORD_DATA,
      nextEvent: forJob.find((event) => new Date(event.starts_at).getTime() >= Date.now()) ?? null,
      // The same rule `useApplicationRecord` applies: the earliest interview on
      // the job is the one the record's date field edits.
      interview: forJob.find((event) => event.kind === 'interview') ?? null,
    }
  }, [openJob])

  return (
    <ApplicationsPage
      jobs={DEMO.jobs}
      defaultCurrency="PHP"
      onCreate={demoReadOnlyAsync}
      onUpdate={demoReadOnlyAsync}
      onImport={demoReadOnlyAsync}
      onDelete={demoReadOnly}
      onCsvError={demoReadOnly}
      record={record}
      onOpenJobChange={setOpenJob}
      initialOpenId={openParam}
      // `?add=<url>` is how the calendar's job feed hands a posting over. The
      // demo answers it too: the wizard opens with the link in it, and its save
      // is the read-only notice like every other write here.
      initialAddUrl={addParam}
    />
  )
}

/** `useSearchParams` needs a Suspense boundary or Next 15 fails the build. */
export default function Page() {
  return (
    <Suspense fallback={<RouteSkeleton variant="table" />}>
      <DemoApplications />
    </Suspense>
  )
}
