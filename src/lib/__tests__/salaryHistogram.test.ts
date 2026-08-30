import { describe, it, expect } from 'vitest'
import { salaryDistribution, salaryRanges, averageMidpoint } from '../salaryHistogram'
import type { Job } from '@/types'

const job = (over: Partial<Job>) =>
  ({ id: 'j', company: 'Co', salary_currency: 'PHP', ...over }) as unknown as Job

describe('salaryRanges', () => {
  it('spans a company from its lowest min to its highest max', () => {
    // The whole reason this replaced the bucket chart: a job posts a RANGE,
    // and the width of it is the insight. ₱20-60k and ₱39-41k share a
    // midpoint and are not the same offer.
    const jobs = [
      job({ company: 'Acme', salary_min: 20_000, salary_max: 40_000 }),
      job({ company: 'Acme', salary_min: 30_000, salary_max: 60_000 }),
    ]
    const [row] = salaryRanges(salaryDistribution(jobs), jobs)
    expect(row.min).toBe(20_000)
    expect(row.max).toBe(60_000)
    expect(row.jobs).toBe(2)
    // Mean of the two MIDPOINTS (30k, 45k), not of the bounds.
    expect(row.average).toBe(37_500)
  })

  it('keeps a one-ended posting as a zero-width band rather than dropping it', () => {
    // A posting with only a floor is real, just precise. Dropping it would
    // under-report; inventing a spread around it would be worse.
    const jobs = [job({ company: 'Acme', salary_min: 50_000, salary_max: null })]
    const [row] = salaryRanges(salaryDistribution(jobs), jobs)
    expect([row.min, row.max]).toEqual([50_000, 50_000])
  })

  it('never mixes currencies into one band', () => {
    // Global constraint: figures are stored per row and never converted, so a
    // band spanning ₱20k to $60k would not be money in any currency.
    const jobs = [
      job({ company: 'Acme', salary_min: 20_000, salary_max: 40_000 }),
      job({ company: 'Acme', salary_min: 30_000, salary_max: 60_000 }),
      job({ company: 'Globex', salary_min: 5_000, salary_max: 9_000, salary_currency: 'USD' }),
    ]
    const dist = salaryDistribution(jobs)
    expect(dist.currency).toBe('PHP')
    expect(salaryRanges(dist, jobs).map((r) => r.company)).toEqual(['Acme'])
    expect(dist.excludedOtherCurrency).toBe(1)
  })

  it('sorts richest first and caps the rows', () => {
    const jobs = Array.from({ length: 12 }, (_, i) =>
      job({ company: `Co ${i}`, salary_min: (i + 1) * 1_000, salary_max: (i + 1) * 2_000 })
    )
    const rows = salaryRanges(salaryDistribution(jobs), jobs, 8)
    expect(rows).toHaveLength(8)
    expect(rows[0].company).toBe('Co 11')
    expect(rows.map((r) => r.average)).toEqual([...rows.map((r) => r.average)].sort((a, b) => b - a))
  })

  it('returns nothing rather than throwing when no salary is recorded', () => {
    const jobs = [job({ salary_min: null, salary_max: null })]
    const dist = salaryDistribution(jobs)
    expect(dist.currency).toBeNull()
    expect(salaryRanges(dist, jobs)).toEqual([])
    expect(averageMidpoint(dist, jobs)).toBeNull()
  })
})
