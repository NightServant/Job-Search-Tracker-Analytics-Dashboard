'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useJob, useUpdateJob, useDeleteJob, useAutofillJobFromUrl } from '@/hooks/useJobs'
import { useApplicationRecord } from '@/hooks/useApplicationRecord'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { useIsMobile } from '@/hooks/use-mobile'
import { useToast } from '@/contexts/ToastContext'
import { resolveDefaultCurrency } from '@/services/userPreferences'
import { ApplicationRecordScreen } from '@/components/applications/record/ApplicationRecordScreen'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { RouteLoading, RouteError } from '@/components/ui/route-states'
import { buttonVariants } from '@/components/ui/button-variants'
import type { Job, JobFormData } from '@/types'

function message(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw.toLowerCase().includes('permission denied')
    ? 'Permission denied. Check the row-level security policies on jobs.'
    : raw || fallback
}

/**
 * THE MOBILE SURFACE for one application, and only the mobile surface.
 *
 * On desktop this route no longer renders a record at all -- it redirects to
 * the list with `?application=<id>`, which opens the same record in the
 * dialog there. The separate desktop detail screen is gone; every link that
 * used to point at one (the dashboard's recent table, the follow-up nudge,
 * the applications table's company cell) now lands in the dialog instead of a
 * second full page, without any of them having to know that.
 *
 * `router.replace`, not `push`: the redirect must not become a history entry,
 * or Back from the list would bounce straight through this route and
 * forward again.
 *
 * The width test runs in an effect rather than during render because
 * `useIsMobile` cannot know the viewport on the server and reports false
 * until it has mounted. Redirecting on that first value would send every
 * phone to the desktop surface for one frame; waiting for the effect costs a
 * spinner and gets it right.
 *
 * IT WRITES, unlike the read-only screen it replaces. Editing used to send
 * you back to `/applications` to find the row again -- three navigations to
 * fix a typo. The same `ApplicationForm`, the same `jobValidation` and the
 * same `useUpdateJob` mutation the list screen uses are wired up here, so the
 * two surfaces save through one path.
 */
export default function Page() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()
  const isMobile = useIsMobile()
  const { success, error: showError } = useToast()

  const jobQuery = useJob(id)
  const job = jobQuery.data
  const record = useApplicationRecord(id, job?.description)
  const { data: prefs = null } = useUserPreferences()

  const updateJob = useUpdateJob()
  const deleteJob = useDeleteJob()
  const autofill = useAutofillJobFromUrl()

  const [mode, setMode] = React.useState<'view' | 'edit'>('view')
  const [pendingDelete, setPendingDelete] = React.useState<Job | null>(null)

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
    if (wide && id) router.replace(`/applications?application=${encodeURIComponent(id)}`)
  }, [wide, id, router])

  if (wide === null || wide || jobQuery.isLoading) {
    return <RouteLoading />
  }

  // "Not found" covers a bad id and someone else's job identically -- RLS
  // already made those indistinguishable at the query, so the UI does not
  // pretend to know which one happened. A reload of the same URL cannot fix
  // either case, so this is the one call site that overrides RouteError's
  // default retry action with a link back to the list instead.
  if (jobQuery.error || !job) {
    return (
      <RouteError
        title="could not find that application."
        message="It may have been deleted, or the link may be wrong."
        action={
          <Link href="/applications" className={buttonVariants({ variant: 'secondary', size: 's' })}>
            back to applications
          </Link>
        }
      />
    )
  }

  const handleSubmit = async (data: JobFormData) => {
    try {
      await updateJob.mutateAsync({ id: job.id, data })
      success('Application updated')
      // Back to reading it, not out of the screen: the saved values are
      // exactly what the person who just typed them wants to check.
      setMode('view')
    } catch (err) {
      showError('Could not update the application', message(err, 'Unknown error'))
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteJob.mutateAsync(pendingDelete.id)
      success('Application deleted')
      // The record it was showing no longer exists, so the screen cannot
      // stay. `replace`, so Back does not return to a deleted row.
      router.replace('/applications')
    } catch (err) {
      showError('Could not delete the application', message(err, 'Unknown error'))
      setPendingDelete(null)
    }
  }

  return (
    <>
      <ApplicationRecordScreen
        job={job}
        data={record}
        mode={mode}
        onModeChange={setMode}
        backHref="/applications"
        defaultCurrency={resolveDefaultCurrency(prefs)}
        saving={updateJob.isPending}
        onSubmit={handleSubmit}
        onDelete={setPendingDelete}
        onAutofill={(url) => autofill.mutateAsync(url)}
        autofilling={autofill.isPending}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={pendingDelete ? `Delete ${pendingDelete.role} at ${pendingDelete.company}?` : ''}
        body="This cannot be undone."
        confirmLabel="delete"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  )
}
