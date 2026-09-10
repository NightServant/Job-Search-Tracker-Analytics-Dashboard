import { describe, it, expect } from 'vitest'
import { toFeedJob } from '../jobFeed'

const RAW = {
  id: 152938,
  url: 'https://jobicy.com/jobs/152938-software-engineer-backend',
  jobTitle: 'Software Engineer, Backend',
  companyName: 'Vercel',
  jobIndustry: ['Software Engineering'],
  jobType: ['Full-Time'],
  jobGeo: 'USA',
  jobLevel: 'Any',
  jobExcerpt: 'About Vercel: we free people to ship what&#039;s next&hellip;',
  jobDescription: '<h3>About</h3><script>alert(1)</script>',
  pubDate: '2026-09-09T17:23:14+00:00',
  salaryMin: 196000,
  salaryMax: 294000,
  salaryCurrency: 'USD',
  salaryPeriod: 'yearly',
}

/**
 * The boundary between a third-party feed and this app.
 *
 * Every test here is about what does NOT get through: markup, entities left
 * raw, a non-http scheme in something that becomes an `href`, and a row too
 * incomplete to render honestly.
 */
describe('toFeedJob', () => {
  it('keeps the fields the panel shows', () => {
    const job = toFeedJob(RAW)!
    expect(job.title).toBe('Software Engineer, Backend')
    expect(job.company).toBe('Vercel')
    expect(job.geo).toBe('USA')
    expect(job.level).toBe('Any')
    expect(job.industry).toBe('Software Engineering')
    expect(job.salaryMin).toBe(196000)
    expect(job.salaryCurrency).toBe('USD')
    expect(job.publishedAt).toBe(new Date('2026-09-09T17:23:14+00:00').toISOString())
  })

  it('drops the description entirely', () => {
    // 3-6KB of third-party HTML per row that nothing renders. Keeping it would
    // leave untrusted markup one careless dangerouslySetInnerHTML from the DOM.
    const job = toFeedJob(RAW)! as unknown as Record<string, unknown>
    expect(job.jobDescription).toBeUndefined()
    expect(JSON.stringify(job)).not.toContain('<script>')
  })

  it('decodes entities and strips tags out of the excerpt', () => {
    const job = toFeedJob({ ...RAW, jobExcerpt: '<b>Ship</b> fast &amp; well&hellip;' })!
    expect(job.excerpt).toBe('Ship fast & well…')
  })

  it('refuses a URL that is not http(s)', () => {
    // The URL becomes an `href`. `javascript:` there is a stranger's script
    // running on this app's own origin.
    expect(toFeedJob({ ...RAW, url: 'javascript:alert(1)' })).toBeNull()
    expect(toFeedJob({ ...RAW, url: 'data:text/html,<script>alert(1)</script>' })).toBeNull()
    expect(toFeedJob({ ...RAW, url: 'not a url' })).toBeNull()
  })

  it('drops a row that cannot be shown, tracked or placed in time', () => {
    expect(toFeedJob({ ...RAW, jobTitle: '' })).toBeNull()
    expect(toFeedJob({ ...RAW, pubDate: 'sometime' })).toBeNull()
    expect(toFeedJob({ ...RAW, pubDate: undefined })).toBeNull()
    expect(toFeedJob(null)).toBeNull()
  })

  it('names a company it was not given rather than printing undefined', () => {
    expect(toFeedJob({ ...RAW, companyName: null })!.company).toBe('unnamed company')
  })

  it('treats a zero or negative salary as no salary', () => {
    // The feed sends 0 for "not stated", and "$0 – $0" is a worse answer than
    // saying nothing.
    const job = toFeedJob({ ...RAW, salaryMin: 0, salaryMax: 0 })!
    expect(job.salaryMin).toBeNull()
    expect(job.salaryMax).toBeNull()
  })
})
