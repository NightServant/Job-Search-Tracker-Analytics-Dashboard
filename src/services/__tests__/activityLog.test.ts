import { describe, it, expect } from 'vitest'
import { sortActivityDescending, type ActivityEntry } from '../activityLog'

const entry = (id: string, occurred_at: string): ActivityEntry => ({
  id, job_id: 'j1', user_id: 'u1', note: 'recruiter call', occurred_at,
})

describe('sortActivityDescending', () => {
  it('puts the most recent entry first', () => {
    const sorted = sortActivityDescending([
      entry('old', '2026-08-21T00:00:00Z'),
      entry('new', '2026-08-26T00:00:00Z'),
    ])
    expect(sorted[0].id).toBe('new')
  })

  it('does not mutate the input array', () => {
    const input = [entry('a', '2026-08-21T00:00:00Z'), entry('b', '2026-08-26T00:00:00Z')]
    sortActivityDescending(input)
    expect(input[0].id).toBe('a')
  })

  it('returns an empty array unchanged', () => {
    expect(sortActivityDescending([])).toEqual([])
  })
})
