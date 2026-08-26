'use client'

import { useParams } from 'next/navigation'
import { useJob } from '@/hooks/useJobs'
import { useActivity } from '@/hooks/useActivity'
import { useDocumentLinks } from '@/hooks/useDocumentLinks'
import { useJobEvents } from '@/hooks/useJobEvents'
import { useCvText } from '@/hooks/useCvText'
import { matchKeywords } from '@/services/atsMatch'
import { DetailPage } from '@/components/applications/detail/DetailPage'
import { Spinner } from '@/components/ui/spinner'
import { buttonVariants } from '@/components/ui/button'
import { AlertCircleIcon } from '@/components/icons'
import Link from 'next/link'

/**
 * Thin route wrapper for one application, same split as `applications/page.tsx`:
 * `DetailPage` takes plain props so it renders without Next routing or
 * react-query, and this file owns the four reads the screen needs plus the
 * ATS match derived from two of them.
 *
 * `jobService.getJob` filters on `.eq('user_id', user.id)` before
 * `.maybeSingle()`, so a job that does not exist and a job that belongs to
 * someone else surface identically -- both throw "Not found" rather than
 * leaking whether the id is real. This route treats every error from
 * `useJob` the same way rather than trying to tell the two apart.
 *
 * The loading gate waits on all four reads, not just the job, so the
 * activity, linked-CV and event panels never flash their empty state before
 * flipping to real content a moment later -- the same "blank is not the same
 * as loading" reasoning the panels' own empty states exist for.
 */
export default function Page() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const jobQuery = useJob(id)
  const activityQuery = useActivity(id)
  const linksQuery = useDocumentLinks(id)
  const eventsQuery = useJobEvents(id)

  const job = jobQuery.data
  const activity = activityQuery.data ?? []
  const links = linksQuery.data ?? []
  const events = eventsQuery.data ?? []

  const latestLink =
    links.length > 0
      ? [...links].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]
      : null
  const { data: cvText } = useCvText(latestLink?.resume_id)

  const nextEvent = events.find((event) => new Date(event.starts_at).getTime() >= Date.now()) ?? null
  const match = job?.description && cvText ? matchKeywords(cvText, job.description) : null

  const loading =
    jobQuery.isLoading || activityQuery.isLoading || linksQuery.isLoading || eventsQuery.isLoading

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={24} />
      </div>
    )
  }

  // "Not found" covers a bad id and someone else's job identically -- RLS
  // already made those indistinguishable at the query, so the UI does not
  // pretend to know which one happened.
  if (jobQuery.error || !job) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <AlertCircleIcon size={32} className="text-status-rejected-mark" />
        <p className="text-body-m text-text-primary">Could not find that application.</p>
        <p className="text-body-s text-text-muted">
          It may have been deleted, or the link may be wrong.
        </p>
        <Link href="/applications" className={buttonVariants({ variant: 'secondary', size: 's' })}>
          Back to applications
        </Link>
      </div>
    )
  }

  return (
    <DetailPage job={job} activity={activity} links={links} nextEvent={nextEvent} match={match} />
  )
}
