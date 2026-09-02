import { describe, it, expect } from 'vitest'
import { buildDemoFixture, DEMO } from '../demoFixture'
import { rankedSources, applicationsPerMonth } from '../overviewSeries'
import type { JobStatus } from '@/types'

const AT = (iso: string) => new Date(iso)

describe('the demo fixture as a dataset', () => {
  it('has enough applications for every panel to have something to say', () => {
    // A thin fixture produces a screen of "not enough data yet", which is the
    // worst possible first impression on the page whose whole job is the
    // first impression.
    expect(DEMO.jobs.length).toBeGreaterThanOrEqual(25)
  })

  it('covers all five statuses', () => {
    const seen = new Set<JobStatus>(DEMO.jobs.map((j) => j.status))
    for (const status of ['wishlist', 'applied', 'interviewing', 'offer', 'rejected'] as const) {
      expect(seen, `no ${status} application in the demo`).toContain(status)
    }
  })

  it('quotes every salary in one currency, so the salary panel charts', () => {
    // Mixed currencies make the panel disclose an exclusion instead of drawing
    // a distribution. PHP because the Global Constraint says so.
    const currencies = new Set(DEMO.jobs.map((j) => j.salary_currency))
    expect([...currencies]).toEqual(['PHP'])
  })

  it('skews sources enough to produce a primary, a secondary and a tail', () => {
    // rankedSources collapses everything after the top two into "others", so
    // fewer than three distinct sources renders a chart with nothing to
    // compare. The old seed script set every job to LinkedIn.
    const ranked = rankedSources(DEMO.jobs)
    expect(ranked.map((r) => r.rank)).toEqual(['primary', 'secondary', 'tertiary'])
    expect(ranked[2].sources).toBeGreaterThan(0)
  })

  it('carries no real personal data', () => {
    // A fixture committed to a public repo is published. Invented companies,
    // invented names, and example.com addresses only.
    const blob = JSON.stringify(DEMO)
    const emails = blob.match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? []
    expect(emails.length).toBeGreaterThan(0) // positive companion
    for (const email of emails) {
      expect(email, `${email} is not an example.com address`).toMatch(/@example\.(com|org)$/)
    }
  })

  it('gives Documents two CVs with history, one per editor', () => {
    expect(DEMO.resumes.length).toBeGreaterThanOrEqual(2)
    const modes = new Set(DEMO.resumes.map((r) => r.mode))
    expect(modes).toContain('word')
    expect(modes).toContain('latex')
    expect(DEMO.resumes.some((r) => r.hasVersions)).toBe(true)
  })

  it('gives the calendar something in the future to show', () => {
    const now = Date.now()
    expect(DEMO.events.length).toBeGreaterThan(0)
    expect(DEMO.events.some((e) => new Date(e.starts_at).getTime() > now)).toBe(true)
  })
})

describe('the demo fixture dates, which are the only real logic in it', () => {
  // Hardcoded dates mean the demo says "applied 8 months ago" by spring and the
  // trend chart runs off the left edge of its six-month window. The whole
  // fixture is therefore built from a `now` rather than from literals.
  it('moves with the clock rather than being pinned to a literal', () => {
    const a = buildDemoFixture(AT('2026-03-15T00:00:00Z'))
    const b = buildDemoFixture(AT('2027-09-15T00:00:00Z'))

    const appliedA = a.jobs.find((j) => j.date_applied)!.date_applied!
    const appliedB = b.jobs.find((j) => j.date_applied)!.date_applied!
    expect(appliedA).not.toBe(appliedB)
    expect(appliedA.startsWith('2026')).toBe(true)
    expect(appliedB.startsWith('2027')).toBe(true)
  })

  it('lands every application inside the six-month trend window', () => {
    // applicationsPerMonth buckets on created_at against the REAL clock, so a
    // fixture whose created_at values fall outside the window draws an empty
    // chart no matter how many rows it has.
    const points = applicationsPerMonth(DEMO.jobs, 6)
    const total = points.reduce((sum, p) => sum + p.count, 0)
    expect(total).toBe(DEMO.jobs.length)
  })

  it('never dates an application in the future', () => {
    const now = Date.now()
    for (const job of DEMO.jobs) {
      if (!job.date_applied) continue
      expect(new Date(job.date_applied).getTime()).toBeLessThanOrEqual(now)
    }
  })

  it('leaves wishlist applications undated, because they were never sent', () => {
    const wishlist = DEMO.jobs.filter((j) => j.status === 'wishlist')
    expect(wishlist.length).toBeGreaterThan(0)
    for (const job of wishlist) expect(job.date_applied).toBeNull()
  })

  it('is deterministic for a given now', () => {
    // Two builds at the same instant must be identical, or screenshots and the
    // page drift from each other.
    const when = AT('2026-05-01T00:00:00Z')
    expect(buildDemoFixture(when)).toEqual(buildDemoFixture(when))
  })
})

describe('the demo analytics, which must agree with the demo applications', () => {
  // Hand-written analytics that contradict the applications list is a subtle
  // lie: a reviewer clicking between the two screens sees different totals.
  // Everything here is DERIVED from DEMO.jobs for that reason.
  const { analytics } = DEMO

  it('counts the same applications the applications screen shows', () => {
    expect(analytics.conversionMetrics.totalJobs).toBe(DEMO.jobs.length)
  })

  it('never lets a chain stage exceed the one above it', () => {
    // getConversionFunnel's own contract: the chain is monotonically
    // non-increasing, and only the Rejected entry is an exit.
    const chain = analytics.conversionFunnel.filter((f) => !f.isExit)
    for (let i = 1; i < chain.length; i += 1) {
      expect(chain[i].count).toBeLessThanOrEqual(chain[i - 1].count)
    }
  })

  it('marks rejection as an exit and nothing else', () => {
    const exits = analytics.conversionFunnel.filter((f) => f.isExit)
    expect(exits).toHaveLength(1)
    expect(exits[0].stage.toLowerCase()).toContain('reject')
    expect(exits[0].count).toBe(DEMO.jobs.filter((j) => j.status === 'rejected').length)
  })

  it('populates every panel, so none of them shows an empty state', () => {
    // The test that keeps the fixture honest as panels are added: it fails
    // when a new panel has no data, which is exactly when someone needs
    // telling.
    expect(analytics.timeInStage.length).toBeGreaterThan(0)
    expect(analytics.conversionFunnel.length).toBeGreaterThan(0)
    expect(analytics.statusTransitions.length).toBeGreaterThan(0)
    expect(analytics.cohortAnalysis.length).toBeGreaterThan(0)
    expect(Object.keys(analytics.conversionMetrics.conversionBySource).length).toBeGreaterThan(0)
  })

  it('gives the pipeline flow real transitions to draw', () => {
    // The panel most likely to be forgotten, because Gabe's own account has no
    // status history and has never seen it populated.
    for (const t of analytics.statusTransitions) {
      expect(t.count).toBeGreaterThan(0)
      expect(t.from).not.toBe(t.to)
    }
  })

  it('cohorts by the months applications were actually sent', () => {
    const applied = DEMO.jobs.filter((j) => j.date_applied)
    const cohortTotal = analytics.cohortAnalysis.reduce((s, c) => s + c.jobsApplied, 0)
    expect(cohortTotal).toBe(applied.length)
  })
})
