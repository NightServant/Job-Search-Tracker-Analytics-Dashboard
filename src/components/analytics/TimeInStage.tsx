'use client'

import * as React from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { STATUSES, type Status } from '@/components/ui/status-marker'
import { STAGE_FILL } from './FunnelChart'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { TimeInStageMetric } from '@/services/analyticsService'

const LABELS: Record<Status, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}

export interface TimeInStageProps {
  data: TimeInStageMetric[]
}

/**
 * Average days spent in each status, one bar per stage present in `data`,
 * in pipeline order. Has no date field -- see `Analytics.tsx` -- so it
 * always reads "All time" and never responds to the range picker.
 *
 * Bar colour comes from `STAGE_FILL`, the same token map `FunnelChart` uses
 * and documents in full: every fill handed to Recharts is a `var(--color-
 * status-*-mark)` reference, never a colour resolved in JS, so it carries
 * the same theme-change guarantee without a second colour system.
 */
export function TimeInStage({ data }: TimeInStageProps) {
  const reducedMotion = usePrefersReducedMotion()

  if (data.length === 0) {
    return <p className="text-body-s text-text-muted">not enough data yet.</p>
  }

  const chartData = STATUSES.filter((status) => data.some((d) => d.status === status)).map((status) => {
    const metric = data.find((d) => d.status === status)!
    return { status, label: LABELS[status], avgDays: metric.avgDays, fill: STAGE_FILL[status] }
  })

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border-subtle)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            stroke="var(--color-border-default)"
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            stroke="var(--color-border-default)"
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-bg-inset)' }}
            contentStyle={{
              background: 'var(--color-bg-canvas)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 4,
            }}
            // recharts 3 types a Tooltip formatter's first argument as
            // `ValueType | undefined`, so the `(value: number) =>` signature
            // this had under recharts 2 no longer typechecks. The narrowing is
            // done here rather than by widening the tuple's element types.
            formatter={(value) => [`${Number(value)} days`, 'Avg. time in stage']}
          />
          <Bar
            dataKey="avgDays"
            isAnimationActive={!reducedMotion}
            radius={[2, 2, 0, 0]}
            // Uncapped, recharts divides the full panel width by the number of
            // stages, so an account with two stages draws two slabs half the
            // panel wide. Same cap the salary histogram uses.
            maxBarSize={72}
          >
            {chartData.map((d) => (
              <Cell key={d.status} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
