import { localDayKey } from './date'

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
 *
 * The bucket key is `localDayKey(event.starts_at)` -- the viewer's LOCAL
 * calendar day, not `starts_at.slice(0, 10)` (the UTC day embedded in the
 * ISO string, which this function used before). `starts_at` is a
 * TIMESTAMPTZ instant, and the calendar this feeds (`MonthGrid`/`WeekStrip`
 * in `src/components/calendar/`) is built from local `Date`s via
 * `buildMonthGrid`/`weekOf` in `src/lib/calendar.ts`. Keying on the UTC day
 * would file an evening event into the previous day's cell for anyone in a
 * zone ahead of UTC -- see `localDayKey`'s docblock in `src/services/date.ts`
 * for the full reasoning, which is the same call already made for
 * `formatTouchedDate` in commit `10f24b6`.
 */
export function groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>()
  const sorted = [...events].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )
  for (const event of sorted) {
    const day = localDayKey(event.starts_at)
    const bucket = grouped.get(day)
    if (bucket) bucket.push(event)
    else grouped.set(day, [event])
  }
  return grouped
}
