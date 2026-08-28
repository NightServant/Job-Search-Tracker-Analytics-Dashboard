/**
 * Pure grid geometry for the calendar screen -- turning a year/month or an
 * arbitrary date into the `Date[]` shapes `MonthGrid` and `WeekStrip` render.
 *
 * This file does not bucket events into days. `groupEventsByDay` in
 * `src/services/events.ts` already owns that (see its docblock for the
 * TIMESTAMPTZ zone handling), and `Agenda`/`MonthGrid` call it directly --
 * writing a second day-bucketer here would give the calendar two competing
 * ideas of "which day does this event belong to."
 */

/** The Sunday on or before `date`, at local midnight. */
function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - start.getDay())
  return start
}

/**
 * Six full weeks (42 days) covering `month` (0-indexed, matching
 * `Date#getMonth`), padded with the trailing days of the prior month and the
 * leading days of the next rather than blank cells -- so a five-week month
 * like February never renders a shorter grid than a six-week month like
 * August 2026, which would otherwise make the page jump height as the viewer
 * navigates.
 */
export function buildMonthGrid(year: number, month: number): Date[][] {
  const start = startOfWeek(new Date(year, month, 1))
  const weeks: Date[][] = []
  const cursor = new Date(start)
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

/** The seven days (Sunday through Saturday) of the week containing `date`. */
export function weekOf(date: Date): Date[] {
  const start = startOfWeek(date)
  const days: Date[] = []
  const cursor = new Date(start)
  for (let d = 0; d < 7; d++) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

/**
 * The Date-side counterpart to `localDayKey` in `src/services/date.ts`.
 * `groupEventsByDay` buckets events under `localDayKey(event.starts_at)` --
 * a TIMESTAMPTZ instant read in the viewer's local zone -- and a grid cell
 * needs the same "YYYY-MM-DD" string to look its bucket up with
 * `grouped.get(dayKey(cell))`.
 *
 * Deliberately not implemented by importing `localDayKey` and formatting
 * `cell.toISOString()`: `toISOString` converts a local `Date` back to UTC
 * first, which reintroduces the exact local-vs-UTC mismatch this pairing
 * exists to avoid. This function only ever reads the local getters
 * (`getFullYear`/`getMonth`/`getDate`) already on the `Date` objects this
 * file's own grid geometry builds.
 */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * The inverse of `dayKey`: reconstructs the local calendar day a bucket key
 * names, for display (e.g. an agenda day heading). Parses the "YYYY-MM-DD"
 * parts by hand and calls the local `Date(y, m, d)` constructor rather than
 * `new Date(key)` -- the latter parses a bare date string as UTC midnight,
 * which is the wrong calendar day in any zone behind UTC and is precisely
 * the bug class `localDayKey`/`dayKey` exist to keep out of this file.
 */
export function parseDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}
