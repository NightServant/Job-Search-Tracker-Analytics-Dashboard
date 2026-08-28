import * as React from 'react'
import Link from 'next/link'
import { ApplicationRow } from '@/components/ui/application-row'
import { KpiStat } from '@/components/ui/kpi-stat'
import { PanelSection } from '@/components/ui/panel-section'
import { StatusMarker, STATUSES, type Status } from '@/components/ui/status-marker'
import { formatAppliedDate } from '@/services/date'
import type { Job } from '@/types'

export interface DashboardBlocksProps {
  jobs: Job[]
}

interface BlockProps {
  title: string
  href: string
  linkLabel: string
  children: React.ReactNode
}

function Block({ title, href, linkLabel, children }: BlockProps) {
  return (
    <PanelSection
      data-dashboard-block
      title={title}
      titleSize="m"
      actions={
        <Link href={href} className="text-body-s text-accent-default hover:text-accent-hover">
          {linkLabel}
        </Link>
      }
    >
      {children}
    </PanelSection>
  )
}

/**
 * Six blocks, each a heading, a summary and a link out.
 *
 * This is an aggregator, not a second copy of every screen: each block reads
 * off the same `jobs` array the KPI strip and the follow-up nudge already
 * have, and sends anyone who wants more to the screen that owns that data.
 * Upcoming events and Documents have no data source on this page -- there is
 * no calendar or document list in `jobs` -- so those two are link-out cards
 * rather than fabricated numbers.
 *
 * Separation is a top hairline rule, not a border box, via the shared
 * `PanelSection` the application detail screen's five panels also use --
 * this file and that screen each wrote the same wrapper by hand before the
 * whole-branch review pulled it into one place. `job-card.tsx` is the one
 * bordered container in this system, and it earns the border because it
 * moves -- a kanban card being dragged needs a boundary. A static grouping on
 * a dashboard doesn't move, so by the same logic it gets a rule instead. A
 * top rule was chosen over column dividers because the grid collapses to one
 * column at mobile widths, where a vertical divider between columns has
 * nothing left to sit between; a top rule keeps working as a plain row
 * separator once the grid stacks.
 *
 * "Recent applications" links each row to that job's own detail route,
 * matching the kanban card and the applications list's mobile row -- the
 * dashboard predates that route and had been left pointing nowhere more
 * specific than the unfiltered list.
 */
export function DashboardBlocks({ jobs }: DashboardBlocksProps) {
  const recent = [...jobs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  const pipelineCounts = STATUSES.reduce<Record<Status, number>>(
    (acc, status) => {
      acc[status] = jobs.filter((job) => job.status === status).length
      return acc
    },
    {} as Record<Status, number>
  )

  const totalApplications = jobs.filter((job) => job.status !== 'wishlist').length
  const offers = jobs.filter((job) => job.status === 'offer').length
  const interviewing = jobs.filter((job) => job.status === 'interviewing').length

  const sourceCounts = new Map<string, number>()
  for (const job of jobs) {
    const key = job.is_referral ? 'Referral' : job.source?.trim() || 'Unknown'
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1)
  }
  const topSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Block title="Recent applications" href="/applications" linkLabel="View all">
        {recent.length === 0 ? (
          <p className="text-body-s text-text-muted">No applications yet.</p>
        ) : (
          <div className="flex flex-col">
            {recent.map((job) => (
              <Link
                key={job.id}
                href={`/applications/${job.id}`}
                className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
              >
                <ApplicationRow
                  company={job.company}
                  role={job.role}
                  status={job.status}
                  salaryMin={job.salary_min}
                  salaryMax={job.salary_max}
                  currency={job.salary_currency}
                  date={formatAppliedDate(job.date_applied)}
                />
              </Link>
            ))}
          </div>
        )}
      </Block>

      <Block title="Pipeline" href="/applications" linkLabel="See the board">
        <div className="flex flex-col gap-2">
          {STATUSES.map((status) => (
            <div key={status} className="flex items-center justify-between">
              <StatusMarker status={status} className="w-28" />
              <span className="tabular text-body-m text-text-primary">
                {pipelineCounts[status]}
              </span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Upcoming events" href="/calendar" linkLabel="Open calendar">
        <p className="text-body-s text-text-muted">
          {interviewing} interview{interviewing === 1 ? '' : 's'} in progress.
        </p>
      </Block>

      <Block title="Documents" href="/documents" linkLabel="Manage documents">
        <p className="text-body-s text-text-muted">
          Keep your resumes and cover letters ready to attach.
        </p>
      </Block>

      <Block title="ATS snapshot" href="/analytics" linkLabel="View analytics">
        <div className="flex gap-6">
          <KpiStat label="Applications" value={totalApplications} />
          <KpiStat label="Offers" value={offers} />
        </div>
      </Block>

      <Block title="Sources" href="/analytics" linkLabel="Break down sources">
        {topSources.length === 0 ? (
          <p className="text-body-s text-text-muted">No sources recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {topSources.map(([source, count]) => (
              <div key={source} className="flex items-center justify-between text-body-s">
                <span className="text-text-secondary">{source}</span>
                <span className="tabular text-text-primary">{count}</span>
              </div>
            ))}
          </div>
        )}
      </Block>
    </div>
  )
}
