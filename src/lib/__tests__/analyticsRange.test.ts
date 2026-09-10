import { describe, it, expect } from 'vitest'
import { RANGE_OPTIONS, rangeLabel, rangeStartMonth, rangeStartDate, filterByMonth } from '../analyticsRange'

// `now` is fixed rather than `new Date()` so the boundary maths below is not
// re-derived on whatever day the suite happens to run.
const NOW = new Date(2026, 7, 27) // 2026-08-27, month is 0-indexed

describe('rangeStartMonth', () => {
  it('has no start for "all" -- nothing is excluded', () => {
    expect(rangeStartMonth('all', NOW)).toBeNull()
  })

  it('counts the current month as one of the 3, so the cutoff is two months back', () => {
    expect(rangeStartMonth('3m', NOW)).toBe('2026-06')
  })

  it('counts the current month as one of the 6', () => {
    expect(rangeStartMonth('6m', NOW)).toBe('2026-03')
  })

  it('crosses a year boundary for 12m', () => {
    expect(rangeStartMonth('12m', NOW)).toBe('2025-09')
  })
})

// rangeStartDate is what actually reaches analyticsService now (2026-09-09):
// the SERVICE scopes rows before aggregating, so this is the boundary that
// determines what every panel sees, not just rangeStartMonth's month string.
describe('rangeStartDate', () => {
  it('has no start for "all" -- nothing is excluded', () => {
    expect(rangeStartDate('all', NOW)).toBeNull()
  })

  it('is the first day of rangeStartMonth\'s month, not the day "now" falls on', () => {
    // Whole months starting on the 1st, matching rangeStartMonth -- a window
    // that started mid-month would silently exclude days 1-26 of its own
    // first month.
    expect(rangeStartDate('3m', NOW)).toBe('2026-06-01')
  })

  it('crosses a year boundary the same way rangeStartMonth does', () => {
    expect(rangeStartDate('12m', NOW)).toBe('2025-09-01')
  })

  it('defaults `now` to the current date, the same fallback filterByMonth uses', () => {
    // Not pinned to a specific value -- just proves the parameter is
    // optional and the function does not throw without it.
    expect(() => rangeStartDate('3m')).not.toThrow()
  })
})

describe('filterByMonth', () => {
  const items = [
    { month: '2025-01', label: 'too old' },
    { month: '2026-05', label: 'just outside 3m' },
    { month: '2026-06', label: 'edge of 3m' },
    { month: '2026-08', label: 'this month' },
  ]

  it('keeps everything for "all"', () => {
    expect(filterByMonth(items, (i) => i.month, 'all', NOW)).toHaveLength(4)
  })

  it('excludes the month just before the cutoff', () => {
    const kept = filterByMonth(items, (i) => i.month, '3m', NOW).map((i) => i.label)
    expect(kept).toEqual(['edge of 3m', 'this month'])
  })

  it('includes the cutoff month itself, not just months strictly after it', () => {
    const kept = filterByMonth(items, (i) => i.month, '3m', NOW)
    expect(kept.some((i) => i.month === '2026-06')).toBe(true)
  })
})

describe('rangeLabel', () => {
  it('has one label per option, in the order the picker renders them', () => {
    expect(RANGE_OPTIONS.map((o) => o.value)).toEqual(['3m', '6m', '12m', 'all'])
  })

  it('falls back to "all time" for an unrecognised value rather than throwing', () => {
    // @ts-expect-error -- deliberately outside the RangeOption union
    expect(rangeLabel('bogus')).toBe('all time')
  })
})
