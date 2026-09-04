import * as React from 'react'
import { CssSpinner } from '@/components/ui/css-spinner'
import { JobDescription } from '../detail/JobDescription'
import { ActivityTimeline } from '../detail/ActivityTimeline'
import { NextEvent } from '../detail/NextEvent'
import { LinkedCv } from '../detail/LinkedCv'
import { AtsPanel } from '../detail/AtsPanel'
import { RecordSummary, type RecordLayout } from './RecordSummary'
import { RecordNotes, RecordContact } from './RecordNotes'
import type { ApplicationRecordData } from './recordData'
import type { Job } from '@/types'

/**
 * The whole application record, read-only, in one of two layouts.
 *
 * ONE COMPONENT FOR BOTH SURFACES is the point of the file. The desktop
 * dialog and the mobile page show the same eleven sections against the same
 * `Job` row and the same four secondary reads; the only honest way to keep
 * them from drifting is for there to be one place the sections are listed.
 * What differs is layout, and layout is a prop.
 *
 * `dialog` runs the two-column split the detail screen already established:
 * the reading matter on the left (description, activity, notes), the
 * short-lived facts on the right (what is next, which CV went, how well it
 * matched). At 1040px both columns are wide enough to be read rather than
 * skimmed.
 *
 * `page` is a single column in the section list's own order, which is NOT the
 * dialog's order -- a rail has nowhere to go at 375px, so its three panels
 * fall back into the main flow where the list puts them. This is the part
 * that is a different layout rather than a narrower one.
 *
 * The panels themselves are the five `detail/` components unchanged. They
 * were already hairline-separated sections rather than cards, which is what
 * lets eleven of them sit under one another and read as one record instead of
 * eleven boxes.
 */
export interface ApplicationRecordProps {
  job: Job
  data: ApplicationRecordData
  layout: RecordLayout
}

export function ApplicationRecord({ job, data, layout }: ApplicationRecordProps) {
  const {
    activity,
    links,
    nextEvent,
    match,
    activityError,
    linksError,
    nextEventError,
    atsError,
    loading,
  } = data

  // Sections 7 and 8, plus 11 and the contact block: the reading matter.
  const primary = (
    <>
      <JobDescription description={job.description} url={job.url} />
      <ActivityTimeline activity={activity} error={activityError} />
    </>
  )

  // Sections 9 and 10: the short-lived facts.
  const secondary = (
    <>
      <NextEvent event={nextEvent} error={nextEventError} />
      <LinkedCv links={links} error={linksError} />
      <AtsPanel match={match} error={atsError} />
    </>
  )

  const closing = (
    <>
      <RecordNotes notes={job.notes} />
      <RecordContact job={job} />
    </>
  )

  return (
    <div className="flex flex-col gap-8">
      <RecordSummary job={job} layout={layout} />

      {/*
        The four secondary reads are still in flight. Only the panels that
        depend on them wait -- everything above came off the `jobs` row the
        list already had, and blanking it out too would make opening a record
        feel like a page load rather than a disclosure.
      */}
      {loading ? (
        <div className="flex items-center gap-2 border-t border-border-subtle pt-6 text-body-s text-text-muted">
          {/* No `role="status"` on the wrapper -- CssSpinner already carries
              one, and a second announces the same thing twice. */}
          <CssSpinner size={14} />
          loading this application&rsquo;s history
        </div>
      ) : layout === 'dialog' ? (
        <div className="grid gap-x-10 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col">
            {primary}
            {closing}
          </div>
          <div className="flex flex-col">{secondary}</div>
        </div>
      ) : (
        <div className="flex flex-col">
          {primary}
          {secondary}
          {closing}
        </div>
      )}
    </div>
  )
}
