import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CalloutMetric {
  label: string
  value: string
}

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What is being called out — "best performing cohort", "top converting source". */
  label: string
  metrics: CalloutMetric[]
}

/**
 * The Figma's `Callout / best performing cohort` (79:1006) and its twin on
 * Source Performance (79:1046): a label on the left, then evenly spaced metric
 * blocks.
 *
 * Both cohort analysis and source performance shipped as bare tables. A table
 * answers "what are all the numbers"; it does not answer "which one should I
 * look at", and on a 2560px analytics page that is the question. The callout
 * is the frame's answer to it.
 *
 * The values are SELECTED FROM THE ROWS the table already shows, not fetched.
 * No analyticsService method returns a "best" anything, and inventing a query
 * for a superlative that is one sort away from data already in memory is how
 * M5's Task 8 ended up with a range picker over services that take no range.
 *
 * Hairline top rule, no fill, no border box — a callout is emphasis, and in
 * this system emphasis is a rule and a weight, not a tinted panel.
 */
export function Callout({ label, metrics, className, ...props }: CalloutProps) {
  return (
    <div
      data-callout
      className={cn(
        'flex flex-col gap-4 border-t border-border-subtle pt-4 md:flex-row md:items-baseline md:gap-8',
        className
      )}
      {...props}
    >
      <p className="text-label-caps uppercase text-text-secondary md:w-48 md:shrink-0">{label}</p>
      <dl className="flex flex-1 flex-wrap gap-x-10 gap-y-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-24">
            <dt className="text-body-s text-text-muted">{metric.label}</dt>
            <dd className="tabular text-heading-m text-text-primary">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
