'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAppHref } from '@/components/shell/routeBase'
import { PageHeader } from '@/components/ui/page-header'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { FollowUpNudge } from './FollowUpNudge'
import { KpiStrip } from './KpiStrip'
import { ApplicationsOverTime } from './ApplicationsOverTime'
import { StatusDonut } from './StatusDonut'
import { SourceMix } from './SourceMix'
import { UpcomingEvents } from './UpcomingEvents'
import { RecentApplicationsTable } from './RecentApplicationsTable'
import { ArrowRightIcon } from '@/components/icons'
import { ICON_MOTION_GROUP, iconMotion } from '@/components/icons/motion'
import { getStaleApplications } from '@/services/followUp'
import { applicationsPerMonth, statusBreakdown, rankedSources } from '@/lib/overviewSeries'
import type { CalendarEvent } from '@/services/events'
import type { Job } from '@/types'

export interface DashboardProps {
  jobs: Job[]
  events?: CalendarEvent[]
  eventsLoading?: boolean
  eventsError?: boolean
}

/**
 * The link out of a panel, to the screen that panel is a summary of.
 *
 * EVERY PANEL HERE IS AN ABRIDGEMENT. The trend is six months of a chart the
 * analytics screen draws properly; "by status" is a donut of a board; "upcoming
 * events" is the next few rows of a calendar. Before this only one of the five
 * said so, and the other four were dead ends -- a reader who wanted more had to
 * work out for themselves which sidebar entry the panel belonged to, which is
 * exactly the work an overview is supposed to have already done.
 *
 * Wording is the destination, not "view all": four of these five are not lists,
 * so "all" of them is not a thing. `appHref` keeps them inside /demo when the
 * demo is what is being read.
 */
function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        ICON_MOTION_GROUP,
        'inline-flex items-center gap-1.5 text-body-s text-accent-default hover:underline'
      )}
    >
      {children}
      <ArrowRightIcon size={14} aria-hidden className={iconMotion('forward')} />
    </Link>
  )
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
 * The content panels are shadcn `Card`s, restyled to this system in Task 2 --
 * no shadow, radius at the 4px cap, a hairline border rather than shadcn's
 * ring. That is a deliberate departure from the frame, which separates these
 * panels with rules rather than boxing them: Gabe asked for the card
 * component on this screen specifically. The rule the frame does specify --
 * the 2px one under the page title -- stays.
 *
 * Layout, top to bottom: header, rule, five-KPI strip with dividers,
 * follow-up nudge, then a TWO-COLUMN grid, then the recent-applications table
 * across the full width. The column order is Gabe's: `applications over time`
 * beside `by status`, then `upcoming events` beside `by source`, then the
 * table.
 *
 * That replaces a 460/300/280 three-panel row plus a 2fr/1fr row. Six panels
 * at four different widths meant no two charts on the screen shared a scale,
 * so a bar in one could not be read against a bar in another. Equal halves
 * make the pairs comparable, and the table -- the one panel that genuinely
 * wants width, at four columns -- gets the whole row instead of two thirds of
 * one.
 *
 * `by source` is not in the Figma at all; it is the chart Gabe asked for, and
 * source is the dimension the frame's three panels do not cover. It also
 * preserves the data the retired `DashboardBlocks` surfaced as text.
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
  const appHref = useAppHref()
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
  const sources = React.useMemo(() => rankedSources(jobs), [jobs])
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
        {/* PageHeader rather than a hand-rolled h1: this screen having its own
            was why its title was 28px while five other screens were 20px. */}
        <PageHeader
          title="overview"
          description="your search at a glance — what is moving, what has stalled, and what is next."
          action={<p className="tabular text-body-s text-text-muted">{today}</p>}
        />
        <hr data-header-rule className="mt-6 border-0 border-t-2 border-border-default" />
      </div>

      <KpiStrip jobs={jobs} />

      <FollowUpNudge stale={stale} />

      {/* Two equal columns from lg, in Gabe's order: over-time beside status,
          events beside source, and the table across both. */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle icon="Analytics">
              <h2>applications over time</h2>
            </CardTitle>
            <CardDescription>how many you sent each month, over the last six.</CardDescription>
            <CardAction>
              <PanelLink href={appHref('/analytics')}>see the analytics</PanelLink>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <ApplicationsOverTime data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon="Applications">
              <h2>by status</h2>
            </CardTitle>
            <CardDescription>where everything you are tracking currently sits.</CardDescription>
            <CardAction>
              <PanelLink href={appHref('/applications')}>open the board</PanelLink>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <StatusDonut data={statuses} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon="Calendar">
              <h2>upcoming events</h2>
            </CardTitle>
            <CardDescription>interviews and calls already on the calendar.</CardDescription>
            <CardAction>
              <PanelLink href={appHref('/calendar')}>open the calendar</PanelLink>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <UpcomingEvents
              events={events}
              companyByJobId={companyByJobId}
              loading={eventsLoading}
              error={eventsError}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon="External">
              <h2>by source</h2>
            </CardTitle>
            <CardDescription>your best channel, the runner-up, and the tail behind them.</CardDescription>
            <CardAction>
              <PanelLink href={appHref('/analytics')}>see the analytics</PanelLink>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <SourceMix data={sources} />
          </CardContent>
        </Card>

        {/* Full width: four columns of table read badly at half a screen, and
            it is the end of the page rather than one of a pair. */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle icon="Clock">
              <h2>recent applications</h2>
            </CardTitle>
            <CardDescription>the five most recent, newest first.</CardDescription>
            <CardAction>
              <PanelLink href={appHref('/applications')}>view all</PanelLink>
            </CardAction>
          </CardHeader>
          <CardContent>
            <RecentApplicationsTable jobs={jobs} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
