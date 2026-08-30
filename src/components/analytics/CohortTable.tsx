'use client'

import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import type { CohortAnalysis } from '@/services/analyticsService'

export interface CohortTableProps {
  data: CohortAnalysis[]
}

function monthLabel(cohort: string): string {
  const [year, monthIndex] = cohort.split('-').map(Number)
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * One row per application cohort (the month a job was first applied to).
 *
 * This panel briefly carried a grouped bar chart above the table. Gabe took it
 * back out: seven columns of numbers plus a three-series chart of three of
 * those same columns is the same data drawn twice, and the chart was the half
 * that could not show conversion rate or time to offer. A table is the right
 * shape for a cohort breakdown -- it is a grid of numbers by construction.
 *
 * Header band and row banding both come from `accent-surface`, matching
 * `ApplicationsTable` -- the two tables on the app's two densest screens read
 * as one decision rather than a grey table on one and an accented one on the
 * other. `accent-surface`, never `accent-default`: the latter is picked for
 * TEXT contrast (accent-400 in dark) and a full-width band of it is the
 * over-bright header Gabe rejected on the calendar.
 *
 * Zebra striping is what keeps a seven-column row traceable across its full
 * width, which is the whole reason this table is banded at all.
 *
 * A plain `<table>` in its own `overflow-x-auto` wrapper, per the global
 * constraint that a wide table scrolls inside its own container rather than
 * the page body scrolling horizontally. The panel itself is the Card.
 */
export function CohortTable({ data }: CohortTableProps) {
  if (data.length === 0) {
    return (
      <EmptyState icon="Analytics">
        not enough data yet. this fills in as applications move through the pipeline.
      </EmptyState>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-body-s">
        <thead className="bg-accent-surface text-accent-on-surface">
          <tr className="border-b border-border-subtle text-left">
            <th className="py-2 px-4 font-medium">cohort</th>
            <th className="py-2 px-4 text-right font-medium">applied</th>
            <th className="py-2 px-4 text-right font-medium">interviewing</th>
            <th className="py-2 px-4 text-right font-medium">offered</th>
            <th className="py-2 px-4 text-right font-medium">rejected</th>
            <th className="py-2 px-4 text-right font-medium">conversion</th>
            <th className="py-2 px-4 text-right font-medium">avg. time to offer</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.cohort}
              className={cn(
                'border-b border-border-subtle last:border-0',
                i % 2 === 1 && 'bg-accent-surface/30'
              )}
            >
              <td className="py-2 px-4 text-text-primary">{monthLabel(row.cohort)}</td>
              <td className="tabular py-2 px-4 text-right text-text-primary">{row.jobsApplied}</td>
              <td className="tabular py-2 px-4 text-right text-text-primary">{row.jobsInterviewing}</td>
              <td className="tabular py-2 px-4 text-right text-text-primary">{row.jobsOffered}</td>
              <td className="tabular py-2 px-4 text-right text-text-primary">{row.jobsRejected}</td>
              <td className="tabular py-2 px-4 text-right text-text-primary">
                {Math.round(row.conversionRate)}%
              </td>
              <td className="tabular py-2 px-4 text-right text-text-primary">
                {row.avgTimeToOffer === null ? '—' : `${Math.round(row.avgTimeToOffer)}d`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
