import { describe, expect, it } from 'vitest'
import { extractAutofill } from '../../../supabase/functions/job-url-autofill/parser'

describe('job url autofill parser', () => {
  it('extracts from LinkedIn metadata heuristics', () => {
    const url = new URL('https://www.linkedin.com/jobs/view/123')
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Senior Software Engineer | LinkedIn" />
          <meta property="og:description" content="Apply now for the Senior Software Engineer role at Acme Corp." />
          <title>Senior Software Engineer | LinkedIn</title>
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.role).toContain('Senior Software Engineer')
    expect(result.values.company).toContain('Acme Corp')
    expect(result.values.source).toBe('LinkedIn')
  })

  it('extracts company from Greenhouse URL path', () => {
    const url = new URL('https://boards.greenhouse.io/stripe/jobs/987')
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Backend Engineer - Stripe" />
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.company?.toLowerCase()).toContain('stripe')
    expect(result.values.role).toContain('Backend Engineer')
  })

  it('extracts company from Lever URL path', () => {
    const url = new URL('https://jobs.lever.co/notion/abc123')
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Product Designer - Notion" />
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.company?.toLowerCase()).toContain('notion')
    expect(result.values.role).toContain('Product Designer')
  })

  it('extracts company from Workday URL structure', () => {
    const url = new URL('https://wd5.myworkdayjobs.com/en-US/OpenAI/job/San-Francisco/Research-Engineer_444')
    const html = `
      <html>
        <head>
          <title>Research Engineer - Workday</title>
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.company?.toLowerCase()).toContain('openai')
    expect(result.values.role).toContain('Research Engineer')
  })

  it('extracts role, company and salary from JSON-LD job posting', () => {
    const url = new URL('https://careers.example.com/jobs/1')
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Staff Frontend Engineer",
              "hiringOrganization": { "name": "Example Inc" },
              "baseSalary": {
                "@type": "MonetaryAmount",
                "value": {
                  "@type": "QuantitativeValue",
                  "minValue": 180000,
                  "maxValue": 230000
                }
              }
            }
          </script>
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.role).toBe('Staff Frontend Engineer')
    expect(result.values.company).toBe('Example Inc')
    expect(result.values.salary_min).toBe(180000)
    expect(result.values.salary_max).toBe(230000)
  })
})
