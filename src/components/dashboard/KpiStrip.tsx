import { KpiStat } from '@/components/ui/kpi-stat'
import type { Job } from '@/types'

export interface KpiStripProps {
  jobs: Job[]
}

/**
 * Four counts read off the jobs the caller already fetched -- no separate
 * query, no aggregate table.
 *
 * "Applications" excludes wishlist entries, since those were never sent; the
 * full five-status breakdown lives in the Pipeline block below rather than
 * being duplicated here as a fifth number. "Response rate" is applications
 * that moved past a bare "applied" over applications sent -- interviewing,
 * offer or rejected all count as a response, since all three mean somebody on
 * the other end looked at it.
 */
export function KpiStrip({ jobs }: KpiStripProps) {
  const applications = jobs.filter((job) => job.status !== 'wishlist').length
  const interviewing = jobs.filter((job) => job.status === 'interviewing').length
  const offers = jobs.filter((job) => job.status === 'offer').length
  const responded = jobs.filter(
    (job) => job.status !== 'wishlist' && job.status !== 'applied'
  ).length
  const responseRate = applications > 0 ? Math.round((responded / applications) * 100) : 0

  return (
    <section data-kpi-strip className="grid grid-cols-2 gap-6 md:grid-cols-4">
      <KpiStat label="Applications" value={applications} />
      <KpiStat label="Interviewing" value={interviewing} />
      <KpiStat label="Offers" value={offers} />
      <KpiStat label="Response rate" value={`${responseRate}%`} />
    </section>
  )
}
