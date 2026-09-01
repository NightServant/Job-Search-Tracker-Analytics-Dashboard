'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { MonthPoint } from '@/lib/overviewSeries'

const CONFIG = {
  count: { label: 'applications', color: 'var(--color-accent-default)' },
} satisfies ChartConfig

export interface ApplicationsOverTimeProps {
  data: MonthPoint[]
}

/**
 * Applications per month — the Figma Overview's first content panel (22:77).
 *
 * Figma draws a line with six point markers. This is shadcn's
 * `chart-area-gradient` with `dot` enabled, which keeps those markers; the
 * departure is the fill beneath the curve, and it is a deliberate one. Gabe
 * asked for the shadcn chart catalogue, and a monthly count is a volume
 * reading rather than a rate — the filled area says "this much happened",
 * which is what the number is.
 *
 * The accent carries the series because this is not a status: a count of all
 * applications has no single status, and the five status hues mean one
 * specific thing everywhere else in the app.
 *
 * `allowDecimals={false}` on the y axis because a fractional application does
 * not exist; recharts will happily label 0.5 on a small domain otherwise.
 *
 * A stat row sits above the plot, at Gabe's request. A curve answers "what
 * shape" and is poor at "how many" -- reading a total off six stacked areas
 * means adding them up by eye, and the busiest month is a guess unless the
 * dots happen to be far apart. The three figures state what the curve implies.
 *
 * `change` compares the last two COMPLETE months and skips the final bucket,
 * which is the month in progress. Comparing a two-day-old September against a
 * whole August is apples to oranges: it printed -100% on the first of every
 * month, which is arithmetically true and tells the reader nothing except what
 * day it is. Excluding the partial bucket makes the figure stable and about
 * the search rather than about the calendar.
 *
 * It is deliberately absent rather than shown as +100% when the earlier month
 * is zero: a percentage against zero is not a percentage, and Infinity is
 * worse. Same for a series too short to have two complete months.
 */
export function ApplicationsOverTime({ data }: ApplicationsOverTimeProps) {
  const reducedMotion = usePrefersReducedMotion()

  const stats = React.useMemo(() => {
    const total = data.reduce((sum, point) => sum + point.count, 0)
    const busiest = data.reduce<MonthPoint | null>(
      (best, point) => (best === null || point.count > best.count ? point : best),
      null
    )
    // Drop the month in progress: it has had less time to accumulate than
    // anything it would be compared against.
    const complete = data.slice(0, -1)
    const last = complete[complete.length - 1]
    const previous = complete[complete.length - 2]
    // A change against zero is not a percentage, so it stays null and the
    // figure renders as a dash rather than as +100% or Infinity.
    const change =
      last && previous && previous.count > 0
        ? ((last.count - previous.count) / previous.count) * 100
        : null
    return { total, busiest, change, changeMonth: change === null ? null : last.month }
  }, [data])

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* divide-x on the row rather than a border on each cell, the same idiom
          KpiStrip uses: there is then no trailing rule after the last figure
          and no special case for it. A grid rather than flex-wrap, because a
          wrapped flex row puts a vertical rule at the start of the second line
          where there is nothing to its left. */}
      <dl
        data-over-time-stats
        className="grid grid-cols-3 divide-x divide-border-subtle"
      >
        <div className="pr-4">
          <dt className="text-label-caps uppercase text-text-muted">total</dt>
          <dd className="tabular text-heading-m text-text-primary">{stats.total}</dd>
        </div>
        <div className="px-4">
          <dt className="text-label-caps uppercase text-text-muted">busiest month</dt>
          <dd className="tabular text-heading-m text-text-primary">
            {stats.busiest && stats.busiest.count > 0 ? (
              <>
                {stats.busiest.month}
                <span className="ml-1 text-body-s text-text-muted">{stats.busiest.count}</span>
              </>
            ) : (
              '\u2014'
            )}
          </dd>
        </div>
        <div className="pl-4">
          <dt className="text-label-caps uppercase text-text-muted">month on month</dt>
          <dd className="tabular text-heading-m text-text-primary">
            {stats.change === null ? (
              '\u2014'
            ) : (
              <>
                {stats.change > 0 ? '+' : ''}
                {Math.round(stats.change)}%
                {/* Naming the month it measured, because the figure skips the
                    month in progress and would otherwise look wrong to anyone
                    checking it against the last point on the curve. */}
                <span className="ml-1 text-body-s text-text-muted">{stats.changeMonth}</span>
              </>
            )}
          </dd>
        </div>
      </dl>

      <ChartContainer config={CONFIG} className="aspect-auto h-full min-h-56 w-full flex-1" data-chart-over-time>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="overTimeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-default)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-accent-default)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="0" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="tabular"
        />
        <YAxis
          width={28}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          className="tabular"
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Area
          dataKey="count"
          type="monotone"
          stroke="var(--color-accent-default)"
          strokeWidth={2}
          fill="url(#overTimeFill)"
          dot={{ r: 3, strokeWidth: 0, fill: 'var(--color-accent-default)' }}
          activeDot={{ r: 4 }}
          isAnimationActive={!reducedMotion}
        />
      </AreaChart>
      </ChartContainer>
    </div>
  )
}
