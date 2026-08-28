import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  analyticsService,
  type TimeInStageMetric,
  type ConversionFunnelMetric,
  type SourceConversionTrend,
  type CohortAnalysis,
  type ConversionMetrics,
} from '../analyticsService'
import * as Sentry from '@sentry/react'

vi.mock('@sentry/react')

/**
 * `getConversionFunnel`'s fix round exists because every test below this
 * point in the file (pre-existing) constructs its expected `funnel` /
 * `cohorts` / `trends` arrays as inline literals and asserts against them --
 * the exact defect class that let a quadratic self-scan, a silently-dropped
 * `rejected` count, a never-computed `wishlist` count, and two stages
 * sharing one `avgDaysToStage` value all ship green. None of those tests
 * ever calls `analyticsService.getConversionFunnel` itself.
 *
 * This fake models `jobs` and `job_status_history` well enough to drive the
 * real function: `.from(table).select(...).eq(...).eq(...)` filters an
 * in-memory row array and resolves like a PostgREST response. `.order()` is
 * a no-op (`_computeTimeToStatus`'s callers only ever look at whole result
 * sets here, not order).
 */
const clientRef = vi.hoisted(() => ({ current: null as unknown as { from: (table: string) => unknown } }))

vi.mock('@/lib/supabase', () => ({
  supabase: new Proxy(
    {},
    { get: (_target, prop: string) => (clientRef.current as unknown as Record<string, unknown>)[prop] }
  ),
}))

type FakeRow = Record<string, unknown>

function fakeSupabase(tables: Record<string, FakeRow[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? []
      let filtered = rows.slice()
      const builder: PromiseLike<{ data: FakeRow[]; error: null }> & Record<string, unknown> = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          filtered = filtered.filter((r) => r[col] === val)
          return builder
        },
        order: () => builder,
        then: (onFulfilled: any, onRejected?: any) =>
          Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected),
      } as any
      return builder
    },
  }
}

/** Minutes-precision ISO timestamp `n` days after a fixed epoch. */
function daysAfter(epochIso: string, days: number): string {
  return new Date(new Date(epochIso).getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConversionFunnel -- real computation, not literal fixtures', () => {
    const EPOCH = '2026-01-01T00:00:00.000Z'

    it('is monotonically non-increasing across wishlist -> applied -> interviewing -> offer, crediting a job at a later stage with every earlier stage it passed through', async () => {
      // j1: never left wishlist, no history.
      // j2: applied only.
      // j3: applied -> interviewing.
      // j4: applied -> interviewing -> offer -- the exact case that used to
      //     be invisible at "interviewing" under current-status-only counting,
      //     which could render interviewing LOWER than offer.
      // j5: applied -> interviewing -> rejected -- a rejection after
      //     interviewing must still count at applied and interviewing.
      // j6: currently rejected with NO history rows at all (predates
      //     capture) -- falls back to current status, credited only at
      //     wishlist since unverified progress cannot be fabricated.
      clientRef.current = fakeSupabase({
        jobs: [
          { id: 'j1', user_id: 'user-1', status: 'wishlist', created_at: EPOCH },
          { id: 'j2', user_id: 'user-1', status: 'applied', created_at: EPOCH },
          { id: 'j3', user_id: 'user-1', status: 'interviewing', created_at: EPOCH },
          { id: 'j4', user_id: 'user-1', status: 'offer', created_at: EPOCH },
          { id: 'j5', user_id: 'user-1', status: 'rejected', created_at: EPOCH },
          { id: 'j6', user_id: 'user-1', status: 'rejected', created_at: EPOCH },
        ],
        job_status_history: [
          { job_id: 'j2', user_id: 'user-1', to_status: 'applied', changed_at: daysAfter(EPOCH, 1) },
          { job_id: 'j3', user_id: 'user-1', to_status: 'applied', changed_at: daysAfter(EPOCH, 1) },
          { job_id: 'j3', user_id: 'user-1', to_status: 'interviewing', changed_at: daysAfter(EPOCH, 5) },
          { job_id: 'j4', user_id: 'user-1', to_status: 'applied', changed_at: daysAfter(EPOCH, 1) },
          { job_id: 'j4', user_id: 'user-1', to_status: 'interviewing', changed_at: daysAfter(EPOCH, 5) },
          { job_id: 'j4', user_id: 'user-1', to_status: 'offer', changed_at: daysAfter(EPOCH, 20) },
          { job_id: 'j5', user_id: 'user-1', to_status: 'applied', changed_at: daysAfter(EPOCH, 1) },
          { job_id: 'j5', user_id: 'user-1', to_status: 'interviewing', changed_at: daysAfter(EPOCH, 5) },
          { job_id: 'j5', user_id: 'user-1', to_status: 'rejected', changed_at: daysAfter(EPOCH, 9) },
          // j6 has no history rows at all.
        ],
      })

      const result = await analyticsService.getConversionFunnel('user-1')

      const chain = result.filter((r) => !r.isExit)
      expect(chain.map((r) => r.stage)).toEqual(['Wishlist', 'Applied', 'Interviewing', 'Offer'])
      const byStage = Object.fromEntries(chain.map((r) => [r.stage, r.count]))

      // The invariant, not five hand-written numbers: each stage's count is
      // <= the previous stage's, for the whole chain.
      for (let i = 1; i < chain.length; i++) {
        expect(chain[i].count).toBeLessThanOrEqual(chain[i - 1].count)
      }

      // The specific regression this exists to catch: j4 is currently at
      // Offer, and must still be counted at Interviewing. Reverting to
      // counting current status alone drops j4 out of `interviewing`,
      // making this assertion (and the loop above, for this pair) fail.
      expect(byStage.Interviewing).toBeGreaterThanOrEqual(byStage.Offer)
      expect(byStage.Applied).toBe(4) // j2, j3, j4, j5 -- not j1, not j6
      expect(byStage.Interviewing).toBe(3) // j3, j4, j5
      expect(byStage.Offer).toBe(1) // j4 only
      expect(byStage.Wishlist).toBe(6) // every job

      const rejected = result.find((r) => r.stage === 'Rejected')!
      expect(rejected.isExit).toBe(true)
      expect(rejected.count).toBe(2) // j5, j6 -- current status, not chain membership
      expect(chain.every((r) => r.isExit === false)).toBe(true)
    })

    it('reports Wishlist and Rejected, not just the three stages the old code returned', async () => {
      clientRef.current = fakeSupabase({
        jobs: [
          { id: 'j1', user_id: 'user-1', status: 'wishlist', created_at: EPOCH },
          { id: 'j2', user_id: 'user-1', status: 'rejected', created_at: EPOCH },
        ],
        job_status_history: [{ job_id: 'j2', user_id: 'user-1', to_status: 'rejected', changed_at: daysAfter(EPOCH, 2) }],
      })

      const result = await analyticsService.getConversionFunnel('user-1')

      expect(result).toHaveLength(5)
      expect(result.map((r) => r.stage)).toEqual(['Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected'])
      expect(result.find((r) => r.stage === 'Rejected')?.count).toBe(1)
    })

    it('computes a distinct avgDaysToStage for Applied and Interviewing instead of reusing the same value', async () => {
      clientRef.current = fakeSupabase({
        jobs: [{ id: 'j1', user_id: 'user-1', status: 'interviewing', created_at: EPOCH }],
        job_status_history: [
          { job_id: 'j1', user_id: 'user-1', to_status: 'applied', changed_at: daysAfter(EPOCH, 2) },
          { job_id: 'j1', user_id: 'user-1', to_status: 'interviewing', changed_at: daysAfter(EPOCH, 10) },
        ],
      })

      const result = await analyticsService.getConversionFunnel('user-1')
      const applied = result.find((r) => r.stage === 'Applied')!
      const interviewing = result.find((r) => r.stage === 'Interviewing')!

      expect(applied.avgDaysToStage).toBe(2)
      expect(interviewing.avgDaysToStage).toBe(10)
      expect(applied.avgDaysToStage).not.toBe(interviewing.avgDaysToStage)
    })
  })

  describe('getTimeInStageMetrics', () => {
    it('computes average time in each status stage', async () => {
      // Mock data: job spends 7 days in applied, 14 days in interviewing
      const mockMetrics: TimeInStageMetric[] = [
        {
          status: 'applied',
          avgDays: 7,
          medianDays: 7,
          minDays: 5,
          maxDays: 10,
          count: 5,
        },
        {
          status: 'interviewing',
          avgDays: 14,
          medianDays: 14,
          minDays: 7,
          maxDays: 21,
          count: 3,
        },
      ]

      expect(mockMetrics[0]?.avgDays).toBe(7)
      expect(mockMetrics[1]?.avgDays).toBe(14)
      expect(mockMetrics[0]?.count).toBe(5)
    })

    it('computes median, min, and max days in stage', () => {
      const metric: TimeInStageMetric = {
        status: 'interviewing',
        avgDays: 14.2,
        medianDays: 14,
        minDays: 5,
        maxDays: 30,
        count: 8,
      }

      expect(metric.medianDays).toBe(14)
      expect(metric.minDays).toBe(5)
      expect(metric.maxDays).toBe(30)
      expect(metric.avgDays).toBeLessThan(20)
    })

    it('includes count of transitions for each stage', () => {
      const metrics: TimeInStageMetric[] = [
        { status: 'applied', avgDays: 5, medianDays: 5, minDays: 2, maxDays: 10, count: 15 },
        { status: 'interviewing', avgDays: 10, medianDays: 10, minDays: 3, maxDays: 20, count: 8 },
        { status: 'offer', avgDays: 2, medianDays: 2, minDays: 1, maxDays: 5, count: 3 },
      ]

      expect(metrics[0]?.count).toBe(15)
      expect(metrics[1]?.count).toBe(8)
      expect(metrics[2]?.count).toBe(3)
    })

    it('logs to Sentry on success', () => {
      expect(Sentry.addBreadcrumb).toBeDefined()
    })

    it('captures Sentry exception on error', () => {
      expect(Sentry.captureException).toBeDefined()
    })
  })

  describe('getConversionFunnel', () => {
    it('computes funnel stages: applied -> interviewing -> offer', () => {
      const funnel: ConversionFunnelMetric[] = [
        {
          stage: 'Applied',
          count: 50,
          percentage: 100,
          avgDaysToStage: 0,
          isExit: false,
        },
        {
          stage: 'Interviewing',
          count: 15,
          percentage: 30,
          avgDaysToStage: 7,
          isExit: false,
        },
        {
          stage: 'Offer',
          count: 3,
          percentage: 6,
          avgDaysToStage: 21,
          isExit: false,
        },
      ]

      expect(funnel).toHaveLength(3)
      expect(funnel[0]?.count).toBe(50)
      expect(funnel[1]?.count).toBe(15)
      expect(funnel[2]?.count).toBe(3)
    })

    it('computes conversion percentages at each stage', () => {
      const totalJobs = 100
      const funnel: ConversionFunnelMetric[] = [
        { stage: 'Applied', count: 100, percentage: 100, avgDaysToStage: 0, isExit: false },
        { stage: 'Interviewing', count: 30, percentage: 30, avgDaysToStage: 7, isExit: false },
        { stage: 'Offer', count: 5, percentage: 5, avgDaysToStage: 21, isExit: false },
      ]

      expect(funnel[1]?.percentage).toBe(30)
      expect(funnel[2]?.percentage).toBe(5)
    })

    it('computes average time to each stage', () => {
      const funnel: ConversionFunnelMetric[] = [
        { stage: 'Applied', count: 100, percentage: 100, avgDaysToStage: 0, isExit: false },
        { stage: 'Interviewing', count: 30, percentage: 30, avgDaysToStage: 10, isExit: false },
        { stage: 'Offer', count: 5, percentage: 5, avgDaysToStage: 35, isExit: false },
      ]

      expect(funnel[1]?.avgDaysToStage).toBe(10)
      expect(funnel[2]?.avgDaysToStage).toBe(35)
    })

    it('shows time-to-interview metric', () => {
      const funnel: ConversionFunnelMetric[] = [
        { stage: 'Interviewing', count: 25, percentage: 25, avgDaysToStage: 14, isExit: false },
      ]

      expect(funnel[0]?.avgDaysToStage).toBe(14)
    })

    it('shows time-to-offer metric', () => {
      const funnel: ConversionFunnelMetric[] = [
        { stage: 'Offer', count: 5, percentage: 5, avgDaysToStage: 42, isExit: false },
      ]

      expect(funnel[0]?.avgDaysToStage).toBe(42)
    })
  })

  describe('getSourceConversionTrends', () => {
    it('groups applications by source and month', () => {
      const trends: SourceConversionTrend[] = [
        {
          source: 'LinkedIn',
          month: '2026-04',
          applied: 10,
          interviewing: 3,
          offer: 1,
          rejected: 2,
          conversionRate: 10,
        },
        {
          source: 'LinkedIn',
          month: '2026-05',
          applied: 15,
          interviewing: 5,
          offer: 2,
          rejected: 3,
          conversionRate: 13.3,
        },
        {
          source: 'Indeed',
          month: '2026-04',
          applied: 8,
          interviewing: 1,
          offer: 0,
          rejected: 1,
          conversionRate: 0,
        },
      ]

      expect(trends.filter((t) => t.source === 'LinkedIn')).toHaveLength(2)
      expect(trends.filter((t) => t.source === 'Indeed')).toHaveLength(1)
    })

    it('computes conversion rate per source per month', () => {
      const trend: SourceConversionTrend = {
        source: 'LinkedIn',
        month: '2026-05',
        applied: 20,
        interviewing: 6,
        offer: 2,
        rejected: 4,
        conversionRate: 10, // 2 offers / 20 applied
      }

      expect(trend.conversionRate).toBe(10)
    })

    it('tracks applications, interviews, offers by source', () => {
      const trend: SourceConversionTrend = {
        source: 'Referral',
        month: '2026-05',
        applied: 5,
        interviewing: 4,
        offer: 3,
        rejected: 0,
        conversionRate: 60,
      }

      expect(trend.applied).toBe(5)
      expect(trend.interviewing).toBe(4)
      expect(trend.offer).toBe(3)
    })

    it('shows trends over multiple months', () => {
      const months = ['2026-03', '2026-04', '2026-05']
      const trends = months.map((month) => ({
        source: 'LinkedIn',
        month,
        applied: 10,
        interviewing: 3,
        offer: 1,
        rejected: 2,
        conversionRate: 10,
      }))

      expect(trends).toHaveLength(3)
      expect(trends[0]?.month).toBe('2026-03')
      expect(trends[2]?.month).toBe('2026-05')
    })

    it('compares conversion rates across sources', () => {
      const trends: SourceConversionTrend[] = [
        { source: 'LinkedIn', month: '2026-05', applied: 20, interviewing: 5, offer: 2, rejected: 4, conversionRate: 10 },
        { source: 'Indeed', month: '2026-05', applied: 30, interviewing: 3, offer: 0, rejected: 5, conversionRate: 0 },
        { source: 'Referral', month: '2026-05', applied: 5, interviewing: 4, offer: 3, rejected: 0, conversionRate: 60 },
      ]

      const linkedInRate = trends.find((t) => t.source === 'LinkedIn')?.conversionRate ?? 0
      const referralRate = trends.find((t) => t.source === 'Referral')?.conversionRate ?? 0

      expect(referralRate).toBeGreaterThan(linkedInRate)
    })
  })

  describe('getCohortAnalysis', () => {
    it('groups applications by month applied', () => {
      const cohorts: CohortAnalysis[] = [
        {
          cohort: '2026-05',
          jobsApplied: 25,
          jobsInterviewing: 8,
          jobsOffered: 2,
          jobsRejected: 5,
          conversionRate: 8,
          avgTimeToOffer: 30,
        },
        {
          cohort: '2026-04',
          jobsApplied: 30,
          jobsInterviewing: 10,
          jobsOffered: 4,
          jobsRejected: 8,
          conversionRate: 13.3,
          avgTimeToOffer: 25,
        },
      ]

      expect(cohorts.filter((c) => c.cohort === '2026-05')).toHaveLength(1)
      expect(cohorts.filter((c) => c.cohort === '2026-04')).toHaveLength(1)
    })

    it('tracks progression through pipeline for each cohort', () => {
      const cohort: CohortAnalysis = {
        cohort: '2026-05',
        jobsApplied: 50,
        jobsInterviewing: 15,
        jobsOffered: 5,
        jobsRejected: 10,
        conversionRate: 10,
        avgTimeToOffer: 32,
      }

      expect(cohort.jobsApplied).toBeGreaterThanOrEqual(cohort.jobsInterviewing)
      expect(cohort.jobsInterviewing).toBeGreaterThanOrEqual(cohort.jobsOffered)
    })

    it('computes offer conversion rate per cohort', () => {
      const cohort: CohortAnalysis = {
        cohort: '2026-05',
        jobsApplied: 100,
        jobsInterviewing: 30,
        jobsOffered: 10,
        jobsRejected: 20,
        conversionRate: 10, // 10 offers / 100 applied
        avgTimeToOffer: 28,
      }

      expect(cohort.conversionRate).toBe(10)
    })

    it('computes average time to offer for each cohort', () => {
      const cohorts: CohortAnalysis[] = [
        {
          cohort: '2026-05',
          jobsApplied: 20,
          jobsInterviewing: 6,
          jobsOffered: 2,
          jobsRejected: 4,
          conversionRate: 10,
          avgTimeToOffer: 28,
        },
        {
          cohort: '2026-04',
          jobsApplied: 25,
          jobsInterviewing: 8,
          jobsOffered: 3,
          jobsRejected: 5,
          conversionRate: 12,
          avgTimeToOffer: 35,
        },
      ]

      expect(cohorts[0]?.avgTimeToOffer).toBe(28)
      expect(cohorts[1]?.avgTimeToOffer).toBe(35)
    })

    it('shows recent cohorts first (most recent first)', () => {
      const cohorts: CohortAnalysis[] = [
        { cohort: '2026-05', jobsApplied: 20, jobsInterviewing: 5, jobsOffered: 1, jobsRejected: 3, conversionRate: 5, avgTimeToOffer: 30 },
        { cohort: '2026-04', jobsApplied: 25, jobsInterviewing: 7, jobsOffered: 2, jobsRejected: 4, conversionRate: 8, avgTimeToOffer: 28 },
        { cohort: '2026-03', jobsApplied: 30, jobsInterviewing: 9, jobsOffered: 3, jobsRejected: 6, conversionRate: 10, avgTimeToOffer: 25 },
      ]

      expect(cohorts[0]?.cohort).toBe('2026-05')
      expect(cohorts[1]?.cohort).toBe('2026-04')
      expect(cohorts[2]?.cohort).toBe('2026-03')
    })

    it('handles cohorts with no offers (null avgTimeToOffer)', () => {
      const cohort: CohortAnalysis = {
        cohort: '2026-05',
        jobsApplied: 10,
        jobsInterviewing: 2,
        jobsOffered: 0,
        jobsRejected: 3,
        conversionRate: 0,
        avgTimeToOffer: null,
      }

      expect(cohort.avgTimeToOffer).toBeNull()
      expect(cohort.conversionRate).toBe(0)
    })
  })

  describe('getConversionMetrics', () => {
    it('computes overall conversion metrics', () => {
      const metrics: ConversionMetrics = {
        totalJobs: 100,
        timeToFirstInterview: 14,
        timeToOffer: 42,
        conversionRate: 8,
        conversionBySource: {
          LinkedIn: 4,
          Indeed: 2,
          Referral: 2,
        },
      }

      expect(metrics.totalJobs).toBe(100)
      expect(metrics.conversionRate).toBe(8) // 8 offers / 100 jobs
      expect(Object.keys(metrics.conversionBySource)).toHaveLength(3)
    })

    it('tracks time to first interview in days', () => {
      const metrics: ConversionMetrics = {
        totalJobs: 50,
        timeToFirstInterview: 10,
        timeToOffer: null,
        conversionRate: 0,
        conversionBySource: {},
      }

      expect(metrics.timeToFirstInterview).toBe(10)
    })

    it('tracks time to offer in days', () => {
      const metrics: ConversionMetrics = {
        totalJobs: 50,
        timeToFirstInterview: 10,
        timeToOffer: 35,
        conversionRate: 6,
        conversionBySource: { LinkedIn: 3 },
      }

      expect(metrics.timeToOffer).toBe(35)
    })

    it('computes conversion rate across all jobs', () => {
      const metrics: ConversionMetrics = {
        totalJobs: 100,
        timeToFirstInterview: 14,
        timeToOffer: 42,
        conversionRate: 5, // 5 offers / 100 jobs
        conversionBySource: {},
      }

      expect(metrics.conversionRate).toBeCloseTo(5, 1)
    })

    it('counts offers by source', () => {
      const metrics: ConversionMetrics = {
        totalJobs: 50,
        timeToFirstInterview: 12,
        timeToOffer: 40,
        conversionRate: 10,
        conversionBySource: {
          LinkedIn: 3,
          Indeed: 1,
          Referral: 1,
        },
      }

      expect(metrics.conversionBySource.LinkedIn).toBe(3)
      expect(metrics.conversionBySource.Indeed).toBe(1)
      expect(metrics.conversionBySource.Referral).toBe(1)
    })

    it('handles null values when no offers exist', () => {
      const metrics: ConversionMetrics = {
        totalJobs: 20,
        timeToFirstInterview: 7,
        timeToOffer: null,
        conversionRate: 0,
        conversionBySource: {},
      }

      expect(metrics.timeToOffer).toBeNull()
      expect(metrics.conversionRate).toBe(0)
    })
  })

  describe('_computeTimeToStatus', () => {
    it('computes average time from creation to status', () => {
      // 5 jobs reach "interviewing" in 10, 12, 14, 16, 18 days respectively
      const times = [10, 12, 14, 16, 18]
      const average = times.reduce((a, b) => a + b) / times.length
      expect(average).toBe(14)
    })

    it('returns null when no jobs reach target status', () => {
      // No jobs reached "offer" status
      const result = null
      expect(result).toBeNull()
    })

    it('calculates median time to status', () => {
      const times = [5, 10, 14, 20, 30].sort((a, b) => a - b)
      const median = times[Math.floor(times.length / 2)]
      expect(median).toBe(14)
    })
  })

  describe('Analytics Integration', () => {
    it('cohort with better conversion rate is identified', () => {
      const cohorts: CohortAnalysis[] = [
        {
          cohort: '2026-04',
          jobsApplied: 100,
          jobsInterviewing: 30,
          jobsOffered: 10,
          jobsRejected: 20,
          conversionRate: 10,
          avgTimeToOffer: 35,
        },
        {
          cohort: '2026-05',
          jobsApplied: 50,
          jobsInterviewing: 20,
          jobsOffered: 8,
          jobsRejected: 10,
          conversionRate: 16,
          avgTimeToOffer: 28,
        },
      ]

      const bestCohort = cohorts.reduce((best, current) =>
        current.conversionRate > best.conversionRate ? current : best
      )

      expect(bestCohort.cohort).toBe('2026-05')
      expect(bestCohort.conversionRate).toBe(16)
    })

    it('highest conversion source is identified', () => {
      const trends: SourceConversionTrend[] = [
        { source: 'LinkedIn', month: '2026-05', applied: 50, interviewing: 10, offer: 3, rejected: 10, conversionRate: 6 },
        { source: 'Referral', month: '2026-05', applied: 10, interviewing: 8, offer: 6, rejected: 1, conversionRate: 60 },
        { source: 'Indeed', month: '2026-05', applied: 40, interviewing: 5, offer: 1, rejected: 8, conversionRate: 2.5 },
      ]

      const bestSource = trends.reduce((best, current) =>
        current.conversionRate > best.conversionRate ? current : best
      )

      expect(bestSource.source).toBe('Referral')
      expect(bestSource.conversionRate).toBe(60)
    })

    it('fastest time-to-offer cohort is identified', () => {
      const cohorts: CohortAnalysis[] = [
        {
          cohort: '2026-04',
          jobsApplied: 100,
          jobsInterviewing: 30,
          jobsOffered: 10,
          jobsRejected: 20,
          conversionRate: 10,
          avgTimeToOffer: 45,
        },
        {
          cohort: '2026-05',
          jobsApplied: 50,
          jobsInterviewing: 20,
          jobsOffered: 8,
          jobsRejected: 10,
          conversionRate: 16,
          avgTimeToOffer: 25,
        },
      ]

      const withOffers = cohorts.filter((c) => c.avgTimeToOffer !== null)
      const fastest = withOffers.reduce((best, current) =>
        current.avgTimeToOffer! < best.avgTimeToOffer! ? current : best
      )

      expect(fastest.cohort).toBe('2026-05')
      expect(fastest.avgTimeToOffer).toBe(25)
    })
  })
})
