'use client'

import * as React from 'react'
import { useResumes, useResumeVersions, useDeleteResume } from '@/hooks/useResumes'
import { useToast } from '@/contexts/ToastContext'
import { RouteError, RouteLoading } from '@/components/ui/route-states'
import { DocumentsPage } from '@/components/documents/DocumentsPage'
import type { ResumeSummary } from '@/services/resumeService'

/**
 * Thin route wrapper, the same split as `applications/page.tsx`: the screen
 * takes plain props so it renders without Next routing or react-query, and
 * this file owns the reads and the one write.
 *
 * Two reads, not one. The CV list is the page; a CV's snapshots are fetched
 * only once a row has been expanded, because loading every CV's version
 * history to render a list of CVs would be one query per row for something
 * almost nobody opens. `useResumeVersions` stays disabled until
 * `openVersionsFor` names a CV, so its `isLoading` is `false` for a query that
 * was never asked to run rather than reading as a permanent pending state.
 *
 * A failed versions read is not blanked into "no versions saved yet" -- that
 * would tell someone their history is empty when it is merely unreachable --
 * so it is passed down as its own state, the same distinction the application
 * detail panels make.
 */
export default function Page() {
  const { data: docs = [], isLoading, error } = useResumes()
  const [openVersionsFor, setOpenVersionsFor] = React.useState<string | null>(null)
  const versionsQuery = useResumeVersions(openVersionsFor)
  const deleteResume = useDeleteResume()
  const { success, error: showError } = useToast()

  const handleDelete = async (doc: ResumeSummary) => {
    if (!window.confirm(`Delete ${doc.title}? This cannot be undone.`)) return
    try {
      await deleteResume.mutateAsync(doc.id)
      if (openVersionsFor === doc.id) setOpenVersionsFor(null)
      success('CV deleted', 'The draft was removed.')
    } catch (err) {
      showError('Delete failed', err instanceof Error ? err.message : 'Could not delete the CV')
    }
  }

  if (isLoading) {
    return <RouteLoading />
  }

  // An empty list and a failed fetch look identical, so the failure has to say
  // so rather than falling through to the "no CVs yet" state.
  if (error) {
    return (
      <RouteError
        title="Could not load your CVs."
        message={error instanceof Error ? error.message : 'An error occurred while loading them.'}
      />
    )
  }

  return (
    <DocumentsPage
      docs={docs}
      onDelete={(doc) => void handleDelete(doc)}
      onToggleVersions={(doc) =>
        setOpenVersionsFor((current) => (current === doc.id ? null : doc.id))
      }
      openVersionsFor={openVersionsFor}
      versions={(versionsQuery.data ?? []).map((snapshot) => ({
        id: snapshot.id,
        version: snapshot.version ?? null,
        created_at: snapshot.created_at,
      }))}
      versionsLoading={versionsQuery.isLoading}
      versionsError={!!versionsQuery.error}
    />
  )
}
