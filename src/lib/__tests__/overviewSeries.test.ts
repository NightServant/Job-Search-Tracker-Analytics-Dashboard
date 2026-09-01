import { describe, it, expect } from 'vitest'
import {
  applicationsPerMonth,
  statusBreakdown,
  sourceBreakdown,
  rankedSources,
} from '../overviewSeries'
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

describe('rankedSources', () => {
  const from = (sources: string[]) =>
    sources.map((source, i) => makeJob({ id: `j${i}`, status: 'applied', source }))

  it('names the top two and collapses the rest into one others row', () => {
    // Gabe's shape: a job search has one or two channels that work and a tail
    // that does not. Six equal rows made the reader do the ranking themselves.
    const jobs = from([
      'Jobstreet', 'Jobstreet', 'Jobstreet',
      'LinkedIn', 'LinkedIn',
      'Indeed',
      'Referral',
    ])
    const ranked = rankedSources(jobs)
    expect(ranked.map((r) => [r.rank, r.source, r.count])).toEqual([
      ['primary', 'Jobstreet', 3],
      ['secondary', 'LinkedIn', 2],
      ['tertiary', 'others', 2],
    ])
    // The others row stands for more than one source, and says how many.
    expect(ranked[2].sources).toBe(2)
    expect(ranked[0].sources).toBe(1)
  })

  it('does not invent an others row when there is no tail', () => {
    // "others 0" is a claim about nothing.
    expect(rankedSources(from(['Jobstreet', 'LinkedIn'])).map((r) => r.rank)).toEqual([
      'primary',
      'secondary',
    ])
    expect(rankedSources(from(['Jobstreet'])).map((r) => r.rank)).toEqual(['primary'])
  })

  it('shares add up to the whole, so the tail is never silently dropped', () => {
    const jobs = from(['A', 'A', 'B', 'C', 'D'])
    const ranked = rankedSources(jobs)
    expect(ranked.reduce((sum, r) => sum + r.count, 0)).toBe(jobs.length)
    expect(Math.round(ranked.reduce((sum, r) => sum + r.share, 0))).toBe(100)
  })

  it('counts an unlabelled source rather than discarding it', () => {
    // "where did these come from" is answered badly by excluding the ones you
    // never labelled.
    const jobs = [
      makeJob({ id: 'a', status: 'applied', source: 'Jobstreet' }),
      makeJob({ id: 'b', status: 'applied', source: null }),
    ]
    expect(rankedSources(jobs).map((r) => r.source)).toEqual(['Jobstreet', 'unknown'])
  })

  it('returns nothing at all rather than a zero row for an empty list', () => {
    expect(rankedSources([])).toEqual([])
  })
})
