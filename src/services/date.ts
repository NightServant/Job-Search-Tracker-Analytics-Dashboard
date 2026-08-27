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

/**
 * The last-touched column specifically: `last_touched_at` (built in
 * `Dashboard.tsx` as `job.updated_at || job.date_applied || job.created_at`)
 * is, in the common case, `updated_at` -- a `TIMESTAMPTZ DEFAULT NOW()` (see
 * `supabase/migrations/20260821042747_create_jobs_table_with_rls.sql`), a
 * real instant, not a calendar day.
 *
 * That is the opposite of `date_applied`, the bare `DATE` that
 * `formatAppliedDate` (via `formatShortDate`) deliberately reads in UTC so a
 * dateless day never shifts. An instant has no such ambiguity to protect
 * against -- it names a specific moment -- so converting it to a calendar day
 * must use the *viewer's* local zone, or the day is simply wrong for anyone
 * materially east or west of UTC. That distinction matters most here because
 * `FollowUpNudge`'s whole point is "how long has this been sitting," and a
 * UTC read flips to the wrong day for up to a third of the clock depending on
 * the viewer's offset.
 *
 * Do not point this at `date_applied` or any other bare `DATE` column, and do
 * not fold this back into `formatShortDate` -- the two column types need
 * opposite zone handling, and collapsing them is the exact regression this
 * function exists to undo.
 */
export function formatTouchedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
