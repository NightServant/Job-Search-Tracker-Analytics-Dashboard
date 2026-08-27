import { describe, it, expect, afterEach } from 'vitest'
import { formatShortDate, formatAppliedDate, formatTouchedDate } from '../date'

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

describe('formatTouchedDate', () => {
  const originalTz = process.env.TZ

  afterEach(() => {
    process.env.TZ = originalTz
  })

  it('renders a TIMESTAMPTZ late in the UTC day as the correct LOCAL calendar day', () => {
    // Node re-reads process.env.TZ on every Date/Intl call, so pinning it
    // here makes the assertion independent of whatever zone the test
    // machine or CI runner defaults to.
    process.env.TZ = 'Pacific/Kiritimati' // UTC+14, the practical max offset
    // 23:00 UTC on the 20th is already the 21st in a zone ahead of UTC.
    // formatShortDate (UTC-only) would say "Aug 20" here -- the exact bug
    // this function exists to fix for an instant column.
    expect(formatTouchedDate('2026-08-20T23:00:00.000Z')).toBe('Aug 21')
  })

  it('renders a TIMESTAMPTZ early in the UTC day as the correct LOCAL calendar day behind UTC', () => {
    process.env.TZ = 'Pacific/Midway' // UTC-11
    // 01:00 UTC on the 20th is still the 19th in a zone behind UTC.
    expect(formatTouchedDate('2026-08-20T01:00:00.000Z')).toBe('Aug 19')
  })

  it('matches formatShortDate\'s output shape ("Mon D", no year)', () => {
    process.env.TZ = 'UTC'
    expect(formatTouchedDate('2026-08-20T12:00:00.000Z')).toBe('Aug 20')
  })
})
