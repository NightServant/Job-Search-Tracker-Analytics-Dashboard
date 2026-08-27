/**
 * Short "Mon D" display for a date-ish column, read entirely in UTC.
 *
 * `date_applied` is a bare `DATE` ("2026-08-20"), which the JS `Date`
 * constructor parses as UTC midnight; a `TIMESTAMPTZ` like `created_at`
 * carries a real UTC instant. Formatting both in the caller's local zone
 * would shift a bare `DATE` back a day for anyone west of UTC, and would
 * make the two column types render through different rules depending on
 * which one happened to reach this function -- reading both in UTC keeps
 * one rule for both.
 *
 * No year, matching `FollowUpNudge`'s existing "since Aug 20" style: this is
 * a dense list/row context (`ApplicationRow` gives the whole column 6rem),
 * not the detail page's activity log, which spans enough time that dropping
 * the year would be ambiguous.
 */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * The applied-date column specifically: `null` means the job hasn't been
 * applied to yet (most often a wishlist entry), which is a different fact
 * from a fetch that hasn't resolved, so it renders as "Not applied" rather
 * than falling back to some other timestamp on the row. `created_at` used to
 * stand in for a missing `date_applied` on the dashboard, which told anyone
 * looking at an old wishlist entry that they'd applied on the day the row was
 * created -- a fabricated date is worse than an honest "not applied".
 */
export function formatAppliedDate(dateApplied: string | null): string {
  return dateApplied ? formatShortDate(dateApplied) : 'Not applied'
}
