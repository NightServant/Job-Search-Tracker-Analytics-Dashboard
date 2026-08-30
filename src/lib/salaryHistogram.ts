import type { Job } from '@/types'

/**
 * The salary distribution behind Figma's `Panel / Salary Insights` (80:1003) —
 * a stats row over a twelve-bar histogram.
 *
 * Pure, derived from `Job[]`, and deliberately NOT a new service query. No
 * analyticsService method returns a salary distribution, and M5's Task 8 built
 * a range picker against services that take no range; the lesson recorded from
 * that is to derive what the rows already carry rather than invent an
 * interface. `salary_min`/`salary_max`/`salary_currency` are on every job.
 *
 * ONE CURRENCY AT A TIME, AND THIS IS THE WHOLE DESIGN OF THIS FUNCTION.
 * "Salary values are Philippine pesos unless a currency column says otherwise.
 * Never assume USD" is a Global Constraint, and figures are stored per row and
 * never converted. So a histogram over mixed currencies would put ₱60,000 and
 * $60,000 in the same bucket and call it a distribution — a bar chart made of
 * two incompatible units, which is worse than no chart because it looks
 * authoritative. This buckets a single currency and reports which, so the
 * panel can name it. Everything else is excluded and counted, so the panel can
 * say what it left out rather than silently under-reporting.
 */

export interface SalaryBucket {
  /** Lower bound, inclusive. */
  from: number
  /** Upper bound, exclusive — except the last bucket, which is inclusive. */
  to: number
  count: number
}

export interface SalaryDistribution {
  /** The currency these buckets are in. Null when nothing has a salary. */
  currency: string | null
  buckets: SalaryBucket[]
  /** Jobs counted. */
  included: number
  /** Jobs with a salary in some OTHER currency, so the panel can disclose it. */
  excludedOtherCurrency: number
  /** Jobs with no salary recorded at all. */
  missing: number
  median: number | null
  min: number | null
  max: number | null
}

/** A job's representative salary: the midpoint of a range, or whichever end it has. */
function midpoint(job: Job): number | null {
  const lo = job.salary_min
  const hi = job.salary_max
  if (lo != null && hi != null) return (lo + hi) / 2
  if (lo != null) return lo
  if (hi != null) return hi
  return null
}

/**
 * Figma draws twelve bars, but twelve is a ceiling rather than a constant.
 * Four salaries spread over twelve buckets is eight empty columns and three
 * lonely bars -- the chart reserves space for data that does not exist and
 * reads as broken rather than as sparse. Square-root choice is the standard
 * rule for this and degrades sensibly: 4 salaries -> 2 buckets, 25 -> 5,
 * 144+ -> the full twelve.
 */
const MAX_BUCKETS = 12

function bucketsFor(count: number): number {
  return Math.max(1, Math.min(MAX_BUCKETS, Math.ceil(Math.sqrt(count))))
}

export function salaryDistribution(jobs: Job[], bucketCount?: number): SalaryDistribution {
  const priced = jobs
    .map((job) => ({ job, value: midpoint(job) }))
    .filter((row): row is { job: Job; value: number } => row.value !== null && row.value > 0)

  const missing = jobs.length - priced.length

  if (priced.length === 0) {
    return {
      currency: null,
      buckets: [],
      included: 0,
      excludedOtherCurrency: 0,
      missing,
      median: null,
      min: null,
      max: null,
    }
  }

  // The dominant currency wins, ties broken alphabetically so the answer is
  // stable across reloads rather than depending on row order.
  const byCurrency = new Map<string, number>()
  for (const { job } of priced) {
    const code = job.salary_currency || 'PHP'
    byCurrency.set(code, (byCurrency.get(code) ?? 0) + 1)
  }
  const currency = [...byCurrency.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )[0][0]

  const inCurrency = priced.filter(({ job }) => (job.salary_currency || 'PHP') === currency)
  const values = inCurrency.map((row) => row.value).sort((a, b) => a - b)

  const min = values[0]
  const max = values[values.length - 1]
  const mid = Math.floor(values.length / 2)
  const median =
    values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid]

  // A single distinct value has no range to divide, so one bucket holds it
  // rather than producing twelve empty ones around a zero-width span.
  const buckets_ = bucketCount ?? bucketsFor(values.length)
  const span = max - min
  const width = span > 0 ? span / buckets_ : 0
  const buckets: SalaryBucket[] = []

  if (width === 0) {
    buckets.push({ from: min, to: max, count: values.length })
  } else {
    for (let i = 0; i < buckets_; i += 1) {
      buckets.push({ from: min + i * width, to: min + (i + 1) * width, count: 0 })
    }
    for (const value of values) {
      // The top value would land at index bucketCount; clamp it into the last
      // bucket, whose upper bound is inclusive.
      const index = Math.min(buckets_ - 1, Math.floor((value - min) / width))
      buckets[index].count += 1
    }
  }

  return {
    currency,
    buckets,
    included: inCurrency.length,
    excludedOtherCurrency: priced.length - inCurrency.length,
    missing,
    median,
    min,
    max,
  }
}

/** One company's posted salary band, for the range chart. */
export interface CompanyRange {
  company: string
  /** Lowest `salary_min` this company posted (falling back to whichever end exists). */
  min: number
  /** Highest `salary_max`. */
  max: number
  /** Mean of this company's midpoints -- the marker inside the band. */
  average: number
  jobs: number
}

/**
 * Posted salary bands per company, richest first.
 *
 * The panel used to chart midpoints dropped into four fixed buckets, which
 * threw away half of what the rows carry: a job posts a RANGE, and the width
 * of that range is itself the insight -- "₱20-60k" and "₱39-41k" have the same
 * midpoint and are not the same offer. Bucketing also meant the whole chart
 * could collapse into one or two bars, which is what it did on an account with
 * four salaries.
 *
 * A job with only one end recorded gets a zero-width band at that value rather
 * than being dropped; that is a real posting, just a precise one.
 *
 * One currency, never converted, same as everything else in this module.
 */
export function salaryRanges(dist: SalaryDistribution, jobs: Job[], limit = 8): CompanyRange[] {
  if (dist.currency === null) return []
  const acc = new Map<string, { min: number; max: number; sum: number; n: number }>()
  for (const job of jobs) {
    if ((job.salary_currency || 'PHP') !== dist.currency) continue
    const mid = midpoint(job)
    if (mid === null || mid <= 0) continue
    // A missing end collapses to the end that exists, so the band is the
    // posting itself rather than an invented spread.
    const lo = job.salary_min ?? job.salary_max ?? mid
    const hi = job.salary_max ?? job.salary_min ?? mid
    const key = job.company?.trim() || 'unknown'
    const row = acc.get(key) ?? { min: lo, max: hi, sum: 0, n: 0 }
    row.min = Math.min(row.min, lo)
    row.max = Math.max(row.max, hi)
    row.sum += mid
    row.n += 1
    acc.set(key, row)
  }
  return [...acc.entries()]
    .map(([company, r]) => ({
      company,
      min: r.min,
      max: r.max,
      average: r.sum / r.n,
      jobs: r.n,
    }))
    .sort((a, b) => b.average - a.average || a.company.localeCompare(b.company))
    .slice(0, limit)
}

/** Mean of every counted midpoint -- the panel's "avg midpoint" stat. */
export function averageMidpoint(dist: SalaryDistribution, jobs: Job[]): number | null {
  if (dist.currency === null) return null
  const values: number[] = []
  for (const job of jobs) {
    if ((job.salary_currency || 'PHP') !== dist.currency) continue
    const v = midpoint(job)
    if (v !== null && v > 0) values.push(v)
  }
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}
