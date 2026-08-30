'use client'

import * as React from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { salaryDistribution, salaryRanges, averageMidpoint } from '@/lib/salaryHistogram'
import type { CompanyRange } from '@/lib/salaryHistogram'
import type { Job } from '@/types'

/** Axis ticks in thousands -- full peso figures collide across eight rows. */
function compact(value: number): string {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value))
}

export interface SalaryInsightsProps {
  jobs: Job[]
}

/**
 * Figma `Panel / Salary Insights` (80:1003) — a stats row over a chart.
 *
 * The distribution comes from `lib/salaryHistogram`, derived from the jobs the
 * route already holds. No analyticsService method returns one, and the rows
 * carry `salary_min`/`salary_max`/`salary_currency` already.
 *
 * ONE CURRENCY, NEVER CONVERTED. Salaries are stored per row and figures are
 * never converted, so this charts a single currency. When an account holds
 * more than one, the rest are dropped and the panel says so beneath itself --
 * silently under-reporting is worse than explaining.
 *
 * The chart is a RANGE PLOT, not a histogram. Two earlier versions bucketed
 * midpoints -- first into buckets derived from the data's own min and max
 * (whose axis labels moved every time a job was added, making two accounts
 * incomparable), then into fixed 25k bands. Both collapsed each job to a
 * single number, which threw away the half of the data that a job posting
 * actually is: ₱20-60k and ₱39-41k share a midpoint and are not the same
 * offer. And on a small account the whole chart collapsed into one or two
 * bars. The plot now draws each company's posted band with its average marked
 * inside it, which is the comparison the panel exists to support.
 *
 * The per-company average TABLE that used to sit below is gone with it: the
 * plot marks each average on its own row, so the table was the same numbers a
 * second time -- the duplication Gabe had removed from `cohort analysis` for
 * exactly this reason.
 */
export function SalaryInsights({ jobs }: SalaryInsightsProps) {
  const dist = React.useMemo(() => salaryDistribution(jobs), [jobs])
  const ranges = React.useMemo(() => salaryRanges(dist, jobs), [dist, jobs])
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
    // h-full/flex-1 so the panel fills a card stretched to its neighbour's
    // height. The range plot below is the part that grows into it -- the
    // stats row and the legend are fixed-height by nature.
    <div className="flex h-full flex-1 flex-col gap-6">
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

      {ranges.length > 0 && (
        <RangePlot ranges={ranges} median={dist.median} money={money} />
      )}

      {/*
        The always-on scope line is gone at Gabe's request. Most of what it
        said was already on the panel: "jobs with salary" is the included
        count, and every figure is formatted with its own currency symbol, so
        naming the currency again in prose was restating the ₱ signs above it.

        What survives is the one case where silence actually misleads. Salaries
        are stored per row and NEVER converted (Global Constraint), so when an
        account holds salaries in more than one currency this panel charts one
        of them and drops the rest. Without a line saying so, the numbers look
        like the whole picture and are not. This renders only in that case, and
        never for an account with a single currency.
      */}
      {dist.excludedOtherCurrency > 0 && (
        <p data-salary-scope className="text-body-s text-text-muted">
          {dist.excludedOtherCurrency}{' '}
          {dist.excludedOtherCurrency === 1 ? 'application' : 'applications'} in another currency
          not shown &mdash; figures are never converted.
        </p>
      )}
    </div>
  )
}

/**
 * The posted-range plot, in CSS rather than Recharts.
 *
 * Recharts drew this first and its category axis is the reason it does not
 * any more: a company name is long, the axis reserves a fixed pixel width for
 * it, and anything that does not fit gets word-wrapped onto two lines and
 * then ellipsed mid-word -- "Callhounds Global…" over two rows. Widening the
 * axis eats the plot; narrowing the names makes them unreadable. A CSS row
 * gives the label a real `truncate` with a `title`, so the full name is one
 * line and still recoverable on hover.
 *
 * This is the same call `FunnelChart` makes and for the same reasons. Both
 * are horizontal bars against a linear scale, which is arithmetic (`left` and
 * `width` as percentages), not charting. No library, no ResponsiveContainer,
 * no measure-then-paint, and the bars exist on the very first render.
 *
 * What it draws that the bucket histogram could not: each company's POSTED
 * BAND, min to max, with its average marked inside it. A wide band around a
 * low average is a very different proposition from a tight one at the same
 * number, and bucketing midpoints threw that away -- along with, on a small
 * account, most of the chart, which collapsed into one or two bars.
 */
function RangePlot({
  ranges,
  median,
  money,
}: {
  ranges: CompanyRange[]
  median: number | null
  money: Intl.NumberFormat
}) {
  // Shared scale across every row, anchored at zero: a band's position has to
  // mean the same thing on every line or the rows cannot be compared, which is
  // the only reason to stack them.
  const max = Math.max(...ranges.map((r) => r.max), 1)
  const pct = (value: number) => `${(value / max) * 100}%`

  return (
    <div className="flex flex-1 flex-col gap-2">
      <p className="text-label-caps uppercase text-text-secondary">posted ranges by company</p>

      {/* The rows take the panel's spare height, capped so three companies do
          not draw three slabs. Same trick as the funnel: a bar's LENGTH is
          what carries the number here, so its height is free to stretch. */}
      <div className="flex flex-1 flex-col justify-center gap-1.5">
        {ranges.map((row) => (
          <div key={row.company} className="flex max-h-10 min-h-7 flex-1 items-center gap-3">
            <span
              title={row.company}
              className="w-36 shrink-0 truncate text-body-s text-text-secondary"
            >
              {row.company}
            </span>

            <div className="relative h-full max-h-6 min-h-5 flex-1 rounded-sm bg-bg-inset">
              {median !== null && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 w-px bg-border-strong"
                  style={{ left: pct(median) }}
                />
              )}
              {/*
                accent-default at 35%, NOT accent-subtle. `accent-subtle` is a
                surface token: in dark mode it resolves to rgb(24,24,27),
                darker than the rgb(39,39,42) track behind it, so the band read
                as a hole punched in the row rather than as a bar. A tint of
                the accent reads as the same colour family as the average
                marker sitting inside it, which is the relationship the plot is
                drawing.
              */}
              <span
                className="absolute inset-y-0 rounded-sm bg-accent-default/35"
                style={{
                  left: pct(row.min),
                  // A floor, so a one-ended posting (min === max) is a visible
                  // tick rather than a zero-width nothing.
                  width: `max(${pct(row.max - row.min)}, 3px)`,
                }}
              />
              {/*
                A tick, not a dot. A ringed 10px dot covered an 11px band
                whole -- measured, on the two tightest rows -- so the reader
                could not see there was a range there at all. A 2px rule sits
                INSIDE the band the way a boxplot's median does, and never
                hides the thing it is marking.
              */}
              <span
                aria-hidden
                className="absolute inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-accent-default"
                style={{ left: pct(row.average) }}
              />
            </div>

            <span className="tabular w-32 shrink-0 text-right text-body-s text-text-primary">
              {money.format(Math.round(row.min))}
              <span className="text-text-muted">
                {row.max === row.min ? '' : `\u2013${compact(row.max)}`}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 text-body-s text-text-muted">
        <span className="w-36 shrink-0" />
        <span className="flex-1">
          {/* The dot and the rule are the only two marks that need naming; the
              band is self-evident once they are. */}
          <span className="inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-accent-default" /> average
          <span className="ml-3 inline-block h-3 w-px translate-y-0.5 bg-border-strong" /> median
          {median !== null ? ` ${money.format(Math.round(median))}` : ''}
        </span>
        <span className="tabular w-32 shrink-0 text-right">up to {compact(max)}</span>
      </div>
    </div>
  )
}
