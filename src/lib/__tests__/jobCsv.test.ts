import { describe, it, expect } from 'vitest'
import { buildJobDedupKey, buildJobsCsvText, parseJobsCsvText } from '../jobCsv'

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

describe('buildJobsCsvText', () => {
  const job = {
    company: 'Acme',
    role: 'Frontend Engineer',
    status: 'applied' as const,
    date_applied: '2026-05-01',
    salary_min: 60000,
    salary_max: 90000,
    salary_currency: 'PHP',
    tags: ['fintech', 'new-grad'],
    is_referral: true,
    notes: null,
  }

  it('writes a header row the importer can read back', () => {
    const text = buildJobsCsvText([job])
    const parsed = parseJobsCsvText(text)
    expect(parsed.issues).toHaveLength(0)
    expect(parsed.rows[0].data).toMatchObject({
      company: 'Acme',
      role: 'Frontend Engineer',
      status: 'applied',
      salary_min: 60000,
      salary_max: 90000,
      salary_currency: 'PHP',
      tags: ['fintech', 'new-grad'],
      is_referral: true,
    })
  })

  it('leaves an unset field empty rather than writing the word null', () => {
    // "null" round-trips as a note that reads null, which is worse than blank.
    const text = buildJobsCsvText([job])
    expect(text).not.toContain('null')
  })

  it('keeps the currency code on every row', () => {
    // A column of bare numbers is how a peso figure re-imports as dollars.
    const text = buildJobsCsvText([job])
    expect(text.split('\n')[0]).toContain('salary_currency')
    expect(text.split('\n')[1]).toContain('PHP')
  })
})

describe('parseStatus via parseJobsCsvText', () => {
  it('reads back the exact status strings the app stores', () => {
    // "applied" does not start with "apply". The prefix test used to be
    // 'apply', so the single most common status imported as wishlist.
    const text = 'company,title,status\n' +
      ['A,Eng,wishlist', 'B,Eng,applied', 'C,Eng,interviewing', 'D,Eng,offer', 'E,Eng,rejected'].join('\n')
    const result = parseJobsCsvText(text)
    expect(result.rows.map((r) => r.data.status)).toEqual([
      'wishlist', 'applied', 'interviewing', 'offer', 'rejected',
    ])
  })
})
