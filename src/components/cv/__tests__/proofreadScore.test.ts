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
    // 600 style findings weigh 200, which is the floor for 2,400 words.
    expect(proofreadScore('word '.repeat(2400), issues(600, 'style', 'STYLE')).value).toBe(0)
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

  it('reaches zero at the documented floor of one issue per twelve words', () => {
    // Recalibrated from 1-in-50 on 2026-09-11: that floor scored a real
    // 949-word CV at 0%, which is a shrug rather than a score.
    expect(proofreadScore('word '.repeat(12), issues(1)).value).toBe(0)
    expect(proofreadScore('word '.repeat(24), issues(1)).value).toBe(50)
  })

  it('gives a middling score to a CV that merely needs a proofread', () => {
    // The measured case the floor was changed for: 949 words, 26 spelling and
    // 24 style. It should land clearly between "clean" and "hopeless".
    const mixed = [
      ...issues(26, 'misspelling', 'TYPOS'),
      ...issues(24, 'style', 'REDUNDANCY'),
    ]
    const value = proofreadScore('word '.repeat(949), mixed).value
    expect(value).toBeGreaterThan(35)
    expect(value).toBeLessThan(80)
  })
})
