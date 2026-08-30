'use client'

import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { EmptyState } from '@/components/ui/empty-state'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { CohortAnalysis } from '@/services/analyticsService'

/**
 * Status hues, because these series ARE application statuses -- the same
 * exception the Overview doughnut earns and the source chart does not.
 */
const CONFIG = {
  jobsApplied: { label: 'applied', color: 'var(--color-status-applied-mark)' },
  jobsInterviewing: { label: 'interviewing', color: 'var(--color-status-interviewing-mark)' },
  jobsOffered: { label: 'offered', color: 'var(--color-status-offer-mark)' },
} satisfies ChartConfig


export interface CohortTableProps {
  data: CohortAnalysis[]
}

function monthLabel(cohort: string): string {
  const [year, monthIndex] = cohort.split('-').map(Number)
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * The chart the panel was missing. Cohort analysis shipped as a bare table:
 * it answered "what are all the numbers" and not "is this getting better",
 * which is the only question a cohort breakdown exists to answer -- and a
 * month-over-month trend is invisible when it is rows of digits.
 */
function CohortChart({ data }: { data: CohortAnalysis[] }) {
  const reducedMotion = usePrefersReducedMotion()
  const series = React.useMemo(
    () =>
      data.map((row) => ({
        cohort: monthLabel(row.cohort),
        jobsApplied: row.jobsApplied,
        jobsInterviewing: row.jobsInterviewing,
        jobsOffered: row.jobsOffered,
      })),
    [data]
  )

  return (
    <ChartContainer config={CONFIG} className="aspect-auto h-48 w-full" data-chart-cohort>
      <BarChart data={series} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="0" />
        <XAxis dataKey="cohort" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="jobsApplied" fill="var(--color-status-applied-mark)" radius={[2,2,0,0]} isAnimationActive={!reducedMotion} />
        <Bar dataKey="jobsInterviewing" fill="var(--color-status-interviewing-mark)" radius={[2,2,0,0]} isAnimationActive={!reducedMotion} />
        <Bar dataKey="jobsOffered" fill="var(--color-status-offer-mark)" radius={[2,2,0,0]} isAnimationActive={!reducedMotion} />
      </BarChart>
    </ChartContainer>
  )
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
    // No chart here: there is nothing to plot, and an empty axis is the exact
    // "graph not visible" state this panel was reported for.
    return (
      <EmptyState icon="Analytics">
        not enough data yet. this fills in as applications move through the pipeline.
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <CohortChart data={data} />
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
    </div>
  )
}
