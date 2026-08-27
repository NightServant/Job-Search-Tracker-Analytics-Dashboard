import { describe, it, expect } from 'vitest'
import { buildMonthGrid, weekOf, dayKey, parseDayKey } from '../calendar'

describe('buildMonthGrid', () => {
  it('always returns six weeks, so the grid never changes height month to month', () => {
    expect(buildMonthGrid(2026, 1)).toHaveLength(6) // February, 28 days
    expect(buildMonthGrid(2026, 7)).toHaveLength(6) // August, starts Saturday
  })

  it('pads with the neighbouring months rather than blanks', () => {
    const grid = buildMonthGrid(2026, 7) // 1 Aug 2026 is a Saturday
    expect(grid[0][0].getMonth()).toBe(6) // July fills the leading cells
  })

  it('handles a leap February', () => {
    const days = buildMonthGrid(2024, 1)
      .flat()
      .filter((d) => d.getMonth() === 1)
    expect(days).toHaveLength(29)
  })

  it('every week is seven days long', () => {
    for (const week of buildMonthGrid(2026, 7)) {
      expect(week).toHaveLength(7)
    }
  })

  it('every week starts on a Sunday', () => {
    for (const week of buildMonthGrid(2026, 7)) {
      expect(week[0].getDay()).toBe(0)
    }
  })
})

describe('weekOf', () => {
  it('returns seven days', () => {
    expect(weekOf(new Date(2026, 7, 26))).toHaveLength(7)
  })

  it('starts on the Sunday on or before the given date', () => {
    // 26 Aug 2026 is a Wednesday
    const week = weekOf(new Date(2026, 7, 26))
    expect(week[0].getDay()).toBe(0)
    expect(week[0].getDate()).toBe(23)
  })

  it('is a no-op shift when the date given is already a Sunday', () => {
    const sunday = new Date(2026, 7, 23)
    const week = weekOf(sunday)
    expect(week[0].getTime()).toBe(sunday.getTime())
  })
})

describe('dayKey / parseDayKey', () => {
  it('formats a local Date as YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('round-trips through parseDayKey back to the same local calendar day', () => {
    const original = new Date(2026, 7, 26)
    expect(dayKey(parseDayKey(dayKey(original)))).toBe(dayKey(original))
  })

  it('parses without shifting a day the way new Date(dateString) would in a negative-offset zone', () => {
    // new Date('2026-08-26') parses as UTC midnight, which is 25 Aug in any
    // zone behind UTC. parseDayKey must not have that failure mode since it
    // is reconstructing a LOCAL day, not reading a DATE column.
    const parsed = parseDayKey('2026-08-26')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(7)
    expect(parsed.getDate()).toBe(26)
  })
})
