/**
 * The analytics range picker's pure maths, split out of `RangePicker.tsx` for
 * the same reason `buildMonthGrid`/`weekOf` live in `src/lib/calendar.ts`
 * rather than inside `Calendar.tsx`: boundary arithmetic is where these
 * things break, and it is easier to pin the boundary in a unit test than a
 * rendered component.
 *
 * SUPERSEDED, 2026-09-09. The old ruling here was that `analyticsService`'s
 * five methods took only `userId`, so the picker could only ever filter the
 * two return shapes carrying a `YYYY-MM` field -- the other three panels said
 * "All time" whatever was picked. That is exactly what Gabe reported as a
 * "dead dropdown": choosing Last 3 months changed one table out of six and
 * left every other card claiming all time.
 *
 * The range now reaches the SERVICE, which scopes the underlying rows before
 * aggregating them, so every panel answers the same question. `rangeStartDate`
 * is what it takes; `filterByMonth` stays for the shapes that are filtered
 * after the fact.
 */

export type RangeOption = '3m' | '6m' | '12m' | 'all'

export const RANGE_OPTIONS: { value: RangeOption; label: string }[] = [
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'all', label: 'all time' },
]

const MONTHS_BY_RANGE: Record<Exclude<RangeOption, 'all'>, number> = {
  '3m': 3,
  '6m': 6,
  '12m': 12,
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * The earliest `YYYY-MM` included in `range`, as of `now`, inclusive. `null`
 * for `'all'`, which excludes nothing.
 *
 * The current month counts as one of the N -- "last 3 months" including the
 * one in progress reads as three data points on the chart, not two plus a
 * fragment, matching how a person would describe the window out loud.
 */
export function rangeStartMonth(range: RangeOption, now: Date): string | null {
  if (range === 'all') return null
  const months = MONTHS_BY_RANGE[range]
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}`
}

/**
 * Keeps items whose `YYYY-MM` field (read via `monthOf`) falls within `range`,
 * inclusive of the cutoff month itself. `YYYY-MM` strings sort lexically the
 * same as chronologically, so this is a plain string comparison rather than
 * a second date parse.
 */
export function filterByMonth<T>(
  items: T[],
  monthOf: (item: T) => string,
  range: RangeOption,
  now: Date = new Date()
): T[] {
  const start = rangeStartMonth(range, now)
  if (start === null) return items
  return items.filter((item) => monthOf(item) >= start)
}

/**
 * The first DAY included in `range`, as `YYYY-MM-DD`, or `null` for all time.
 *
 * The window is whole months and starts on the 1st, matching
 * `rangeStartMonth`: "last 3 months" is three calendar months including the
 * one in progress, which is how a person says it out loud and how the cohort
 * table has always bucketed.
 *
 * A DATE STRING RATHER THAN A `Date`, because everything it is compared
 * against is one: `jobs.date_applied` is a bare DATE column, and `created_at`
 * is an ISO timestamp whose first ten characters are the same format. Both
 * sort lexically the way they sort chronologically, so no parse is needed on
 * either side -- and none of the timezone questions that come with one.
 */
export function rangeStartDate(range: RangeOption, now: Date = new Date()): string | null {
  const month = rangeStartMonth(range, now)
  return month === null ? null : `${month}-01`
}

export function rangeLabel(range: RangeOption): string {
  return RANGE_OPTIONS.find((option) => option.value === range)?.label ?? 'all time'
}
