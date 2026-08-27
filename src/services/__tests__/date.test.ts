import { describe, it, expect } from 'vitest'
import { formatShortDate, formatAppliedDate } from '../date'

describe('formatShortDate', () => {
  it('formats a bare DATE column without shifting the day', () => {
    // A bare DATE parses as UTC midnight; reading it back in UTC must land
    // on the same calendar day regardless of the machine's local timezone.
    expect(formatShortDate('2026-08-20')).toBe('Aug 20')
  })

  it('formats a TIMESTAMPTZ-shaped value the same way, never rendering it raw', () => {
    const raw = '2026-08-20T14:23:01.123456+00:00'
    const formatted = formatShortDate(raw)
    expect(formatted).toBe('Aug 20')
    expect(formatted).not.toContain('T')
    expect(formatted).not.toContain(raw)
  })

  it('does not drop a year across a UTC day boundary at midnight', () => {
    expect(formatShortDate('2026-01-01')).toBe('Jan 1')
  })
})

describe('formatAppliedDate', () => {
  it('says "Not applied" for a job with no applied date, rather than reaching for another field', () => {
    expect(formatAppliedDate(null)).toBe('Not applied')
  })

  it('formats a real applied date the same way formatShortDate does', () => {
    expect(formatAppliedDate('2026-08-20')).toBe('Aug 20')
  })
})
