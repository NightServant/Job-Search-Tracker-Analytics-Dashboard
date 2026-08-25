import { describe, it, expect } from 'vitest'
import { isDemoUser } from '../demoMode'

describe('isDemoUser', () => {
  it('returns true when the id is in the demo list', () => {
    expect(isDemoUser('u1', ['u1', 'u2'])).toBe(true)
  })

  it('returns false when the id is absent', () => {
    expect(isDemoUser('u3', ['u1', 'u2'])).toBe(false)
  })

  it('returns false for a null user id', () => {
    expect(isDemoUser(null, ['u1'])).toBe(false)
  })

  it('returns false when the demo list is empty', () => {
    expect(isDemoUser('u1', [])).toBe(false)
  })
})
