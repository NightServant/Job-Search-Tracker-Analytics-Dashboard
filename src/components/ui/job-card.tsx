import * as React from 'react'
import { cn } from '@/lib/utils'
import { StatusMarker, type Status } from '@/components/ui/status-marker'
import { formatSalaryRange } from '@/services/salary'

/**
 * The kanban unit. A card only because it moves -- otherwise it would be a row.
 *
 * Radius stays at 4px and separation is still a hairline border, not a shadow.
 * A drop shadow would be the only elevation anywhere in the system, which is
 * how a flat design quietly acquires a second visual language.
 *
 * `currency` has no default. Currency is stored per job and never inferred,
 * and a fallback value is exactly the inference that rule forbids -- a card
 * that quietly renders a peso figure as USD because a call site forgot the
 * prop is a wrong-by-55x number that still looks plausible.
 */
export interface JobCardProps extends React.HTMLAttributes<HTMLDivElement> {
  company: string
  role: string
  status: Status
  salaryMin?: number | null
  salaryMax?: number | null
  currency: string
}

export function JobCard({
  company,
  role,
  status,
  salaryMin = null,
  salaryMax = null,
  currency,
  className,
  ...props
}: JobCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-canvas p-3',
        'transition-colors duration-[--duration-fast] hover:border-border-default',
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        <p className="truncate text-body-m text-text-primary">{role}</p>
        <p className="truncate text-body-s text-text-muted">{company}</p>
      </div>
      <p className="tabular text-body-s text-text-secondary">
        {formatSalaryRange(salaryMin, salaryMax, currency)}
      </p>
      <StatusMarker status={status} className="w-20" />
    </article>
  )
}
