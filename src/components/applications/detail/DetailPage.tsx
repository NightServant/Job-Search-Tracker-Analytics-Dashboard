'use client'

import * as React from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StatusMarker, type Status } from '@/components/ui/status-marker'
import { buttonVariants } from '@/components/ui/button'
import { formatSalaryRange } from '@/services/salary'
import { JobDescription } from './JobDescription'
import { ActivityTimeline } from './ActivityTimeline'
import { LinkedCv } from './LinkedCv'
import { AtsPanel } from './AtsPanel'
import { NextEvent } from './NextEvent'
import type { Job } from '@/types'
import type { ActivityEntry } from '@/services/activityLog'
import type { DocumentLinkSummary } from '@/services/applicationDocuments'
import type { CalendarEvent } from '@/services/events'
import type { KeywordMatch } from '@/services/atsMatch'

/**
 * The application detail screen's body, over plain props -- the same split
 * as `Dashboard` and `ApplicationsPage`, so it renders without Next routing
 * or react-query. `src/app/(app)/applications/[id]/page.tsx` owns the four
 * hooks this screen needs and the ATS match computed from their results.
 *
 * `Back` and `Edit` sit in `PageHeader`'s action slot rather than the Top
 * Bar: Back is navigation, so per the roadmap it belongs beside the title it
 * is leaving, and Edit is the same kind of body-header control as
 * Applications' own `Add`. Edit returns to `/applications` rather than
 * deep-linking into that screen's edit disclosure -- doing that would mean
 * teaching the Applications route to read a query param, which is scope this
 * task chose not to reopen that file for. Documented as a known gap rather
 * than silently shipped.
 *
 * The two-column layout below the header is the only new layout this screen
 * draws; every panel inside it is a hairline-separated section, never a
 * bordered card, so five panels next to each other read as one page rather
 * than five boxes.
 */
export interface DetailPageProps {
  job: Job
  activity?: ActivityEntry[]
  links?: DocumentLinkSummary[]
  nextEvent?: CalendarEvent | null
  match?: KeywordMatch | null
  backHref?: string
  editHref?: string
}

export function DetailPage({
  job,
  activity = [],
  links = [],
  nextEvent = null,
  match = null,
  backHref = '/applications',
  editHref = '/applications',
}: DetailPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Applications', href: '/applications' }, { label: job.role }]} />

      <PageHeader
        title={job.role}
        action={
          <div className="flex items-center gap-2">
            <Link href={backHref} className={buttonVariants({ variant: 'ghost', size: 's' })}>
              Back
            </Link>
            <Link href={editHref} className={buttonVariants({ size: 's' })}>
              Edit
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border-subtle pb-6">
        <p className="text-body-m text-text-secondary">{job.company}</p>
        <StatusMarker status={job.status as Status} className="w-24" />
        <p className="tabular text-body-s text-text-muted">
          {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
        </p>
      </div>

      <div className="grid gap-x-10 md:grid-cols-[2fr_1fr]">
        <div className="flex flex-col">
          <JobDescription description={job.description} url={job.url} />
          <ActivityTimeline activity={activity} />
        </div>
        <div className="flex flex-col">
          <NextEvent event={nextEvent} />
          <AtsPanel match={match} />
          <LinkedCv links={links} />
        </div>
      </div>
    </div>
  )
}
