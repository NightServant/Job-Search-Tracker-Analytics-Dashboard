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
 */
export function ApplicationsOverTime({ data }: ApplicationsOverTimeProps) {
  const reducedMotion = usePrefersReducedMotion()

  return (
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
  )
}
