import { describe, it, expect } from 'vitest'
import { hasStoredDescription } from '../jobDescription'
import type { Job } from '@/types'

describe('hasStoredDescription', () => {
  it('returns false when description is null', () => {
    expect(hasStoredDescription({ description: null } as Job)).toBe(false)
  })

  it('returns false when description is only whitespace', () => {
    expect(hasStoredDescription({ description: '   \n ' } as Job)).toBe(false)
  })

  it('returns true when description has content', () => {
    expect(hasStoredDescription({ description: 'Build APIs' } as Job)).toBe(true)
  })
})
