import { describe, it, expect } from 'vitest'
import { matchKeywords } from '../atsMatch'

describe('matchKeywords', () => {
  it('scores a full match at 100 with nothing missing', () => {
    const result = matchKeywords('React TypeScript Postgres', 'React, TypeScript and Postgres')
    expect(result.score).toBe(100)
    expect(result.missing).toEqual([])
  })

  it('reports the terms the CV does not mention', () => {
    const result = matchKeywords('React only', 'React TypeScript Postgres')
    expect(result.missing).toContain('typescript')
    expect(result.missing).toContain('postgres')
    expect(result.score).toBeLessThan(100)
  })

  it('matches regardless of case', () => {
    expect(matchKeywords('react', 'REACT').score).toBe(100)
  })

  it('ignores filler words so the score reflects real requirements', () => {
    const result = matchKeywords('React', 'You will be working with the React and a team')
    expect(result.matched).toEqual(['react'])
    expect(result.missing).toEqual([])
  })

  it('counts a repeated requirement once', () => {
    const result = matchKeywords('React', 'React React React')
    expect(result.matched).toEqual(['react'])
    expect(result.score).toBe(100)
  })

  it('does not count a term as present because it is inside a longer word', () => {
    const result = matchKeywords('I write JavaScript', 'Java')
    expect(result.missing).toEqual(['java'])
    expect(result.score).toBe(0)
  })

  it('scores zero when there is no job description to match against', () => {
    const result = matchKeywords('React TypeScript', '')
    expect(result.score).toBe(0)
    expect(result.matched).toEqual([])
  })
})
