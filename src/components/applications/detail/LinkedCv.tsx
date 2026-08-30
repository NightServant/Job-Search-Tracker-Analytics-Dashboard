import * as React from 'react'
import { DocumentsIcon } from '@/components/icons'
import { PanelSection } from '@/components/ui/panel-section'
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
 *
 * The empty copy says only that no CV is linked, not that there is anywhere
 * to link one from -- `documentLinkService.pin` and `.unpin` have zero
 * callers in `src`, and `DocumentRow` renders no pin affordance, so promising
 * one here would point at a control that does not exist.
 */
export interface LinkedCvProps extends React.HTMLAttributes<HTMLElement> {
  links: DocumentLinkSummary[]
  error?: boolean
}

export function LinkedCv({ links, error = false, className, ...props }: LinkedCvProps) {
  return (
    <PanelSection
      aria-label="Linked CV"
      title="linked CV"
      error={error ? 'Could not load the linked CV. Try refreshing the page.' : undefined}
      className={className}
      {...props}
    >
      {links.length === 0 ? (
        <p className="text-body-s text-text-muted">no CV linked to this application yet.</p>
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
    </PanelSection>
  )
}
