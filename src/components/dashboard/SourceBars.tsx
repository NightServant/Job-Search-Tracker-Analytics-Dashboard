'use client'

import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { EmptyState } from '@/components/ui/empty-state'
import type { SourceCount } from '@/lib/overviewSeries'

const CONFIG = {
  count: { label: 'applications', color: 'var(--color-accent-default)' },
} satisfies ChartConfig

export interface SourceBarsProps {
  data: SourceCount[]
}

/**
 * Applications by source — shadcn's `chart-bar-horizontal`.
 *
 * This panel is NOT in the Figma. Gabe asked for a bar chart on the Overview
 * alongside the line and the doughnut, and the three frames drawn there cover
 * time, status and upcoming events. Source is the one dimension none of them
 * shows, and the old `DashboardBlocks` already computed it as a plain text
 * list — so charting it preserves data the previous screen surfaced instead of
 * dropping it on the way to a nicer layout.
 *
 * Horizontal because source names are words of unpredictable length
 * ("Jobstreet", "referral from a friend"): as vertical x-axis ticks they
 * truncate or rotate, and neither reads.
 *
 * The accent carries the bars. A source is not a status, so the five status
 * hues would be borrowing a vocabulary that means something else.
 */
export function SourceBars({ data }: SourceBarsProps) {
  const reducedMotion = usePrefersReducedMotion()
  // Height follows the row count instead of being fixed. recharts divides the
  // plot area between however many categories it has, so a fixed 224px box
  // with two sources gives two ~100px slabs -- the bars grow to fill the
  // space rather than the space fitting the bars. 28px a row plus axis
  // padding, and maxBarSize caps the thickness independently, so one source
  // and six both read as the same chart.
  const height = Math.max(96, data.length * 28 + 32)

  if (data.length === 0) {
    return (
      <EmptyState icon="Analytics">
        no sources recorded yet. add one to an application and it shows up here.
      </EmptyState>
    )
  }

  return (
    <ChartContainer config={CONFIG} className="aspect-auto w-full" style={{ height }} data-chart-sources>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 0 }}>
        <CartesianGrid horizontal={false} strokeDasharray="0" />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} className="tabular" />
        <YAxis
          type="category"
          dataKey="source"
          width={96}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar
          dataKey="count"
          fill="var(--color-accent-default)"
          radius={[0, 2, 2, 0]}
          maxBarSize={20}
          isAnimationActive={!reducedMotion}
        />
      </BarChart>
    </ChartContainer>
  )
}
