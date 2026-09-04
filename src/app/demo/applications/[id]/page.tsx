'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { ApplicationRecordScreen } from '@/components/applications/record/ApplicationRecordScreen'
import { RouteLoading, RouteError } from '@/components/ui/route-states'
import { buttonVariants } from '@/components/ui/button-variants'
import { DEMO } from '@/lib/demoFixture'
import { demoReadOnly } from '../../readOnly'

/**
 * THE ROUTE THIS DEMO NEVER HAD.
 *
 * `ApplicationsTable` has always linked its company cell at
 * `/demo/applications/<id>`, and nothing has ever served that path -- so every
 * row in the demo led to a 404. It went unnoticed because it was equally
 * broken at both widths and nobody clicked it.
 *
 * It became load-bearing when the desktop detail screen was replaced by a
 * dialog: on a wide viewport the click no longer navigates at all, but on a
 * phone this route IS the record, so leaving it missing would have made the
 * demo's main interaction dead on exactly the surface the redesign was for.
 *
 * The fixture has jobs and events but no activity log and no document links --
 * those tables have no demo data behind them -- so the record shows three
 * genuinely empty panels rather than pretending otherwise. `ApplicationRecord`
 * distinguishes empty from failed, and this is honestly empty.
 */
export default function Page() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()
  const isMobile = useIsMobile()

  const [mode, setMode] = React.useState<'view' | 'edit'>('view')
  // `null` until the client has actually measured, which is what keeps a
  // phone from being redirected on the server's guess.
  //
  // DERIVED, NOT STATE. This was `useState` fed by an effect keyed on
  // `isMobile`, and it sent every phone to the desktop surface. `useIsMobile`
  // reports false until its own effect runs, so on the commit where that
  // effect fired, a second effect reading `isMobile` still saw the stale
  // false and wrote `wide = true` -- and the redirect effect, firing in the
  // same flush, acted on it before the correction could land.
  //
  // Computing it inline removes the lagging copy. `setMounted` here and
  // `setIsMobile` inside the hook are both passive effects of the same
  // commit, so React batches them into ONE re-render in which both are
  // already right.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const wide = mounted ? !isMobile : null

  React.useEffect(() => {
    if (wide && id) router.replace(`/demo/applications?application=${encodeURIComponent(id)}`)
  }, [wide, id, router])

  const job = DEMO.jobs.find((candidate) => candidate.id === id) ?? null

  if (wide === null || wide) return <RouteLoading />

  if (!job) {
    return (
      <RouteError
        title="could not find that application."
        message="It may have been deleted, or the link may be wrong."
        action={
          <Link
            href="/demo/applications"
            className={buttonVariants({ variant: 'secondary', size: 's' })}
          >
            back to applications
          </Link>
        }
      />
    )
  }

  const nextEvent =
    DEMO.events
      .filter((event) => event.job_id === job.id)
      .find((event) => new Date(event.starts_at).getTime() >= Date.now()) ?? null

  return (
    <ApplicationRecordScreen
      job={job}
      data={{ activity: [], links: [], nextEvent, match: null }}
      mode={mode}
      onModeChange={setMode}
      backHref="/demo/applications"
      defaultCurrency="PHP"
      // The same read-only contract every other write control in /demo uses:
      // it explains itself rather than doing nothing, because a button that
      // silently no-ops is indistinguishable from a broken one.
      onSubmit={() => {
        demoReadOnly()
      }}
      onDelete={demoReadOnly}
    />
  )
}
