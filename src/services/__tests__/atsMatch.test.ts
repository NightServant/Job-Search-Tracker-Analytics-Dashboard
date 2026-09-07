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

describe('what counts as a requirement at all', () => {
  /**
   * THE DEFECT, measured 2026-09-06. The matcher treated every non-stopword
   * token in the posting as something the CV had to contain, and a posting is
   * mostly prose -- one paragraph produced SIXTY-THREE "requirements"
   * including "provide", "manages", "smoothly", "500" and "hours". A CV cannot
   * contain "smoothly", so each was a guaranteed miss and the score read far
   * below the truth: 30% on a CV that was a good match.
   */
  const POSTING = `Provide first line phone, email and chat support. Manages the
    service desk tickets and assists onsite. Physical troubleshooting, repair of
    hardware and connectivity. Coordinate the process as necessary. Resolving
    issues as they arise, communicating with staff to ensure setup runs
    smoothly. Qualifications: render a minimum of 500 hours, willing to work
    hybrid days. Knowledgeable in network, familiar but limited with the
    following: Windows, Mac, Microsoft server, Zoom and Adobe.`

  const CV = `IT support specialist. Troubleshooting hardware and network
    connectivity. Windows and Mac administration, Microsoft server, Zoom and
    Adobe. Service desk ticket handling, onsite and remote.`

  it('does not treat a number as a skill', () => {
    // "render a minimum of 500 hours" -- no CV contains 500.
    const { missing, matched } = matchKeywords(CV, POSTING)
    expect([...missing, ...matched]).not.toContain('500')
  })

  it('does not treat prose verbs and adverbs as requirements', () => {
    const { missing, matched } = matchKeywords(CV, POSTING)
    const counted = new Set([...missing, ...matched])
    for (const noise of ['provide', 'manages', 'smoothly', 'necessary', 'willing', 'hours']) {
      expect(counted, `"${noise}" is not something a CV can satisfy`).not.toContain(noise)
    }
  })

  it('still counts the things the job actually asks for', () => {
    // The guard on the guard: a list that removed everything would pass the
    // two tests above and be useless.
    const { matched } = matchKeywords(CV, POSTING)
    for (const real of ['hardware', 'network', 'windows', 'microsoft', 'server', 'adobe']) {
      expect(matched).toContain(real)
    }
  })

  it('scores a good CV as a good match', () => {
    const { score } = matchKeywords(CV, POSTING)
    expect(score).toBeGreaterThan(45)
  })

  it('keeps short technology names that read as ordinary words', () => {
    // `go` means the language. Adding it to the stopword list would be the
    // exact failure the original short list was guarding against.
    const { matched } = matchKeywords('Go and SQL and AWS developer', 'We need Go, SQL and AWS.')
    expect(matched).toEqual(expect.arrayContaining(['go', 'sql', 'aws']))
  })

  it('matches across a plural on either side', () => {
    expect(matchKeywords('Built REST APIs.', 'Experience with a REST API.').matched)
      .toContain('api')
    expect(matchKeywords('Deep API knowledge.', 'You will build APIs.').matched)
      .toContain('apis')
  })

  it('does not let a plural rule collapse a technology onto another word', () => {
    // `css` must not be satisfied by a CV that merely said `cs`.
    const { missing } = matchKeywords('BS CS graduate.', 'Strong CSS required.')
    expect(missing).toContain('css')
  })

  it('does not corrupt a term to make a plural match', () => {
    // A transform-then-compare stemmer turns `kubernetes` into `kubernete`
    // and `aws` into `aw`. This only ever ADDS candidates.
    const { missing } = matchKeywords('Docker only.', 'Kubernetes required.')
    expect(missing).toContain('kubernetes')
  })
})
