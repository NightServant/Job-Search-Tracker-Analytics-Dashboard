import { describe, it, expect } from 'vitest'
import { countWords, proofreadScore } from '../proofreadScore'
import { toIssues } from '@/services/grammar'

const issues = (n: number, issueType = 'grammar', categoryId = 'GRAMMAR') =>
  toIssues({
    matches: Array.from({ length: n }, (_, i) => ({
      offset: i,
      length: 1,
      replacements: [],
      rule: { issueType, category: { id: categoryId } },
    })),
  })

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

  it('counts style at a third when reaching the floor', () => {
    // 150 style findings weigh 50, which is the floor for 2,500 words.
    expect(proofreadScore('word '.repeat(2500), issues(150, 'style', 'STYLE')).value).toBe(0)
  })

  it('reports each count separately for the corrections and refinements rows', () => {
    const mixed = [
      ...issues(2, 'misspelling', 'TYPOS'),
      ...issues(3, 'grammar', 'GRAMMAR'),
      ...issues(4, 'style', 'REDUNDANCY'),
    ]
    const score = proofreadScore('word '.repeat(100), mixed)
    expect(score.spelling).toBe(2)
    expect(score.grammar).toBe(3)
    expect(score.style).toBe(4)
  })

  it('penalises a style finding less than a mistake', () => {
    // A redundant phrase is a preference; a misspelling is an error. A wordy
    // but correct CV should not score like a careless one.
    const wordy = proofreadScore('word '.repeat(200), issues(6, 'style', 'REDUNDANCY')).value
    const careless = proofreadScore('word '.repeat(200), issues(6, 'misspelling', 'TYPOS')).value
    expect(wordy).toBeGreaterThan(careless)
  })

  it('reaches zero at one issue per fifty words, the documented floor', () => {
    expect(proofreadScore('word '.repeat(50), issues(1)).value).toBe(0)
    expect(proofreadScore('word '.repeat(100), issues(1)).value).toBe(50)
  })
})
