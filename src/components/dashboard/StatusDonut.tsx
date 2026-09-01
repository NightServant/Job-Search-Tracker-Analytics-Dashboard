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
 * a five-row legend.
 *
 * Chart left, legend right, two columns, at Gabe's instruction. Stacked, the
 * ring and its five rows made this the tallest panel on the Overview and left
 * the right half of a 668px card empty; side by side the panel is roughly half
 * as tall and the legend sits at the ring's own eye level. It collapses back to
 * one column below `sm`, where two 150px columns would truncate every label.
 *
 * The ring is sized as a proportion of its column rather than at a fixed 176px
 * -- Gabe asked for it larger, and a fixed square would sit small in the middle
 * of a card that grows. Radii are percentages for the same reason: at fixed
 * 54/80 the ring would keep its original thickness inside a bigger box and
 * read as a thin hoop.
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
    <div className="grid flex-1 items-center gap-4 sm:grid-cols-2">
      {/* Enlarged at Gabe's request. `w-full` with a max rather than a fixed
          h-44: the ring now takes whatever its grid column gives it, so it
          grows with the card instead of sitting small in the middle of it,
          and the max stops it outgrowing the legend beside it on a wide
          screen. The radii are proportions of that, not the old fixed 54/80,
          or the ring would keep its original thickness inside a larger box. */}
      <ChartContainer
        config={CONFIG}
        className="mx-auto aspect-square w-full max-w-64"
        data-chart-donut
      >
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
          <Pie
            data={slices}
            dataKey="count"
            nameKey="label"
            innerRadius="62%"
            outerRadius="94%"
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
                      className="tabular fill-text-primary text-display-m"
                    >
                      {total}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 24}
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

      {/* min-w-0 so a long status label truncates inside its own column
          rather than widening the grid track and squeezing the ring. */}
      <ul data-donut-legend className="flex min-w-0 flex-col gap-1">
        {data.map((slice) => (
          <li key={slice.status} className="flex items-center gap-2 text-body-s">
            <span
              aria-hidden
              className="size-2 shrink-0"
              style={{ background: `var(--color-status-${slice.status}-mark)` }}
            />
            <span className="min-w-0 flex-1 truncate text-text-secondary">{slice.label}</span>
            <span className="tabular text-text-primary">{slice.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
