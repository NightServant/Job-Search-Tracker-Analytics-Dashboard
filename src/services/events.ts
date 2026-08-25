export type EventKind = 'interview' | 'deadline' | 'take_home' | 'follow_up' | 'other'

export interface CalendarEvent {
  id: string
  job_id: string | null
  user_id: string
  kind: EventKind
  title: string
  starts_at: string
  duration_minutes: number | null
  notes: string | null
}

/**
 * Buckets events into calendar days, each bucket ordered by start time.
 *
 * Sorting happens once over the whole list before bucketing, so insertion
 * order into each day is already chronological. The input is copied rather
 * than sorted in place: callers pass arrays they still hold.
 */
export function groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>()
  const sorted = [...events].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )
  for (const event of sorted) {
    const day = event.starts_at.slice(0, 10)
    const bucket = grouped.get(day)
    if (bucket) bucket.push(event)
    else grouped.set(day, [event])
  }
  return grouped
}
