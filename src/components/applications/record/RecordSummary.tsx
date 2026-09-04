import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { ExternalIcon } from '@/components/icons'
import { formatSalaryRange } from '@/services/salary'
import { formatAppliedDate } from '@/services/date'
import { cn } from '@/lib/utils'
import type { Job, WorkMode } from '@/types'

const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: 'remote',
  hybrid: 'hybrid',
  onsite: 'on-site',
}

export type RecordLayout = 'dialog' | 'page'

/**
 * One label-and-value pair, in whichever of the two shapes the surface uses.
 *
 * THE TWO SHAPES ARE GENUINELY DIFFERENT, not one scaled down. The dialog
 * stacks the label over its value inside a three-column grid, because a wide
 * surface can align twelve values into columns and reading down a column is
 * how you compare them. The page puts the label and value on ONE line, label
 * left and value right, separated by a hairline -- a single vertical column
 * of rows a thumb scrolls through, where stacking each pair would double the
 * height of the section for no gain in legibility.
 */
function Pair({
  label,
  children,
  layout,
  wide,
}: {
  label: string
  children: React.ReactNode
  layout: RecordLayout
  /** Opts a long value out of the grid's columns. Only the posting URL uses it. */
  wide?: boolean
}) {
  if (layout === 'page') {
    return (
      <div className="flex items-baseline justify-between gap-6 border-b border-border-subtle py-3 last:border-b-0">
        <dt className="shrink-0 text-label-caps uppercase text-text-secondary">{label}</dt>
        <dd className="min-w-0 text-right text-body-m text-text-primary">{children}</dd>
      </div>
    )
  }
  return (
    <div className={cn('flex flex-col gap-1', wide && 'col-span-full')}>
      <dt className="text-label-caps uppercase text-text-secondary">{label}</dt>
      <dd className="text-body-m text-text-primary">{children}</dd>
    </div>
  )
}

/** Nothing stored. Muted, and it says which field is empty by sitting under its own label. */
function Unset({ children = 'not set' }: { children?: React.ReactNode }) {
  return <span className="text-text-muted">{children}</span>
}

function TermList({ terms }: { terms: string[] }) {
  if (terms.length === 0) return <Unset>none</Unset>
  return (
    <div className="flex flex-wrap justify-end gap-1.5 sm:justify-start">
      {terms.map((term) => (
        // `outline`, so a tag is a hairline-bordered label rather than a
        // filled pill. Badge is explicitly sanctioned for tags and tech-stack
        // chips and explicitly banned from carrying application status, which
        // stays the StatusMarker's 2px rule.
        <Badge key={term} variant="outline" className="rounded-md">
          {term}
        </Badge>
      ))}
    </div>
  )
}

/**
 * Sections 2 to 6 of the record, read-only: job information, the posting URL,
 * tags and tech stack, the referral flag, and the date applied.
 *
 * COMPANY AND ROLE ARE DELIBERATELY ABSENT even though the section list names
 * them under job information. Both surfaces put them in the header, two lines
 * above this, where they are the record's identity. Printing them again here
 * as two more rows in a twelve-row list is the kind of duplication that makes
 * a dense screen read as filler. They ARE editable under job information --
 * the form is where the section list's reading applies, and that is where
 * they sit.
 *
 * Every empty value says so rather than rendering blank. A blank cell in a
 * grid of values reads as something that failed to load; "not set" reads as a
 * field nobody has filled in, which is what it is.
 */
export interface RecordSummaryProps {
  job: Job
  layout: RecordLayout
}

export function RecordSummary({ job, layout }: RecordSummaryProps) {
  const list = (children: React.ReactNode) => (
    <dl
      className={cn(
        layout === 'page'
          ? 'flex flex-col'
          : 'grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3'
      )}
    >
      {children}
    </dl>
  )

  return (
    <div className="flex flex-col gap-8">
      {list(
        <>
          <Pair label="salary" layout={layout}>
            <span className="tabular">
              {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
            </span>
          </Pair>
          {/*
            Shown beside the figures rather than folded into them. The form's
            own hint says these are "stored in this currency and never
            converted", which makes the code a fact about the row, not a
            formatting detail -- and it is the only thing left to read when
            no salary is stored at all.
          */}
          <Pair label="currency" layout={layout}>
            {job.salary_currency}
          </Pair>
          <Pair label="date applied" layout={layout}>
            <span className="tabular">
              {job.date_applied ? formatAppliedDate(job.date_applied) : <Unset>not applied</Unset>}
            </span>
          </Pair>
          <Pair label="location" layout={layout}>
            {job.location || <Unset />}
          </Pair>
          <Pair label="work mode" layout={layout}>
            {job.work_mode ? WORK_MODE_LABELS[job.work_mode] : <Unset />}
          </Pair>
          <Pair label="source" layout={layout}>
            {job.source || <Unset />}
          </Pair>
          <Pair label="referral" layout={layout}>
            {job.is_referral ? 'came through a referral' : <Unset>no</Unset>}
          </Pair>
          {/*
            IN THE COLUMNS, not spanning them. Given a row of their own each,
            these two left the grid as four consecutive one-item rows and the
            "strong grid alignment" the record is built for stopped after the
            second row. Badges wrap inside a third-column cell perfectly well;
            only the URL, which is a single unbreakable string, genuinely
            needs the full width.
          */}
          <Pair label="tags" layout={layout}>
            <TermList terms={job.tags} />
          </Pair>
          <Pair label="tech stack" layout={layout}>
            <TermList terms={job.tech_stack} />
          </Pair>
          <Pair label="posting url" layout={layout} wide>
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1 break-all text-accent-default underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
              >
                <span className="truncate">{job.url}</span>
                <ExternalIcon size={14} className="shrink-0" aria-hidden />
              </a>
            ) : (
              <Unset>none saved</Unset>
            )}
          </Pair>
        </>
      )}
    </div>
  )
}
