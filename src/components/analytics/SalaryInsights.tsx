'use client'

import * as React from 'react'
import { Bar, BarChart, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { EmptyState } from '@/components/ui/empty-state'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import {
  salaryDistribution,
  salaryBands,
  salaryByCompany,
  averageMidpoint,
} from '@/lib/salaryHistogram'
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
 * The distribution is FIXED CLASSIFICATION BANDS, not buckets derived from the
 * data's own min and max. Derived buckets moved their axis labels every time a
 * job was added and made two accounts incomparable; 0-25k is 0-25k for
 * everyone. The top band is open-ended so an outlier is classified rather than
 * silently dropped.
 */
export function SalaryInsights({ jobs }: SalaryInsightsProps) {
  const reducedMotion = usePrefersReducedMotion()
  const dist = React.useMemo(() => salaryDistribution(jobs), [jobs])
  const bands = React.useMemo(() => salaryBands(dist, jobs), [dist, jobs])
  const byCompany = React.useMemo(() => salaryByCompany(dist, jobs), [dist, jobs])
  const avg = React.useMemo(() => averageMidpoint(dist, jobs), [dist, jobs])

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

  return (
    <div className="flex flex-col gap-6">
      <dl className="flex flex-wrap gap-x-10 gap-y-3">
        <div>
          <dt className="text-body-s text-text-muted">jobs with salary</dt>
          <dd className="tabular text-heading-m text-text-primary">{dist.included}</dd>
        </div>
        <div className="border-l border-border-subtle pl-10">
          <dt className="text-body-s text-text-muted">avg midpoint</dt>
          <dd className="tabular text-heading-m text-text-primary">
            {money.format(Math.round(avg ?? 0))}
          </dd>
        </div>
        <div>
          <dt className="text-body-s text-text-muted">median</dt>
          <dd className="tabular text-heading-m text-text-primary">
            {money.format(Math.round(dist.median ?? 0))}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <p className="text-label-caps uppercase text-text-secondary">range distribution</p>
        <ChartContainer config={CONFIG} className="aspect-auto h-40 w-full" data-chart-salary>
          <BarChart data={bands} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
            <Bar
              dataKey="count"
              fill="var(--color-accent-default)"
              radius={[2, 2, 0, 0]}
              maxBarSize={72}
              isAnimationActive={!reducedMotion}
            />
          </BarChart>
        </ChartContainer>
      </div>

      {byCompany.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-label-caps uppercase text-text-secondary">average by company</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-body-s">
              <thead>
                <tr className="border-b border-border-subtle text-left text-text-muted">
                  <th className="py-2 pr-4 font-medium">company</th>
                  <th className="py-2 pr-4 text-right font-medium">avg</th>
                  <th className="py-2 text-right font-medium">jobs</th>
                </tr>
              </thead>
              <tbody>
                {byCompany.map((row) => (
                  <tr key={row.company} className="border-b border-border-subtle last:border-b-0">
                    <td className="max-w-0 truncate py-2 pr-4 text-text-primary">{row.company}</td>
                    <td className="tabular py-2 pr-4 text-right text-text-secondary">
                      {money.format(Math.round(row.average))}
                    </td>
                    <td className="tabular py-2 text-right text-text-muted">{row.jobs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p data-salary-scope className="text-body-s text-text-muted">
        {dist.currency} only, {dist.included}{' '}
        {dist.included === 1 ? 'application' : 'applications'}.
        {dist.excludedOtherCurrency > 0
          ? ` ${dist.excludedOtherCurrency} in another currency not shown \u2014 figures are never converted.`
          : ''}
        {dist.missing > 0 ? ` ${dist.missing} with no salary recorded.` : ''}
      </p>
    </div>
  )
}
