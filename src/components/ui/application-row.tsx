import * as React from 'react'
import { cn } from '@/lib/utils'
import { StatusMarker, type Status } from '@/components/ui/status-marker'
import { formatSalaryRange } from '@/services/salary'

/**
 * One application, one line.
 *
 * Rows are separated by a hairline rule on the row itself rather than by a
 * border around each one. A list of bordered cards draws 2px between every
 * neighbour and boxes the whole list twice; a shared rule draws 1px once.
 *
 * Salary goes through M2's formatSalaryRange rather than being formatted here,
 * so a PHP figure can never be rendered with a dollar sign. Currency is stored
 * per job and never inferred.
 */
export interface ApplicationRowProps extends React.HTMLAttributes<HTMLDivElement> {
  company: string
  role: string
  status: Status
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  date: string
}

export function ApplicationRow({
  company,
  role,
  status,
  salaryMin,
  salaryMax,
  currency,
  date,
  className,
  ...props
}: ApplicationRowProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border-subtle py-3',
        'md:grid-cols-[2fr_1.5fr_7rem_6rem]',
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        <p className="truncate text-body-m text-text-primary">{company}</p>
        <p className="truncate text-body-s text-text-muted md:hidden">{role}</p>
      </div>
      <p className="hidden min-w-0 truncate text-body-m text-text-secondary md:block">{role}</p>
      <p className="hidden tabular text-body-s text-text-secondary md:block">
        {formatSalaryRange(salaryMin, salaryMax, currency)}
      </p>
      <div className="flex items-center justify-end gap-4">
        <StatusMarker status={status} className="w-20" />
        <time className="tabular hidden text-body-s text-text-muted md:block">{date}</time>
      </div>
    </div>
  )
}
