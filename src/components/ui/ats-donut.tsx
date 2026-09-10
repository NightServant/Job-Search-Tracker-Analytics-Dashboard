'use client'

import * as React from 'react'
import { Label, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { AtsResult } from '@/components/ui/ats-check'

/**
 * The ATS score as a ring: how much of the posting's vocabulary the CV covers.
 *
 * WHY A RING AND NOT A BAR. The score is a PROPORTION of one whole -- the
 * terms in the posting, split into the ones the CV mentions and the ones it
 * does not -- and the two lists underneath are that same split spelled out.
 * The old `AtsCheck` rule showed the verdict colour and the number but drew
 * nothing to scale, so "32%" and "82%" were the same picture. Here the arc IS
 * the number, and the missing arc is visibly the work left to do.
 *
 * STRUCTURALLY THE SAME COMPONENT AS `StatusDonut`, deliberately: the same
 * `ChartContainer`/`Pie`/centred-`Label` shape, the same proportional radii,
 * the same reduced-motion opt-out. A second donut built a different way is how
 * two rings on one product come to look like two products.
 *
 * THE COLOUR IS THE VERDICT'S, NOT THE STATUS PALETTE'S. `AtsCheck` already
 * established pass/review/fail as offer-green, amber and rejected-red, and
 * this reads from that same three-way call so the ring and any rule beside it
 * can never disagree. The missing arc is a neutral border tone rather than a
 * second signal colour -- it is the absence of the first, not a status of its
 * own, and a red "missing" arc against an amber "matched" arc would read as
 * two competing verdicts.
 *
 * RESPONSIVE BY CONTAINER, NOT BY VIEWPORT, and that distinction is the whole
 * reason this reads correctly in both places it appears. The record dialog
 * gives it most of a wide panel; the document editor gives it a 320px rail on
 * the SAME wide screen. A viewport `sm:grid-cols-2` cannot tell those apart --
 * it would split that rail into two 150px columns, squeezing the ring and
 * truncating every legend row, on exactly the screens that look roomiest.
 *
 * So the query is on the container: stacked until the panel itself is wide
 * enough, side by side after. Same mechanism `ui/card` already uses.
 */

const CONFIG = {
  count: { label: 'terms' },
  matched: { label: 'matched' },
  missing: { label: 'missing' },
} satisfies ChartConfig

/**
 * The ring's filled arc, in the verdict's own colour.
 *
 * `--color-verdict-*` RATHER THAN THE STATUS HUES, since 2026-09-09. Two
 * things were wrong with the old map. `review` named `--color-amber-600`,
 * which this project has never defined -- it fell through to Tailwind's
 * built-in #d97706, a few degrees off `accent-700`, so the middle verdict
 * drew in what reads as the brand orange and carried no information at all.
 * And every colour was a LIGHT-THEME value used in both themes, because the
 * status hues are deliberately theme-invariant; a ring is a field of colour
 * on the canvas, not a 2px rule, and it needs to step lighter on a dark one.
 *
 * The track is the same story: it was `border-subtle`, 1.5:1 against the
 * canvas, so the "missing" half of the ring was invisible and a 55% score
 * looked like an arc floating in nothing.
 */
const ARC: Record<AtsResult, string> = {
  pass: 'var(--color-verdict-pass)',
  review: 'var(--color-verdict-review)',
  fail: 'var(--color-verdict-fail)',
}

export interface AtsDonutProps {
  /** 0-100. Rendered in the centre, and what the arc is drawn to. */
  score: number
  matched: number
  missing: number
  verdict: AtsResult
}

export function AtsDonut({ score, matched, missing, verdict }: AtsDonutProps) {
  // DRAWN FROM THE COUNTS, not from `score`. The two must agree, and the
  // counts are the thing the lists below are built from -- deriving the arc
  // from the percentage instead would let a rounding difference put a ring at
  // 33% above a list of 32 matched terms out of 100.
  const slices = React.useMemo(
    () => [
      { key: 'matched', label: 'matched', count: matched, fill: ARC[verdict] },
      { key: 'missing', label: 'missing', count: missing, fill: 'var(--color-verdict-track)' },
    ],
    [matched, missing, verdict]
  )

  const total = matched + missing

  return (
    // The container is the OUTER element and the grid is inside it: an
    // element cannot query its own container, so declaring both on one div
    // would resolve `@sm/ats` against some ancestor instead -- silently, and
    // looking correct in whichever layout happened to match.
    <div className="@container/ats">
     <div className="grid items-center gap-4 @sm/ats:grid-cols-2">
      {/* THE NUMBER IN TEXT, not only in the ring.
          The score is drawn as an SVG `<tspan>` inside the chart, which a
          screen reader does not announce and which does not exist at all
          where the chart cannot lay itself out. This is the same fact as a
          sentence, so the panel says what it shows whether or not the picture
          renders. */}
      <p className="sr-only" data-ats-score>
        {score}% match. {matched} of {matched + missing} terms from the posting appear in the CV.
      </p>
      <ChartContainer
        config={CONFIG}
        className="mx-auto aspect-square w-full max-w-44"
        data-ats-donut
      >
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
          <Pie
            data={slices}
            dataKey="count"
            nameKey="label"
            innerRadius="64%"
            outerRadius="94%"
            strokeWidth={0}
            // NO ENTRY ANIMATION, unlike `StatusDonut`. Measured 2026-09-06:
            // with the animation on, this ring drew NO ARCS AT ALL in two
            // environments -- the arcs are only painted as the animation
            // ticks, and where it never starts the ring is an empty circle.
            // `StatusDonut` behaves identically under the same test, so this
            // is Recharts rather than either component; the difference is that
            // this one lives inside a dialog that mounts and unmounts, which
            // is exactly where an entry animation is least reliable.
            //
            // A ring that always renders beats one that sometimes animates,
            // and this is a diagnostic rather than a showpiece. Verified with
            // the animation off: two sectors, 112x78 and 156x148 at 176px.
            isAnimationActive={false}
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
                      {score}%
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 22}
                      className="fill-text-muted text-body-s"
                    >
                      match
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* `min-w-0` so a count never widens the track and squeezes the ring. */}
      <ul data-ats-legend className="flex min-w-0 flex-col gap-1">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2 text-body-s">
            <span aria-hidden className="size-2 shrink-0" style={{ background: slice.fill }} />
            <span className="min-w-0 flex-1 truncate text-text-secondary">{slice.label}</span>
            <span className="tabular shrink-0 text-text-primary">{slice.count}</span>
          </li>
        ))}
        <li className="mt-1 flex items-center gap-2 border-t border-border-subtle pt-2 text-body-s">
          <span className="min-w-0 flex-1 truncate text-text-muted">terms in posting</span>
          <span className="tabular shrink-0 text-text-muted">{total}</span>
        </li>
      </ul>
     </div>
    </div>
  )
}
