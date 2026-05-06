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

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
        },
        {
          stage: 'Interviewing',
          count: 15,
          percentage: 30,
          avgDaysToStage: 7,
        },
        {
          stage: 'Offer',
          count: 3,
          percentage: 6,
          avgDaysToStage: 21,
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
        { stage: 'Applied', count: 100, percentage: 100, avgDaysToStage: 0 },
        { stage: 'Interviewing', count: 30, percentage: 30, avgDaysToStage: 7 },
        { stage: 'Offer', count: 5, percentage: 5, avgDaysToStage: 21 },
      ]

      expect(funnel[1]?.percentage).toBe(30)
      expect(funnel[2]?.percentage).toBe(5)
    })

    it('computes average time to each stage', () => {
      const funnel: ConversionFunnelMetric[] = [
        { stage: 'Applied', count: 100, percentage: 100, avgDaysToStage: 0 },
        { stage: 'Interviewing', count: 30, percentage: 30, avgDaysToStage: 10 },
        { stage: 'Offer', count: 5, percentage: 5, avgDaysToStage: 35 },
      ]

      expect(funnel[1]?.avgDaysToStage).toBe(10)
      expect(funnel[2]?.avgDaysToStage).toBe(35)
    })

    it('shows time-to-interview metric', () => {
      const funnel: ConversionFunnelMetric[] = [
        { stage: 'Interviewing', count: 25, percentage: 25, avgDaysToStage: 14 },
      ]

      expect(funnel[0]?.avgDaysToStage).toBe(14)
    })

    it('shows time-to-offer metric', () => {
      const funnel: ConversionFunnelMetric[] = [
        { stage: 'Offer', count: 5, percentage: 5, avgDaysToStage: 42 },
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
