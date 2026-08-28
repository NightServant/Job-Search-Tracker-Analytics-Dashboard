import { describe, it, expect } from 'vitest'
import { lintForAts, lintSections } from '../atsLint'
import { emptyCvDocument, type CvDocument } from '../cvSchema'

function completeCv(): CvDocument {
  return {
    ...emptyCvDocument(),
    basics: {
      name: 'Gabe Cervantes', label: 'Software Engineer', email: 'gabe@example.com',
      phone: '+63 900 000 0000', location: 'Manila', summary: 'Builds web applications.',
    },
    work: [{
      company: 'Acme', position: 'Engineer', location: 'Remote',
      startDate: '2024-01', endDate: null, highlights: ['Shipped the billing rewrite'],
    }],
    skills: ['TypeScript', 'Postgres'],
  }
}

describe('lintForAts', () => {
  it('passes a complete CV with no reasons', () => {
    const result = lintForAts(completeCv())
    expect(result.verdict).toBe('pass')
    expect(result.reasons).toEqual([])
  })

  it('fails a CV with no name, which an ATS cannot file', () => {
    const doc = completeCv()
    doc.basics.name = ''
    const result = lintForAts(doc)
    expect(result.verdict).toBe('fail')
    expect(result.reasons.join(' ')).toMatch(/name/i)
  })

  it('fails a CV with no email, which an ATS cannot reply to', () => {
    const doc = completeCv()
    doc.basics.email = ''
    expect(lintForAts(doc).verdict).toBe('fail')
  })

  it('fails a malformed email rather than trusting it', () => {
    const doc = completeCv()
    doc.basics.email = 'gabe-at-example'
    expect(lintForAts(doc).verdict).toBe('fail')
  })

  it('fails a CV with no work history', () => {
    const doc = completeCv()
    doc.work = []
    expect(lintForAts(doc).verdict).toBe('fail')
  })

  it('asks for review when the summary is empty', () => {
    const doc = completeCv()
    doc.basics.summary = ''
    const result = lintForAts(doc)
    expect(result.verdict).toBe('review')
    expect(result.reasons.join(' ')).toMatch(/summary/i)
  })

  it('asks for review when no skills are listed', () => {
    const doc = completeCv()
    doc.skills = []
    expect(lintForAts(doc).verdict).toBe('review')
  })

  it('asks for review when a role has no bullet points to match against', () => {
    const doc = completeCv()
    doc.work[0].highlights = []
    const result = lintForAts(doc)
    expect(result.verdict).toBe('review')
    expect(result.reasons.join(' ')).toMatch(/Acme/)
  })

  it('asks for review when a role has no start date', () => {
    const doc = completeCv()
    doc.work[0].startDate = ''
    expect(lintForAts(doc).verdict).toBe('review')
  })

  it('reports fail when a CV has both blocking and reviewable problems', () => {
    const doc = completeCv()
    doc.basics.name = ''
    doc.skills = []
    const result = lintForAts(doc)
    expect(result.verdict).toBe('fail')
    expect(result.reasons.length).toBeGreaterThan(1)
  })
})

describe('lintSections', () => {
  it('lints a stored structured CV down to the one verdict a list column can show', () => {
    expect(lintSections(completeCv())).toBe('pass')
  })

  it('has no verdict for a legacy word or latex draft, whose sections column is null', () => {
    // "Not checked" and "failed the check" are different facts, and a list
    // that renders the first as the second accuses every pre-sections CV of
    // being unreadable by an ATS.
    expect(lintSections(null)).toBeNull()
  })

  it('has no verdict for JSONB that is not a CV document at all', () => {
    expect(lintSections({ type: 'doc', content: [] })).toBeNull()
    expect(lintSections('a string')).toBeNull()
  })

  it('has no verdict rather than throwing when the shape passes the guard but the fields are wrong', () => {
    // The column is nullable JSONB with nothing constraining it, and
    // isValidCvDocument only checks the top-level shape -- basics.name can
    // still be a number, which would throw inside the linter and take the
    // whole Documents list down with it.
    expect(lintSections({ basics: {}, work: [], education: [], skills: [], projects: [], awards: [] })).toBeNull()
  })
})
