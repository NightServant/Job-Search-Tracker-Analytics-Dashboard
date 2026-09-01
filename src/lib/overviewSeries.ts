import { STATUSES, type Status } from '@/components/ui/status-marker'
import type { Job } from '@/types'

/**
 * The Overview's chart data, as pure functions over the jobs the route already
 * fetched.
 *
 * Pure and separate from the components for the same reason `lib/calendar.ts`
 * and `lib/analyticsRange.ts` are: bucketing maths is where date and ordering
 * bugs live, and jsdom cannot lay out a chart, so a component test can only
 * ever assert that *something* rendered. Testing the numbers here is the only
 * place the numbers can actually be checked.
 */

const MONTH_LABELS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const

export interface MonthPoint {
  /** Three-letter lowercase label, matching the Figma x axis (`mar apr may`). */
  month: string
  count: number
}

/**
 * Applications created per calendar month, oldest first, always exactly
 * `months` buckets including empty ones.
 *
 * The empty buckets are the point. A series that omits months with no
 * applications draws an x axis with an uneven interval, so a quiet March and a
 * busy April sit the same distance apart as April and August — the plot then
 * lies about the shape of the trend, which is the only thing it exists to show.
 *
 * Buckets on `created_at` (when the row was added to Worktrack) rather than
 * `date_applied` (when the application went out). Those are different fields
 * and a wishlist entry has no `date_applied` at all, so `created_at` is the one
 * every job is guaranteed to have. Read in the viewer's local zone: these are
 * calendar months on a wall calendar, not UTC instants.
 */
export function applicationsPerMonth(jobs: Job[], months: number): MonthPoint[] {
  const now = new Date()
  const buckets: MonthPoint[] = []
  const index = new Map<string, number>()

  for (let back = months - 1; back >= 0; back -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    index.set(key, buckets.length)
    buckets.push({ month: MONTH_LABELS[d.getMonth()], count: 0 })
  }

  for (const job of jobs) {
    const created = new Date(job.created_at)
    if (Number.isNaN(created.getTime())) continue
    const slot = index.get(`${created.getFullYear()}-${created.getMonth()}`)
    if (slot !== undefined) buckets[slot].count += 1
  }

  return buckets
}

export interface StatusSlice {
  status: Status
  label: string
  count: number
}

const STATUS_LABELS: Record<Status, string> = {
  wishlist: 'wishlist',
  applied: 'applied',
  interviewing: 'interviewing',
  offer: 'offer',
  rejected: 'rejected',
}

/**
 * The five-status breakdown behind the donut and its legend.
 *
 * Always returns all five in `STATUSES` order, including zeros. A donut that
 * drops empty statuses reorders its own segments as the data changes, so the
 * colour under a given angle means something different from one week to the
 * next — and the legend below it silently changes length.
 */
export function statusBreakdown(jobs: Job[]): StatusSlice[] {
  const counts = new Map<Status, number>(STATUSES.map((s) => [s, 0]))
  for (const job of jobs) {
    const current = counts.get(job.status as Status)
    if (current !== undefined) counts.set(job.status as Status, current + 1)
  }
  return STATUSES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: counts.get(status) ?? 0,
  }))
}

export interface SourceCount {
  source: string
  count: number
}

/**
 * Applications per source, busiest first.
 *
 * The bar chart Gabe asked for is this. Figma's three panels cover time, status
 * and upcoming events; source is the one dimension none of them shows, and
 * `DashboardBlocks` already computed it as a text list — so this preserves data
 * the old screen surfaced rather than dropping it on the way to a chart.
 *
 * A null source becomes `unknown` rather than being discarded: "where did these
 * come from" is answered badly by silently excluding the ones you did not
 * label.
 */
export function sourceBreakdown(jobs: Job[], limit = 6): SourceCount[] {
  const counts = new Map<string, number>()
  for (const job of jobs) {
    const key = job.source?.trim() || 'unknown'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source))
    .slice(0, limit)
}

/** A source's place in the ranking. `tertiary` is the aggregate, never one source. */
export type SourceRank = 'primary' | 'secondary' | 'tertiary'

export interface RankedSource extends SourceCount {
  rank: SourceRank
  /** How many distinct sources this row stands for. Always 1 except on `tertiary`. */
  sources: number
  /** Share of all applications that have a source, 0-100. */
  share: number
}

/**
 * The busiest source, the runner-up, and everything else as one row.
 *
 * Gabe's shape: "jobstreet is the primary source, LinkedIn is the secondary
 * source, and tertiary sources should be displayed as others."
 *
 * The point is that a job search has one or two channels that actually work
 * and a long tail that does not. Six equal rows made the reader do that
 * ranking themselves every time they looked; naming the top two and collapsing
 * the rest states the conclusion the panel exists to deliver.
 *
 * The tail collapses only when there is a tail. Two sources produce two rows,
 * not two rows and an empty "others" -- a row reading "others 0" is a claim
 * about nothing.
 *
 * Ties break alphabetically, inherited from `sourceBreakdown`, so the answer is
 * stable across reloads rather than depending on row order. That does mean two
 * sources on equal counts are named primary and secondary arbitrarily; `share`
 * is on every row so a reader can see they are level rather than inferring a
 * lead that is not there.
 */
export function rankedSources(jobs: Job[]): RankedSource[] {
  // No limit: the tail has to be counted in full before it can be collapsed.
  const all = sourceBreakdown(jobs, Number.MAX_SAFE_INTEGER)
  const total = all.reduce((sum, row) => sum + row.count, 0)
  if (total === 0) return []

  const pct = (count: number) => (count / total) * 100
  const ranked: RankedSource[] = []

  const [primary, secondary, ...rest] = all
  ranked.push({ ...primary, rank: 'primary', sources: 1, share: pct(primary.count) })
  if (secondary) {
    ranked.push({ ...secondary, rank: 'secondary', sources: 1, share: pct(secondary.count) })
  }

  if (rest.length > 0) {
    const count = rest.reduce((sum, row) => sum + row.count, 0)
    ranked.push({
      source: 'others',
      count,
      rank: 'tertiary',
      sources: rest.length,
      share: pct(count),
    })
  }

  return ranked
}
