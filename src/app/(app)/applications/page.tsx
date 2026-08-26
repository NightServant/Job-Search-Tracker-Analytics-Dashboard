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
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon } from '@/components/icons'
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
 * Default currency is `resolveDefaultCurrency(null)` -- PHP -- because nothing
 * reads the stored `user_preferences` row yet. Task 9 builds that read, and
 * this call is the single place it replaces.
 */
export default function Page() {
  const { data: jobs = [], isLoading, error } = useJobs()
  const createJob = useCreateJob()
  const createJobsBulk = useCreateJobsBulk()
  const updateJob = useUpdateJob()
  const deleteJob = useDeleteJob()
  const updateStatus = useUpdateJobStatus()
  const autofill = useAutofillJobFromUrl()
  const { success, error: showError } = useToast()

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={24} />
      </div>
    )
  }

  // An empty board and a failed fetch look identical, so the failure has to
  // say so rather than falling through to the "no applications yet" state.
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <AlertCircleIcon size={32} className="text-status-rejected-mark" />
        <p className="text-body-m text-text-primary">Could not load your applications.</p>
        <p className="text-body-s text-text-muted">
          {error instanceof Error ? error.message : 'An error occurred while loading them.'}
        </p>
        <Button variant="secondary" size="s" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
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
      defaultCurrency={resolveDefaultCurrency(null)}
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
