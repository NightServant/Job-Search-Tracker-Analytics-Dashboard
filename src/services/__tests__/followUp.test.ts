import { describe, it, expect } from 'vitest'
import { getStaleApplications, type StaleCandidate } from '../followUp'

const NOW = new Date('2026-08-25T00:00:00Z')

const job = (id: string, status: StaleCandidate['status'], lastTouched: string): StaleCandidate => ({
  id, company: 'Acme', role: 'Engineer', status, last_touched_at: lastTouched,
})

describe('getStaleApplications', () => {
  it('flags an in-flight application untouched beyond the threshold', () => {
    const stale = getStaleApplications([job('a', 'applied', '2026-08-01T00:00:00Z')], 14, NOW)
    expect(stale.map((j) => j.id)).toEqual(['a'])
  })

  it('leaves an application touched inside the threshold alone', () => {
    const stale = getStaleApplications([job('a', 'applied', '2026-08-20T00:00:00Z')], 14, NOW)
    expect(stale).toHaveLength(0)
  })

  it('ignores resolved applications however old they are', () => {
    const rows = [
      job('offer', 'offer', '2026-01-01T00:00:00Z'),
      job('rejected', 'rejected', '2026-01-01T00:00:00Z'),
    ]
    expect(getStaleApplications(rows, 14, NOW)).toHaveLength(0)
  })

  it('ignores wishlist entries, which were never sent', () => {
    expect(getStaleApplications([job('w', 'wishlist', '2026-01-01T00:00:00Z')], 14, NOW)).toHaveLength(0)
  })

  it('returns the most stale first', () => {
    const rows = [
      job('recent', 'applied', '2026-08-05T00:00:00Z'),
      job('ancient', 'interviewing', '2026-06-01T00:00:00Z'),
    ]
    expect(getStaleApplications(rows, 14, NOW).map((j) => j.id)).toEqual(['ancient', 'recent'])
  })

  it('treats exactly the threshold as not yet stale', () => {
    const stale = getStaleApplications([job('a', 'applied', '2026-08-11T00:00:00Z')], 14, NOW)
    expect(stale).toHaveLength(0)
  })
})
