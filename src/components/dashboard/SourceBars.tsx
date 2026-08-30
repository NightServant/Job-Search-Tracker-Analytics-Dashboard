'use client'

import * as React from 'react'
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
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
 * No x axis and no gridlines. The first cut drew a 0-12 scale with vertical
 * rules behind two bars, which spent most of the panel measuring a number the
 * reader can get exactly from a label at the end of the bar. At this size the
 * comparison between bars is the whole message and the axis is furniture --
 * so the value goes on the bar and the scale goes away. A wider analytics
 * chart with many categories would want the axis back; this one does not.
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
  const height = Math.max(88, data.length * 30 + 16)

  if (data.length === 0) {
    return (
      <EmptyState icon="Analytics">
        no sources recorded yet. add one to an application and it shows up here.
      </EmptyState>
    )
  }

  return (
    <ChartContainer config={CONFIG} className="aspect-auto w-full" style={{ height }} data-chart-sources>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 28, top: 0, bottom: 0 }}>
        {/* hide: the scale still drives bar widths, it just isn't drawn. */}
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="source"
          width={92}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar
          dataKey="count"
          fill="var(--color-accent-default)"
          radius={[0, 2, 2, 0]}
          maxBarSize={14}
          isAnimationActive={!reducedMotion}
        >
          <LabelList
            dataKey="count"
            position="right"
            offset={8}
            className="tabular fill-text-secondary"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
