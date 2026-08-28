/**
 * The analytics range picker's pure maths, split out of `RangePicker.tsx` for
 * the same reason `buildMonthGrid`/`weekOf` live in `src/lib/calendar.ts`
 * rather than inside `Calendar.tsx`: boundary arithmetic is where these
 * things break, and it is easier to pin the boundary in a unit test than a
 * rendered component.
 *
 * Ruling (pre-flight scan, Task 8): `analyticsService`'s five methods take
 * only `userId` -- no date range, in the database or in memory. Of the five
 * return shapes, only `SourceConversionTrend` (`month`) and `CohortAnalysis`
 * (`cohort`) carry a `YYYY-MM` field at all, so the picker can only ever
 * filter those two. `filterByMonth` below is the one filter both of them
 * share; `TimeInStageMetric`, `ConversionFunnelMetric` and `ConversionMetrics`
 * never call it and state "All time" instead, in `Analytics.tsx`.
 */

export type RangeOption = '3m' | '6m' | '12m' | 'all'

export const RANGE_OPTIONS: { value: RangeOption; label: string }[] = [
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
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

export function rangeLabel(range: RangeOption): string {
  return RANGE_OPTIONS.find((option) => option.value === range)?.label ?? 'All time'
}
