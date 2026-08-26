import * as React from 'react'
import { cn } from '@/lib/utils'
import { ExternalIcon } from '@/components/icons'

/**
 * The posting text, verbatim.
 *
 * `whitespace-pre-wrap` rather than re-flowing the text: postings arrive
 * pasted from a browser or a CSV import, and reformatting them risks losing
 * the paragraph breaks that make a wall of requirements readable.
 *
 * A missing description is not cosmetic here -- it is also why `AtsPanel`
 * below has nothing to score against, so the empty state says so rather than
 * leaving a blank region that reads as still loading.
 */
export interface JobDescriptionProps extends React.HTMLAttributes<HTMLElement> {
  description: string | null
  url?: string | null
}

export function JobDescription({ description, url, className, ...props }: JobDescriptionProps) {
  return (
    <section
      aria-label="Job description"
      className={cn('flex flex-col gap-3 border-t border-border-subtle pt-6', className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-heading-s text-text-primary">Job description</h2>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-body-s text-text-secondary hover:text-text-primary hover:underline"
          >
            View posting
            <ExternalIcon size={14} />
          </a>
        )}
      </div>
      {description ? (
        <p className="whitespace-pre-wrap text-body-m text-text-secondary">{description}</p>
      ) : (
        <p className="text-body-s text-text-muted">
          No job description saved. Add one on the application to see it here and to score it
          against a CV.
        </p>
      )}
    </section>
  )
}
