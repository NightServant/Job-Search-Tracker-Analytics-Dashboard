import { describe, it, expect } from 'vitest'
import { buildUpNext, QUIET_AFTER_DAYS } from '../upNext'
import { makeJob } from '@/test/fixtures'
import type { CalendarEvent } from '@/services/events'

const NOW = new Date(2026, 8, 11, 9, 0)
const DAY = 24 * 60 * 60 * 1000

const event = (id: string, daysAhead: number, kind: CalendarEvent['kind'] = 'interview'): CalendarEvent => ({
  id,
  job_id: 'job-1',
  user_id: 'u1',
  kind,
  title: 'Technical interview',
  starts_at: new Date(NOW.getTime() + daysAhead * DAY).toISOString(),
  duration_minutes: 60,
  notes: null,
})

/** In flight and untouched this long ago. */
const quietJob = (id: string, daysQuiet: number) =>
  makeJob({
    id,
    status: 'applied',
    company: `Co ${id}`,
    role: `Role ${id}`,
    updated_at: new Date(NOW.getTime() - daysQuiet * DAY).toISOString(),
  })

describe('buildUpNext', () => {
  it('has something to say for an account with applications and no events at all', () => {
    // THE DEFECT THIS EXISTS FOR (Gabe, 2026-09-11): "my account still does not
    // have any data for this section". Fifty-two applications, no interviews
    // booked, and the panel was empty -- absent precisely for the person
    // using the app hardest.
    const items = buildUpNext([], [quietJob('a', 30), quietJob('b', 20)], NOW)
    expect(items).toHaveLength(2)
    expect(items.every((item) => item.kind === 'chase')).toBe(true)
  })

  it('puts what is booked before what has merely gone quiet', () => {
    // A clock outranks an age however old the age is.
    const items = buildUpNext([event('e1', 3)], [quietJob('a', 90)], NOW)
    expect(items[0].kind).toBe('event')
    expect(items[1].kind).toBe('chase')
  })

  it('orders events soonest first and chases longest-quiet first', () => {
    const items = buildUpNext(
      [event('later', 9), event('sooner', 2)],
      [quietJob('recent', 15), quietJob('ancient', 80)],
      NOW
    )
    expect(items.map((i) => i.id)).toEqual([
      'event-sooner',
      'event-later',
      'chase-ancient',
      'chase-recent',
    ])
  })

  it('never points backwards', () => {
    // `listUpcoming` filters at the database, but a fixture or a cached page
    // can carry an event that has since gone past.
    const items = buildUpNext([event('gone', -2), event('coming', 2)], [], NOW)
    expect(items.map((i) => i.id)).toEqual(['event-coming'])
  })

  it('leaves applications alone until they have actually gone quiet', () => {
    const items = buildUpNext([], [quietJob('fresh', QUIET_AFTER_DAYS - 1)], NOW)
    expect(items).toHaveLength(0)
  })

  it('does not chase an application that is finished', () => {
    // An offer or a rejection is not waiting on a reply. The rule is
    // `services/followUp`'s, shared with the Overview's nudge.
    const settled = makeJob({
      id: 'done',
      status: 'rejected',
      updated_at: new Date(NOW.getTime() - 90 * DAY).toISOString(),
    })
    expect(buildUpNext([], [settled], NOW)).toHaveLength(0)
  })

  it('names the company for an event by joining on job_id', () => {
    const job = makeJob({ id: 'job-1', company: 'Acme Corp', status: 'interviewing' })
    expect(buildUpNext([event('e1', 1)], [job], NOW)[0].company).toBe('Acme Corp')
  })

  it('counts the quiet days it reports', () => {
    const items = buildUpNext([], [quietJob('a', 21)], NOW)
    expect(items[0].quietDays).toBe(21)
  })

  it('caps the rail rather than turning it back into a list', () => {
    const many = Array.from({ length: 25 }, (_, i) => quietJob(`j${i}`, 20 + i))
    expect(buildUpNext([], many, NOW).length).toBeLessThanOrEqual(10)
  })
})
