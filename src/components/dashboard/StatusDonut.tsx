'use client'

import * as React from 'react'
import { Label, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { StatusSlice } from '@/lib/overviewSeries'

const CONFIG = {
  count: { label: 'applications' },
  wishlist: { label: 'wishlist', color: 'var(--color-status-wishlist-mark)' },
  applied: { label: 'applied', color: 'var(--color-status-applied-mark)' },
  interviewing: { label: 'interviewing', color: 'var(--color-status-interviewing-mark)' },
  offer: { label: 'offer', color: 'var(--color-status-offer-mark)' },
  rejected: { label: 'rejected', color: 'var(--color-status-rejected-mark)' },
} satisfies ChartConfig

export interface StatusDonutProps {
  data: StatusSlice[]
}

/**
 * The by-status donut and its legend — the Figma Overview's second panel
 * (23:76), a 180px ring with the total and the word `total` in the centre and
 * a five-row legend beneath.
 *
 * This is shadcn's `chart-pie-donut-text` and the match is structural, not an
 * approximation: `<Pie innerRadius>` plus a centred `<Label>` rendering a value
 * and a caption is exactly what Figma nodes 23:84/23:85 draw.
 *
 * These segments genuinely ARE application statuses, so the status palette is
 * correct here — this is the one chart on the Overview where it is. The legend
 * is hand-rolled rather than `ChartLegendContent` because Figma's rows carry a
 * value per status and the shadcn legend renders labels only.
 *
 * All five statuses always render, zeros included: `statusBreakdown` guarantees
 * it, so a colour never migrates to a different meaning as the data changes.
 * A zero-count slice contributes no arc, which is correct — but it keeps its
 * legend row, which is the part that actually answers "how many offers".
 */
export function StatusDonut({ data }: StatusDonutProps) {
  const reducedMotion = usePrefersReducedMotion()
  const total = React.useMemo(() => data.reduce((sum, slice) => sum + slice.count, 0), [data])
  const slices = React.useMemo(
    () => data.map((slice) => ({ ...slice, fill: `var(--color-status-${slice.status}-mark)` })),
    [data]
  )

  return (
    <div className="flex flex-col gap-4">
      <ChartContainer config={CONFIG} className="mx-auto aspect-square h-44" data-chart-donut>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
          <Pie
            data={slices}
            dataKey="count"
            nameKey="label"
            innerRadius={54}
            outerRadius={80}
            strokeWidth={0}
            isAnimationActive={!reducedMotion}
          >
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox)) return null
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="tabular fill-text-primary text-heading-l"
                    >
                      {total}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 20}
                      className="fill-text-muted text-body-s"
                    >
                      total
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul data-donut-legend className="flex flex-col gap-1">
        {data.map((slice) => (
          <li key={slice.status} className="flex items-center gap-2 text-body-s">
            <span
              aria-hidden
              className="size-2 shrink-0"
              style={{ background: `var(--color-status-${slice.status}-mark)` }}
            />
            <span className="flex-1 text-text-secondary">{slice.label}</span>
            <span className="tabular text-text-primary">{slice.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
