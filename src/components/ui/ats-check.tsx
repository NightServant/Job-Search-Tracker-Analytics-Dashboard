import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The Status Marker's vocabulary applied to an ATS verdict.
 *
 * Three outcomes rather than five, and deliberately the same rule-plus-label
 * shape: a reader who has learned to read one is not asked to learn a second
 * grammar for the same kind of information.
 *
 * Review is amber, not orange. They sit close on the wheel, which is the point
 * of the distinction -- amber here never touches the accent, so it cannot be
 * mistaken for an action.
 */
export const ATS_RESULTS = ['pass', 'review', 'fail'] as const

export type AtsResult = (typeof ATS_RESULTS)[number]

const LABELS: Record<AtsResult, string> = {
  pass: 'Pass',
  review: 'Review',
  fail: 'Fail',
}

const RULES: Record<AtsResult, string> = {
  pass: 'bg-status-offer-mark',
  review: 'bg-amber-600',
  fail: 'bg-status-rejected-mark',
}

export interface AtsCheckProps extends React.HTMLAttributes<HTMLSpanElement> {
  result: AtsResult
  label?: string
}

export function AtsCheck({ result, label, className, ...props }: AtsCheckProps) {
  return (
    <span data-ats={result} className={cn('inline-flex flex-col gap-1', className)} {...props}>
      <span className="text-label-caps uppercase text-text-secondary">
        {label ?? LABELS[result]}
      </span>
      <span
        data-status-rule
        aria-hidden
        className={cn('h-[2px] w-full rounded-none', RULES[result])}
      />
    </span>
  )
}
