'use client'

import * as React from 'react'
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { EmptyState } from '@/components/ui/empty-state'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { SourceCount } from '@/lib/overviewSeries'

const CONFIG = {
  count: { label: 'applications' },
} satisfies ChartConfig

export interface SourceMixProps {
  data: SourceCount[]
}

/**
 * Where applications came from — shadcn's radial chart family.
 *
 * NOT in the Figma. Gabe asked for a chart of this and the three drawn panels
 * cover time, status and events, so source is the dimension none of them
 * shows. It also preserves data the retired `DashboardBlocks` surfaced as text.
 *
 * This was horizontal bars twice, and both were wrong for different reasons.
 * The first drew a 0–12 axis with gridlines behind two bars, spending a small
 * panel measuring a number a label states exactly. The second dropped the axis
 * but was still a bar chart: with one dominant source it is one long slab and
 * one stub, which reads as a rendering glitch rather than a finding.
 *
 * Radial suits the actual shape of this data. Concentric arcs compare lengths
 * against a shared 0–max sweep, so a dominant source is a nearly-closed ring
 * rather than a bar that runs out of panel, and two sources look deliberate
 * where two bars looked broken. It is also visually distinct from the status
 * doughnut beside it — a second donut here would read as the same chart drawn
 * twice.
 *
 * The accent carries every arc, stepped in opacity by rank. A source is not a
 * status, so the five status hues would borrow a vocabulary that means
 * something specific elsewhere in this app.
 *
 * The legend is the numbers. An arc is good at "which is bigger" and bad at
 * "how many", so the exact counts sit beside it rather than in a tooltip only
 * a mouse can reach.
 *
 * Chart left, legend right, two columns, matching `StatusDonut` -- the two
 * panels sit side by side on the Overview, so a different internal layout in
 * each would read as an accident. One column below `sm`, where two narrow
 * tracks would truncate every source name.
 */
export function SourceMix({ data }: SourceMixProps) {
  const reducedMotion = usePrefersReducedMotion()

  const max = React.useMemo(() => Math.max(1, ...data.map((d) => d.count)), [data])
  const arcs = React.useMemo(
    () =>
      data.map((row, i) => ({
        ...row,
        // Stepped, floored so the last arc never fades into the track.
        fill: `color-mix(in oklab, var(--color-accent-default) ${Math.max(40, 100 - i * 16)}%, transparent)`,
      })),
    [data]
  )

  if (data.length === 0) {
    return (
      <EmptyState icon="Analytics">
        no sources recorded yet. add one to an application and it shows up here.
      </EmptyState>
    )
  }

  return (
    <div className="grid flex-1 items-center gap-4 sm:grid-cols-2">
      <ChartContainer
        config={CONFIG}
        className="mx-auto aspect-square w-full max-w-56"
        data-chart-sources
      >
        <RadialBarChart
          data={arcs}
          innerRadius="30%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
        >
          {/* The shared 0..max domain is what makes the arcs comparable; without
              it recharts scales each ring to its own value and every source
              looks identical. */}
          <PolarAngleAxis type="number" domain={[0, max]} tick={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent nameKey="source" hideLabel />} />
          <RadialBar
            dataKey="count"
            background={{ fill: 'var(--color-bg-inset)' }}
            cornerRadius={2}
            isAnimationActive={!reducedMotion}
          />
        </RadialBarChart>
      </ChartContainer>

      <ul data-source-legend className="flex min-w-0 flex-col gap-1">
        {arcs.map((row) => (
          <li key={row.source} className="flex items-center gap-2 text-body-s">
            <span aria-hidden className="size-2 shrink-0" style={{ background: row.fill }} />
            <span className="min-w-0 flex-1 truncate text-text-secondary">{row.source}</span>
            <span className="tabular text-text-primary">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
