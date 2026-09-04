import { describe, expect, it } from 'vitest'
import {
  extractAutofill,
  challengedSiteName,
  looksLikeBotChallenge,
  autofillFromUrlAlone,
} from '../../../supabase/functions/job-url-autofill/parser'

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

  it('extracts JobPosting from JSON-LD @graph', () => {
    const url = new URL('https://careers.example.com/jobs/2')
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@graph": [
                { "@type": "Organization", "name": "Other" },
                {
                  "@type": "JobPosting",
                  "title": "Platform Engineer",
                  "hiringOrganization": { "name": "Graph Co" },
                  "baseSalary": {
                    "@type": "MonetaryAmount",
                    "value": {
                      "@type": "QuantitativeValue",
                      "minValue": "120000",
                      "maxValue": "160000"
                    }
                  }
                }
              ]
            }
          </script>
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.role).toBe('Platform Engineer')
    expect(result.values.company).toBe('Graph Co')
    expect(result.values.salary_min).toBe(120000)
    expect(result.values.salary_max).toBe(160000)
  })

  it('extracts JobPosting from JSON-LD array', () => {
    const url = new URL('https://careers.example.com/jobs/3')
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            [
              { "@type": "BreadcrumbList" },
              {
                "@type": "JobPosting",
                "title": "Data Engineer",
                "hiringOrganization": { "name": "Array Inc" }
              }
            ]
          </script>
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.role).toBe('Data Engineer')
    expect(result.values.company).toBe('Array Inc')
  })

  it('prefers JSON-LD title over og:title', () => {
    const url = new URL('https://careers.example.com/jobs/4')
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Wrong Title - Example" />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Correct Title",
              "hiringOrganization": { "name": "Example" }
            }
          </script>
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.role).toBe('Correct Title')
  })

  it('supports meta tags where content comes first', () => {
    const url = new URL('https://careers.example.com/jobs/5')
    const html = `
      <html>
        <head>
          <meta content="Backend Engineer - Example Inc" property="og:title" />
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.role).toBe('Backend Engineer')
  })

  it('extracts salary range from text with commas and en dash', () => {
    const url = new URL('https://careers.example.com/jobs/6')
    const html = `
      <html>
        <body>
          <p>Compensation: $120,000 – $150,000 per year</p>
        </body>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.salary_min).toBe(120000)
    expect(result.values.salary_max).toBe(150000)
  })

  it('decodes HTML entities in meta tags', () => {
    const url = new URL('https://careers.example.com/jobs/7')
    const html = `
      <html>
        <head>
          <meta property="og:site_name" content="AT&amp;T" />
          <meta property="og:title" content="Network Engineer | Careers" />
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.company).toBe('AT&T')
  })

  it('handles Workday en-GB locale in URL path', () => {
    const url = new URL(
      'https://wd5.myworkdayjobs.com/en-GB/OpenAI/job/London/ML-Engineer_999'
    )
    const html = `
      <html>
        <head>
          <title>ML Engineer - Workday</title>
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.company?.toLowerCase()).toContain('openai')
    expect(result.values.role).toContain('ML Engineer')
  })

  it('ignores malformed JSON-LD blocks without throwing', () => {
    const url = new URL('https://careers.example.com/jobs/8')
    const html = `
      <html>
        <head>
          <script type="application/ld+json">{ this is not valid json }</script>
          <meta property="og:title" content="Frontend Engineer - Example" />
          <meta property="og:site_name" content="Example Co" />
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.role).toBe('Frontend Engineer')
    expect(result.values.company).toBe('Example Co')
  })

  it('returns helpful warnings when little data is available', () => {
    const url = new URL('https://careers.example.com/jobs/9')
    const html = `<html></html>`

    const result = extractAutofill(url, html)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Could not confidently detect company'),
        expect.stringContaining('Could not confidently detect role'),
        expect.stringContaining('Salary was not found'),
      ])
    )
  })

  it('cleans noisy LinkedIn boilerplate and encoded fragments', () => {
    const url = new URL('https://www.linkedin.com/jobs/view/123')
    // Simulate LinkedIn meta and a messy autopopulated title/body
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Bluesky HR Consultancy Inc. by 2x | LinkedIn" />
          <meta property="og:description" content="Bluesky HR Consultancy Inc. hiring Data Analyst in Makati, National Capital Region" />
          <title>Bluesky HR Consultancy Inc. hiring Data Analyst in Makati, National Capital Region | LinkedIn</title>
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.company).toBeTruthy()
    expect(result.values.company?.toLowerCase()).toContain('bluesky hr consultancy')
    expect(result.values.company?.toLowerCase()).not.toContain('by 2x')
    expect(result.values.role).toBeTruthy()
    expect(result.values.role?.toLowerCase()).toContain('data analyst')
  })

  it('decodes percent-encoded meta content and plus-as-space fragments', () => {
    const url = new URL('https://careers.example.com/jobs/encoded')
    const encodedTitle = 'Senior%20Engineer%20%7C%20Acme%20Corp'
    const html = `
      <html>
        <head>
          <meta property="og:title" content="${encodedTitle}" />
          <meta property="og:site_name" content="ACME+Corp" />
        </head>
      </html>
    `

    const result = extractAutofill(url, html)
    expect(result.values.role).toContain('Senior Engineer')
    expect(result.values.company).toBe('ACME Corp')
  })
})

describe('sites that answer a fetch with a bot challenge', () => {
  // MEASURED, not assumed (2026-09-05): every JobStreet HTML path -- /job/<id>,
  // /jobs, and the homepage -- returns 403 with Cloudflare's "Just a moment..."
  // interstitial, from a browser User-Agent with full Accept headers. Only
  // robots.txt answers 200. No selector work fixes that; no HTML arrives.

  it('recognises the APAC sites that block server-side reads', () => {
    expect(challengedSiteName('ph.jobstreet.com')).toBe('JobStreet')
    expect(challengedSiteName('www.jobstreet.com.ph')).toBe('JobStreet')
    expect(challengedSiteName('hk.jobsdb.com')).toBe('JobsDB')
    expect(challengedSiteName('www.seek.com.au')).toBe('SEEK')
    // A site that does NOT block must not be labelled as one, or the app would
    // stop trying to read pages it can read perfectly well.
    expect(challengedSiteName('boards.greenhouse.io')).toBeNull()
    expect(challengedSiteName('jobs.lever.co')).toBeNull()
    // Not a substring match: this must not fire on an unrelated host.
    expect(challengedSiteName('notjobstreet.com.evil.test')).toBeNull()
  })

  it('detects a challenge by status AND by body', () => {
    // A challenge can arrive as a 200 whose only job is to run JS and redirect.
    // Status alone would let that through to the parser, which would then
    // "succeed" and extract "Just a moment..." as the role -- a confidently
    // wrong autofill, which is worse than an error because nothing looks broken.
    expect(looksLikeBotChallenge(403, '')).toBe(true)
    expect(looksLikeBotChallenge(503, '')).toBe(true)
    expect(looksLikeBotChallenge(200, '<html><title>Just a moment...</title>')).toBe(true)
    expect(looksLikeBotChallenge(200, '<div class="cf-browser-verification">')).toBe(true)
    // A real page is not a challenge.
    expect(looksLikeBotChallenge(200, '<html><title>Frontend Engineer at Acme</title>')).toBe(false)
  })

  it('returns what the URL alone proves, rather than nothing', () => {
    // A bot challenge is not a broken link. Answering "could not fetch this
    // URL" sends the user to check a URL that is perfectly correct.
    const result = autofillFromUrlAlone(new URL('https://ph.jobstreet.com/job/86776684'))
    expect(result.values.source).toBe('JobStreet')
    expect(result.values.url).toBe('https://ph.jobstreet.com/job/86776684')
    // Nothing is invented from the path -- no role, no company.
    expect(result.values.role).toBeUndefined()
    expect(result.values.company).toBeUndefined()
    // And it says why, naming the site and the way that does work.
    expect(result.warnings.join(' ')).toMatch(/JobStreet blocks automated reads/)
    expect(result.warnings.join(' ')).toMatch(/paste/i)
  })

  it('still explains itself for an unknown blocking host', () => {
    const result = autofillFromUrlAlone(new URL('https://unknown.example/job/1'))
    expect(result.values.source).toBeUndefined()
    expect(result.warnings.join(' ')).toMatch(/could not be read/i)
  })
})
