import { describe, it, expect } from 'vitest'
import { countWords, proofreadScore } from '../proofreadScore'
import { toIssues } from '@/services/grammar'

const issues = (n: number, cat = 'GRMR') =>
  toIssues({ edits: Array.from({ length: n }, (_, i) => ({ start: i, end: i, replace: '', err_cat: cat })) })

describe('countWords', () => {
  it('counts on whitespace, and nothing on empty', () => {
    expect(countWords('one two  three\nfour')).toBe(4)
    expect(countWords('   ')).toBe(0)
    expect(countWords('')).toBe(0)
  })
})

describe('proofreadScore', () => {
  it('is 100 for a clean document', () => {
    expect(proofreadScore('word '.repeat(100), []).value).toBe(100)
  })

  it('is 100 for an empty one rather than NaN', () => {
    // Dividing by zero words is the obvious way this goes wrong, and NaN
    // renders as "NaN%" rather than failing loudly.
    expect(proofreadScore('', []).value).toBe(100)
  })

  it('falls as issue density rises, not as raw count rises', () => {
    // Ten problems in a 1000-word CV is a better document than ten in 100
    // words. A score on raw count would rank them the same.
    const long = proofreadScore('word '.repeat(1000), issues(10)).value
    const short = proofreadScore('word '.repeat(100), issues(10)).value
    expect(long).toBeGreaterThan(short)
  })

  it('bottoms out at zero instead of going negative', () => {
    expect(proofreadScore('word '.repeat(10), issues(500)).value).toBe(0)
  })

  it('reports the two counts separately for the corrections rows', () => {
    const mixed = [...issues(2, 'SPELL'), ...issues(3, 'GRMR')]
    const score = proofreadScore('word '.repeat(100), mixed)
    expect(score.spelling).toBe(2)
    expect(score.grammar).toBe(3)
  })

  it('reaches zero at one issue per fifty words, the documented floor', () => {
    expect(proofreadScore('word '.repeat(50), issues(1)).value).toBe(0)
    expect(proofreadScore('word '.repeat(100), issues(1)).value).toBe(50)
  })
})
