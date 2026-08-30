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

/** Fixed classification bands, in the panel's own currency. */
export interface SalaryBand {
  label: string
  from: number
  /** Inclusive upper bound; `null` on the open-ended top band. */
  to: number | null
  count: number
}

export interface CompanySalary {
  company: string
  /** Mean of the midpoints of that company's priced applications. */
  average: number
  jobs: number
}

const BAND_STEP = 25_000
const BAND_COUNT = 4

/**
 * Salary classification -- fixed bands rather than buckets derived from the
 * data's own min and max.
 *
 * The earlier version divided [min, max] into N equal buckets, so the axis
 * labels moved every time a job was added and two accounts could never be
 * compared. Bands are absolute: 0-25k is 0-25k whatever anyone has recorded.
 * That is what makes "most of my applications are entry band" a statement
 * about the market rather than about this row set.
 *
 * The top band is open-ended, so a salary above the last edge is classified
 * rather than dropped -- the failure mode of a fixed scheme is silently
 * discarding the outliers it cannot place.
 *
 * Bands are in the distribution's own currency and are NOT converted, the same
 * rule the rest of this module follows.
 */
export function salaryBands(dist: SalaryDistribution, jobs: Job[]): SalaryBand[] {
  const bands: SalaryBand[] = []
  for (let i = 0; i < BAND_COUNT; i += 1) {
    const from = i * BAND_STEP
    const last = i === BAND_COUNT - 1
    bands.push({
      from,
      to: last ? null : from + BAND_STEP,
      label: last ? `${fmtK(from)}+` : `${fmtK(from)}-${fmtK(from + BAND_STEP)}`,
      count: 0,
    })
  }
  if (dist.currency === null) return bands

  for (const job of jobs) {
    if ((job.salary_currency || 'PHP') !== dist.currency) continue
    const value = midpoint(job)
    if (value === null || value <= 0) continue
    const index = Math.min(BAND_COUNT - 1, Math.floor(value / BAND_STEP))
    bands[index].count += 1
  }
  return bands
}

function fmtK(value: number): string {
  return value === 0 ? '0' : `${Math.round(value / 1000)}k`
}

/**
 * Average salary per company, richest first.
 *
 * Averages the midpoints of that company's priced applications, and only
 * within the distribution's currency -- averaging PHP with USD would produce a
 * number that is not money in any currency.
 */
export function salaryByCompany(dist: SalaryDistribution, jobs: Job[], limit = 8): CompanySalary[] {
  if (dist.currency === null) return []
  const totals = new Map<string, { sum: number; n: number }>()
  for (const job of jobs) {
    if ((job.salary_currency || 'PHP') !== dist.currency) continue
    const value = midpoint(job)
    if (value === null || value <= 0) continue
    const key = job.company?.trim() || 'unknown'
    const acc = totals.get(key) ?? { sum: 0, n: 0 }
    acc.sum += value
    acc.n += 1
    totals.set(key, acc)
  }
  return [...totals.entries()]
    .map(([company, t]) => ({ company, average: t.sum / t.n, jobs: t.n }))
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
