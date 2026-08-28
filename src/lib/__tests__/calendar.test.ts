import { describe, it, expect, afterEach } from 'vitest'
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

describe('buildMonthGrid across a DST transition', () => {
  const originalTz = process.env.TZ

  afterEach(() => {
    process.env.TZ = originalTz
  })

  // Every committed fixture up to this point was Asia/Manila (UTC+8) or
  // Pacific/Midway (UTC-11) -- neither observes DST, so nothing here would
  // fail if buildMonthGrid/weekOf/startOfWeek were refactored toward
  // millisecond arithmetic (cursor = new Date(cursor.getTime() + 86_400_000))
  // instead of the local `Date#setDate` this file actually uses.
  //
  // November, not March, is the direction that catches that refactor. DST
  // ends (falls back an hour) at 2am on 1 Nov 2026 in America/New_York, so
  // local midnight-to-midnight across that day spans 25 real hours, not 24.
  // A cursor that adds a fixed 86_400_000ms lands an hour SHORT of the next
  // local midnight -- 1 Nov 23:00 rather than 2 Nov 00:00 -- which still
  // reads back as 1 Nov, producing a doubled day. (The reverse case, March's
  // spring-forward, only overshoots past midnight into the correct next day
  // and would not have caught this -- confirmed by construction against a
  // naive ms-cursor implementation before writing this test.)
  it('produces 42 distinct, consecutive local days across the November 2026 US fall-back, with no skipped or doubled day', () => {
    process.env.TZ = 'America/New_York'
    const days = buildMonthGrid(2026, 10).flat() // November

    expect(days).toHaveLength(42)
    expect(new Set(days.map((d) => dayKey(d))).size).toBe(42)

    for (let i = 1; i < days.length; i++) {
      const prevMidnight = new Date(
        days[i - 1].getFullYear(),
        days[i - 1].getMonth(),
        days[i - 1].getDate()
      ).getTime()
      const currMidnight = new Date(
        days[i].getFullYear(),
        days[i].getMonth(),
        days[i].getDate()
      ).getTime()
      // Rounds away the 23h/25h a DST-crossing local midnight-to-midnight
      // span actually is in real elapsed time; every cell must still be
      // exactly one CALENDAR day after the previous one.
      expect(Math.round((currMidnight - prevMidnight) / 86_400_000)).toBe(1)
    }
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
