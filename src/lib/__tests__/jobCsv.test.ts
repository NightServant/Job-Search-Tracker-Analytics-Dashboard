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
  it('imports the M1 columns when the CSV carries them', () => {
    const result = parseJobsCsvText(
      `company,title,status,currency,job_description\nAcme,Frontend Engineer,applied,sgd,Build the web app`
    )

    expect(result.issues).toHaveLength(0)
    expect(result.rows[0]?.data.salary_currency).toBe('SGD')
    expect(result.rows[0]?.data.description).toBe('Build the web app')
  })

  it('drops an unrecognised currency rather than failing the row', () => {
    const result = parseJobsCsvText(
      `company,title,status,currency\nAcme,Frontend Engineer,applied,XYZ`
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.data.salary_currency).toBeUndefined()
    expect(result.issues.some((i) => i.message.includes('XYZ'))).toBe(true)
  })
})
