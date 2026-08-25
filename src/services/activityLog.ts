export interface ActivityEntry {
  id: string
  job_id: string
  user_id: string
  note: string
  occurred_at: string
}

/**
 * Newest first, for the application detail timeline.
 *
 * Sorts on occurred_at rather than created_at: an entry can be logged after the
 * fact, and the timeline should read in the order things happened, not in the
 * order they were typed. Copies the input so callers keep their own ordering.
 */
export function sortActivityDescending(entries: ActivityEntry[]): ActivityEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )
}
