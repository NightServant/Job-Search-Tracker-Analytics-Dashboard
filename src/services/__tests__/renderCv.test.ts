import { describe, it, expect } from 'vitest'
import { renderCvHtml } from '../../../supabase/functions/cv-render/renderCv'
import { emptyCvDocument, type CvDocument } from '../cvSchema'

function cv(overrides: Partial<CvDocument> = {}): CvDocument {
  const base = emptyCvDocument()
  return {
    ...base,
    basics: { ...base.basics, name: 'Gabe Cervantes', email: 'gabe@example.com' },
    ...overrides,
  }
}

describe('renderCvHtml', () => {
  it('renders the candidate name as the document heading', () => {
    const html = renderCvHtml(cv(), 'CV')
    expect(html).toContain('Gabe Cervantes')
  })

  it('escapes user content so a CV cannot inject markup', () => {
    const doc = cv()
    doc.basics.name = '<script>alert(1)</script>'
    const html = renderCvHtml(doc, 'CV')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes the document title too', () => {
    const html = renderCvHtml(cv(), '</title><script>x</script>')
    expect(html).not.toContain('<script>x</script>')
  })

  it('renders each role with its bullet points', () => {
    const doc = cv({
      work: [{
        company: 'Acme', position: 'Engineer', location: 'Remote',
        startDate: '2024-01', endDate: '2025-06',
        highlights: ['Shipped billing', 'Cut latency in half'],
      }],
    })
    const html = renderCvHtml(doc, 'CV')
    expect(html).toContain('Acme')
    expect(html).toContain('Shipped billing')
    expect(html).toContain('Cut latency in half')
  })

  it('shows an open-ended role as Present rather than a blank date', () => {
    const doc = cv({
      work: [{
        company: 'Acme', position: 'Engineer', location: 'Remote',
        startDate: '2024-01', endDate: null, highlights: [],
      }],
    })
    expect(renderCvHtml(doc, 'CV')).toContain('Present')
  })

  it('omits sections that have no content instead of printing empty headings', () => {
    const html = renderCvHtml(cv(), 'CV')
    expect(html).not.toContain('>Experience<')
    expect(html).not.toContain('>Skills<')
  })

  it('renders skills when present', () => {
    const html = renderCvHtml(cv({ skills: ['TypeScript', 'Postgres'] }), 'CV')
    expect(html).toContain('Skills')
    expect(html).toContain('TypeScript')
  })
})
