'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  useJobs,
  useCreateJob,
  useCreateJobsBulk,
  useUpdateJob,
  useDeleteJob,
  useAutofillJobFromUrl,
} from '@/hooks/useJobs'
import { useToast } from '@/contexts/ToastContext'
import { ApplicationsPage } from '@/components/applications/ApplicationsPage'
import { useApplicationRecord } from '@/hooks/useApplicationRecord'
import { RouteLoading, RouteError } from '@/components/ui/route-states'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { resolveDefaultCurrency } from '@/services/userPreferences'
import type { Job, JobFormData } from '@/types'

function message(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw.toLowerCase().includes('permission denied')
    ? 'Permission denied. Check the row-level security policies on jobs.'
    : raw || fallback
}

/**
 * Thin route wrapper. The screen itself is a pure component over props so it
 * can be tested without Next routing or a QueryClient; everything stateful
 * lives here.
 *
 * Every read and write goes through the `useJobs` hooks rather than
 * `jobService` directly, so all of them land on the same `['jobs', user?.id]`
 * cache entry the dashboard reads. Dragging a card between columns here has to
 * move the dashboard's KPI numbers too, and it does so by invalidating one key
 * rather than by anyone re-fetching.
 *
 * Default currency comes from `useUserPreferences`, the read half of the
 * seam Task 4 deliberately left open: `resolveDefaultCurrency` already knows
 * how to turn "no row yet" into PHP, so passing `prefsQuery.data ?? null`
 * straight through covers both the loading state and a genuine first-time
 * user without this route needing to gate the whole board on a preferences
 * fetch the way it already gates on the jobs fetch below.
 */
function ApplicationsRoute() {
  const { data: jobs = [], isLoading, error } = useJobs()
  const { data: prefs = null } = useUserPreferences()
  const createJob = useCreateJob()
  const createJobsBulk = useCreateJobsBulk()
  const updateJob = useUpdateJob()
  const deleteJob = useDeleteJob()
  const autofill = useAutofillJobFromUrl()
  const { success, error: showError } = useToast()
  const [pendingDelete, setPendingDelete] = React.useState<Job | null>(null)

  // WHICH RECORD IS OPEN, and its four secondary reads.
  //
  // The screen owns the selection and reports it here; this route owns the
  // reads, the same division every other screen in the app uses. Every query
  // behind `useApplicationRecord` is `enabled: !!jobId`, so nothing is
  // fetched at all while the dialog is shut.
  //
  // It is kept as the whole `Job` rather than an id because the ATS match
  // needs the row's `description`, and holding the row avoids a second lookup
  // through `jobs` on every render.
  const [openJob, setOpenJob] = React.useState<Job | null>(null)
  const record = useApplicationRecord(openJob?.id, openJob?.description)

  // A desktop visitor landing on `/applications/<id>` is redirected here with
  // the id in the query, because that route is the mobile surface now.
  const openParam = useSearchParams().get('application')

  if (isLoading) {
    return <RouteLoading />
  }

  // An empty board and a failed fetch look identical, so the failure has to
  // say so rather than falling through to the "no applications yet" state.
  if (error) {
    return (
      <RouteError
        title="could not load your applications."
        message={error instanceof Error ? error.message : 'An error occurred while loading them.'}
      />
    )
  }

  const handleCreate = async (data: JobFormData) => {
    try {
      await createJob.mutateAsync(data)
      success('Application added')
      return true
    } catch (err) {
      showError('Could not add the application', message(err, 'Unknown error'))
      return false
    }
  }

  const handleUpdate = async (id: string, data: JobFormData) => {
    try {
      await updateJob.mutateAsync({ id, data })
      success('Application updated')
      return true
    } catch (err) {
      showError('Could not update the application', message(err, 'Unknown error'))
      return false
    }
  }

  const handleDelete = (job: Job) => setPendingDelete(job)

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const job = pendingDelete
    try {
      await deleteJob.mutateAsync(job.id)
      success('Application deleted')
    } catch (err) {
      showError('Could not delete the application', message(err, 'Unknown error'))
    } finally {
      setPendingDelete(null)
    }
  }

  const handleImport = async (rows: JobFormData[]) => {
    try {
      await createJobsBulk.mutateAsync(rows)
      success('CSV imported', `${rows.length} added`)
      return true
    } catch (err) {
      showError('Import failed', message(err, 'Unknown error'))
      return false
    }
  }

  return (
    <>
      <ApplicationsPage
        jobs={jobs}
        defaultCurrency={resolveDefaultCurrency(prefs)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onImport={handleImport}
        onAutofill={(url) => autofill.mutateAsync(url)}
        onCsvError={(msg) => showError('CSV import failed', msg)}
        saving={createJob.isPending || updateJob.isPending}
        importing={createJobsBulk.isPending}
        autofilling={autofill.isPending}
        record={record}
        onOpenJobChange={setOpenJob}
        initialOpenId={openParam}
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

/**
 * `useSearchParams` opts a client page out of static prerendering, which Next
 * 15 fails the build over unless the read sits behind a Suspense boundary --
 * the same wrapper `/cv` needs for the same reason.
 */
export default function Page() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <ApplicationsRoute />
    </Suspense>
  )
}
