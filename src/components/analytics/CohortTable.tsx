import type { CohortAnalysis } from '@/services/analyticsService'

export interface CohortTableProps {
  data: CohortAnalysis[]
}

function monthLabel(cohort: string): string {
  const [year, monthIndex] = cohort.split('-').map(Number)
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * One row per application cohort (the month a job was first applied to), the
 * second of the two panels the range picker actually filters.
 *
 * A plain `<table>` in its own `overflow-x-auto` wrapper, per the global
 * constraint that a wide table scrolls inside its own container rather than
 * the page body scrolling horizontally -- seven columns is exactly the kind
 * of row that overflows a narrow viewport.
 */
export function CohortTable({ data }: CohortTableProps) {
  if (data.length === 0) {
    return <p className="text-body-s text-text-muted">not enough data yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-body-s">
        <thead>
          <tr className="border-b border-border-subtle text-left text-text-muted">
            <th className="py-2 pr-4 font-medium">cohort</th>
            <th className="py-2 pr-4 text-right font-medium">applied</th>
            <th className="py-2 pr-4 text-right font-medium">interviewing</th>
            <th className="py-2 pr-4 text-right font-medium">offered</th>
            <th className="py-2 pr-4 text-right font-medium">rejected</th>
            <th className="py-2 pr-4 text-right font-medium">conversion</th>
            <th className="py-2 text-right font-medium">avg. time to offer</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.cohort} className="border-b border-border-subtle last:border-0">
              <td className="py-2 pr-4 text-text-primary">{monthLabel(row.cohort)}</td>
              <td className="tabular py-2 pr-4 text-right text-text-primary">{row.jobsApplied}</td>
              <td className="tabular py-2 pr-4 text-right text-text-primary">{row.jobsInterviewing}</td>
              <td className="tabular py-2 pr-4 text-right text-text-primary">{row.jobsOffered}</td>
              <td className="tabular py-2 pr-4 text-right text-text-primary">{row.jobsRejected}</td>
              <td className="tabular py-2 pr-4 text-right text-text-primary">
                {Math.round(row.conversionRate)}%
              </td>
              <td className="tabular py-2 text-right text-text-primary">
                {row.avgTimeToOffer === null ? '—' : `${Math.round(row.avgTimeToOffer)}d`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
