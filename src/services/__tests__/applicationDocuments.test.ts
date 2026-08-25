import { describe, it, expect } from 'vitest'
import { describeLink } from '../applicationDocuments'

describe('describeLink', () => {
  it('names the snapshot version when one is pinned', () => {
    expect(describeLink({ title: 'software engineer cv', version: 3, sent_at: '2026-08-21' }))
      .toBe('software engineer cv · version 3 · sent 21 AUG 2026')
  })

  it('falls back to latest when no snapshot version is pinned', () => {
    expect(describeLink({ title: 'software engineer cv', version: null, sent_at: '2026-08-21' }))
      .toBe('software engineer cv · latest · sent 21 AUG 2026')
  })
})
