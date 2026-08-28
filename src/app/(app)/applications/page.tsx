'use client'

import {
  useJobs,
  useCreateJob,
  useCreateJobsBulk,
  useUpdateJob,
  useDeleteJob,
  useUpdateJobStatus,
  useAutofillJobFromUrl,
} from '@/hooks/useJobs'
import { useToast } from '@/contexts/ToastContext'
import { ApplicationsPage } from '@/components/applications/ApplicationsPage'
import { RouteLoading, RouteError } from '@/components/ui/route-states'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { resolveDefaultCurrency } from '@/services/userPreferences'
import type { Job, JobFormData, JobStatus } from '@/types'

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
export default function Page() {
  const { data: jobs = [], isLoading, error } = useJobs()
  const { data: prefs = null } = useUserPreferences()
  const createJob = useCreateJob()
  const createJobsBulk = useCreateJobsBulk()
  const updateJob = useUpdateJob()
  const deleteJob = useDeleteJob()
  const updateStatus = useUpdateJobStatus()
  const autofill = useAutofillJobFromUrl()
  const { success, error: showError } = useToast()

  if (isLoading) {
    return <RouteLoading />
  }

  // An empty board and a failed fetch look identical, so the failure has to
  // say so rather than falling through to the "no applications yet" state.
  if (error) {
    return (
      <RouteError
        title="Could not load your applications."
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

  const handleDelete = async (job: Job) => {
    if (!window.confirm(`Delete ${job.role} at ${job.company}?`)) return
    try {
      await deleteJob.mutateAsync(job.id)
      success('Application deleted')
    } catch (err) {
      showError('Could not delete the application', message(err, 'Unknown error'))
    }
  }

  const handleStatusChange = async (job: Job, status: JobStatus) => {
    try {
      await updateStatus.mutateAsync({ id: job.id, status })
    } catch (err) {
      showError('Could not move the application', message(err, 'Unknown error'))
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
    <ApplicationsPage
      jobs={jobs}
      defaultCurrency={resolveDefaultCurrency(prefs)}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onStatusChange={handleStatusChange}
      onImport={handleImport}
      onAutofill={(url) => autofill.mutateAsync(url)}
      onCsvError={(msg) => showError('CSV import failed', msg)}
      saving={createJob.isPending || updateJob.isPending}
      importing={createJobsBulk.isPending}
      autofilling={autofill.isPending}
    />
  )
}
