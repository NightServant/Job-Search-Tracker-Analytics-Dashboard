import * as React from 'react'
import { STATUSES, type Status } from '@/components/ui/status-marker'
import { EmptyState } from '@/components/ui/empty-state'
import type { ConversionFunnelMetric } from '@/services/analyticsService'

const LABELS: Record<Status, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}

/**
 * Written out rather than interpolated, matching the discipline
 * `status-marker.tsx`'s `RULES` map established -- though the reason differs
 * slightly here. `bg-status-${status}-mark` is a Tailwind utility class, and
 * Tailwind only emits CSS for class names its static scanner literally sees
 * in source text, so a runtime-built one produces nothing. These are raw CSS
 * custom-property *references*, not Tailwind classes -- `src/index.css`'s
 * `@theme` block defines `--color-status-*-mark` unconditionally, so nothing
 * needs to be "seen" by a scanner for `var(--color-status-wishlist-mark)` to
 * resolve. Spelled out anyway, for the same reason a lookup table beats a
 * template string even when nothing forces it: it is grep-able, and a typo
 * fails loudly instead of silently drawing nothing.
 *
 * This is also the whole answer to the "Recharts colour hazard" for this
 * component. The value handed to the DOM is always the token reference
 * itself, never a colour resolved in JS -- so there is no `getComputedStyle`
 * call that can return `''` in jsdom (trap 1), and no snapshot taken once at
 * mount that can go stale after a theme change (trap 2). The browser's own
 * CSS cascade resolves the reference at paint time, live, every time --
 * exactly the thing next-themes' `.dark` class toggle needs charts to do.
 */
export const STAGE_FILL: Record<Status, string> = {
  wishlist: 'var(--color-status-wishlist-mark)',
  applied: 'var(--color-status-applied-mark)',
  interviewing: 'var(--color-status-interviewing-mark)',
  offer: 'var(--color-status-offer-mark)',
  rejected: 'var(--color-status-rejected-mark)',
}

export interface FunnelStageDatum {
  stage: Status
  count: number
  percentage: number
  /** See `ConversionFunnelMetric.isExit`. `true` only for 'rejected'. */
  isExit: boolean
}

/**
 * Normalizes `analyticsService.getConversionFunnel`'s return shape into this
 * chart's own, sorted into pipeline order (wishlist -> applied ->
 * interviewing -> offer -> rejected).
 *
 * The service now reports all five stages (fixed in Task 8's fix round --
 * previously `wishlist` was never computed and `rejected` was computed then
 * silently discarded). Stages the service does not report are still left out
 * of the chart rather than fabricated as a zero bar, the same "do not fake
 * it" principle the range-picker ruling applied to ranges -- this only
 * matters for a caller passing a partial fixture, since production always
 * returns all five now.
 *
 * `rejected` sorts last here (STATUSES order), but `isExit` is what
 * `FunnelChart` actually uses to keep it out of the monotonic chain visually
 * -- position alone must never be read as chain membership.
 */
export function normalizeFunnel(metrics: ConversionFunnelMetric[]): FunnelStageDatum[] {
  const byStage = new Map<Status, ConversionFunnelMetric>()
  for (const metric of metrics) {
    const stage = metric.stage.toLowerCase() as Status
    if ((STATUSES as readonly string[]).includes(stage)) byStage.set(stage, metric)
  }
  return STATUSES.filter((stage) => byStage.has(stage)).map((stage) => {
    const metric = byStage.get(stage)!
    return { stage, count: metric.count, percentage: metric.percentage, isExit: metric.isExit }
  })
}

export interface FunnelChartProps {
  data: FunnelStageDatum[]
}

/**
 * A horizontal bar per stage rather than a Recharts `Funnel` wedge. The
 * wedge shape reads as decoration this system otherwise avoids -- no
 * shadows, no rounded cards -- and a labelled bar keeps the count tabular
 * and the stage colour a flat rule, consistent with `StatusMarker` and
 * `KpiStat` elsewhere on this screen.
 *
 * `isExit` stages (currently just 'rejected') render in their own group
 * below a hairline divider rather than as the next bar in the list --
 * visually as well as structurally, a rejection is an exit from the funnel,
 * not the fifth rung of a chain that is supposed to read top-to-bottom as
 * monotonically non-increasing.
 */
export function FunnelChart({ data }: FunnelChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState icon="Analytics">
        not enough data yet. this fills in as applications move through the pipeline.
      </EmptyState>
    )
  }

  const chain = data.filter((d) => !d.isExit)
  const exits = data.filter((d) => d.isExit)
  // The chain's own top stage is the denominator, not the global max. A funnel
  // reads as "what fraction survived each step", and measuring against an exit
  // count would make a heavily-rejected pipeline look like it converted well.
  const top = Math.max(chain[0]?.count ?? 0, 1)

  return (
    <div className="flex flex-col gap-4">
      {/* An actual funnel, not a bar list: each stage is centred and its width
          is its share of the first stage, so the taper IS the conversion. The
          previous version was left-aligned tracks of equal length, which is a
          bar chart wearing the word "funnel" -- you had to read the numbers to
          see the shape the chart exists to show. */}
      <div data-funnel-chain className="flex flex-col items-center gap-1">
        {chain.map((d) => {
          const share = d.count / top
          return (
            <div key={d.stage} className="flex w-full items-center gap-3">
              <span className="w-24 shrink-0 text-body-s text-text-secondary">
                {LABELS[d.stage]}
              </span>
              <div
                data-stage={d.stage}
                className="flex h-7 flex-1 items-center justify-center"
              >
                <div
                  data-fill={STAGE_FILL[d.stage]}
                  className="h-7 rounded-sm transition-[width] duration-[--duration-base]"
                  style={{
                    // A floor so a zero stage is still a visible tick rather
                    // than nothing -- "0 got here" is information.
                    width: `${Math.max(share * 100, 1.5)}%`,
                    backgroundColor: STAGE_FILL[d.stage],
                  }}
                />
              </div>
              <span className="tabular w-16 shrink-0 text-right text-body-s text-text-primary">
                {d.count}
                <span className="ml-1 text-text-muted">
                  {Math.round(share * 100)}%
                </span>
              </span>
            </div>
          )
        })}
      </div>

      {exits.length > 0 && (
        <div
          data-funnel-exits
          className="flex flex-col gap-1 border-t border-border-subtle pt-3"
        >
          {exits.map((d) => (
            <div key={d.stage} className="flex w-full items-center gap-3">
              <span className="w-24 shrink-0 text-body-s text-text-secondary">
                {LABELS[d.stage]}
              </span>
              <div
                data-stage={d.stage}
                data-exit="true"
                className="flex h-5 flex-1 items-center"
              >
                <div
                  data-fill={STAGE_FILL[d.stage]}
                  className="h-5 rounded-sm"
                  style={{
                    width: `${Math.max((d.count / top) * 100, 1.5)}%`,
                    backgroundColor: STAGE_FILL[d.stage],
                  }}
                />
              </div>
              <span className="tabular w-16 shrink-0 text-right text-body-s text-text-primary">
                {d.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
