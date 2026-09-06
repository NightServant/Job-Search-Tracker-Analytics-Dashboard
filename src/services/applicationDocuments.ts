export interface DocumentLinkSummary {
  /** The resume this link points at, needed to read its content for ATS matching. */
  resume_id: string
  title: string
  version: number | null
  sent_at: string
}

/**
 * The other direction: one application a CV was submitted to.
 *
 * A separate type rather than a widened `DocumentLinkSummary`, because the two
 * answer different questions and carry different fields -- this one has no
 * snapshot version (the editor is showing the CV as it is now, not as it was)
 * and does carry the company and role, which is the whole point of it.
 */
export interface ResumeLinkSummary {
  job_id: string
  company: string
  role: string
  /** The application's pipeline status, or null if the row went missing. */
  status: string | null
  sent_at: string
}

/**
 * Formats a DATE column for display.
 *
 * Read entirely in UTC. `sent_at` is a bare DATE, which parses as UTC midnight,
 * so reading any part of it in local time would shift the day backwards west of
 * UTC and could name the wrong month across a boundary.
 */
function formatSentDate(iso: string): string {
  const d = new Date(iso)
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
  return `${String(d.getUTCDate()).padStart(2, '0')} ${month} ${d.getUTCFullYear()}`
}

/**
 * One-line summary of which CV went to an application.
 *
 * A null version means no snapshot was pinned, so the link tracks whatever the
 * CV looks like now — "latest" rather than a fixed point in its history.
 */
export function describeLink(link: DocumentLinkSummary): string {
  const version = link.version === null ? 'latest' : `version ${link.version}`
  return `${link.title} · ${version} · sent ${formatSentDate(link.sent_at)}`
}

/**
 * One-line summary of an application a CV went to, for the editor's dropdown.
 *
 * Role first, then company: a person with four CVs open is scanning for the
 * ROLE they tailored one against, and the company is the disambiguator.
 */
export function describeResumeLink(link: ResumeLinkSummary): string {
  return `${link.role} · ${link.company} · sent ${formatSentDate(link.sent_at)}`
}
