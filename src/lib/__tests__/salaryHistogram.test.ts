import { describe, it, expect } from 'vitest'
import { salaryDistribution } from '../salaryHistogram'
import { makeJob } from '@/test/fixtures'
import type { Job } from '@/types'

const priced = (id: string, min: number | null, max: number | null, currency = 'PHP'): Job => ({
  ...makeJob({ id, status: 'applied' }),
  salary_min: min,
  salary_max: max,
  salary_currency: currency,
})

describe('salaryDistribution', () => {
  it('never mixes currencies in one distribution', () => {
    // The load-bearing case. Figures are stored per row and never converted,
    // so bucketing PHP beside USD would put 60,000 pesos and 60,000 dollars in
    // the same bar and call it a distribution.
    const d = salaryDistribution([
      priced('a', 50_000, 70_000, 'PHP'),
      priced('b', 60_000, 80_000, 'PHP'),
      priced('c', 90_000, 110_000, 'USD'),
    ])
    expect(d.currency).toBe('PHP')
    expect(d.included).toBe(2)
    expect(d.excludedOtherCurrency).toBe(1)
    // Positive companion: the excluded row is genuinely absent from the bars,
    // not merely reported in a counter.
    expect(d.buckets.reduce((sum, b) => sum + b.count, 0)).toBe(2)
  })

  it('picks the dominant currency, breaking ties stably rather than by row order', () => {
    const forward = salaryDistribution([priced('a', 10, 10, 'USD'), priced('b', 10, 10, 'PHP')])
    const reversed = salaryDistribution([priced('b', 10, 10, 'PHP'), priced('a', 10, 10, 'USD')])
    expect(forward.currency).toBe(reversed.currency)
  })

  it('counts jobs with no salary separately from jobs in another currency', () => {
    // Two different reasons a job is not in the chart. Collapsing them would
    // make the panel unable to say which.
    const d = salaryDistribution([
      priced('a', 50_000, 70_000, 'PHP'),
      priced('b', null, null, 'PHP'),
      priced('c', 90_000, 110_000, 'USD'),
    ])
    expect(d.missing).toBe(1)
    expect(d.excludedOtherCurrency).toBe(1)
    expect(d.included).toBe(1)
  })

  it('puts every job in exactly one bucket, including the topmost value', () => {
    // The maximum lands at index bucketCount without a clamp and is silently
    // dropped -- the classic off-by-one in a histogram.
    const jobs = [10, 20, 30, 40, 50, 60].map((v, i) => priced(`j${i}`, v, v))
    const d = salaryDistribution(jobs, 4)
    expect(d.buckets.reduce((sum, b) => sum + b.count, 0)).toBe(jobs.length)
    expect(d.max).toBe(60)
  })

  it('uses the midpoint of a range, and whichever end exists when only one does', () => {
    const d = salaryDistribution([priced('a', 40_000, 60_000), priced('b', 80_000, null)])
    expect(d.min).toBe(50_000)
    expect(d.max).toBe(80_000)
  })

  it('collapses to a single bucket when every salary is identical', () => {
    // A zero-width span divided into twelve gives twelve empty buckets around
    // a division by zero.
    const d = salaryDistribution([priced('a', 50_000, 50_000), priced('b', 50_000, 50_000)])
    expect(d.buckets).toHaveLength(1)
    expect(d.buckets[0].count).toBe(2)
    expect(d.median).toBe(50_000)
  })

  it('reports nothing to chart rather than throwing when no job has a salary', () => {
    const d = salaryDistribution([priced('a', null, null), priced('b', null, null)])
    expect(d.currency).toBeNull()
    expect(d.buckets).toEqual([])
    expect(d.missing).toBe(2)
    expect(d.median).toBeNull()
  })

  it('takes the median of an even count as the mean of the middle two', () => {
    const d = salaryDistribution([
      priced('a', 10, 10),
      priced('b', 20, 20),
      priced('c', 30, 30),
      priced('d', 40, 40),
    ])
    expect(d.median).toBe(25)
  })
})
