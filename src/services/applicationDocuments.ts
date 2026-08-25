export interface DocumentLinkSummary {
  title: string
  version: number | null
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
