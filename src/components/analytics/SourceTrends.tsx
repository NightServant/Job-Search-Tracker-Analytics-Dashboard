'use client'

import * as React from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { SourceConversionTrend } from '@/services/analyticsService'

export interface SourceTrendsProps {
  data: SourceConversionTrend[]
}

// Solid for the leading source, then dash, dot, dash-dot -- distinguishing
// lines by pattern rather than by adding more hues. This system already
// reserves one accent and five status colours; a sixth arbitrary hue for
// "whichever job board happens to be third" would be a colour invented for
// this screen alone, which the "screens write no new component styling"
// constraint rules out.
const DASH_PATTERNS: (string | undefined)[] = [undefined, '4 3', '1 3', '6 2 1 2']

function monthLabel(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number)
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

/**
 * Conversion rate per source, over the months the range picker selects --
 * this is one of the two panels (with `CohortTable`) that actually has a
 * `month` field to filter on. `Analytics.tsx` does the filtering before this
 * component ever sees `data`; this component just draws whatever it's given.
 *
 * Line colour follows the same var()-token discipline as `FunnelChart` and
 * `TimeInStage`: the leading source (by total applications) reads
 * `accent-default`, the rest read `text-muted`, told apart by dash pattern
 * rather than hue.
 */
export function SourceTrends({ data }: SourceTrendsProps) {
  const reducedMotion = usePrefersReducedMotion()

  const { sources, chartRows } = React.useMemo(() => {
    const totals = new Map<string, number>()
    for (const row of data) totals.set(row.source, (totals.get(row.source) ?? 0) + row.applied)
    const sortedSources = [...totals.keys()].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0))

    const months = [...new Set(data.map((d) => d.month))].sort()
    const rows = months.map((month) => {
      const row: Record<string, number | string> = { month, label: monthLabel(month) }
      for (const source of sortedSources) {
        const match = data.find((d) => d.month === month && d.source === source)
        if (match) row[source] = Math.round(match.conversionRate * 10) / 10
      }
      return row
    })
    return { sources: sortedSources, chartRows: rows }
  }, [data])

  if (data.length === 0) {
    return <p className="text-body-s text-text-muted">not enough data yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border-subtle)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              stroke="var(--color-border-default)"
            />
            <YAxis
              tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              stroke="var(--color-border-default)"
              unit="%"
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-canvas)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 4,
              }}
            />
            {sources.map((source, index) => (
              <Line
                key={source}
                type="monotone"
                dataKey={source}
                name={source}
                stroke={index === 0 ? 'var(--color-accent-default)' : 'var(--color-text-muted)'}
                strokeDasharray={DASH_PATTERNS[index % DASH_PATTERNS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={!reducedMotion}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-4">
        {sources.map((source, index) => (
          <li key={source} className="flex items-center gap-2 text-body-s text-text-secondary">
            <span
              aria-hidden
              className="h-[2px] w-4"
              style={{
                backgroundColor: index === 0 ? 'var(--color-accent-default)' : 'var(--color-text-muted)',
              }}
            />
            {source}
          </li>
        ))}
      </ul>
    </div>
  )
}
