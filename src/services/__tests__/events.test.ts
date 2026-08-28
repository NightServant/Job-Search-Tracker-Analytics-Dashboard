import { describe, it, expect, afterEach } from 'vitest'
import { groupEventsByDay, type CalendarEvent } from '../events'

const ev = (id: string, starts_at: string): CalendarEvent => ({
  id, job_id: 'j1', user_id: 'u1', kind: 'interview',
  title: 'Technical interview', starts_at, duration_minutes: 60, notes: null,
})

describe('groupEventsByDay', () => {
  const originalTz = process.env.TZ

  afterEach(() => {
    process.env.TZ = originalTz
  })

  it('groups two events on the same day under one key', () => {
    process.env.TZ = 'UTC'
    const grouped = groupEventsByDay([
      ev('a', '2026-08-26T10:00:00Z'),
      ev('b', '2026-08-26T14:00:00Z'),
    ])
    expect(grouped.get('2026-08-26')).toHaveLength(2)
  })

  it('separates events on different days', () => {
    process.env.TZ = 'UTC'
    const grouped = groupEventsByDay([
      ev('a', '2026-08-26T10:00:00Z'),
      ev('b', '2026-08-28T10:00:00Z'),
    ])
    expect(grouped.size).toBe(2)
  })

  it('orders events within a day by start time', () => {
    process.env.TZ = 'UTC'
    const grouped = groupEventsByDay([
      ev('late', '2026-08-26T14:00:00Z'),
      ev('early', '2026-08-26T09:00:00Z'),
    ])
    expect(grouped.get('2026-08-26')?.map(e => e.id)).toEqual(['early', 'late'])
  })

  it('returns an empty map for no events', () => {
    expect(groupEventsByDay([]).size).toBe(0)
  })

  it('buckets a TIMESTAMPTZ under the VIEWER-LOCAL day, not the UTC day, at a UTC+8 boundary', () => {
    // Manila is UTC+8, where Gabe is. 20:00 UTC on the 26th is already
    // 04:00 on the 27th there -- the exact defect class fixed for
    // last_touched_at in 10f24b6. Keying on `starts_at.slice(0, 10)` (the
    // old implementation) would file this under '2026-08-26' instead.
    process.env.TZ = 'Asia/Manila'
    const grouped = groupEventsByDay([ev('evening', '2026-08-26T20:00:00.000Z')])
    expect(grouped.get('2026-08-27')).toHaveLength(1)
    expect(grouped.has('2026-08-26')).toBe(false)
  })
})
