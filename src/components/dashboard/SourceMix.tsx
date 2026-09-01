'use client'

import * as React from 'react'
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { EmptyState } from '@/components/ui/empty-state'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { RankedSource } from '@/lib/overviewSeries'

const CONFIG = {
  count: { label: 'applications' },
} satisfies ChartConfig

export interface SourceMixProps {
  data: RankedSource[]
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
 * Each rank gets its own colour, from the `chart-1..3` series tokens. Stepped
 * OPACITY of one accent was the previous version and Gabe rejected it: a
 * single colour at three alphas is one colour, and against a tinted track the
 * faintest step was nearly the track itself.
 *
 * The series tokens are three steps of the accent ramp rather than three hues.
 * A source is not a status, so the five status hues would borrow a vocabulary
 * that means something specific everywhere else in this app -- and inventing
 * three new hues for one panel would put colours on screen that mean nothing
 * anywhere else. The ramp inverts in dark so rank 1 stays the most prominent
 * against its own ground.
 *
 * Three rows, not six: the busiest source, the runner-up, and everything else
 * as one `others`. Gabe's shape, and the point of it is that a job search has
 * one or two channels that actually work and a long tail that does not -- six
 * equal rows made the reader do that ranking themselves every time. The rank
 * is written on the row (`primary` / `secondary` / `tertiary`) so the
 * conclusion is stated rather than implied by sort order, and `others` says
 * how many sources it stands for so the tail is visible as a tail.
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
const RANK_LABELS: Record<RankedSource['rank'], string> = {
  primary: 'primary',
  secondary: 'secondary',
  tertiary: 'tertiary',
}

/**
 * Written out rather than indexed, the discipline `STAGE_FILL` and the status
 * marker's `RULES` map already follow: these are raw CSS custom-property
 * references, so a typo fails loudly and greps rather than silently drawing
 * nothing.
 */
const RANK_FILL: Record<RankedSource['rank'], string> = {
  primary: 'var(--color-chart-1)',
  secondary: 'var(--color-chart-2)',
  tertiary: 'var(--color-chart-3)',
}

export function SourceMix({ data }: SourceMixProps) {
  const reducedMotion = usePrefersReducedMotion()

  const max = React.useMemo(() => Math.max(1, ...data.map((d) => d.count)), [data])
  const arcs = React.useMemo(
    () =>
      data.map((row) => ({
        ...row,
        // Keyed on RANK, not on index: the row's own identity decides its
        // colour, so a two-source account and a five-source one give
        // `primary` the same colour rather than reusing whatever index 0
        // happened to be.
        fill: RANK_FILL[row.rank],
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
        // max-w-64, matching StatusDonut exactly: the two panels sit side by
        // side on the Overview, so two rings at different diameters read as a
        // mistake rather than as a distinction.
        className="mx-auto aspect-square w-full max-w-64"
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

      <ul data-source-legend className="flex min-w-0 flex-col gap-3">
        {arcs.map((row) => (
          <li key={row.source} data-source-rank={row.rank} className="flex min-w-0 gap-2">
            <span
              aria-hidden
              className="mt-1.5 size-2 shrink-0"
              style={{ background: row.fill }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-label-caps uppercase text-text-muted">{RANK_LABELS[row.rank]}</p>
              <p className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-body-s text-text-primary">
                  {row.source}
                </span>
                <span className="tabular shrink-0 text-body-s text-text-primary">{row.count}</span>
              </p>
              <p className="text-body-s text-text-muted">
                {Math.round(row.share)}%
                {/* Only the tail needs explaining -- a named source stands for
                    itself, `others` does not. */}
                {row.rank === 'tertiary'
                  ? ` \u00b7 ${row.sources} ${row.sources === 1 ? 'source' : 'sources'}`
                  : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
