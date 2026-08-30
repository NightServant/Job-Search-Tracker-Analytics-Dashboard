'use client'

import * as React from 'react'
import { Bar, BarChart, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { EmptyState } from '@/components/ui/empty-state'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { salaryDistribution } from '@/lib/salaryHistogram'
import type { Job } from '@/types'

const CONFIG = {
  count: { label: 'applications', color: 'var(--color-accent-default)' },
} satisfies ChartConfig

export interface SalaryInsightsProps {
  jobs: Job[]
}

/**
 * Figma `Panel / Salary Insights` (80:1003) — a stats row over a twelve-bar
 * histogram. Absent from the code entirely until now.
 *
 * The distribution comes from `lib/salaryHistogram`, derived from the jobs the
 * route already holds. No analyticsService method returns one, and the rows
 * carry `salary_min`/`salary_max`/`salary_currency` already.
 *
 * THE CURRENCY LINE IS NOT A FOOTNOTE. Salaries are stored per row and never
 * converted, so this charts one currency and says which. Jobs priced in
 * another currency, and jobs with no salary at all, are counted and disclosed
 * separately — they are two different reasons a job is not in the chart, and a
 * panel that silently under-reports is worse than one that explains itself.
 *
 * No y axis. Twelve narrow bars with a count in the tooltip do not need a
 * labelled scale; the shape is the message and the axis would be furniture.
 */
export function SalaryInsights({ jobs }: SalaryInsightsProps) {
  const reducedMotion = usePrefersReducedMotion()
  const dist = React.useMemo(() => salaryDistribution(jobs), [jobs])

  const money = React.useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: dist.currency ?? 'PHP',
        maximumFractionDigits: 0,
      }),
    [dist.currency]
  )

  if (dist.currency === null) {
    return (
      <EmptyState icon="Analytics">
        no salaries recorded yet. add a range to an application and the spread shows up here.
      </EmptyState>
    )
  }

  const data = dist.buckets.map((bucket) => ({
    label: money.format(Math.round(bucket.from)),
    count: bucket.count,
  }))

  return (
    <div className="flex flex-col gap-6">
      <dl className="flex flex-wrap gap-x-10 gap-y-3">
        <div>
          <dt className="text-body-s text-text-muted">median</dt>
          <dd className="tabular text-heading-m text-text-primary">
            {money.format(Math.round(dist.median ?? 0))}
          </dd>
        </div>
        <div>
          <dt className="text-body-s text-text-muted">lowest</dt>
          <dd className="tabular text-heading-m text-text-primary">
            {money.format(Math.round(dist.min ?? 0))}
          </dd>
        </div>
        <div>
          <dt className="text-body-s text-text-muted">highest</dt>
          <dd className="tabular text-heading-m text-text-primary">
            {money.format(Math.round(dist.max ?? 0))}
          </dd>
        </div>
        <div>
          <dt className="text-body-s text-text-muted">with a salary</dt>
          <dd className="tabular text-heading-m text-text-primary">{dist.included}</dd>
        </div>
      </dl>

      <ChartContainer config={CONFIG} className="aspect-auto h-48 w-full" data-chart-salary>
        <BarChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={false} height={4} />
          <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
          <Bar
            dataKey="count"
            fill="var(--color-accent-default)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={!reducedMotion}
          />
        </BarChart>
      </ChartContainer>

      <p data-salary-scope className="text-body-s text-text-muted">
        {dist.currency} only, {dist.included}{' '}
        {dist.included === 1 ? 'application' : 'applications'}.
        {dist.excludedOtherCurrency > 0
          ? ` ${dist.excludedOtherCurrency} in another currency not shown — figures are never converted.`
          : ''}
        {dist.missing > 0 ? ` ${dist.missing} with no salary recorded.` : ''}
      </p>
    </div>
  )
}
