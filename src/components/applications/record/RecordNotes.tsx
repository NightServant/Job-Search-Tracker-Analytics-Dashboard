import * as React from 'react'
import { PanelSection } from '@/components/ui/panel-section'
import type { Job } from '@/types'

/**
 * Section 11: whatever the user wrote against this application.
 *
 * `whitespace-pre-wrap`, matching `JobDescription`: notes are typed with
 * deliberate line breaks and re-flowing them loses the only structure a
 * free-text field has.
 */
export function RecordNotes({ notes }: { notes: string | null }) {
  return (
    <PanelSection aria-label="Notes" title="notes" icon="Info">
      {notes ? (
        <p className="whitespace-pre-wrap text-body-m text-text-secondary">{notes}</p>
      ) : (
        <p className="text-body-s text-text-muted">nothing written against this application yet.</p>
      )}
    </PanelSection>
  )
}

/**
 * The contact on the application: name, email, LinkedIn and notes.
 *
 * NOT IN THE SECTION LIST THIS RECORD WAS SPECIFIED FROM, and kept anyway.
 * Four columns on `jobs` hold this -- `contact_name`, `contact_email`,
 * `contact_linkedin`, `contact_notes` -- the form has always written them,
 * and dropping the section would leave an account that had filled them in
 * with no way to read or change the data again. Losing a capability is a
 * bigger change than adding a twelfth section, so it stays until Gabe says
 * otherwise.
 *
 * IT RENDERS NOTHING AT ALL when all four are empty, which is the common
 * case. An unasked-for section that is also permanently blank is the worst of
 * both, so this one earns its space only when it has something to show.
 */
export function RecordContact({ job }: { job: Job }) {
  const rows: { label: string; value: string | null; href?: string }[] = [
    { label: 'name', value: job.contact_name },
    {
      label: 'email',
      value: job.contact_email,
      href: job.contact_email ? `mailto:${job.contact_email}` : undefined,
    },
    {
      label: 'linkedin',
      value: job.contact_linkedin,
      href: job.contact_linkedin ?? undefined,
    },
  ].filter((row) => !!row.value)

  if (rows.length === 0 && !job.contact_notes) return null

  return (
    <PanelSection aria-label="Contact" title="contact" icon="Mail">
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-6 border-b border-border-subtle py-3 last:border-b-0"
          >
            <dt className="shrink-0 text-label-caps uppercase text-text-secondary">{row.label}</dt>
            <dd className="min-w-0 truncate text-right text-body-m text-text-primary">
              {row.href ? (
                <a
                  href={row.href}
                  target={row.label === 'linkedin' ? '_blank' : undefined}
                  rel={row.label === 'linkedin' ? 'noreferrer' : undefined}
                  className="text-accent-default underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
                >
                  {row.value}
                </a>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {job.contact_notes && (
        <p className="whitespace-pre-wrap text-body-m text-text-secondary">{job.contact_notes}</p>
      )}
    </PanelSection>
  )
}
