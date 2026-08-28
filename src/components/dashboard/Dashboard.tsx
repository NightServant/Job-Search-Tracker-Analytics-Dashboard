import { PageHeader } from '@/components/ui/page-header'
import { FollowUpNudge } from './FollowUpNudge'
import { KpiStrip } from './KpiStrip'
import { DashboardBlocks } from './DashboardBlocks'
import { getStaleApplications } from '@/services/followUp'
import type { Job } from '@/types'

export interface DashboardProps {
  jobs: Job[]
}

/** In-flight beyond two weeks with no sign of life is when chasing becomes reasonable. */
const STALE_AFTER_DAYS = 14

/**
 * The dashboard's body, separated from `src/app/(app)/dashboard/page.tsx` so
 * it can be rendered and tested with plain props instead of through Next
 * routing. The route itself only fetches `jobs` and hands them here.
 *
 * `last_touched_at` for staleness purposes is a job's `updated_at`, falling
 * back to `date_applied` then `created_at` for rows from before either column
 * was populated -- there is no separate activity-log query on this page, so
 * the freshest timestamp already on the row stands in for it.
 */
export function Dashboard({ jobs }: DashboardProps) {
  const stale = getStaleApplications(
    jobs.map((job) => ({
      id: job.id,
      company: job.company,
      role: job.role,
      status: job.status,
      last_touched_at: job.updated_at || job.date_applied || job.created_at,
    })),
    STALE_AFTER_DAYS
  )

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" />
      <FollowUpNudge stale={stale} />
      <KpiStrip jobs={jobs} />
      <DashboardBlocks jobs={jobs} />
    </div>
  )
}
