import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Label, value, delta.
 *
 * The value carries `tabular`, which is not cosmetic. In proportional figures a
 * 1 is narrower than an 8, so a KPI that ticks from 118 to 88 visibly reflows
 * and the strip looks broken while it updates. Figma's Data/* styles lost their
 * mono face, so this has to come from CSS rather than from the type scale.
 *
 * Direction is carried by a word as well as a hue, because green-up/red-down is
 * exactly the pair that red-green colour blindness collapses.
 */
export interface KpiStatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  delta?: { value: string; direction: 'up' | 'down' | 'flat' }
}

const DELTA_TONE = {
  up: 'text-status-offer-mark',
  down: 'text-status-rejected-mark',
  flat: 'text-text-muted',
} as const

const DELTA_WORD = { up: 'up', down: 'down', flat: 'flat' } as const

export function KpiStat({ label, value, delta, className, ...props }: KpiStatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      <span className="text-label-caps uppercase text-text-muted">{label}</span>
      <span data-kpi-value className="tabular text-data-l text-text-primary">
        {value}
      </span>
      {delta && (
        <span className={cn('tabular text-body-s', DELTA_TONE[delta.direction])}>
          <span className="sr-only">{DELTA_WORD[delta.direction]} </span>
          {delta.value}
        </span>
      )}
    </div>
  )
}
