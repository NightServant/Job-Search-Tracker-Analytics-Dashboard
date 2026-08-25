import { describe, it, expect } from 'vitest'
import { lintForAts } from '../atsLint'
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
