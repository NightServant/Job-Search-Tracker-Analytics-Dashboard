import { describe, it, expect, afterEach, vi } from 'vitest'
import { groupEventsByDay, type CalendarEvent } from '../events'
import { eventService } from '../eventService'

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

describe('eventService.scheduleInterview', () => {
  const client = {} as never

  afterEach(() => vi.restoreAllMocks())

  /**
   * The composition, not the SQL.
   *
   * `scheduleInterview` is the only method here with branching worth pinning:
   * everything else is one query. It is written in terms of this object's own
   * `listForJob`/`create`/`update`/`remove`, so those are what get stubbed —
   * a fake Postgrest query builder would be testing `@supabase/supabase-js`
   * rather than the rule this implements.
   */
  const stub = (existing: CalendarEvent[]) => {
    const create = vi.spyOn(eventService, 'create').mockResolvedValue(existing[0] ?? ev('new', '2026-09-20T06:00:00Z'))
    const update = vi.spyOn(eventService, 'update').mockResolvedValue(existing[0] ?? ev('u', '2026-09-20T06:00:00Z'))
    const remove = vi.spyOn(eventService, 'remove').mockResolvedValue(undefined)
    vi.spyOn(eventService, 'listForJob').mockResolvedValue(existing)
    return { create, update, remove }
  }

  it('creates the interview when the application has none', async () => {
    const { create, update } = stub([])
    await eventService.scheduleInterview(client, 'job-1', '2026-09-20T06:00:00Z', 'Interview — Acme')
    expect(update).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith(client, {
      job_id: 'job-1',
      kind: 'interview',
      title: 'Interview — Acme',
      starts_at: '2026-09-20T06:00:00Z',
    })
  })

  it('moves the existing one rather than replacing it', async () => {
    // The id has to survive a reschedule: it is what any later reminder or
    // export would key on, and a delete-and-insert would change it.
    const { create, update, remove } = stub([ev('evt-1', '2026-09-20T06:00:00Z')])
    await eventService.scheduleInterview(client, 'job-1', '2026-09-21T01:00:00Z', 'Interview — Acme')
    expect(create).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(client, 'evt-1', {
      starts_at: '2026-09-21T01:00:00Z',
      title: 'Interview — Acme',
    })
  })

  it('leaves events of other kinds alone', async () => {
    // A deadline or a take-home on the same application is not this method's
    // business, in either direction.
    const deadline: CalendarEvent = { ...ev('evt-d', '2026-09-19T06:00:00Z'), kind: 'deadline' }
    const { create, remove } = stub([deadline])
    await eventService.scheduleInterview(client, 'job-1', '2026-09-20T06:00:00Z', 'Interview — Acme')
    expect(remove).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalled()
  })

  it('clears every interview when the date is removed', async () => {
    const { create, update, remove } = stub([
      ev('evt-1', '2026-09-20T06:00:00Z'),
      ev('evt-2', '2026-09-27T06:00:00Z'),
    ])
    const result = await eventService.scheduleInterview(client, 'job-1', null, 'unused')
    expect(result).toBeNull()
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(remove.mock.calls.map((call) => call[1])).toEqual(['evt-1', 'evt-2'])
  })

  it('tidies duplicates down to the one it keeps', async () => {
    // One interview per application is the model the record dialog offers, so
    // a second one left by an earlier version is cleaned up rather than
    // silently shadowing the one being edited.
    const { update, remove } = stub([
      ev('evt-1', '2026-09-20T06:00:00Z'),
      ev('evt-2', '2026-09-27T06:00:00Z'),
    ])
    await eventService.scheduleInterview(client, 'job-1', '2026-09-22T06:00:00Z', 'Interview — Acme')
    expect(update.mock.calls[0][1]).toBe('evt-1')
    expect(remove.mock.calls.map((call) => call[1])).toEqual(['evt-2'])
  })
})
