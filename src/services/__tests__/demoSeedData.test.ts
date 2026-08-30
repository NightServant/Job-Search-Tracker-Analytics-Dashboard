import { describe, it, expect } from 'vitest'
import { buildDemoDataset } from '../../../scripts/demoSeedData.mjs'

const data = buildDemoDataset()

describe('buildDemoDataset', () => {
  it('provides at least the 25 applications the roadmap asks for', () => {
    expect(data.jobs.length).toBeGreaterThanOrEqual(25)
  })

  it('covers all five pipeline statuses', () => {
    const statuses = new Set(data.jobs.map((j) => j.status))
    expect([...statuses].sort()).toEqual(
      ['applied', 'interviewing', 'offer', 'rejected', 'wishlist'].sort()
    )
  })

  it('prices everything in PHP, since a mixed-currency demo misreports analytics', () => {
    const currencies = new Set(data.jobs.map((j) => j.salary_currency))
    expect([...currencies]).toEqual(['PHP'])
  })

  it('gives every application a description, which is what ATS matching reads', () => {
    expect(data.jobs.every((j) => typeof j.description === 'string' && j.description.length > 0)).toBe(true)
  })

  it('never dates an application in the future', () => {
    const today = new Date().toISOString().slice(0, 10)
    const dated = data.jobs.filter((j) => j.date_applied)
    expect(dated.every((j) => (j.date_applied ?? '') <= today)).toBe(true)
  })

  it('leaves wishlist entries undated, because they were never sent', () => {
    const wishlist = data.jobs.filter((j) => j.status === 'wishlist')
    expect(wishlist.length).toBeGreaterThan(0)
    expect(wishlist.every((j) => j.date_applied === null)).toBe(true)
  })

  it('attaches every event and note to a job that exists', () => {
    const refs = new Set(data.jobs.map((j) => j.ref))
    expect(data.events.every((e) => refs.has(e.jobRef))).toBe(true)
    expect(data.activity.every((a) => refs.has(a.jobRef))).toBe(true)
  })

  it('gives interviewing applications something on the calendar', () => {
    const interviewing = data.jobs
      .filter((j) => j.status === 'interviewing')
      .map((j) => j.ref as string)
    const withEvents = new Set(data.events.map((e) => e.jobRef))
    expect(interviewing.every((ref) => withEvents.has(ref))).toBe(true)
  })

  it('ships a structured CV that passes the ATS lint', () => {
    expect(data.cv.sections.basics.name).toBeTruthy()
    expect(data.cv.sections.work.length).toBeGreaterThan(0)
  })

  it('is deterministic, so re-seeding produces the same demo', () => {
    expect(JSON.stringify(buildDemoDataset())).toBe(JSON.stringify(data))
  })
})
