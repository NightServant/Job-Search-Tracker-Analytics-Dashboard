'use client'

import { useParams } from 'next/navigation'
import { useJob } from '@/hooks/useJobs'
import { useActivity } from '@/hooks/useActivity'
import { useDocumentLinks } from '@/hooks/useDocumentLinks'
import { useJobEvents } from '@/hooks/useJobEvents'
import { useCvText } from '@/hooks/useCvText'
import { matchKeywords } from '@/services/atsMatch'
import { DetailPage } from '@/components/applications/detail/DetailPage'
import { RouteLoading, RouteError } from '@/components/ui/route-states'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

/**
 * Thin route wrapper for one application, same split as `applications/page.tsx`:
 * `DetailPage` takes plain props so it renders without Next routing or
 * react-query, and this file owns the five reads the screen needs (job,
 * activity, document links, events, and the linked CV's text) plus the ATS
 * match derived from two of them.
 *
 * `jobService.getJob` filters on `.eq('user_id', user.id)` before
 * `.maybeSingle()`, so a job that does not exist and a job that belongs to
 * someone else surface identically -- both throw "Not found" rather than
 * leaking whether the id is real. This route treats every error from
 * `useJob` the same way rather than trying to tell the two apart.
 *
 * The loading gate waits on all five reads (including `useCvText`, gated
 * behind `linksQuery` resolving first), not just the job, so the activity,
 * linked-CV, event and ATS panels never flash their empty state before
 * flipping to real content a moment later -- the same "blank is not the same
 * as loading" reasoning the panels' own empty states exist for. `useCvText`
 * only turns on once `linksQuery` has settled and produced a link to read, so
 * an application with no linked CV never enables it -- its `isLoading` stays
 * `false` for a query that was never asked to fetch, rather than blocking the
 * gate forever.
 *
 * A settled failure on one of the four secondary reads is not blanked out to
 * a page-level error (that would hide the panels that loaded fine behind a
 * fetch problem in one of them), but it must not collapse into the same "no
 * activity logged yet" / "no CV linked" / "nothing scheduled" / "link a CV"
 * copy a genuine empty read produces either -- so each `*Query.error` is
 * passed down to its own panel as a distinct third state, one step further
 * along the same reasoning.
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
  const cvTextQuery = useCvText(latestLink?.resume_id)
  const cvText = cvTextQuery.data

  const nextEvent = events.find((event) => new Date(event.starts_at).getTime() >= Date.now()) ?? null
  const match = job?.description && cvText ? matchKeywords(cvText, job.description) : null

  const loading =
    jobQuery.isLoading ||
    activityQuery.isLoading ||
    linksQuery.isLoading ||
    eventsQuery.isLoading ||
    cvTextQuery.isLoading

  if (loading) {
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

  return (
    <DetailPage
      job={job}
      activity={activity}
      links={links}
      nextEvent={nextEvent}
      match={match}
      activityError={!!activityQuery.error}
      linksError={!!linksQuery.error}
      nextEventError={!!eventsQuery.error}
      atsError={!!cvTextQuery.error}
    />
  )
}
