import * as React from 'react'
import { cn } from '@/lib/utils'
import { DocumentsIcon, AlertCircleIcon } from '@/components/icons'
import { describeLink, type DocumentLinkSummary } from '@/services/applicationDocuments'

/**
 * Which CV (or CVs) were sent for this application.
 *
 * Renders through `describeLink` rather than formatting the fields itself,
 * so the wording here can never drift from the summary the Documents screen
 * uses for the same data.
 *
 * `error` is a third state, distinct from both loading and empty: a failed
 * read must not render the same "no CV linked" copy an application that
 * genuinely has none gets.
 */
export interface LinkedCvProps extends React.HTMLAttributes<HTMLElement> {
  links: DocumentLinkSummary[]
  error?: boolean
}

export function LinkedCv({ links, error = false, className, ...props }: LinkedCvProps) {
  return (
    <section
      aria-label="Linked CV"
      className={cn('flex flex-col gap-3 border-t border-border-subtle pt-6', className)}
      {...props}
    >
      <h2 className="text-heading-s text-text-primary">Linked CV</h2>
      {error ? (
        <p className="flex items-start gap-2 text-body-s text-status-rejected-mark">
          <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
          Could not load the linked CV. Try refreshing the page.
        </p>
      ) : links.length === 0 ? (
        <p className="text-body-s text-text-muted">
          No CV linked to this application yet. Pin one from Documents to track which version
          you sent.
        </p>
      ) : (
        <ul className="flex flex-col">
          {links.map((link) => (
            <li
              key={`${link.resume_id}-${link.sent_at}`}
              className="flex items-center gap-3 border-b border-border-subtle py-3 last:border-b-0"
            >
              <DocumentsIcon size={16} className="shrink-0 text-text-muted" />
              <p className="truncate text-body-m text-text-secondary">{describeLink(link)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
