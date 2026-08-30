import { describe, it, expect } from 'vitest'
import { applicationsPerMonth, statusBreakdown, sourceBreakdown } from '../overviewSeries'
import { makeJob } from '@/test/fixtures'
import { STATUSES } from '@/components/ui/status-marker'

const at = (iso: string) => ({ created_at: iso })

describe('applicationsPerMonth', () => {
  it('returns exactly the number of months asked for, oldest first', () => {
    // The Figma plot draws six fixed buckets. A series that omits empty months
    // makes the x axis lie about the interval between the ones it keeps.
    const series = applicationsPerMonth([], 6)
    expect(series).toHaveLength(6)
    expect(series.every((p) => p.count === 0)).toBe(true)
  })

  it('counts a job into its own month and no other', () => {
    const now = new Date()
    const job = { ...makeJob({ id: 'a', status: 'applied' }), ...at(now.toISOString()) }
    const series = applicationsPerMonth([job], 6)
    // Positive AND negative: an implementation that counted every job into
    // every bucket would satisfy the first assertion alone.
    expect(series[5].count).toBe(1)
    expect(series.slice(0, 5).every((p) => p.count === 0)).toBe(true)
  })

  it('drops a job older than the window rather than folding it into the first bucket', () => {
    const old = new Date()
    old.setFullYear(old.getFullYear() - 3)
    const job = { ...makeJob({ id: 'a', status: 'applied' }), ...at(old.toISOString()) }
    const series = applicationsPerMonth([job], 6)
    expect(series.every((p) => p.count === 0)).toBe(true)
  })

  it('survives an unparseable created_at instead of throwing', () => {
    const job = { ...makeJob({ id: 'a', status: 'applied' }), ...at('not-a-date') }
    expect(() => applicationsPerMonth([job], 6)).not.toThrow()
    expect(applicationsPerMonth([job], 6).every((p) => p.count === 0)).toBe(true)
  })

  it('labels buckets with the three-letter month the Figma axis uses', () => {
    const series = applicationsPerMonth([], 12)
    expect(series).toHaveLength(12)
    for (const point of series) {
      expect(point.month).toMatch(/^[a-z]{3}$/)
    }
    // 12 consecutive months are 12 distinct labels; a bug that reused one
    // month's label for every bucket would pass the regex above.
    expect(new Set(series.map((p) => p.month)).size).toBe(12)
  })
})

describe('statusBreakdown', () => {
  it('always returns all five statuses in order, including zeros', () => {
    // A donut that drops empty statuses reorders its own segments as data
    // changes, so a colour means something different week to week.
    const slices = statusBreakdown([])
    expect(slices.map((s) => s.status)).toEqual([...STATUSES])
    expect(slices.every((s) => s.count === 0)).toBe(true)
  })

  it('counts each job into exactly its own status', () => {
    const slices = statusBreakdown([
      makeJob({ id: 'a', status: 'applied' }),
      makeJob({ id: 'b', status: 'applied' }),
      makeJob({ id: 'c', status: 'offer' }),
    ])
    const by = Object.fromEntries(slices.map((s) => [s.status, s.count]))
    expect(by.applied).toBe(2)
    expect(by.offer).toBe(1)
    expect(by.wishlist + by.interviewing + by.rejected).toBe(0)
  })
})

describe('sourceBreakdown', () => {
  it('buckets an unlabelled source as unknown rather than discarding it', () => {
    const rows = sourceBreakdown([
      { ...makeJob({ id: 'a', status: 'applied' }), source: null },
      { ...makeJob({ id: 'b', status: 'applied' }), source: '  ' },
    ])
    expect(rows).toEqual([{ source: 'unknown', count: 2 }])
  })

  it('orders busiest first', () => {
    const rows = sourceBreakdown([
      { ...makeJob({ id: 'a', status: 'applied' }), source: 'LinkedIn' },
      { ...makeJob({ id: 'b', status: 'applied' }), source: 'Jobstreet' },
      { ...makeJob({ id: 'c', status: 'applied' }), source: 'Jobstreet' },
    ])
    expect(rows[0]).toEqual({ source: 'Jobstreet', count: 2 })
    expect(rows[1]).toEqual({ source: 'LinkedIn', count: 1 })
  })

  it('caps the list rather than drawing a bar per source forever', () => {
    const jobs = Array.from({ length: 10 }, (_, i) => ({
      ...makeJob({ id: `j${i}`, status: 'applied' as const }),
      source: `src-${i}`,
    }))
    expect(sourceBreakdown(jobs, 4)).toHaveLength(4)
  })
})
