import { KpiStat } from '@/components/ui/kpi-stat'
import type { Job } from '@/types'

export interface KpiStripProps {
  jobs: Job[]
}

/**
 * Five counts read off the jobs the caller already fetched -- no separate
 * query, no aggregate table.
 *
 * Figma 20:69 draws five at 220px each, separated by 1px x 64px vertical
 * rules. M5 shipped four in an even grid with no dividers, which is why the
 * strip read as a row of loose numbers rather than one instrument.
 *
 * "applications" excludes wishlist entries, since those were never sent.
 * "rejected" is the fifth, and it earns its place now that the donut below
 * carries the full breakdown: seeing it beside offers is the comparison the
 * strip exists to make. "success rate" is applications that moved past a bare
 * "applied" over applications sent -- interviewing, offer or rejected all
 * count as a response, since all three mean somebody looked at it.
 *
 * The dividers are `divide-x` on the grid rather than borders on each cell,
 * so there is no trailing rule after the fifth and no special case for it.
 */
export function KpiStrip({ jobs }: KpiStripProps) {
  const applications = jobs.filter((job) => job.status !== 'wishlist').length
  const interviewing = jobs.filter((job) => job.status === 'interviewing').length
  const offers = jobs.filter((job) => job.status === 'offer').length
  const rejected = jobs.filter((job) => job.status === 'rejected').length
  const responded = jobs.filter(
    (job) => job.status !== 'wishlist' && job.status !== 'applied'
  ).length
  const responseRate = applications > 0 ? Math.round((responded / applications) * 100) : 0

  return (
    <section
      data-kpi-strip
      className="grid grid-cols-2 gap-y-6 divide-border-subtle md:grid-cols-5 md:gap-y-0 md:divide-x"
    >
      <KpiStat label="applications" value={applications} className="md:px-6 md:first:pl-0" />
      <KpiStat label="interviews" value={interviewing} className="md:px-6" />
      <KpiStat label="offers" value={offers} className="md:px-6" />
      <KpiStat label="rejected" value={rejected} className="md:px-6" />
      <KpiStat label="success rate" value={`${responseRate}%`} className="md:px-6 md:last:pr-0" />
    </section>
  )
}
