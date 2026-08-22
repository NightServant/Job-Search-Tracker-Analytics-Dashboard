import { buildJobDedupKey, parseJobsCsvText } from '../jobCsv'

describe('jobCsv utilities', () => {
  it('builds a normalized dedup key', () => {
    expect(
      buildJobDedupKey({
        company: '  Acme  ',
        role: 'Frontend Engineer',
        date_applied: '2026-05-01',
        url: 'https://example.com/job',
      })
    ).toBe('acme|frontend engineer|2026-05-01|https://example.com/job')
  })

  it('parses common job CSV headers', () => {
    const result = parseJobsCsvText(`company,title,status,date_applied\nAcme,Frontend Engineer,applied,2026-05-01`)

    expect(result.fatalError).toBeUndefined()
    expect(result.issues).toHaveLength(0)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.data.company).toBe('Acme')
    expect(result.rows[0]?.data.role).toBe('Frontend Engineer')
    expect(result.rows[0]?.dedupKey).toBe('acme|frontend engineer|2026-05-01|')
  })
})
