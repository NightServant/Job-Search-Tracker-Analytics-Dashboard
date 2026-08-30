'use client'

import * as React from 'react'
import Link from 'next/link'
import { PanelSection } from '@/components/ui/panel-section'
import { FollowUpNudge } from './FollowUpNudge'
import { KpiStrip } from './KpiStrip'
import { ApplicationsOverTime } from './ApplicationsOverTime'
import { StatusDonut } from './StatusDonut'
import { SourceBars } from './SourceBars'
import { UpcomingEvents } from './UpcomingEvents'
import { RecentApplicationsTable } from './RecentApplicationsTable'
import { getStaleApplications } from '@/services/followUp'
import { applicationsPerMonth, statusBreakdown, sourceBreakdown } from '@/lib/overviewSeries'
import type { CalendarEvent } from '@/services/events'
import type { Job } from '@/types'

export interface DashboardProps {
  jobs: Job[]
  events?: CalendarEvent[]
  eventsLoading?: boolean
  eventsError?: boolean
}

/** In-flight beyond two weeks with no sign of life is when chasing becomes reasonable. */
const STALE_AFTER_DAYS = 14

/** Figma 22:77 plots six buckets. */
const TREND_MONTHS = 6

/**
 * The Overview's body, separated from `src/app/(app)/dashboard/page.tsx` so it
 * can be rendered and tested with plain props instead of through Next routing.
 *
 * Rebuilt against Figma node 20:64 (M5.5 Item 5). What M5 shipped was six
 * generic text blocks and no charts at all -- recharts has been a dependency
 * this whole time and this screen never imported it.
 *
 * The header is the page title over a 2px rule with the date on the trailing
 * edge, and the title is `overview` rather than `Dashboard`: the sidebar nav,
 * the Figma page title and this heading all now agree, where before only the
 * route path said dashboard and the heading copied it.
 *
 * Layout, top to bottom, matching the frame: header, rule, five-KPI strip with
 * dividers, follow-up nudge, then a three-panel content grid at 460/300/280,
 * then the recent-applications table. The one departure is the fourth panel,
 * `by source` -- Gabe asked for a bar chart and the three Figma panels cover
 * time, status and events, so source is the dimension none of them shows. It
 * also preserves the data the retired `DashboardBlocks` surfaced as text.
 *
 * `events` arrives as a prop from the route, which reads `useEvents`. That
 * hook already existed and `/calendar` already used it; the Overview never
 * called it, which is why "upcoming events" printed a sentence derived from
 * job statuses and had no empty state to show.
 *
 * `last_touched_at` for staleness is a job's `updated_at`, falling back to
 * `date_applied` then `created_at` for rows from before either column was
 * populated -- there is no activity-log query on this page, so the freshest
 * timestamp already on the row stands in for it.
 */
export function Dashboard({
  jobs,
  events = [],
  eventsLoading = false,
  eventsError = false,
}: DashboardProps) {
  const stale = React.useMemo(
    () =>
      getStaleApplications(
        jobs.map((job) => ({
          id: job.id,
          company: job.company,
          role: job.role,
          status: job.status,
          last_touched_at: job.updated_at || job.date_applied || job.created_at,
        })),
        STALE_AFTER_DAYS
      ),
    [jobs]
  )

  const trend = React.useMemo(() => applicationsPerMonth(jobs, TREND_MONTHS), [jobs])
  const statuses = React.useMemo(() => statusBreakdown(jobs), [jobs])
  const sources = React.useMemo(() => sourceBreakdown(jobs), [jobs])
  const companyByJobId = React.useMemo(
    () => Object.fromEntries(jobs.map((job) => [job.id, job.company])),
    [jobs]
  )

  const today = React.useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div data-body-header className="flex items-baseline justify-between gap-4">
          <h1 className="text-display-m text-text-primary">overview</h1>
          <p className="tabular text-body-s text-text-muted">{today}</p>
        </div>
        <hr data-header-rule className="mt-6 border-0 border-t-2 border-border-default" />
      </div>

      <KpiStrip jobs={jobs} />

      <FollowUpNudge stale={stale} />

      <div className="grid gap-8 lg:grid-cols-[460fr_300fr_280fr]">
        <PanelSection title="applications over time" titleSize="m">
          <ApplicationsOverTime data={trend} />
        </PanelSection>
        <PanelSection title="by status" titleSize="m">
          <StatusDonut data={statuses} />
        </PanelSection>
        <PanelSection title="upcoming events" titleSize="m">
          <UpcomingEvents
            events={events}
            companyByJobId={companyByJobId}
            loading={eventsLoading}
            error={eventsError}
          />
        </PanelSection>
      </div>

      {/* `by source` shares this row rather than owning a full-width one of
          its own. It is not in the Figma at all -- it is the bar chart Gabe
          asked for -- and a lone full-bleed panel gave a handful of bars the
          visual weight of the whole screen. The table is the frame's own
          bottom block (26:76) and keeps the larger share. */}
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <PanelSection
          title="recent applications"
          titleSize="m"
          actions={
            <Link href="/applications" className="text-body-s text-accent-default hover:underline">
              view all
            </Link>
          }
        >
          <RecentApplicationsTable jobs={jobs} />
        </PanelSection>
        <PanelSection title="by source" titleSize="m">
          <SourceBars data={sources} />
        </PanelSection>
      </div>
    </div>
  )
}
