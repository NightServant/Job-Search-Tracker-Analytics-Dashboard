import { describe, it, expect } from 'vitest'
import { groupEventsByDay, type CalendarEvent } from '../events'

const ev = (id: string, starts_at: string): CalendarEvent => ({
  id, job_id: 'j1', user_id: 'u1', kind: 'interview',
  title: 'Technical interview', starts_at, duration_minutes: 60, notes: null,
})

describe('groupEventsByDay', () => {
  it('groups two events on the same day under one key', () => {
    const grouped = groupEventsByDay([
      ev('a', '2026-08-26T10:00:00Z'),
      ev('b', '2026-08-26T14:00:00Z'),
    ])
    expect(grouped.get('2026-08-26')).toHaveLength(2)
  })

  it('separates events on different days', () => {
    const grouped = groupEventsByDay([
      ev('a', '2026-08-26T10:00:00Z'),
      ev('b', '2026-08-28T10:00:00Z'),
    ])
    expect(grouped.size).toBe(2)
  })

  it('orders events within a day by start time', () => {
    const grouped = groupEventsByDay([
      ev('late', '2026-08-26T14:00:00Z'),
      ev('early', '2026-08-26T09:00:00Z'),
    ])
    expect(grouped.get('2026-08-26')?.map(e => e.id)).toEqual(['early', 'late'])
  })

  it('returns an empty map for no events', () => {
    expect(groupEventsByDay([]).size).toBe(0)
  })
})
